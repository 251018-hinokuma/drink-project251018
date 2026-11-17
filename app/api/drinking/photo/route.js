import dns from "node:dns";
import net from "node:net";
import mongoose from "mongoose";
import { User } from "@/utils/schemaModels";
import connectDB from "@/utils/database";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

// ★ IPv4 のみで接続する設定
dns.setDefaultResultOrder("ipv4first");
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}

function base64ToGenerativePart(base64Data, defaultMimeType = "image/jpeg") {
  if (!base64Data) return null;
  const match = base64Data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    return {
      inlineData: {
        mimeType: match[1],
        data: match[2],
      },
    };
  }
  return {
    inlineData: {
      mimeType: defaultMimeType,
      data: base64Data,
    },
  };
}

// ★ リトライ回数を最大2回（初回＋再試行1回）に抑え、60秒制限内に確実に収める
async function generateContentWithRetry(ai, params, maxRetries = 2, initialDelay = 1000) {
  let delay = initialDelay;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error) {
      const isRetryable =
        error?.status === 503 ||
        error?.code === 503 ||
        error?.status === 504 ||
        error?.code === 504 ||
        error?.name === "TimeoutError" ||
        error?.name === "AbortError" ||
        error?.message?.includes("high demand") ||
        error?.message?.includes("503") ||
        error?.message?.includes("504") ||
        error?.message?.includes("DEADLINE_EXCEEDED") ||
        error?.message?.includes("timeout") ||
        error?.message?.includes("aborted");

      if (isRetryable && attempt < maxRetries) {
        console.warn(
          `[Gemini API 混雑/遅延] ${delay}ms 後に再試行します (リトライ ${attempt}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
}

export async function POST(request) {
  const encoder = new TextEncoder();
  console.time("1. API全体処理");

  const stream = new ReadableStream({
    async start(controller) {
      let progress = 0;
      let heartbeatInterval = null;
      let activeAiTimer = null;

      const startAiTimer = (label) => {
        activeAiTimer = label;
        console.time(label);
      };

      const stopAiTimer = () => {
        if (activeAiTimer) {
          console.timeEnd(activeAiTimer);
          activeAiTimer = null;
        }
      };

      const sendProgress = (value, message, extra = {}) => {
        try {
          const data = JSON.stringify({ progress: value, message, ...extra }) + "\n";
          controller.enqueue(encoder.encode(data));
        } catch {
          // 切断済みの場合は無視
        }
      };

      const startHeartbeat = (baseMessage) => {
        let elapsed = 0;
        heartbeatInterval = setInterval(() => {
          elapsed += 2;
          if (progress < 95) {
            progress += 2;
          }
          sendProgress(progress, `${baseMessage} (${elapsed}秒経過)`);
        }, 2000);
      };

      const stopHeartbeat = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      };

      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          sendProgress(0, "エラー", {
            error: "GEMINI_API_KEY が設定されていません。.env.local を確認してください。",
          });
          return;
        }

        // ★ 1回あたりのタイムアウトを 20秒 に短縮（60秒オーバー防止）
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { timeout: 20000 },
        });

        progress = 15;
        sendProgress(progress, "AI接続準備完了");

        console.time("2. DB接続・リクエスト受信");
        progress = 25;
        sendProgress(progress, "データベース接続中...");
        await connectDB();
        const body = await request.json();
        console.timeEnd("2. DB接続・リクエスト受信");

        const {
          userId = 1,
          useMydrink = false,
          reqMyDrinkImgName = "",
          reqMyDrinkImgCalorie = 0,
          reqMergedDrinkImg,
          reqDrinkImgBefor,
          reqDrinkImgAfter,
          customValue,
        } = body;

        if (!userId) {
          sendProgress(0, "エラー", { error: "userId が指定されていません" });
          return;
        }

        const hasCustomValue =
          customValue !== undefined &&
          customValue !== null &&
          customValue !== "" &&
          !isNaN(Number(customValue));
        const parsedCustomValue = hasCustomValue ? Number(customValue) : null;

        console.time("3. 画像Base64変換");
        progress = 40;
        sendProgress(progress, "画像処理中...");

        // ★ 1枚結合画像と従来の2枚画像のどちらでも動作するように対応
        const imageParts = [];
        let imagePromptPrefix = "";

        if (reqMergedDrinkImg) {
          const mergedPart = base64ToGenerativePart(reqMergedDrinkImg);
          if (!mergedPart) {
            sendProgress(0, "エラー", { error: "画像データの変換に失敗しました" });
            return;
          }
          imageParts.push(mergedPart);
          imagePromptPrefix = "添付された画像は「左側：飲む前」「右側：飲んだ後」を並べた比較画像です。";
        } else {
          const postDrinkImgBefor = base64ToGenerativePart(reqDrinkImgBefor);
          const postDrinkImgAfter = base64ToGenerativePart(reqDrinkImgAfter);
          if (!postDrinkImgBefor || !postDrinkImgAfter) {
            sendProgress(0, "エラー", { error: "飲む前と飲んだ後の両方の画像が必要です" });
            return;
          }
          imageParts.push(postDrinkImgBefor, postDrinkImgAfter);
          imagePromptPrefix = "添付された2枚の画像（画像1:飲む前, 画像2:飲んだ後）を比較し、";
        }
        console.timeEnd("3. 画像Base64変換");

        // ★ 高速化オプションは必ず config の中に記述する
        const baseAiConfig = {
          mediaResolution: "MEDIA_RESOLUTION_LOW",
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
        };

        let finalDrinkName = "";
        let finalDrinkValue = 0;
        let finalDrinkCalorie = 0;

        // パターン1: マイドリンクを使用する場合
        if (useMydrink) {
          finalDrinkName = reqMyDrinkImgName || "マイドリンク";

          if (hasCustomValue) {
            progress = 85;
            sendProgress(progress, "手入力データからカロリー計算完了");
            finalDrinkValue = parsedCustomValue;
            finalDrinkCalorie = Math.round(
              (parsedCustomValue / 100) * Number(reqMyDrinkImgCalorie)
            );
          } else {
            progress = 50;
            sendProgress(progress, "AIがマイドリンクを解析中...");
            startHeartbeat("AIがマイドリンクを解析中...");
            startAiTimer("4. AI解析（マイドリンク）");

            const response = await generateContentWithRetry(ai, {
              model: "gemini-3.8-flash",
              contents: [
                `${imagePromptPrefix}指定されたJSON形式で解析結果を出力してください。
                 マイドリンク名: ${reqMyDrinkImgName}
                 マイドリンクの100mlあたりのカロリー: ${reqMyDrinkImgCalorie} kcal`,
                ...imageParts,
              ],
              config: {
                ...baseAiConfig,
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    drinkvalue: {
                      type: "INTEGER",
                      description: "比較から計算した飲んだ量(ml)",
                    },
                    drinkcalorie: {
                      type: "INTEGER",
                      description: "飲んだ量とマイドリンクカロリーから計算した摂取カロリー",
                    },
                  },
                  required: ["drinkvalue", "drinkcalorie"],
                },
              },
            });

            stopHeartbeat();
            stopAiTimer();
            progress = 96;
            sendProgress(progress, "AI解析完了");

            const resultVariables = JSON.parse(response.text);
            finalDrinkValue = resultVariables.drinkvalue || 0;
            finalDrinkCalorie = resultVariables.drinkcalorie || 0;
          }
        }
        // パターン2: 一般飲料（マイドリンク以外）
        else {
          if (hasCustomValue) {
            progress = 50;
            sendProgress(progress, "AIが商品名とカロリーを解析中...");
            startHeartbeat("AIが商品名とカロリーを解析中...");
            startAiTimer("4. AI解析（一般・量指定あり）");

            const response = await generateContentWithRetry(ai, {
              model: "gemini-3.8-flash",
              contents: [
                `${imagePromptPrefix}商品名を特定してください。飲んだ量は ${parsedCustomValue} ml と確定しています。指定されたJSON形式で結果を出力してください。`,
                ...imageParts,
              ],
              config: {
                ...baseAiConfig,
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    drinkname: {
                      type: "STRING",
                      description: "画像から特定した飲料の商品名",
                    },
                    drinkcalorie: {
                      type: "INTEGER",
                      description: `商品名のカロリー情報から算出した ${parsedCustomValue} ml あたりの摂取カロリー`,
                    },
                  },
                  required: ["drinkname", "drinkcalorie"],
                },
              },
            });

            stopHeartbeat();
            stopAiTimer();
            progress = 96;
            sendProgress(progress, "AI解析完了");

            const resultVariables = JSON.parse(response.text);
            finalDrinkName = resultVariables.drinkname || "不明な飲料";
            finalDrinkValue = parsedCustomValue;
            finalDrinkCalorie = resultVariables.drinkcalorie || 0;
          } else {
            progress = 50;
            sendProgress(progress, "AIが飲料名と飲んだ量を解析中...");
            startHeartbeat("AIが飲料名と飲んだ量を解析中...");
            startAiTimer("4. AI解析（一般・全自動）");

            const response = await generateContentWithRetry(ai, {
              model: "gemini-3.8-flash",
              contents: [
                `${imagePromptPrefix}指定されたJSON形式で解析結果を出力してください。`,
                ...imageParts,
              ],
              config: {
                ...baseAiConfig,
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    drinkname: {
                      type: "STRING",
                      description: "画像から特定した飲料の商品名",
                    },
                    drinkvalue: {
                      type: "INTEGER",
                      description: "比較から計算した飲んだ量(ml)",
                    },
                    drinkcalorie: {
                      type: "INTEGER",
                      description: "商品名のカロリーと飲んだ量から計算した摂取カロリー",
                    },
                  },
                  required: ["drinkname", "drinkvalue", "drinkcalorie"],
                },
              },
            });

            stopHeartbeat();
            stopAiTimer();
            progress = 96;
            sendProgress(progress, "AI解析完了");

            const resultVariables = JSON.parse(response.text);
            finalDrinkName = resultVariables.drinkname || "不明な飲料";
            finalDrinkValue = resultVariables.drinkvalue || 0;
            finalDrinkCalorie = resultVariables.drinkcalorie || 0;
          }
        }

        progress = 98;
        sendProgress(progress, "記録をデータベースに保存中...");
        console.time("5. DB保存処理");

        const newRecord = {
          drinkRecordId: new mongoose.Types.ObjectId().toString(),
          drinkName: finalDrinkName,
          drinkValue: String(finalDrinkValue),
          drinkCalorie: String(finalDrinkCalorie),
          drinkDate: new Date(),
        };

        const searchFilter = mongoose.Types.ObjectId.isValid(userId)
          ? { _id: userId }
          : { userId: Number(userId) };

        const updatedUser = await User.findOneAndUpdate(
          searchFilter,
          { $push: { drinkrecord: newRecord } },
          { returnDocument: "after" }
        );
        console.timeEnd("5. DB保存処理");

        if (!updatedUser) {
          sendProgress(0, "エラー", { error: "ユーザーが見つかりませんでした" });
          return;
        }

        sendProgress(100, "記録を追加しました", {
          done: true,
          record: newRecord,
          user: updatedUser,
        });
      } catch (error) {
        stopHeartbeat();
        stopAiTimer();
        console.error("API Error:", error);

        const is429 =
          error?.status === 429 ||
          error?.code === 429 ||
          error?.message?.includes("429") ||
          error?.message?.includes("RESOURCE_EXHAUSTED");

        const isBusy =
          error?.status === 503 ||
          error?.code === 503 ||
          error?.status === 504 ||
          error?.code === 504;

        let errorMessage = "AI解析またはサーバー処理に失敗しました";
        if (is429) {
          errorMessage =
            "本日のAI解析の上限（無料枠20回/日）に達しました。17:00以降に再度お試しください。";
        } else if (isBusy) {
          errorMessage =
            "AIサーバーが現在混雑しています。数秒待ってから再度送信してください。";
        }

        sendProgress(0, "エラー", { error: errorMessage });
      } finally {
        stopHeartbeat();
        stopAiTimer();
        console.timeEnd("1. API全体処理");
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
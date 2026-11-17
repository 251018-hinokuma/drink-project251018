import dns from "node:dns";
import net from "node:net";
import mongoose from "mongoose";
import { User } from "@/utils/schemaModels";
import connectDB from "@/utils/database";
import { GoogleGenAI } from "@google/genai";

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

// ★ 503混雑・504タイムアウト時に自動リトライを行うヘルパー関数
async function generateContentWithRetry(ai, params, maxRetries = 3, initialDelay = 1500) {
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

      const sendProgress = (value, message, extra = {}) => {
        try {
          const data = JSON.stringify({ progress: value, message, ...extra }) + "\n";
          controller.enqueue(encoder.encode(data));
        } catch {
          // 切断済みの場合は無視
        }
      };

      // 95%まで3秒ごとにデータを送り続け、ポート転送の無通信切断を防ぐ
      const startHeartbeat = (baseMessage) => {
        let elapsed = 0;
        heartbeatInterval = setInterval(() => {
          elapsed += 3;
          if (progress < 95) {
            progress += 1;
          }
          sendProgress(progress, `${baseMessage} (${elapsed}秒経過)`);
        }, 3000);
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

        // ★ 1回あたりの AI 応答タイムアウトを 45秒 に設定
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { timeout: 45000 },
        });

        progress = 10;
        sendProgress(progress, "AI接続準備完了");

        console.time("2. DB接続・リクエスト受信");
        progress = 20;
        sendProgress(progress, "データベース接続中...");
        await connectDB();
        const body = await request.json();
        progress = 30;
        sendProgress(progress, "データベース接続完了");
        console.timeEnd("2. DB接続・リクエスト受信");

        const {
          userId = 1,
          useMydrink = false,
          reqMyDrinkImgName = "",
          reqMyDrinkImgCalorie = 0,
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
        const postDrinkImgBefor = base64ToGenerativePart(reqDrinkImgBefor);
        const postDrinkImgAfter = base64ToGenerativePart(reqDrinkImgAfter);
        console.timeEnd("3. 画像Base64変換");

        if (!postDrinkImgBefor || !postDrinkImgAfter) {
          sendProgress(0, "エラー", { error: "飲む前と飲んだ後の両方の画像が必要です" });
          return;
        }

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
            console.time("4. AI解析（マイドリンク）");

            const response = await generateContentWithRetry(ai, {
              model: "gemini-3.8-flash",
              contents: [
                `添付された2枚の画像（画像1:飲む前, 画像2:飲んだ後）を比較し、指定されたJSON形式で解析結果を出力してください。
                 マイドリンク名: ${reqMyDrinkImgName}
                 マイドリンクの100mlあたりのカロリー: ${reqMyDrinkImgCalorie} kcal`,
                postDrinkImgBefor,
                postDrinkImgAfter,
              ],
              config: {
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    drinkvalue: {
                      type: "INTEGER",
                      description: "2枚の画像から計算した飲んだ量(ml)",
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
            console.timeEnd("4. AI解析（マイドリンク）");
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
            console.time("4. AI解析（一般・量指定あり）");

            const response = await generateContentWithRetry(ai, {
              model: "gemini-3.8-flash",
              contents: [
                `添付された2枚の画像を比較し、商品名を特定してください。飲んだ量は ${parsedCustomValue} ml と確定しています。指定されたJSON形式で結果を出力してください。`,
                postDrinkImgBefor,
                postDrinkImgAfter,
              ],
              config: {
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: "application/json",
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
            console.timeEnd("4. AI解析（一般・量指定あり）");
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
            console.time("4. AI解析（一般・全自動）");

            const response = await generateContentWithRetry(ai, {
              model: "gemini-3.8-flash",
              contents: [
                "添付された2枚の画像（画像1:飲む前, 画像2:飲んだ後）を比較し、指定されたJSON形式で解析結果を出力してください。",
                postDrinkImgBefor,
                postDrinkImgAfter,
              ],
              config: {
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    drinkname: {
                      type: "STRING",
                      description: "画像から特定した飲料の商品名",
                    },
                    drinkvalue: {
                      type: "INTEGER",
                      description: "2枚の画像から計算した飲んだ量(ml)",
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
            console.timeEnd("4. AI解析（一般・全自動）");
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
        console.error("API Error:", error);
        const isBusy =
          error?.status === 503 ||
          error?.code === 503 ||
          error?.status === 504 ||
          error?.code === 504;
        const errorMessage = isBusy
          ? "AIサーバーが現在混雑しています。数秒待ってから再度送信してください。"
          : "AI解析またはサーバー処理に失敗しました";

        sendProgress(0, "エラー", { error: errorMessage });
      } finally {
        stopHeartbeat();
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
import dns from "node:dns";
import net from "node:net";
import mongoose from "mongoose";
import { User } from "@/utils/schemaModels";
import connectDB from "@/utils/database";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

// IPv4 のみで接続する設定
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

async function generateContentWithRetry(
  ai,
  params,
  { maxRetries = 2, initialDelay = 1000, onRetry } = {}
) {
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
          `[Gemini API 混雑/遅延] ${delay}ms 後に再試行します (リトライ ${attempt}/${maxRetries})...`,
          { status: error?.status, name: error?.name, message: error?.message }
        );
        if (onRetry) {
          onRetry(attempt, maxRetries, error);
        }
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
  const requestStartTime = Date.now();
  console.time("1. API全体処理");

  const stream = new ReadableStream({
    async start(controller) {
      let progress = 0;
      let heartbeatInterval = null;
      let activeAiTimer = null;
      let currentStage = "初期化";
      let aiAttemptCount = 0;

      const getElapsedSec = () =>
        Number(((Date.now() - requestStartTime) / 1000).toFixed(2));

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
        currentStage = "APIキー確認";
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          sendProgress(0, "エラー", {
            error: "GEMINI_API_KEY が設定されていません。.env.local を確認してください。",
            errorDetail: {
              stage: currentStage,
              elapsedSec: getElapsedSec(),
              status: 500,
              rawMessage: "GEMINI_API_KEY is missing",
            },
          });
          return;
        }

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { timeout: 20000 },
        });

        progress = 15;
        sendProgress(progress, "AI接続準備完了");

        currentStage = "DB接続・リクエスト受信";
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
          sendProgress(0, "エラー", {
            error: "userId が指定されていません",
            errorDetail: {
              stage: "リクエスト検証",
              elapsedSec: getElapsedSec(),
              status: 400,
              rawMessage: "userId is required",
            },
          });
          return;
        }

        const hasCustomValue =
          customValue !== undefined &&
          customValue !== null &&
          customValue !== "" &&
          !isNaN(Number(customValue));
        const parsedCustomValue = hasCustomValue ? Number(customValue) : null;

        currentStage = "画像Base64変換";
        console.time("3. 画像Base64変換");
        progress = 40;
        sendProgress(progress, "画像処理中...");

        const imageParts = [];
        let imagePromptPrefix = "";

        if (reqMergedDrinkImg) {
          const mergedPart = base64ToGenerativePart(reqMergedDrinkImg);
          if (!mergedPart) {
            sendProgress(0, "エラー", {
              error: "画像データの変換に失敗しました",
              errorDetail: {
                stage: currentStage,
                elapsedSec: getElapsedSec(),
                status: 400,
                rawMessage: "Failed to parse reqMergedDrinkImg",
              },
            });
            return;
          }
          imageParts.push(mergedPart);
          imagePromptPrefix = "添付された画像は「左側：飲む前」「右側：飲んだ後」を並べた比較画像です。";
        } else {
          const postDrinkImgBefor = base64ToGenerativePart(reqDrinkImgBefor);
          const postDrinkImgAfter = base64ToGenerativePart(reqDrinkImgAfter);
          if (!postDrinkImgBefor || !postDrinkImgAfter) {
            sendProgress(0, "エラー", {
              error: "飲む前と飲んだ後の両方の画像が必要です",
              errorDetail: {
                stage: currentStage,
                elapsedSec: getElapsedSec(),
                status: 400,
                rawMessage: "Missing before or after image",
              },
            });
            return;
          }
          imageParts.push(postDrinkImgBefor, postDrinkImgAfter);
          imagePromptPrefix = "添付された2枚の画像（画像1:飲む前, 画像2:飲んだ後）を比較し、";
        }
        console.timeEnd("3. 画像Base64変換");

        // ★ Gemini 3.x 系対応の高速化設定（thinkingBudget: 0 は 400 エラーになるため thinkingLevel を使用）
        const baseAiConfig = {
          mediaResolution: "MEDIA_RESOLUTION_LOW",
          thinkingConfig: { thinkingLevel: "LOW" },
          responseMimeType: "application/json",
        };

        const handleRetryNotice = (attempt, maxRetries, err) => {
          aiAttemptCount = attempt + 1;
          const reason =
            err?.name === "TimeoutError" || err?.name === "AbortError" || err?.status === 504
              ? "20秒タイムアウト"
              : `サーバー混雑(${err?.status || "遅延"})`;
          sendProgress(
            progress,
            `1回目が${reason}のため再試行中 (${attempt}/${maxRetries - 1})...`
          );
        };

        let finalDrinkName = "";
        let finalDrinkValue = 0;
        let finalDrinkCalorie = 0;

        // パターン1: マイドリンクを使用する場合
        if (useMydrink) {
          finalDrinkName = reqMyDrinkImgName || "マイドリンク";

          if (hasCustomValue) {
            currentStage = "マイドリンク手入力計算";
            progress = 85;
            sendProgress(progress, "手入力データからカロリー計算完了");
            finalDrinkValue = parsedCustomValue;
            finalDrinkCalorie = Math.round(
              (parsedCustomValue / 100) * Number(reqMyDrinkImgCalorie)
            );
          } else {
            currentStage = "AI解析（マイドリンク）";
            aiAttemptCount = 1;
            progress = 50;
            sendProgress(progress, "AIがマイドリンクを解析中...");
            startHeartbeat("AIがマイドリンクを解析中...");
            startAiTimer("4. AI解析（マイドリンク）");

            const response = await generateContentWithRetry(
              ai,
              {
                model: "gemini-3.5-flash-lite",
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
              },
              { maxRetries: 2, initialDelay: 1000, onRetry: handleRetryNotice }
            );

            stopHeartbeat();
            stopAiTimer();
            progress = 96;
            sendProgress(progress, "AI解析完了");

            currentStage = "AI応答JSONパース（マイドリンク）";
            const resultVariables = JSON.parse(response.text);
            finalDrinkValue = resultVariables.drinkvalue || 0;
            finalDrinkCalorie = resultVariables.drinkcalorie || 0;
          }
        }
        // パターン2: 一般飲料（マイドリンク以外）
        else {
          if (hasCustomValue) {
            currentStage = "AI解析（一般・量指定あり）";
            aiAttemptCount = 1;
            progress = 50;
            sendProgress(progress, "AIが商品名とカロリーを解析中...");
            startHeartbeat("AIが商品名とカロリーを解析中...");
            startAiTimer("4. AI解析（一般・量指定あり）");

            const response = await generateContentWithRetry(
              ai,
              {
                model: "gemini-3.5-flash-lite",
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
              },
              { maxRetries: 2, initialDelay: 1000, onRetry: handleRetryNotice }
            );

            stopHeartbeat();
            stopAiTimer();
            progress = 96;
            sendProgress(progress, "AI解析完了");

            currentStage = "AI応答JSONパース（一般・量指定あり）";
            const resultVariables = JSON.parse(response.text);
            finalDrinkName = resultVariables.drinkname || "不明な飲料";
            finalDrinkValue = parsedCustomValue;
            finalDrinkCalorie = resultVariables.drinkcalorie || 0;
          } else {
            currentStage = "AI解析（一般・全自動）";
            aiAttemptCount = 1;
            progress = 50;
            sendProgress(progress, "AIが飲料名と飲んだ量を解析中...");
            startHeartbeat("AIが飲料名と飲んだ量を解析中...");
            startAiTimer("4. AI解析（一般・全自動）");

            const response = await generateContentWithRetry(
              ai,
              {
                model: "gemini-3.5-flash-lite",
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
              },
              { maxRetries: 2, initialDelay: 1000, onRetry: handleRetryNotice }
            );

            stopHeartbeat();
            stopAiTimer();
            progress = 96;
            sendProgress(progress, "AI解析完了");

            currentStage = "AI応答JSONパース（一般・全自動）";
            const resultVariables = JSON.parse(response.text);
            finalDrinkName = resultVariables.drinkname || "不明な飲料";
            finalDrinkValue = resultVariables.drinkvalue || 0;
            finalDrinkCalorie = resultVariables.drinkcalorie || 0;
          }
        }

        currentStage = "DB保存処理";
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
          sendProgress(0, "エラー", {
            error: "ユーザーが見つかりませんでした",
            errorDetail: {
              stage: currentStage,
              elapsedSec: getElapsedSec(),
              status: 404,
              rawMessage: `User not found for filter: ${JSON.stringify(searchFilter)}`,
            },
          });
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

        const elapsedSec = getElapsedSec();
        const status = error?.status || error?.code || error?.cause?.code || "UNKNOWN";
        const errorName = error?.name || "Error";
        const rawMessage = error?.message || String(error);
        const causeMessage = error?.cause ? String(error.cause?.message || error.cause) : null;

        console.error("=== API Error 詳細 ===", {
          stage: currentStage,
          elapsedSec: `${elapsedSec}s`,
          aiAttemptCount,
          status,
          name: errorName,
          message: rawMessage,
          cause: causeMessage,
          stack: error?.stack,
        });

        const isTimeout =
          errorName === "TimeoutError" ||
          errorName === "AbortError" ||
          status === 504 ||
          rawMessage.includes("DEADLINE_EXCEEDED") ||
          rawMessage.includes("timeout") ||
          rawMessage.includes("aborted");

        const is429 =
          status === 429 ||
          rawMessage.includes("429") ||
          rawMessage.includes("RESOURCE_EXHAUSTED");

        const isBusy = status === 503 || rawMessage.includes("high demand");

        // ★ alert() だけでも詳細原因が読めるようにステータスと詳細メッセージを結合
        let errorMessage = `「${currentStage}」でエラー (${status}): ${rawMessage}`;
        if (isTimeout) {
          errorMessage = `AI解析がタイムアウトしました（経過: ${elapsedSec}秒 / 試行: ${aiAttemptCount}回）`;
        } else if (is429) {
          errorMessage = "APIの利用上限（429 Quota Exceeded）に達しました。時間をおいて再試行してください。";
        } else if (isBusy) {
          errorMessage = "AIサーバーが混雑しています（503）。数秒待ってから再度送信してください。";
        }

        sendProgress(0, "エラー", {
          error: errorMessage,
          errorDetail: {
            stage: currentStage,
            elapsedSec,
            aiAttemptCount,
            status,
            name: errorName,
            rawMessage,
            cause: causeMessage,
          },
        });
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
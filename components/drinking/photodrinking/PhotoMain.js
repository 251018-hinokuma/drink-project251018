"use client";

import { useState } from "react";
import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";

export default function PhotoMain() {
  const [imageBefore, setImageBefore] = useState(null);
  const [imageAfter, setImageAfter] = useState(null);
  const [customValue, setCustomValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("待機中");

  const {
    user,
    setUser,
    resetCount,
    useMydrink,
    useMydrinkInfo,
    setNowScreen,
  } = useDrink();

  // プレビュー用に軽量リサイズ
  const resizeImage = (file, maxSize = 480, quality = 0.6) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // ★ 「飲む前(左)」と「飲んだ後(右)」を1枚の画像に結合してAIの読み込みを高速化
  const mergeImagesSideBySide = (beforeSrc, afterSrc, targetHeight = 440, quality = 0.55) => {
    return new Promise((resolve) => {
      const img1 = new Image();
      const img2 = new Image();
      let loaded = 0;

      const onLoad = () => {
        loaded++;
        if (loaded < 2) return;

        const w1 = Math.round((img1.width * targetHeight) / img1.height);
        const w2 = Math.round((img2.width * targetHeight) / img2.height);

        const canvas = document.createElement("canvas");
        canvas.width = w1 + w2;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img1, 0, 0, w1, targetHeight);
        ctx.drawImage(img2, w1, 0, w2, targetHeight);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img1.onload = onLoad;
      img2.onload = onLoad;
      img1.src = beforeSrc;
      img2.src = afterSrc;
    });
  };

  const handleFileChange = async (e, setImage) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const compressedDataUrl = await resizeImage(file);
    setImage(compressedDataUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageBefore || !imageAfter) {
      alert("「飲む前の写真」と「飲んだ後の写真」を両方選択してください");
      return;
    }

    setIsSubmitting(true);
    setProgress(5);
    setStatus("比較画像を作成中...");

    try {
      // ★ 2枚を左右1枚に結合してから送信
      const mergedImage = await mergeImagesSideBySide(imageBefore, imageAfter);

      setProgress(10);
      setStatus("サーバーへ送信中...");

      const payload = {
        userId: user?.userId || 1,
        useMydrink: Boolean(useMydrink),
        reqMyDrinkImgName: useMydrinkInfo?.drinkName || "",
        reqMyDrinkImgCalorie: useMydrinkInfo?.drinkCalorie || 0,
        reqMergedDrinkImg: mergedImage,
        customValue: customValue ? Number(customValue) : null,
      };

      const response = await fetch("/api/drinking/photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.body) {
        throw new Error("レスポンスの読み取りに失敗しました");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const progressData = JSON.parse(line);

          if (progressData.error) {
            alert(progressData.error);
            return;
          }

          if (progressData.progress !== undefined) {
            setProgress(progressData.progress);
          }
          if (progressData.message) {
            setStatus(progressData.message);
          }

          if (progressData.done) {
            await new Promise((resolve) => setTimeout(resolve, 300));

            if (progressData.user && setUser) {
              setUser(progressData.user);
            }
            if (resetCount) {
              resetCount();
            }
            setNowScreen("HOMEMAIN");
            alert(progressData.message || "記録を追加しました");
          }
        }
      }
    } catch (error) {
      console.error("送信エラー:", error);
      alert("通信が切断されました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Header />
      <button onClick={() => setNowScreen("HOMEMAIN")} disabled={isSubmitting}>
        ホーム
      </button>

      <form onSubmit={handleSubmit}>
        <div>
          <p style={{ fontWeight: "bold", margin: "8px 0" }}>
            {useMydrink ? `選択中: ${useMydrinkInfo?.drinkName}` : "一般飲料解析"}
          </p>

          <label>飲む前の写真：</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileChange(e, setImageBefore)}
            disabled={isSubmitting}
            required
          />
          <div>
            {imageBefore && (
              <img
                src={imageBefore}
                alt="飲む前プレビュー"
                style={{ maxWidth: "200px", marginTop: "8px" }}
              />
            )}
          </div>
        </div>

        <div style={{ marginTop: "16px" }}>
          <label>飲んだ後の写真：</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileChange(e, setImageAfter)}
            disabled={isSubmitting}
            required
          />
          <div>
            {imageAfter && (
              <img
                src={imageAfter}
                alt="飲んだ後プレビュー"
                style={{ maxWidth: "200px", marginTop: "8px" }}
              />
            )}
          </div>
        </div>

        <div style={{ marginTop: "16px" }}>
          <label>手入力（任意）：</label>
          <input
            type="number"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="自分で飲んだ量を指定したい場合に入力(ml)"
            disabled={isSubmitting}
            style={{ width: "100%", padding: "8px", marginTop: "8px" }}
          />
        </div>

        {isSubmitting && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>{status}</span>
              <span>{progress}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "16px",
                backgroundColor: "#e5e7eb",
                borderRadius: "9999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: "#2563eb",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ marginTop: "16px", padding: "8px 16px" }}
        >
          {isSubmitting ? "解析中..." : "送信して解析"}
        </button>
      </form>
    </div>
  );
}
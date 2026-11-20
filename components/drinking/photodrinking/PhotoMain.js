"use client";

import { useState } from "react";
import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
import styles from "./PhotoMain.module.css";

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

  // 「飲む前(左)」と「飲んだ後(右)」を1枚の画像に結合してAIの読み込みを高速化
  const mergeImagesSideBySide = (
    beforeSrc,
    afterSrc,
    targetHeight = 440,
    quality = 0.55
  ) => {
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

    if (isSubmitting) return;

    setIsSubmitting(true);
    setProgress(5);
    setStatus("比較画像を作成中...");

    try {
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

  const displayDrinkName = useMydrink
    ? useMydrinkInfo?.drinkName || "マイドリンク"
    : "市販飲料";

  return (
    <div className={styles.wrapper}>
      <main className={styles.stage}>
        <Header />

        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.formGroup}>
            {/* 1. 飲料名ボックス */}
            <div className={styles.drinkNameBox}>{displayDrinkName}</div>

            {/* 2. 左右2分割の写真選択ボックス */}
            <div className={styles.photoSplitBox}>
              {/* 左：飲む前の写真 */}
              <label
                className={`${styles.photoSlot} ${styles.photoSlotLeft} ${
                  isSubmitting ? styles.photoSlotDisabled : ""
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(e, setImageBefore)}
                  disabled={isSubmitting}
                  className={styles.hiddenInput}
                />
                {imageBefore ? (
                  <>
                    <img
                      src={imageBefore}
                      alt="飲む前プレビュー"
                      className={styles.previewImg}
                    />
                    <span className={styles.previewBadge}>飲む前</span>
                  </>
                ) : (
                  <span className={styles.photoPlaceholder}>
                    飲む前の
                    <br />
                    写真
                  </span>
                )}
              </label>

              {/* 右：飲んだ後の写真 */}
              <label
                className={`${styles.photoSlot} ${
                  isSubmitting ? styles.photoSlotDisabled : ""
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(e, setImageAfter)}
                  disabled={isSubmitting}
                  className={styles.hiddenInput}
                />
                {imageAfter ? (
                  <>
                    <img
                      src={imageAfter}
                      alt="飲んだ後プレビュー"
                      className={styles.previewImg}
                    />
                    <span className={styles.previewBadge}>飲んだ後</span>
                  </>
                ) : (
                  <span className={styles.photoPlaceholder}>
                    飲んだ後
                    <br />
                    の写真
                  </span>
                )}
              </label>
            </div>

            {/* 3. 飲んだ量ボックス（任意手入力） */}
            <div className={styles.amountBox}>
              <label htmlFor="photo-custom-value" className={styles.amountLabel}>
                飲んだ量
              </label>
              <div className={styles.inputRow}>
                <input
                  id="photo-custom-value"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="任意"
                  disabled={isSubmitting}
                  className={styles.amountInput}
                />
                <span className={styles.unitText}>ml</span>
              </div>
            </div>

            {/* 解析中の進捗バー */}
            {isSubmitting && (
              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span>{status}</span>
                  <span>{progress}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 4. 楕円形の送信ボタン */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? "解析中..." : "送信"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
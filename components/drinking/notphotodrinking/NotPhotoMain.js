"use client";

import { useState } from "react";
import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
import styles from "./NotPhotoMain.module.css";
import Footer from "@/components/Footer";
export default function NotPhotoMain() {
  const [customValue, setCustomValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    user,
    setUser,
    useMyDrink,
    useMydrinkInfo,
    setNowScreen,
    resetCount,
  } = useDrink();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customValue || isNaN(Number(customValue)) || Number(customValue) <= 0) {
      alert("飲んだ量を正しい数値で入力してください");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        userId: user?.userId || 1,
        useMyDrink: useMyDrink ?? true,
        reqMyDrinkImgName: useMydrinkInfo?.drinkName || "マイドリンク",
        reqMyDrinkImgCalorie: useMydrinkInfo?.drinkCalorie || 0,
        customValue: Number(customValue),
      };

      const response = await fetch("/api/drinking/notphoto", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const jsonData = await response.json();

      if (response.ok) {
        if (jsonData.user && setUser) {
          setUser(jsonData.user);
        }
        if (resetCount) {
          resetCount();
        }
        setNowScreen("HOMEMAIN");

        alert(jsonData.message || "記録を追加しました");
        setCustomValue("");
      } else {
        alert(jsonData.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("記録更新エラー:", error);
      alert("送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <main className={styles.stage}>
        <Header />

        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.formGroup}>
            {/* 上段：飲料名ボックス */}
            <div className={styles.drinkNameBox}>
              {useMydrinkInfo?.drinkName || "マイドリンク"}
            </div>

            {/* 中段：飲んだ量入力ボックス */}
            <div className={styles.amountBox}>
              <label htmlFor="custom-drink-value" className={styles.amountLabel}>
                飲んだ量
              </label>
              <div className={styles.inputRow}>
                <input
                  id="custom-drink-value"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="0"
                  className={styles.amountInput}
                  required
                />
                <span className={styles.unitText}>ml</span>
              </div>
            </div>

            {/* 下段：楕円形の送信ボタン */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? "送信中..." : "送信"}
            </button>
          </form>
        </div>
        <Footer />
      </main>
      
    </div>
  );
}
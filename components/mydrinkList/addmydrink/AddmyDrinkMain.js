"use client";

import { useState } from "react";
import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
import styles from "./AddmyDrinkMain.module.css";
import Footer from "@/components/footer/Footer";
export default function AddmyDrinkMain() {
  const { user, setUser, setNowScreen } = useDrink();

  // 入力フォーム用 State
  const [drinkName, setDrinkName] = useState("");
  const [drinkValue, setDrinkValue] = useState("");
  const [drinkCalorie, setDrinkCalorie] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!drinkName || !drinkValue) {
      alert("ドリンク名と容量を入力してください");
      return;
    }

    try {
      const payload = {
        userId: user?.userId || 1,
        drinkName: drinkName,
        drinkValue: Number(drinkValue),
        drinkCalorie: Number(drinkCalorie) || 0,
      };

      const response = await fetch("/api/drinking/mydrink", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const jsonData = await response.json();

      if (response.ok) {
        alert(jsonData.message || "マイドリンクを追加しました");
        // 最新のユーザー情報（更新された drinkInfo 含む）を Context に反映
        if (jsonData.user && setUser) {
          setUser(jsonData.user);
        }
        // 登録後に一覧画面などへ戻す場合
        if (setNowScreen) {
          setNowScreen("MYDRINKING");
        }
      } else {
        alert(jsonData.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error(error);
      alert("送信に失敗しました");
    }
  };

  return (
    <div className={styles.wrapper}>
      <main className={styles.stage}>
        <Header />

        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.formGroup}>
            {/* 1. 飲料名ボックス */}
            <div className={styles.nameBox}>
              <label htmlFor="add-drink-name" className={styles.boxLabel}>
                飲料名
              </label>
              <input
                id="add-drink-name"
                type="text"
                name="drinkName"
                value={drinkName}
                onChange={(e) => setDrinkName(e.target.value)}
                placeholder="例: マイボトルのお茶"
                className={styles.textInput}
                required
              />
            </div>

            {/* 2. 内容量ボックス */}
            <div className={styles.numberBox}>
              <label htmlFor="add-drink-value" className={styles.boxLabel}>
                内容量
              </label>
              <div className={styles.inputRow}>
                <input
                  id="add-drink-value"
                  type="number"
                  name="drinkValue"
                  min="1"
                  inputMode="numeric"
                  value={drinkValue}
                  onChange={(e) => setDrinkValue(e.target.value)}
                  placeholder="500"
                  className={styles.numberInput}
                  required
                />
                <span className={styles.unitText}>ml</span>
              </div>
            </div>

            {/* 3. 100mlごとのカロリーボックス */}
            <div className={styles.numberBox}>
              <label htmlFor="add-drink-calorie" className={styles.boxLabel}>
                100mlごとのカロリー
              </label>
              <div className={styles.inputRow}>
                <input
                  id="add-drink-calorie"
                  type="number"
                  name="drinkCalorie"
                  min="0"
                  inputMode="numeric"
                  value={drinkCalorie}
                  onChange={(e) => setDrinkCalorie(e.target.value)}
                  placeholder="0"
                  className={styles.numberInput}
                />
                <span className={styles.unitText}>kcal</span>
              </div>
            </div>

            {/* 4. 楕円形の追加ボタン */}
            <button type="submit" className={styles.submitButton}>
              追加
            </button>
          </form>
        </div>
        <Footer />
      </main>
    </div>
  );
}
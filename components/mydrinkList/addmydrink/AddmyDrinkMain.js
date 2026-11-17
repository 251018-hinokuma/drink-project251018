"use client";

import { useState } from "react";
import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
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
    <div>
      <Header/>
        <button onClick={() => setNowScreen("HOMEMAIN")}>
        ホーム
      </button>
      <h2>マイドリンク追加</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "12px" }}>
          <label>ドリンク名: </label>
          <input
            type="text"
            name="drinkName"
            value={drinkName}
            onChange={(e) => setDrinkName(e.target.value)}
            placeholder="例: マイボトルのお茶"
            required
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>水筒などの容量 (ml): </label>
          <input
            type="number"
            name="drinkValue"
            value={drinkValue}
            onChange={(e) => setDrinkValue(e.target.value)}
            placeholder="例: 500"
            required
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>100mLごとのカロリー (kcal): </label>
          <input
            type="number"
            name="drinkCalorie"
            value={drinkCalorie}
            onChange={(e) => setDrinkCalorie(e.target.value)}
            placeholder="例: 0"
          />
        </div>

        <button type="submit">追加</button>
      </form>
    </div>
  );
}
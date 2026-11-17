"use client";

import { useState } from "react";
import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
export default function NotPhotoMain() {
  const [customValue, setCustomValue] = useState(""); // 手入力用の State

  // ★ setUser と resetCount を Context から受け取るように追加
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

    if (!customValue || isNaN(Number(customValue))) {
      alert("飲んだ量を正しい数値で入力してください");
      return;
    }

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
        // 1. 最新のユーザー情報を Context に反映
        if (jsonData.user && setUser) {
          setUser(jsonData.user);
        }
        // 2. タイマーをリセット
        if (resetCount) {
          resetCount();
        }
        // 3. ホーム画面へ遷移
        setNowScreen("HOMEMAIN");

        alert(jsonData.message || "記録を追加しました");
        setCustomValue(""); // 入力欄をリセット
      } else {
        alert(jsonData.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("記録更新エラー:", error);
      alert("送信に失敗しました");
    }
  };

  return (
    <div>
      <Header/>
      <button onClick={() => setNowScreen("HOMEMAIN")}>ホーム</button>

      {/* ★ useMydrinkInfo?.drinkName とオプショナルチェイニングにして安全に表示 */}
      <div style={{ margin: "16px 0", fontWeight: "bold" }}>
        {useMydrinkInfo?.drinkName || "マイドリンク"}
      </div>

      <form onSubmit={handleSubmit}>
        <div>
          <label>手入力（飲んだ量）：</label>
          <input
            type="number"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="自分で飲んだ量を入力(ml)"
            style={{ width: "100%", padding: "8px", marginTop: "8px" }}
            required
          />
        </div>
        <button type="submit" style={{ marginTop: "16px" }}>
          送信
        </button>
      </form>
    </div>
  );
}
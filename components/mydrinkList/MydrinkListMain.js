"use client";

import { useDrink } from "@/context/DrinkContext";
import {useState} from "react";
import Header from "@/components/header/Header";
export default function MydrinkingListMain() {
  const { user,setUser, setNowScreen,useMydrinkId } = useDrink();


  const handleSubmit = async (drinkId) => {
    if (!confirm("このマイドリンクを削除しますか？")) return;
  
  try{
    const payload = {
        deleteuserId: user?.userId || 1,
        deletedrinkId: drinkId || 1,
      };
    const response = await fetch("/api//drinking/mydrink", {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        console.error("サーバーエラー詳細:", errorText);
        alert(`サーバーエラーが発生しました (${response.status})`);
        return;
      }

      const jsonData = await response.json();

      if (response.ok) {
        if (jsonData.user && setUser) {
          setUser(jsonData.user);
        }
        alert(jsonData.message || "記録を削除しました");
        if (setNowScreen) {
          setNowScreen("MYDRINKLIST");
        }
      } else {
        alert(jsonData.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("送信エラー:", error);
      alert("送信に失敗しました");
    } finally {
     
    }
  }

  // user が null (データ取得中など) の場合の保護
  if (!user) {
    return (
      <div className="p-4">
        <p>ユーザー情報を読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <Header/>
       <button onClick={() => setNowScreen("HOMEMAIN")}>
        ホーム
      </button>
      <h2>マイドリンク一覧</h2>

      <div>
        {/* オプショナルチェイニング user?.drinkInfo を使用し、三項演算子で分岐 */}
        {user?.drinkInfo && user.drinkInfo.length > 0 ? (
          user.drinkInfo.map((d) => {
            const isDrink=Number(d.drinkId)===Number(useMydrinkId)
            return(
            <div key={d.drinkId} style={{ border: "1px solid #ccc", margin: "8px 0", padding: "8px" }}>
              <div>ドリンク名: {d.drinkName}</div>
              <div>内容量: {d.drinkValue} ml</div>
              <div>カロリー: {d.drinkCalorie} kcal</div>
              <button
              onClick={()=>{
                handleSubmit(d.drinkId);

              }}>
                削除
              </button>
            </div>
          )})
        ) : (
          <p>登録されているマイドリンクはありません</p>
        )}
      </div>

      <div style={{ marginTop: "16px" }}>
        <button onClick={() => setNowScreen("ADDMYDRINKMAIN")}>追加</button>
      </div>
    </div>
  );
}
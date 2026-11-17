"use client";

import { useDrink } from "@/context/DrinkContext";
import { SearchDate } from "@/lib/functions";
import Header from "@/components/header/Header";

export default function RecordMain() {
  const { user, setNowScreen, setSearchDate } = useDrink();
  const datesObj = SearchDate(user);
  return (
    <div>
      <Header/>
       <button onClick={() => setNowScreen("HOMEMAIN")}>
        ホーム
      </button>
      <h2>日付別履歴</h2>
      <div>
        {Object.entries(datesObj).map(([dateStr, records]) => {
          return (
            <div
              key={dateStr}
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                margin: "8px 0",
              }}
            >
              <p>
                {dateStr} 件数: {records.length}件
              </p>
              <button
                onClick={() => {
                  setSearchDate(dateStr); // ★ 選択した日付 (例: "2026-10-23") を Context に保存
                  setNowScreen("RECORDDATE"); // ★ 詳細画面へ遷移
                }}
              >
                詳細を見る
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
"use client";

import { useDrink } from "@/context/DrinkContext";
import { searchDrinkDate, sortSearchDrinkDate } from "@/lib/functions";
import Header from "@/components/header/Header";
export default function RecordDateInfoMain() {
  const { user, searchDate,setNowScreen } = useDrink(); // ★ Context から searchDate を取得

  const searchDrinkInfo = searchDrinkDate(user, searchDate);
  const searchDrinkInfoList = sortSearchDrinkDate(searchDrinkInfo);

  return (
    <div>
      <Header/>
       <button onClick={() => setNowScreen("HOMEMAIN")}>
        ホーム
      </button>
      <h2>{searchDate} の記録一覧</h2>

      <div>
        {searchDrinkInfoList && searchDrinkInfoList.length > 0 ? (
          searchDrinkInfoList.map((list) => {
            const timeStr = new Date(list.drinkDate).toLocaleTimeString(
              "ja-JP",
              { hour: "2-digit", minute: "2-digit" }
            );

            return (
              <div
                key={list.drinkRecordId || list._id}
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  margin: "8px 0",
                }}
              >
                <p>時間: {timeStr}</p>
                <p>飲み物名: {list.drinkName}</p>
                <p>量: {list.drinkValue} ml</p>
                <p>カロリー: {list.drinkCalorie} kcal</p>
              </div>
            );
          })
        ) : (
          <p>この日の記録はありません。</p>
        )}
      </div>
    </div>
  );
}
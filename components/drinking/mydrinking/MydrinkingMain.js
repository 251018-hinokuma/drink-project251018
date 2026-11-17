"use client";

import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
export default function MydrinkingMain() {
  const {
    user,
    setNowScreen,
    setUseMydrinkInfo,
    useMydrinkId,
    setUseMydrinkId,
    setUseMydrink,
  } = useDrink();

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
      <button onClick={() => setNowScreen("HOMEMAIN")}>ホーム</button>
      <h2>マイドリンク一覧</h2>

      <div>
        {user?.drinkInfo && user.drinkInfo.length > 0 ? (
          user.drinkInfo.map((d) => {
            // ★ ObjectId(文字列) でも安全に比較できるように String() で統一
            const currentId = d.drinkId || d._id;
            const isDrink =
              useMydrinkId && String(currentId) === String(useMydrinkId);

            return (
              <div
                key={currentId}
                style={{
                  border: isDrink ? "2px solid #0070f3" : "1px solid #ccc",
                  backgroundColor: isDrink ? "#f0f7ff" : "transparent",
                  margin: "8px 0",
                  padding: "8px",
                  borderRadius: "4px",
                }}
              >
                <div>ドリンク名: {d.drinkName}</div>
                <div>内容量: {d.drinkValue} ml</div>
                <div>カロリー: {d.drinkCalorie} kcal</div>
                <button
                  onClick={() => {
                    setUseMydrinkInfo(d);
                    setUseMydrinkId(currentId);
                    if (setUseMydrink) setUseMydrink(true);
                    alert(`${d.drinkName} を選択しました`);
                  }}
                  disabled={isDrink}
                >
                  {isDrink ? "選択中" : "選択"}
                </button>
              </div>
            );
          })
        ) : (
          <p>登録されているマイドリンクはありません</p>
        )}
      </div>

      <div style={{ marginTop: "16px" }}>
        <button onClick={() => setNowScreen("ADDMYDRINKMAIN")}>
          マイドリンクを追加
        </button>
        <button
          onClick={() => setNowScreen("NOTPHOTOMAIN")}
          style={{ marginLeft: "8px" }}
        >
          手入力
        </button>
        <button
          onClick={() => setNowScreen("PHOTOMAIN")}
          style={{ marginLeft: "8px" }}
        >
          写真入力
        </button>
      </div>
    </div>
  );
}
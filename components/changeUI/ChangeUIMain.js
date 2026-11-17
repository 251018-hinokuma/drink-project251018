"use client";

import { useDrink } from "@/context/DrinkContext";
import { getuseUI } from "@/lib/functions";
import Header from "@/components/header/Header";
export default function ChangeUIMain() {
  const { user, UI, updateUser, setNowScreen } = useDrink();

  // 1. user ロード前の保護
  if (!user) {
    return <div>読み込み中...</div>;
  }

  const useUI = getuseUI(UI, user?.userUI);

  return (
    <div>
      <Header/>
      <button onClick={() => setNowScreen("HOMEMAIN")}>ホーム</button>
      <h2>外見設定</h2>
      <div>
        {UI.map((uis) => {
          // 2. UIId / UIid の表記揺れに対応した ID 取得
          const targetId = uis.UIId ?? uis.UIid;

          // 3. 数値/文字列の型を揃えて比較
          const isSelected = Number(targetId) === Number(user?.userUI);

          return (
            <div key={targetId ?? uis._id}>
              <p>{uis.UIName}</p>
              <button
                onClick={() => {
                  if (!targetId) return;

                  // ★ uis.UIId ではなく targetId をセット
                  updateUser({
                    ...user,
                    userUI: targetId,
                  });
                  alert(`${uis.UIName} を選択しました`);
                }}
              >
                {isSelected ? "選択中" : "選択"}
              </button>
            </div>
          );
        })}
      </div>
      {/* 4. useUI が null の場合でもクラッシュしないようオプショナルチェイニングを適用 */}
      <p>現在の外見: {useUI?.UIName || "未設定"}</p>
    </div>
  );
}
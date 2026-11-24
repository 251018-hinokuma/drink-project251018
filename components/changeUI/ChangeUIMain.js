"use client";

import { useDrink } from "@/context/DrinkContext";
import { getuseUI } from "@/lib/functions";
import Header from "@/components/header/Header";
import styles from "./ChangeUIMain.module.css";
import Footer from "@/components/Footer";
export default function ChangeUIMain() {
  const { user, UI, updateUser } = useDrink();

  // 1. user ロード前の保護
  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>読み込み中...</div>
      </div>
    );
  }

  const useUI = getuseUI(UI, user?.userUI);

  const handleSelectUI = (uis, targetId, isSelected) => {
    if (!targetId || isSelected) return;

    updateUser({
      ...user,
      userUI: targetId,
    });
    alert(`${uis.UIName} を選択しました`);
  };

  return (
    <div className={styles.wrapper}>
      <main className={styles.stage}>
        <Header />

        <div className={styles.content}>
          <div className={styles.panelGroup}>
            {/* 上段：現在のUI表示ボックス */}
            <div className={styles.currentUiBox}>
              現在のUI：{useUI?.UIName || "未設定"}
            </div>

            {/* 下段：UI選択カードの横スクロール枠 */}
            <section className={styles.carouselBox} aria-label="外見設定一覧">
              {UI && UI.length > 0 ? (
                <div className={styles.cardList}>
                  {UI.map((uis) => {
                    // 2. UIId / UIid の表記揺れに対応した ID 取得
                    const targetId = uis.UIId ?? uis.UIid;

                    // 3. 数値/文字列の型を揃えて比較
                    const isSelected =
                      Number(targetId) === Number(user?.userUI);

                    return (
                      <div
                        key={targetId ?? uis._id}
                        className={`${styles.uiCard} ${
                          isSelected ? styles.uiCardSelected : ""
                        }`}
                      >
                        <div className={styles.uiNameCell}>{uis.UIName}</div>
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectUI(uis, targetId, isSelected)
                          }
                          disabled={isSelected}
                          className={`${styles.selectButtonCell} ${
                            isSelected ? styles.selectButtonCellSelected : ""
                          }`}
                        >
                          {isSelected ? "選択中" : "選択"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  選択可能なUIがありません
                </div>
              )}
            </section>
          </div>
        </div>
        <Footer />
      </main>
      
    </div>
  );
}
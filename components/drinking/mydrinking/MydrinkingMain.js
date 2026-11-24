"use client";

import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
import styles from "./MydrinkingMain.module.css";
import Footer from "@/components/footer/Footer";
export default function MydrinkingMain() {
  const {
    user,
    setNowScreen,
    setUseMydrinkInfo,
    useMydrinkId,
    setUseMydrinkId,
    setUseMydrink,
  } = useDrink();

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>ユーザー情報を読み込み中...</div>
      </div>
    );
  }

  const handleSelectDrink = (drink, currentId) => {
    setUseMydrinkInfo(drink);
    setUseMydrinkId(currentId);
    if (setUseMydrink) setUseMydrink(true);
    alert(`${drink.drinkName} を選択しました`);
  };

  return (
    <div className={styles.wrapper}>
      <main className={styles.stage}>
        <Header />

        <div className={styles.content}>
          <div className={styles.panelGroup}>
            {/* マイドリンク一覧枠 */}
            <section className={styles.carouselBox} aria-label="マイドリンク一覧">
              {/* 左上角の「＋」マイドリンク追加ボタン */}
              <button
                type="button"
                className={styles.addButton}
                onClick={() => setNowScreen("ADDMYDRINKMAIN")}
                aria-label="マイドリンクを追加する"
                title="マイドリンクを追加する"
              >
                +
              </button>

              {/* 横スクロールカードリスト */}
              {user?.drinkInfo && user.drinkInfo.length > 0 ? (
                <div className={styles.cardList}>
                  {user.drinkInfo.map((d) => {
                    const currentId = d.drinkId || d._id;
                    const isSelected =
                      useMydrinkId && String(currentId) === String(useMydrinkId);

                    return (
                      <button
                        type="button"
                        key={currentId}
                        onClick={() => handleSelectDrink(d, currentId)}
                        className={`${styles.drinkCard} ${
                          isSelected ? styles.drinkCardSelected : ""
                        }`}
                      >
                        <div className={styles.drinkName}>{d.drinkName}</div>
                        <div className={styles.drinkSpecs}>
                          <span className={styles.drinkvalue}>容量　　{d.drinkValue} ml</span>
                          <span className={styles.drinkcalorie}>カロリー　{d.drinkCalorie} kcal</span>
                        </div>
                        <span
                          className={`${styles.statusBadge} ${
                            isSelected ? styles.statusBadgeSelected : ""
                          }`}
                        >
                          {isSelected ? "選択中" : "選択"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>登録されているマイドリンクはありません</p>
                  <span>左上の「+」から追加できます</span>
                </div>
              )}
            </section>

            {/* 下部2分割ボタン：手動入力 / 写真入力 */}
            <div className={styles.inputModeRow}>
              <button
                type="button"
                className={styles.modeButton}
                onClick={() => setNowScreen("NOTPHOTOMAIN")}
              >
                手動入力
              </button>
              <button
                type="button"
                className={styles.modeButton}
                onClick={() => setNowScreen("PHOTOMAIN")}
              >
                写真入力
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
      
    </div>
  );
}
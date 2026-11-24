"use client";

import { useDrink } from "@/context/DrinkContext";
import { searchDrinkDate, sortSearchDrinkDate } from "@/lib/functions";
import Header from "@/components/header/Header";
import styles from "./RecordDateInfoMain.module.css";
import Footer from "@/components/footer/Footer";
export default function RecordDateInfoMain() {
  const { user, searchDate } = useDrink();

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>ユーザー情報を読み込み中...</div>
      </div>
    );
  }

  const searchDrinkInfo = searchDrinkDate(user, searchDate);
  const searchDrinkInfoList = sortSearchDrinkDate(searchDrinkInfo);

  // "2026-10-23" を "2026/10/23" 表記に整形
  const formattedDate = searchDate
    ? String(searchDate).replace(/-/g, "/")
    : "日付未選択";

  return (
    <div className={styles.wrapper}>
      <main className={styles.stage}>
        <Header />

        <div className={styles.content}>
          <section className={styles.recordBox} aria-label="日別記録詳細">
            {/* 上段：日付ヘッダー */}
            <div className={styles.dateHeader}>{formattedDate}</div>

            {/* 中段：縦4段カードの横スクロールリスト（下部にスクロールバー） */}
            {searchDrinkInfoList && searchDrinkInfoList.length > 0 ? (
              <div className={styles.cardList}>
                {searchDrinkInfoList.map((list) => {
                  const timeStr = new Date(list.drinkDate).toLocaleTimeString(
                    "ja-JP",
                    { hour: "2-digit", minute: "2-digit" }
                  );

                  return (
                    <article
                      key={list.drinkRecordId || list._id}
                      className={styles.recordCard}
                    >
                      <div className={styles.cardCell}>{timeStr}</div>
                      <div
                        className={`${styles.cardCell} ${styles.drinkNameCell}`}
                      >
                        {list.drinkName}
                      </div>
                      <div className={styles.cardCell}>{list.drinkValue} ml</div>
                      <div className={styles.cardCell}>
                        {list.drinkCalorie} kcal
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                この日の記録はありません。
              </div>
            )}
          </section>
        </div>
        <Footer />
      </main>
    </div>
  );
}
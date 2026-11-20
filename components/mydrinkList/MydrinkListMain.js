"use client";

import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
import styles from "./MydrinkingListMain.module.css";

export default function MydrinkingListMain() {
  const { user, setUser, setNowScreen, useMydrinkId } = useDrink();

  const handleSubmit = async (drinkId) => {
    if (!confirm("このマイドリンクを削除しますか？")) return;

    try {
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
  };

  // user が null (データ取得中など) の場合の保護
  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>ユーザー情報を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.stage}>
        <Header />

        <div className={styles.content}>
          <div className={styles.panelGroup}>
            {/* マイドリンク一覧枠 */}
            <section className={styles.carouselBox} aria-label="マイドリンク一覧">
              {/* 左上角の「＋」追加ボタン */}
              <button
                type="button"
                className={styles.addButton}
                onClick={() => setNowScreen("ADDMYDRINKMAIN")}
                aria-label="マイドリンクを追加"
                title="マイドリンクを追加"
              >
                +
              </button>

              {/* 横スクロールカードリスト */}
              {user?.drinkInfo && user.drinkInfo.length > 0 ? (
                <div className={styles.cardList}>
                  {user.drinkInfo.map((d) => {
                    const isDrink = Number(d.drinkId) === Number(useMydrinkId);
                    return (
                      <div
                        key={d.drinkId}
                        className={`${styles.drinkCard} ${
                          isDrink ? styles.drinkCardActive : ""
                        }`}
                      >
                        <div className={styles.drinkName}>{d.drinkName}</div>
                        <div className={styles.drinkSpecs}>
                          <span>{d.drinkValue} ml</span>
                          <span>{d.drinkCalorie} kcal</span>
                        </div>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => {
                            handleSubmit(d.drinkId);
                          }}
                        >
                          削除
                        </button>
                      </div>
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
          </div>
        </div>
      </main>
    </div>
  );
}
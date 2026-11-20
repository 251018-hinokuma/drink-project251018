"use client";

import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
import styles from "./DrinkingMain.module.css";

export default function DrinkingMain() {
  const { setUseMydrink, setNowScreen } = useDrink();

  return (
    <div className={styles.wrapper}>
      <main className={styles.stage}>
        <Header />

        <div className={styles.content}>
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.selectButton}
              onClick={() => {
                setUseMydrink(false);
                setNowScreen("PHOTOMAIN");
              }}
            >
              市販飲料
            </button>

            <button
              type="button"
              className={styles.selectButton}
              onClick={() => {
                setUseMydrink(true);
                setNowScreen("MYDRINKING");
              }}
            >
              マイドリンク
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
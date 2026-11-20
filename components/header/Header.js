"use client";

import { useDrink } from "@/context/DrinkContext";
import { useEffect, useState } from "react";
import styles from "./Header.module.css";

const SCREEN_TITLES = {
  DRINKING: "水分補給",
  NOTPHOTOMAIN: "ドリンク選択",
  PHOTOMAIN: "写真で記録",
  MYDRINKING: "マイドリンク補給",
  RECORD: "記録",
  RECORDDATE: "記録詳細",
  SETTING: "設定",
  MYDRINKLIST: "マイドリンク",
  ADDMYDRINKMAIN: "マイドリンク追加",
  CHANGEUI: "UI変更",
};

export default function Header() {
  const { nowScreen, setNowScreen } = useDrink();
  const [deforeScreen, setDeforeScreen] = useState("HOMEMAIN");

  useEffect(() => {
    switch (nowScreen) {
      case "HOMEMAIN":
        setDeforeScreen("");
        break;
      case "DRINKING":
        setDeforeScreen("HOMEMAIN");
        break;
      case "NOTPHOTOMAIN":
        setDeforeScreen("MYDRINKING");
        break;
      case "PHOTOMAIN":
        setDeforeScreen("DRINKING");
        break;
      case "MYDRINKING":
        setDeforeScreen("DRINKING");
        break;
      case "RECORD":
        setDeforeScreen("HOMEMAIN");
        break;
      case "RECORDDATE":
        setDeforeScreen("RECORD");
        break;
      case "SETTING":
        setDeforeScreen("HOMEMAIN");
        break;
      case "MYDRINKLIST":
        setDeforeScreen("HOMEMAIN");
        break;
      case "ADDMYDRINKMAIN":
        setDeforeScreen("MYDRINKLIST");
        break;
      case "CHANGEUI":
        setDeforeScreen("HOMEMAIN");
        break;
      default:
        setDeforeScreen("HOMEMAIN");
        break;
    }
  }, [nowScreen]);

  // ホーム画面ではヘッダーを表示しない
  if (!nowScreen || nowScreen === "HOMEMAIN") {
    return null;
  }

  const pageTitle = SCREEN_TITLES[nowScreen] || "ページ名";

  return (
    <header className={styles.headerContainer}>
      <nav className={styles.headerBox} aria-label="画面ナビゲーション">
        {/* 左：ホームに戻る（家アイコン） */}
        <button
          type="button"
          onClick={() => setNowScreen("HOMEMAIN")}
          className={styles.iconButton}
          aria-label="ホームへ戻る"
          title="ホームへ戻る"
        >
          <svg
            viewBox="0 0 24 24"
            className={styles.iconSvg}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5 9.5V20h14V9.5" />
            <path d="M9.5 20v-6h5v6" />
          </svg>
        </button>

        {/* 中央：1つ前の画面に戻る（Uターン矢印） */}
        <button
          type="button"
          onClick={() => {
            if (deforeScreen) {
              setNowScreen(deforeScreen);
            }
          }}
          className={styles.iconButton}
          aria-label="前の画面へ戻る"
          title="前の画面へ戻る"
        >
          <svg
            viewBox="0 0 24 24"
            className={styles.iconSvg}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>

        {/* 右：現在のページ名 */}
        <div className={styles.pageTitleBox}>{pageTitle}</div>
      </nav>
    </header>
  );
}
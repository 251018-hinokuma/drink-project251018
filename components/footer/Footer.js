"use client";

import { useDrink } from "@/context/DrinkContext";
import { getuseUI } from "@/lib/functions";
import styles from "./Footer.module.css";

function isImageSource(value) {
  if (typeof value !== "string") return false;
  return (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image")
  );
}

export default function Footer() {
  const { user, nowScreen, setNowScreen, UI } = useDrink();
  const useUI = user && UI ? getuseUI(UI, user.userUI) : null;

  const navItems = [
    {
      key: "MYDRINKLIST",
      label: "マイドリンク",
      iconSrc: useUI?.MyDrinkUI,
      extraClass: styles.bottleItem,
    },
    {
      key: "RECORD",
      label: "記録",
      iconSrc: useUI?.RecordUI,
      extraClass: styles.bookItem,
    },
    {
      key: "HOME",
      label: "ホーム",
      iconSrc: null,
      extraClass: styles.homeItem,
    },
    {
      key: "SETTING",
      label: "設定",
      iconSrc: useUI?.SettingUI,
      extraClass: styles.gearItem,
    },
    {
      key: "CHANGEUI",
      label: "UI",
      iconSrc: useUI?.UiUI,
      extraClass: styles.frameItem,
    },
  ];

  return (
    <footer className={styles.footerBar} aria-label="フッターメニュー">
      {navItems.map((item) => {
        const isActive = nowScreen === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setNowScreen(item.key)}
            className={`${styles.navButton} ${item.extraClass} ${
              isActive ? styles.active : ""
            }`}
          >
            {isImageSource(item.iconSrc) && (
              <img
                src={item.iconSrc}
                alt=""
                aria-hidden="true"
                className={styles.bgIcon}
              />
            )}
            <span className={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </footer>
  );
}
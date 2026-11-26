"use client";

import { useState, useEffect } from "react";
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

/* JPGなどの白背景を自動透過して表示するコンポーネント */
function TransparentImage({ src, alt = "", className, ...props }) {
  const [processedSrc, setProcessedSrc] = useState(src);

  useEffect(() => {
    if (!src) return;
    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
          if (minChannel >= 242) {
            data[i + 3] = 0;
          } else if (minChannel >= 220) {
            const ratio = (242 - minChannel) / 22;
            data[i + 3] = Math.round(data[i + 3] * ratio);
          }
        }
        ctx.putImageData(imageData, 0, 0);
        if (!isCancelled) {
          setProcessedSrc(canvas.toDataURL("image/png"));
        }
      } catch {
        if (!isCancelled) setProcessedSrc(src);
      }
    };
    img.src = src;
    return () => {
      isCancelled = true;
    };
  }, [src]);

  return <img src={processedSrc} alt={alt} className={className} {...props} />;
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
              <TransparentImage
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
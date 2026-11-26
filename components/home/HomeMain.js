"use client";

import { useState, useEffect } from "react";
import { useDrink } from "@/context/DrinkContext";
import { getuseUI } from "@/lib/functions";
import flowerStyles from "./HomeFlower.module.css";
import aquariumStyles from "./HomeAquarium.module.css";
import Footer from "@/components/footer/Footer";

const THEME_STYLES = {
  1: flowerStyles,
  2: aquariumStyles,
};

const DEBUG_WEATHERS = [
  "快晴",
  "晴れ",
  "曇り",
  "霧",
  "雨",
  "雪",
  "にわか雨",
  "雷雨",
];

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
function TransparentImage({ src, alt, className }) {
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

  return <img src={processedSrc} alt={alt} className={className} />;
}

function UIAsset({ src, alt, fallbackText, className, imgClassName }) {
  if (isImageSource(src)) {
    return (
      <TransparentImage
        src={src}
        alt={alt}
        className={imgClassName || className}
      />
    );
  }
  return <span className={className}>{src || fallbackText}</span>;
}

export default function HomeMain() {
  const {
    user,
    setNowScreen,
    timerCount,
    calculatedTimer,
    userProgress,
    weatherData,
    address,
    UI,
    loading,
  } = useDrink();

  const [now, setNow] = useState(() => new Date());
  const [debugWeather, setDebugWeather] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !user) {
    return (
      <div className={flowerStyles.loadingScreen}>
        ユーザー情報を読み込み中...
      </div>
    );
  }

  const useUI = getuseUI(UI, user.userUI);

  if (!useUI) {
    return (
      <div className={flowerStyles.loadingScreen}>
        UI設定を読み込み中...
      </div>
    );
  }

  const isAquarium = Number(useUI.UIId) === 2;
  const styles = THEME_STYLES[Number(useUI.UIId)] || flowerStyles;

  // --- 1. 現在時刻と昼夜・太陽/月の位置計算 ---
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  const isDay = hours >= 6 && hours < 18;
  const cycleHours = isDay
    ? hours - 6 + minutes / 60
    : (hours >= 18 ? hours - 18 : hours + 6) + minutes / 60;
  const cycleRatio = Math.min(1, Math.max(0, cycleHours / 12));

  const celestialLeft = 18 + cycleRatio * 64;
  const celestialTop = -75 + Math.pow((cycleRatio - 0.5) * 2, 2) * 35;

  // --- 2. 天気に応じたUIパーツ取得 ---
  const getWeatherAsset = (weather) => {
    switch (weather) {
      case "快晴":
        return useUI.WeatherUI_0;
      case "晴れ":
        return useUI.WeatherUI_1;
      case "曇り":
        return useUI.WeatherUI_2;
      case "霧":
        return useUI.WeatherUI_3;
      case "雨":
        return useUI.WeatherUI_4;
      case "雪":
        return useUI.WeatherUI_5;
      case "にわか雨":
        return useUI.WeatherUI_6;
      case "雷雨":
        return useUI.WeatherUI_7;
      default:
        return useUI.WeatherUI_1;
    }
  };

  const currentWeather = debugWeather ?? weatherData?.weather ?? "";
  const weatherAsset = getWeatherAsset(currentWeather);
  const isClearSky = currentWeather === "快晴";
  const isSunny = currentWeather === "晴れ";
  const isFog = currentWeather === "霧";
  const hasWeatherVisual = Boolean(currentWeather) && !isClearSky && !isSunny;
  const isRaining = ["雨", "にわか雨", "雷雨"].includes(currentWeather);
  const isSnowing = currentWeather === "雪";

  // --- 3. 進捗段階に応じたメインUIと水の濁りレベル（0〜4） ---
  const progressAssets = [
    useUI.ProgressUI_0,
    useUI.ProgressUI_1,
    useUI.ProgressUI_2,
    useUI.ProgressUI_3,
    useUI.ProgressUI_4,
  ];
  const progressLevelClasses = [
    styles.progress0,
    styles.progress1,
    styles.progress2,
    styles.progress3,
    styles.progress4,
  ];

  const safeProgressIndex = Math.min(4, Math.max(0, Number(userProgress) || 0));
  const currentFlowerAsset = progressAssets[safeProgressIndex];
  const currentProgressClass = progressLevelClasses[safeProgressIndex] || "";
  const isWilted = safeProgressIndex >= 3;

  // --- 4. タイマーの％計算 ---
  const timerPercent =
    calculatedTimer > 0
      ? Math.min(100, Math.max(0, Math.round((timerCount / calculatedTimer) * 100)))
      : 0;

  const stageBackgroundStyle = isImageSource(useUI.StageUI)
    ? { backgroundImage: `url(${useUI.StageUI})` }
    : undefined;

  return (
    <div className={styles.wrapper}>
      <main
        className={`${styles.stage} ${isDay ? styles.daySky : styles.nightSky} ${currentProgressClass}`}
        style={stageBackgroundStyle}
      >
        {/* 水槽用：背景専用の水濁りレイヤー（文字やキャラの後ろに配置） */}
        <div className={styles.waterBackOverlay} aria-hidden="true" />

        {/* 水槽用：下から上へ昇る気泡アニメーション */}
        {isAquarium && (
          <div className={styles.aquariumBubbles} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        )}

        {/* 最上部固定バー：左（ユーザー名）・中央（現在地）・右（タイマー稼働時間） */}
        <header className={styles.topHeaderBar}>
          <div className={styles.topUserName}>{user.userName}</div>

          <div className={styles.topLocationBadge}>
            {address?.state || address?.city
              ? `${address.state || ""}${address.city || ""}`
              : "現在地取得中..."}
          </div>

          <div className={styles.topTimerRange}>
            {user?.userStartTimer && user?.userEndTimer
              ? `${String(new Date(user.userStartTimer).getHours()).padStart(2, "0")}:${String(
                  new Date(user.userStartTimer).getMinutes()
                ).padStart(2, "0")} ~ ${String(
                  new Date(user.userEndTimer).getHours()
                ).padStart(2, "0")}:${String(
                  new Date(user.userEndTimer).getMinutes()
                ).padStart(2, "0")}`
              : "時間未設定"}
          </div>
        </header>

        {/* レイヤー1（一番下）：昼なら太陽 / 夜なら月 */}
        <div
          className={`${styles.celestialBody} ${isDay ? styles.sunBody : styles.moonBody}`}
          style={{
            left: `${celestialLeft}%`,
            top: `${celestialTop}px`,
          }}
        >
          <UIAsset
            src={isDay ? useUI.DayUI : useUI.NightUI}
            alt={isDay ? "太陽" : "月"}
            fallbackText=""
            imgClassName={styles.celestialBgImg}
          />
        </div>

        {/* 快晴時のみ：太陽の周囲・下方向へ光が降り注ぐ演出 */}
        {isClearSky && isDay && (
          <div
            className={styles.sunRaysOverlay}
            style={{
              left: `${celestialLeft}%`,
              top: `${celestialTop}px`,
            }}
            aria-hidden="true"
          >
            <span className={styles.rayLeft} />
            <span className={styles.rayBottomLeft} />
            <span className={styles.rayBottom} />
            <span className={styles.rayBottomRight} />
            <span className={styles.rayRight} />
          </div>
        )}

        {/* レイヤー2（真ん中）：晴れ・快晴以外の天気画像（太陽を覆う位置・サイズ） */}
        {/* レイヤー2（真ん中）：晴れ・快晴以外の天気画像（画面横幅いっぱい） */}
        {hasWeatherVisual && (
          <div
            className={`${styles.weatherZone} ${isFog ? styles.fogWeather : ""}`}
          >
            <div className={styles.cloudBox}>
              <UIAsset
                src={weatherAsset}
                alt={currentWeather}
                fallbackText={currentWeather}
                className={styles.cloudFallback}
                imgClassName={styles.weatherImg}
              />
            </div>

            
          </div>
        )}

        {/* レイヤー3（一番上）：時刻・温度・湿度（雲より上のレイヤー） */}
        <div
          className={styles.celestialInfoWrapper}
          style={{
            left: `${celestialLeft}%`,
            top: `${celestialTop}px`,
          }}
        >
          <div className={styles.celestialInfo}>
            <div className={styles.clockText}>{formattedTime}</div>
            <div className={styles.weatherMetrics}>
              <div>
                温度 {weatherData?.temperature != null ? `${weatherData.temperature}°C` : "--°C"}
              </div>
              <div>
                湿度 {weatherData?.humidity != null ? `${weatherData.humidity}%` : "--%"}
              </div>
            </div>
          </div>
        </div>

        {/* 左中段：時計回り％ゲージ付きタイマー */}
        <div className={styles.timerZone}>
          <div
            className={styles.timerRing}
            style={{ "--timer-deg": `${timerPercent * 3.6}deg` }}
          >
            <div className={styles.timerInner}>
              <UIAsset
                src={useUI.TimerUI}
                alt="タイマー"
                fallbackText="タイマー"
                className={styles.timerLabel}
                imgClassName={styles.timerIconImg}
              />
              <span className={styles.timerPercent}>{timerPercent}%</span>
            </div>
          </div>
          <span className={styles.timerSubText}>
            {timerCount}/{calculatedTimer}秒
          </span>
        </div>

        {/* 中央：メインキャラクター（花 / 水槽の魚） */}
        <div className={styles.centerFlowerZone}>
          <div
            className={`${styles.flowerWrapper} ${
              isWilted ? styles.flowerWilted : styles.flowerHealthy
            }`}
          >
            <UIAsset
              src={currentFlowerAsset}
              alt={`状態段階 ${safeProgressIndex}`}
              fallbackText={`${useUI.UIName || "UI"} ${safeProgressIndex + 1}段階`}
              className={styles.flowerFallback}
              imgClassName={styles.flowerImg}
            />
          </div>

          <div className={styles.stemLine} aria-hidden="true" />
        </div>

        {/* 下部中央：水分補給ボタン（花テーマ時のみ葉っぱを表示） */}
        <div className={styles.bottomWateringZone}>
          {Number(useUI.UIId) === 1 && (
            <>
              <div className={styles.leafLeft} aria-hidden="true" />
              <div className={styles.leafRight} aria-hidden="true" />
            </>
          )}
          <button
            type="button"
            onClick={() => setNowScreen("DRINKING")}
            className={styles.wateringButton}
          >
            {isImageSource(useUI.DrinkingUI) ? (
              <>
                <TransparentImage
                  src={useUI.DrinkingUI}
                  alt=""
                  aria-hidden="true"
                  className={styles.wateringIconImg}
                />
                <span className={styles.wateringLabel}>水分補給</span>
              </>
            ) : (
              <span className={styles.wateringFallbackText}>
                {useUI.DrinkingUI || "水分補給"}
              </span>
            )}
          </button>
        </div>

        {/* 天気デバッグパネル（右上に常時表示） */}
        <div
          style={{
            position: "fixed",
            top: "12px",
            right: "12px",
            zIndex: 9999,
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            maxWidth: "240px",
            padding: "6px",
            borderRadius: "8px",
            background: "rgba(0, 0, 0, 0.72)",
            color: "#fff",
            fontSize: "11px",
          }}
        >
          {DEBUG_WEATHERS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDebugWeather(w)}
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontSize: "11px",
                background: currentWeather === w ? "#facc15" : "#374151",
                color: currentWeather === w ? "#111827" : "#fff",
                fontWeight: currentWeather === w ? "bold" : "normal",
              }}
            >
              {w}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDebugWeather(null)}
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              fontSize: "11px",
              background: debugWeather === null ? "#2563eb" : "#4b5563",
              color: "#fff",
            }}
          >
            解除
          </button>
        </div>

        <Footer />
      </main>
    </div>
  );
}
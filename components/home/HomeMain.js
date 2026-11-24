"use client";

import { useState, useEffect } from "react";
import { useDrink } from "@/context/DrinkContext";
import { getuseUI } from "@/lib/functions";
import flowerStyles from "./HomeFlower.module.css";
import aquariumStyles from "./HomeAquarium.module.css";

const THEME_STYLES = {
  1: flowerStyles,
  2: aquariumStyles,
};

function isImageSource(value) {
  if (typeof value !== "string") return false;
  return (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image")
  );
}

function UIAsset({ src, alt, fallbackText, className, imgClassName }) {
  if (isImageSource(src)) {
    return <img src={src} alt={alt} className={imgClassName || className} />;
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
      case "にわか雨":
        return useUI.WeatherUI_4;
      case "雨":
        return useUI.WeatherUI_5;
      case "雷雨":
        return useUI.WeatherUI_6;
      case "雪":
        return useUI.WeatherUI_7;
      default:
        return useUI.WeatherUI_1;
    }
  };

  const currentWeather = weatherData?.weather || "";
  const weatherAsset = getWeatherAsset(currentWeather);
  const isRaining = ["雨", "にわか雨", "雷雨"].includes(currentWeather);
  const isSnowing = currentWeather === "雪";
  const isClearSky = currentWeather === "快晴";

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

        {/* 昼なら太陽 / 夜なら月 */}
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

        {/* 左上：天気（雲・雨・雪） */}
        <div className={styles.weatherZone}>
          {!isClearSky && (
            <div className={styles.cloudBox}>
              <UIAsset
                src={weatherAsset}
                alt={currentWeather || "天気"}
                fallbackText={`☁ ${currentWeather || "天気取得中"}`}
                className={styles.cloudFallback}
                imgClassName={styles.weatherImg}
              />
            </div>
          )}

          {isClearSky && (
            <div className={styles.clearBadge}>
              <UIAsset
                src={weatherAsset}
                alt="快晴"
                fallbackText="☀ 快晴"
                className={styles.clearFallback}
                imgClassName={styles.weatherImg}
              />
            </div>
          )}

          {isRaining && (
            <div className={styles.precipitation} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
          {isSnowing && (
            <div className={styles.snowfall} aria-hidden="true">
              <span>❄</span>
              <span>❄</span>
              <span>❄</span>
            </div>
          )}
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

        {/* 右側：縦並びメニューバー */}
        <nav className={styles.rightMenuBar} aria-label="メインメニュー">
          <button
            type="button"
            onClick={() => setNowScreen("MYDRINKLIST")}
            className={`${styles.menuButton} ${styles.bottleShape}`}
          >
            <UIAsset
              src={useUI.MyDrinkUI}
              alt="マイドリンク"
              fallbackText="マイドリンク"
              className={styles.menuFallbackText}
              imgClassName={styles.menuIconImg}
            />
          </button>

          <button
            type="button"
            onClick={() => setNowScreen("RECORD")}
            className={`${styles.menuButton} ${styles.bookShape}`}
          >
            <UIAsset
              src={useUI.RecordUI}
              alt="記録"
              fallbackText="記録"
              className={styles.menuFallbackText}
              imgClassName={styles.menuIconImg}
            />
          </button>

          <button
            type="button"
            onClick={() => setNowScreen("SETTING")}
            className={`${styles.menuButton} ${styles.gearShape}`}
          >
            <UIAsset
              src={useUI.SettingUI}
              alt="設定"
              fallbackText="設定"
              className={styles.menuFallbackText}
              imgClassName={styles.menuIconImg}
            />
          </button>

          <button
            type="button"
            onClick={() => setNowScreen("CHANGEUI")}
            className={`${styles.menuButton} ${styles.uiPictureShape}`}
          >
            <UIAsset
              src={useUI.UiUI}
              alt="UI変更"
              fallbackText="UI"
              className={styles.menuFallbackText}
              imgClassName={styles.menuIconImg}
            />
          </button>
        </nav>

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
            <UIAsset
              src={useUI.DrinkingUI}
              alt="水分補給"
              fallbackText="水分補給"
              className={styles.wateringFallbackText}
              imgClassName={styles.wateringIconImg}
            />
          </button>
        </div>
      </main>
    </div>
  );
}
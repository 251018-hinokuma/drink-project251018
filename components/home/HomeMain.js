"use client";

import { useState, useEffect } from "react";
import { useDrink } from "@/context/DrinkContext";
import { getuseUI } from "@/lib/functions";
import styles from "./HomeMain.module.css";

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
    resetCount,
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
    return <div className={styles.loadingScreen}>ユーザー情報を読み込み中...</div>;
  }

  const useUI = getuseUI(UI, user.userUI);

  if (!useUI) {
    return <div className={styles.loadingScreen}>UI設定を読み込み中...</div>;
  }

  // --- 1. 現在時刻と昼夜・太陽/月の位置計算 ---
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  const isDay = hours >= 6 && hours < 18;
  const cycleHours = isDay
    ? hours - 6 + minutes / 60
    : (hours >= 18 ? hours - 18 : hours + 6) + minutes / 60;
  const cycleRatio = Math.min(1, Math.max(0, cycleHours / 12));

  const celestialLeft = 15 + cycleRatio * 70;
  const celestialTop = 28 + Math.pow((cycleRatio - 0.5) * 2, 2) * 32;

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

  // --- 3. 進捗段階に応じた花UI ---
  const progressAssets = [
    useUI.ProgressUI_0,
    useUI.ProgressUI_1,
    useUI.ProgressUI_2,
    useUI.ProgressUI_3,
    useUI.ProgressUI_4,
  ];
  const safeProgressIndex = Math.min(4, Math.max(0, Number(userProgress) || 0));
  const currentFlowerAsset = progressAssets[safeProgressIndex];
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
        className={`${styles.stage} ${isDay ? styles.daySky : styles.nightSky}`}
        style={stageBackgroundStyle}
      >
        <div className={styles.topMetaBar}>
          <span>{user.userName}</span>
          <span>
            {user?.userStartTimer && user?.userEndTimer
              ? `${String(new Date(user.userStartTimer).getHours()).padStart(2, "0")}:${String(
                  new Date(user.userStartTimer).getMinutes()
                ).padStart(2, "0")} ~ ${String(
                  new Date(user.userEndTimer).getHours()
                ).padStart(2, "0")}:${String(
                  new Date(user.userEndTimer).getMinutes()
                ).padStart(2, "0")}`
              : "時間未設定"}
          </span>
        </div>

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

        {/* 左上：現在地と天気 */}
        <div className={styles.weatherZone}>
          <div className={styles.locationBadge}>
            {address?.state || address?.city
              ? `${address.state || ""}${address.city || ""}`
              : "現在地取得中..."}
          </div>

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

        {/* 左中段：時計回り％タイマー */}
        <div className={styles.timerZone}>
          <button
            type="button"
            onClick={resetCount}
            className={styles.timerRing}
            style={{ "--timer-deg": `${timerPercent * 3.6}deg` }}
            title="クリックでタイマーリセット"
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
          </button>
          <span className={styles.timerSubText}>
            {timerCount}/{calculatedTimer}秒
          </span>
        </div>

        {/* 中央：花（進捗段階0〜4） */}
        <div className={styles.centerFlowerZone}>
          <div
            className={`${styles.flowerWrapper} ${
              isWilted ? styles.flowerWilted : styles.flowerHealthy
            }`}
          >
            <UIAsset
              src={currentFlowerAsset}
              alt={`状態段階 ${safeProgressIndex}`}
              fallbackText={`${useUI.UIName || "花"} ${safeProgressIndex + 1}段階`}
              className={styles.flowerFallback}
              imgClassName={styles.flowerImg}
            />
          </div>
          <div className={styles.stemLine} />
          <span className={styles.progressBadge}>
            水分段階: {safeProgressIndex} {isWilted ? "（しおれ注意）" : ""}
          </span>
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

        {/* 下部中央：水分補給（じょうろ）ボタン */}
        <div className={styles.bottomWateringZone}>
          <div className={styles.leafLeft} aria-hidden="true" />
          <div className={styles.leafRight} aria-hidden="true" />
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
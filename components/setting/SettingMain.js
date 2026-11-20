"use client";

import { useState, useEffect } from "react";
import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
import styles from "./SettingMain.module.css";

export default function SettingMain() {
  const { user, updateUser, setDrinkTimer } = useDrink();

  const [temperSetting, setTemperSetting] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(20);
  const [timerStart, setTimerStart] = useState("09:00");
  const [timerEnd, setTimerEnd] = useState("20:00");

  // Dateオブジェクトや文字列から "HH:mm" を抽出するヘルパー
  const formatHHMM = (dateInput) => {
    if (!dateInput) return "09:00";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "09:00";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // 入力された "HH:mm" から日本時間（+09:00）のISO文字列を生成する関数
  const createJSTDateString = (timeStr) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    // Zではなく +09:00 を付与して日本時間として保存
    return `${yyyy}-${mm}-${dd}T${timeStr}:00+09:00`;
  };

  // user 読み込み時に初期値を State へセット
  useEffect(() => {
    if (user) {
      setTemperSetting(user.userTemperSetting ?? true);
      setTimerMinutes(user.userTimer ?? 20);
      setTimerStart(formatHHMM(user.userStartTimer));
      setTimerEnd(formatHHMM(user.userEndTimer));
    }
  }, [user]);

  // 温度・湿度設定の ON / OFF 切り替え
  const handleToggleTemper = async () => {
    const nextSetting = !temperSetting;
    setTemperSetting(nextSetting);

    await updateUser({
      ...user,
      userTemperSetting: nextSetting,
    });
  };

  // タイマー時間（分）の変更
  const handleChangeTimer = async () => {
    if (timerMinutes !== "" && !isNaN(Number(timerMinutes))) {
      await updateUser({
        ...user,
        userTimer: Number(timerMinutes),
      });
      setDrinkTimer(timerMinutes * 60);
      alert("タイマー時間を変更しました");
    }
  };

  // 開始時刻の変更
  const handleChangeTimerStart = async () => {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (timerStart && timeRegex.test(timerStart)) {
      const jstString = createJSTDateString(timerStart);
      await updateUser({
        ...user,
        userStartTimer: jstString,
      });
      alert("開始時刻を変更しました");
    } else {
      alert("時刻の形式が不正です (例: 09:00)");
    }
  };

  // 終了時刻の変更
  const handleChangeTimerEnd = async () => {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (timerEnd && timeRegex.test(timerEnd)) {
      const jstString = createJSTDateString(timerEnd);
      await updateUser({
        ...user,
        userEndTimer: jstString,
      });
      alert("終了時刻を変更しました");
    } else {
      alert("時刻の形式が不正です (例: 20:00)");
    }
  };

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
          {/* 1. 温度湿度によるタイマーの変化 ＋ トグルスイッチ */}
          <section className={styles.temperRow}>
            <div className={styles.temperLabelBox}>
              温度湿度による
              <br />
              タイマーの変化
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={temperSetting}
              aria-label="温度湿度によるタイマーの変化切り替え"
              onClick={handleToggleTemper}
              className={`${styles.switchTrack} ${
                temperSetting ? styles.switchOn : styles.switchOff
              }`}
            >
              <span className={styles.switchStateText}>
                {temperSetting ? "ON" : "OFF"}
              </span>
              <span className={styles.switchKnob} />
            </button>
          </section>

          {/* 2. タイマーの時間（上下連結ボックス ＋ 変更ボタン） */}
          <section className={styles.timerIntervalSection}>
            <div className={styles.stackedBox}>
              <label htmlFor="setting-timer-min" className={styles.stackedHeader}>
                タイマーの時間
              </label>
              <div className={styles.stackedInputRow}>
                <input
                  id="setting-timer-min"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(e.target.value)}
                  className={styles.numberInput}
                />
                <span className={styles.unitText}>分</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleChangeTimer}
              className={styles.ovalButton}
            >
              変更
            </button>
          </section>

          {/* 3. タイマーの開始時刻 〜 タイマーの終了時刻 ＋ 各変更ボタン */}
          <section className={styles.timeRangeSection}>
            {/* 左：開始時刻 */}
            <div className={styles.timeColumn}>
              <div className={styles.timeBox}>
                <label htmlFor="setting-timer-start" className={styles.timeBoxLabel}>
                  タイマーの開始
                  <br />
                  時刻
                </label>
                <input
                  id="setting-timer-start"
                  type="time"
                  value={timerStart}
                  onChange={(e) => setTimerStart(e.target.value)}
                  className={styles.timeInput}
                />
              </div>

              <button
                type="button"
                onClick={handleChangeTimerStart}
                className={styles.ovalButtonSmall}
              >
                変更
              </button>
            </div>

            {/* 中央：「〜」ボックス */}
            <div className={styles.tildeBox} aria-hidden="true">
              〜
            </div>

            {/* 右：終了時刻 */}
            <div className={styles.timeColumn}>
              <div className={styles.timeBox}>
                <label htmlFor="setting-timer-end" className={styles.timeBoxLabel}>
                  タイマーの終了
                  <br />
                  時刻
                </label>
                <input
                  id="setting-timer-end"
                  type="time"
                  value={timerEnd}
                  onChange={(e) => setTimerEnd(e.target.value)}
                  className={styles.timeInput}
                />
              </div>

              <button
                type="button"
                onClick={handleChangeTimerEnd}
                className={styles.ovalButtonSmall}
              >
                変更
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
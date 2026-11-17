"use client";

import { useState, useEffect } from "react";
import { useDrink } from "@/context/DrinkContext";

export default function SettingMain() {
  const { user, updateUser, setNowScreen ,setDrinkTimer} = useDrink();

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
      setDrinkTimer(timerMinutes*60);
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
        userStartTimer: jstString, // Z無しの +09:00 文字列で保存
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
        userEndTimer: jstString, // Z無しの +09:00 文字列で保存
      });
      alert("終了時刻を変更しました");
    } else {
      alert("時刻の形式が不正です (例: 20:00)");
    }
  };

  if (!user) {
    return <div>ユーザー情報を読み込み中...</div>;
  }

  return (
    <div>
      <button onClick={() => setNowScreen("HOMEMAIN")}>ホーム</button>
      <h2>設定画面</h2>

      {/* 温度湿度によるタイマーの連動切り替え */}
      <div style={{ marginBottom: "20px" }}>
        <p>温度湿度によるタイマーの変化</p>
        <button onClick={handleToggleTemper}>
          {temperSetting ? "ON" : "OFF"}
        </button>
      </div>

      {/* タイマー時間（分）の変更 */}
      <div style={{ marginBottom: "20px" }}>
        <p>タイマーの時間（分ごと）</p>
        <input
          type="number"
          value={timerMinutes}
          onChange={(e) => setTimerMinutes(e.target.value)}
          style={{ width: "80px", padding: "4px" }}
        />
        <span> 分 </span>
        <button onClick={handleChangeTimer}>変更</button>
      </div>

      {/* タイマーの開始時刻 */}
      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>
          タイマーの開始時刻:
        </label>
        <input
          type="time"
          value={timerStart}
          onChange={(e) => setTimerStart(e.target.value)}
        />
        <button onClick={handleChangeTimerStart} style={{ marginLeft: "8px" }}>
          変更
        </button>
      </div>

      {/* タイマーの終了時刻 */}
      <div>
        <label style={{ display: "block", marginBottom: "4px" }}>
          タイマーの終了時刻:
        </label>
        <input
          type="time"
          value={timerEnd}
          onChange={(e) => setTimerEnd(e.target.value)}
        />
        <button onClick={handleChangeTimerEnd} style={{ marginLeft: "8px" }}>
          変更
        </button>
      </div>
    </div>
  );
}
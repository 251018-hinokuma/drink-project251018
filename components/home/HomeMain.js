"use client";

import { useDrink } from "@/context/DrinkContext";
import {getuseUI} from "@/lib/functions"
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

  if (loading || !user) {
    return <div>ユーザー情報を読み込み中...</div>;
  }

  const useUI=getuseUI(UI,user.userUI);

  if (!useUI) {
    return <div>UI設定を読み込み中...</div>;
  }

  return (
    <div>
      <p>{user.userName}</p>
      <p>現在地:{address.state ? address.state : "取得中..."}{address.city ? address.city : "取得中..."}</p>
      <p>気温: {weatherData ? `${weatherData.temperature}°C` : "取得中..."}</p>
      <p>湿度: {weatherData ? `${weatherData.humidity}%` : "取得中..."}</p>
      <p>天気: {weatherData ? weatherData.weather : "取得中..."}</p>
      <p>進捗段階: {userProgress}</p>
      <p>
        {timerCount} / {calculatedTimer} 秒
      </p>
     <p>
      {user?.userStartTimer && user?.userEndTimer ? (
        `${String(new Date(user.userStartTimer).getHours()).padStart(2, "0")}:${String(new Date(user.userStartTimer).getMinutes()).padStart(2, "0")} ~ ${String(new Date(user.userEndTimer).getHours()).padStart(2, "0")}:${String(new Date(user.userEndTimer).getMinutes()).padStart(2, "0")}`
      ) : (
       "時間未設定"
        )}
      </p>
      <button onClick={() => setNowScreen("DRINKING")}>
        水分補給
      </button>
      <button onClick={resetCount}>
        タイマーリセット
      </button>
      <button onClick={() => setNowScreen("RECORD")}>
        記録
      </button>
      <button onClick={() => setNowScreen("MYDRINKLIST")}>
        マイドリンク
      </button>
      <button onClick={() => setNowScreen("SETTING")}>
        設定
      </button>
      <div>
        {/* 進捗段階に応じた画像 */}
        <p>{userProgress === 0 && "初期段階の画像"}</p>
        <p>{userProgress === 1 && "中期段階の画像"}</p>
        <p>{userProgress === 2 && "後期段階の画像"}</p>
        <p>{userProgress === 3 && "設定後段階の画像"}</p>
        <p>{userProgress === 4 && "設定後最終段階の画像"}</p>
      </div>
      <div>
        {/*天気に応じた画像*/}
        <p>{weatherData && weatherData.weather === "快晴" && "快晴の画像"}</p>
        <p>{weatherData && weatherData.weather === "晴れ" && "晴れの画像"}</p>
        <p>{weatherData && weatherData.weather === "雨" && "雨の画像"}</p>
        <p>{weatherData && weatherData.weather === "にわか雨" && "にわか雨の画像"}</p>
        <p>{weatherData && weatherData.weather === "雷雨" && "雷雨の画像"}</p>
        <p>{weatherData && weatherData.weather === "曇り" && "曇りの画像"}</p>
        <p>{weatherData && weatherData.weather === "霧" && "霧の画像"}</p>
        <p>{weatherData && weatherData.weather === "雪" && "雪の画像"}</p>
      </div>
      <button onClick={() => setNowScreen("CHANGEUI")}>
        UI
      </button>
      <div>
        <p>{useUI.UIName}</p>
        <p>{useUI.StageUI}</p>
        <p>{userProgress === 0 && `${useUI.ProgressUI_0}`}</p>
        <p>{userProgress === 1 && `${useUI.ProgressUI_1}`}</p>
        <p>{userProgress === 2 && `${useUI.ProgressUI_2}`}</p>
      </div>
      
    </div>
  );
}
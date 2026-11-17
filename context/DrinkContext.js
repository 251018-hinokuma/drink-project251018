"use client";

import { createContext, useContext, useState, useEffect, useCallback, use } from "react";
import { resetTimerStorage ,showNotification} from "@/lib/functions"; 
const DrinkContext = createContext();

export function DrinkProvider({ children }) {
  const [nowScreen, setNowScreen] = useState("HOMEMAIN");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useMydrink, setUseMydrink] = useState(false);
  const [useMydrinkId, setUseMydrinkId] = useState(false);
  const [useMydrinkInfo, setUseMydrinkInfo] = useState(null);

  const [UI, setUI] = useState([]); // UI情報の管理用 State


  const [searchDate, setSearchDate] = useState("");

  const [drinkTimer, setDrinkTimer] = useState(0); // デフォルト 20分 (= 1200秒)
  const [calculatedTimer, setCalculatedTimer] = useState(600);
  const [timerCount, setTimerCount] = useState(0);
  const [userProgress, setProgress] = useState(0);

  // 位置情報と気象データ
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [address, setAddress] = useState({ address: null, city: null, state: null, country: null });
  const [weatherData, setWeatherData] = useState({ temperature: null, humidity: null ,weather:null});

  

  // ★ 位置情報・天気・都市名の取得関数
  const getLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      console.error("この環境は位置情報をサポートしていません。");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setLocation({ lat, lng });
        console.log(`緯度: ${lat}, 経度: ${lng}`);

        // Open-Meteo 気象情報取得 API
        const weatherurl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code`;

        // ★ 修正: OpenStreetMap Nominatim 逆ジオコーディング API (format=json を指定)
        const cityurl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;

        // 1. 気象データの取得
        try {
          const weatherResponse = await fetch(weatherurl);
          const weatherdata = await weatherResponse.json();

          if (weatherdata.current) {
            const temp = weatherdata.current.temperature_2m;
            const hum = weatherdata.current.relative_humidity_2m;
            const weatherint = weatherdata.current.weather_code;
            let weather = "";
            if (weatherint === 0) weather = "快晴";
            if (weatherint >= 1 && weatherint <= 2) weather = "晴れ";
            if (weatherint === 3) weather = "曇り";
            if (weatherint >= 45 && weatherint <= 48) weather = "霧";
            if (weatherint >= 51 && weatherint <= 67) weather = "雨";
            if (weatherint >= 71 && weatherint <= 77) weather = "雪";
            if (weatherint >= 80 && weatherint <= 82) weather = "にわか雨";
            if (weatherint >= 85 && weatherint <= 86) weather = "雪";
            if (weatherint >= 95) weather = "雷雨";

            setWeatherData({ temperature: temp, humidity: hum, weather: weather });

            console.log(`現在の気温: ${temp} °C, 湿度: ${hum} %, 天気: ${weather}`);
          }
        } catch (error) {
          console.error("気象データの取得に失敗しました:", error);
        }

        // 2. 都市名・住所データの取得
        try {
          const cityResponse = await fetch(cityurl, {
            headers: {
              "Accept-Language": "ja", // 日本語表記で取得
            },
          });
          const citydata = await cityResponse.json();

          if (citydata.address) {
            const cityName =
              citydata.address.city ||
              citydata.address.town ||
              citydata.address.village ||
              citydata.address.suburb ||
              citydata.address.county ||
              null;

            setAddress({
              address: citydata.display_name || null,
              city: cityName,
              state: citydata.address.state || citydata.address.province || null,
              country: citydata.address.country || null,
            });

            console.log(`取得した都市名: ${cityName}`);
          }
        } catch (error) {
          console.error("都市名・住所情報の取得に失敗しました:", error);
        }
      },
      (err) => {
        console.error("位置情報の取得に失敗しました:", err);
      }
    );
  }, []);

  // 初期ユーザーデータ取得
  useEffect(() => {
    async function initDrink() {
      try {
        const userRes = await fetch("/api/user");

        if (userRes.ok) {
          const userData = await userRes.json();

          if (userData?.user) {
            setUser({
              ...userData.user,
              userId: userData.user.userId || 1,
            });
            if (userData.user?.userTimer) {
              setDrinkTimer(Number(userData.user.userTimer) * 60);
            }
            return;
          }
        }

        console.warn(
          "APIからユーザーデータを正常に取得できなかったため、初期値(userId: 1)をセットします。"
        );
        setUser({ userId: 1, userTemperSetting: true, drinkrecord: [] });
      } catch (error) {
        console.error(
          "データ初期化エラー、userId: 1 で強制ログインします:",
          error
        );
        setUser({ userId: 1, userTemperSetting: true, drinkrecord: [] });
      } finally {
        setLoading(false);
      }
    }

    initDrink();
  }, []);
  
  

  //UI取得
 
useEffect(() => {
  async function initUI() {
    try {
      const UIRes = await fetch("/api/UI");

      if (UIRes.ok) {
        const UIData = await UIRes.json();
        // ★ user ではなく ui の存在を確認し、UIData.ui をセットする
        if (UIData?.ui) {
          setUI(UIData.ui);
          return;
        }
      }
      console.warn(
        "APIからUIデータを正常に取得できなかったため、初期値(UIId: 1)をセットします。"
      );
    } catch (error) {
      console.error("データ初期化エラー", error);
    } finally {
      setLoading(false);
    }
  }

  initUI();
}, []);

  // 位置情報の取得実行
  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // 気温・湿度による目標タイマー時間の計算
  useEffect(() => {
    let calculatedtimer = drinkTimer;

    const isTemperSettingOn = user?.userTemperSetting ?? true;
    const currentTemp = weatherData.temperature;
    const currentHumidity = weatherData.humidity;

    if (isTemperSettingOn && currentTemp !== null && currentHumidity !== null) {
      if (currentTemp >= 30) {
        calculatedtimer -= 120;
      } else if (currentTemp >= 25) {
        calculatedtimer -= 60;
      }

      if (currentHumidity >= 80) {
        calculatedtimer -= 120;
      } else if (currentHumidity >= 65) {
        calculatedtimer -= 60;
      } else if (currentHumidity <= 40) {
        calculatedtimer -= 60;
      }
    }

    setCalculatedTimer(calculatedtimer);
  }, [drinkTimer, weatherData.temperature, weatherData.humidity, user?.userTemperSetting]);

  // タイムスタンプ + localStorage によるタイマー計算
  useEffect(() => {
    if (!user || !user.userStartTimer || !user.userEndTimer) return;
    const nowDate= new Date();
    const startDate = new Date(user.userStartTimer);
    const endDate = new Date(user.userEndTimer);
    const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) return;
    if (typeof window === "undefined") return;

    let startTime = localStorage.getItem("drink_timer_start_time");
    if (!startTime) {
      startTime = Date.now().toString();
      localStorage.setItem("drink_timer_start_time", startTime);
    }

    const updateTimer = () => {
      const start = Number(localStorage.getItem("drink_timer_start_time"));
      if (!start) return;

      const now = Date.now();
      const diffInSeconds = Math.floor((now - start) / 1000);

      const currentCount =
        //diffInSeconds >= calculatedTimer ? calculatedTimer : diffInSeconds;
        diffInSeconds;
      setTimerCount(currentCount);

      const percentage =
        calculatedTimer > 0 ? (currentCount / calculatedTimer) * 100 : 0;
      if(percentage >= 200){
        setProgress(4)
      }else if (percentage >= 150) {
        setProgress(3);
      }else if (percentage >= 100) {
        setProgress(2);
      } else if (percentage >= 50) {
        setProgress(1);
      } else {
        setProgress(0);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [calculatedTimer,user]);

  // タイマーリセット処理
  const resetCount = useCallback(() => {
    resetTimerStorage();
    setTimerCount(0);
    setProgress(0);
  }, []);

  // 1. ブラウザが対応しているか確認
  useEffect(()=>{
    if (!("Notification" in window)) {
  alert("このブラウザはデスクトップ通知に対応していません。");
} else if (Notification.permission === "granted") {
  // 2. すでに許可されている場合はすぐに通知を出す
  showNotification(userProgress);
} else if (Notification.permission !== "denied") {
  // 3. 許可をリクエスト（※必ずボタンクリック等のイベント内で呼ぶこと）
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      showNotification(userProgress);
    }
  });
}
  },[userProgress])




  const updateUser = async (newUserData) => {
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserData),
      });

      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("ユーザー更新エラー:", error);
    }
  };


  return (
    <DrinkContext.Provider
      value={{
        nowScreen,
        setNowScreen,

        user,
        setUser,
        loading,
        updateUser,
        useMydrink,
        setUseMydrink,
        useMydrinkId,
        setUseMydrinkId,
        useMydrinkInfo,
        setUseMydrinkInfo,
        searchDate,
        setSearchDate,
        timerCount,
        calculatedTimer,
        userProgress,
        resetCount,
        setDrinkTimer,
        location,
        weatherData,
        getLocation,
        address,
        UI,
      }}
    >
      {children}
    </DrinkContext.Provider>
  );
}

export const useDrink = () => useContext(DrinkContext);
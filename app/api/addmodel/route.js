import { NextResponse } from "next/server";
import connectDB from "@/utils/database";
import { User, UI } from "@/utils/schemaModels";

const sampleUsers = [
  {
    userId: 1,
    userName: "テストユーザー1",
    userEmail: "user1@example.com",
    userPass: "password123",
    userTimer: 600,
    userTemperSetting: true,
    userProgress: 0,
    userposition: "Tokyo",
    userStartTimer: new Date("2026-10-23T09:00:00"),
    userEndTimer: new Date("2026-10-23T20:00:00"), // ★ タイポ修正 (useEndTimer -> userEndTimer)
    userUI: 1,
    drinkInfo: [
      {
        drinkId: "1",
        drinkName: "緑茶",
        drinkValue: 500,
        drinkCalorie: 0,
      },
      {
        drinkId: "2",
        drinkName: "スポーツドリンク",
        drinkValue: 500,
        drinkCalorie: 95,
      },
    ],
    drinkrecord: [
      {
        drinkRecordId: "1",
        drinkName: "水",
        drinkValue: 200,
        drinkCalorie: 0,
        drinkDate: new Date("2026-10-23T08:30:00"),
      },
      {
        drinkRecordId: "2",
        drinkName: "緑茶",
        drinkValue: 350,
        drinkCalorie: 0,
        drinkDate: new Date("2026-10-23T12:00:00"),
      },
    ],
  },
  {
    userId: 2,
    userName: "テストユーザー2",
    userEmail: "user2@example.com",
    userPass: "password456",
    userTimer: 900,
    userTemperSetting: false,
    userProgress: 1,
    userposition: "Osaka",
    userStartTimer: new Date("2026-10-23T09:00:00"),
    userEndTimer: new Date("2026-10-23T20:00:00"),
    userUI: 2,
    drinkInfo: [
      {
        drinkId: "1",
        drinkName: "ブラックコーヒー",
        drinkValue: 300,
        drinkCalorie: 12,
      },
      {
        drinkId: "2",
        drinkName: "麦茶",
        drinkValue: 500,
        drinkCalorie: 0,
      },
    ],
    drinkrecord: [
      {
        drinkRecordId: "1",
        drinkName: "ブラックコーヒー",
        drinkValue: 300,
        drinkCalorie: 12,
        drinkDate: new Date("2026-10-23T10:00:00Z"),
      },
      {
        drinkRecordId: "2",
        drinkName: "麦茶",
        drinkValue: 500,
        drinkCalorie: 0,
        drinkDate: new Date("2026-10-23T14:15:00Z"),
      },
    ],
  },
];

const sampleUI = [
  {
    UIId: 1,
    UIName: "花",
    StageUI: "花_ステージ",
    ProgressUI_0: "/flower_0.jpg",
    ProgressUI_1: "/flower_1.jpg",
    ProgressUI_2: "/flower_2.jpg",
    ProgressUI_3: "/flower_3.jpg",
    ProgressUI_4: "/flower_4.jpg",
    DrinkingUI: "/flower_drinking.jpg",
    TimerUI: "花_タイマー",
    SettingUI: "/flower_SET_UI.jpg",
    UiUI: "/flower_UI_UI.jpg",
    MyDrinkUI: "/flower_MYDRINK_UI.jpg",
    RecordUI: "/flower_RECORD_UI.jpg",
    WeatherUI_0: "花_天気0",
    WeatherUI_1: "花_天気1",
    WeatherUI_2: "/flower_Weather_2.jpg",
    WeatherUI_3: "/flower_Weather_3.jpg",
    WeatherUI_4: "/flower_Weather_4.jpg",
    WeatherUI_5: "/flower_Weather_5.jpg",
    WeatherUI_6: "/flower_Weather_6.jpg",
    WeatherUI_7: "/flower_Weather_7.jpg",
    DayUI: "花_太陽",
    NightUI: "花_月",
  },
  {
    UIId: 2,
    UIName: "水槽",
    StageUI: "水槽_ステージ",
    ProgressUI_0: "/Aquarium_fish.jpg",
    ProgressUI_1: "/Aquarium_fish.jpg",
    ProgressUI_2: "/Aquarium_fish.jpg",
    ProgressUI_3: "/Aquarium_fish.jpg",
    ProgressUI_4: "/Aquarium_fish.jpg",
    DrinkingUI: "水槽_水分補給",
    TimerUI: "水槽_タイマー",
    SettingUI: "水槽_設定",
    UiUI: "水槽_UI選択",
    MyDrinkUI: "水槽_マイドリンク",
    RecordUI: "水槽_記録",
    WeatherUI_0: "水槽_天気0",
    WeatherUI_1: "水槽_天気1",
    WeatherUI_2: "水槽_天気2",
    WeatherUI_3: "水槽_天気3",
    WeatherUI_4: "水槽_天気4",
    WeatherUI_5: "水槽_天気5",
    WeatherUI_6: "水槽_天気6",
    WeatherUI_7: "水槽_天気7",
    DayUI: "水槽_太陽",
    NightUI: "水槽_月",
  },
];

export async function GET() {
  try {
    await connectDB();

    for (const userData of sampleUsers) {
      await User.findOneAndUpdate(
        { userId: userData.userId },
        userData,
        { upsert: true, returnDocument: "after" }
      );
    }

    for (const UIData of sampleUI) {
      await UI.findOneAndUpdate(
        { UIId: UIData.UIId },
        UIData,
        { upsert: true, returnDocument: "after" }
      );
    }

    return NextResponse.json({
      message: "仮ユーザーデータ(userId: 1, 2)およびUIデータの初期化が完了しました",
      users: sampleUsers,
      uis: sampleUI,
    });
  } catch (error) {
    console.error("Seed Error:", error);
    return NextResponse.json(
      { error: "データの初期化に失敗しました", details: error.message },
      { status: 500 }
    );
  }
}
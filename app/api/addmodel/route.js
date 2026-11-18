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
    ProgressUI_0: "花１段階",
    ProgressUI_1: "花２段階",
    ProgressUI_2: "花３段階",
    ProgressUI_3: "花４段階",
    ProgressUI_4: "花５段階",
    DrinkingUI: "花_じょうろ",
    TimerUI: "花_タイマー",
    SettingUI: "花_設定",
    UiUI: "花_UI選択",
    MyDrinkUI: "花_マイドリンク",
    RecordUI: "花_記録",
    WeatherUI_0: "花_天気0",
    WeatherUI_1: "花_天気1",
    WeatherUI_2: "花_天気2",
    WeatherUI_3: "花_天気3",
    WeatherUI_4: "花_天気4",
    WeatherUI_5: "花_天気5",
    WeatherUI_6: "花_天気6",
    WeatherUI_7: "花_天気7",
    DayUI: "花_太陽",
    NightUI: "花_月",
  },
  {
    UIId: 2,
    UIName: "水槽",
    StageUI: "水槽_ステージ",
    ProgressUI_0: "水槽１段階",
    ProgressUI_1: "水槽２段階",
    ProgressUI_2: "水槽３段階",
    ProgressUI_3: "水槽４段階",
    ProgressUI_4: "水槽５段階",
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
import mongoose from "mongoose";

const Schema = mongoose.Schema;

// ユーザー用スキーマ
const UserModel = new Schema(
  {
    userId: { type: Number },
    userName: { type: String },
    userEmail: { type: String },
    userPass: { type: String },
    userTimer: { type: Number },
    userTemperSetting: { type: Boolean },
    userProgress: { type: Number },
    userposition: { type: String },
    userUI: { type: Number },
    userStartTimer:{type:Date},
    userEndTimer:{type:Date},
    // マイドリンク情報（複数保持用配列）
    drinkInfo: [
      {
        drinkId: { type: String },
        drinkName: { type: String },
        drinkValue: { type: String },
        drinkCalorie: { type: String },
      },
    ],
    // 飲酒・水分補給の記録履歴
    drinkrecord: [
      {
        drinkRecordId: { type: String },
        drinkName: { type: String },
        drinkValue: { type: String },
        drinkCalorie: { type: String },
        drinkDate: { type: Date },
      },
    ],
  },
  {
    collection: "users", // 🛠️ コレクション名を「users」に完全固定
  }
);

// UI設定用スキーマ
const UIModel = new Schema(
  {
    UIId: { type: Number },
    UIName: { type: String },
    StageUI: { type: String },
    ProgressUI_0: { type: String },
    ProgressUI_1: { type: String },
    ProgressUI_2: { type: String },
    ProgressUI_3: { type: String },
    ProgressUI_4: { type: String },
    DrinkingUI: { type: String },
    TimerUI:{ type: String },
    SettingUI:{ type: String },
    UiUI:{ type: String },
    MyDrinkUI:{ type: String },
    RecordUI:{ type: String },
    WeatherUI_0:{ type: String },
    WeatherUI_1:{ type: String },
    WeatherUI_2:{ type: String },
    WeatherUI_3:{ type: String },
    WeatherUI_4:{ type: String },
    WeatherUI_5:{ type: String },
    WeatherUI_6:{ type: String },
    WeatherUI_7:{ type: String },
    DayUI:{ type: String },
    NightUI:{ type: String },

  },
  {
    collection: "uis", // 🛠️ コレクション名を「uis」に完全固定
  }
);

export const User = mongoose.models.User || mongoose.model("User", UserModel);
export const UI = mongoose.models.UI || mongoose.model("UI", UIModel);
export default User;
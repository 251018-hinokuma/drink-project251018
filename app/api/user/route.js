import { NextResponse } from "next/server";
import mongoose from "mongoose"; 
// import UserModel from "@/utils/schemaModels"; // ★ 不要なためコメントアウト
import { User } from "@/utils/schemaModels"; // ★ シードデータと同じ正しいモデル名を使用
import connectDB from "@/utils/database";

export async function GET() {
  try {
    await connectDB();

    /* -------------------------------------------------------------
    // 【元々の処理】ログインID等で動的にユーザーデータを取得する処理
    const sessionUserId = request.headers.get("X-User-Id"); // 例: ヘッダーから取得する場合など
    const searchFilter = mongoose.Types.ObjectId.isValid(sessionUserId)
      ? { _id: sessionUserId }
      : { userId: Number(sessionUserId) };
    ------------------------------------------------------------- */

    // ★ 強制的に userId=1 としてユーザーデータを取得する
    const searchFilter = { userId: 1 };
    const user = await User.findOne(searchFilter);

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりませんでした (userId: 1)" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "GET request", user });
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json(
      { error: "ユーザー情報の取得に失敗しました", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  
  try {
    await connectDB();

    // 1. フロントエンドから送られてきたデータ（JSON）を解析して受け取る
    const body = await request.json();
    const { 
      drinkName, 
      drinkValue, 
      drinkCalorie 
    } = body;

    // 2. 保存用のレコードオブジェクトを作成
    const newRecord = {
      drinkRecordId: new mongoose.Types.ObjectId().toString(),
      drinkId: new mongoose.Types.ObjectId().toString(),
      drinkName: drinkName || "未設定の飲料",
      drinkValue: String(drinkValue || 0),
      drinkCalorie: String(drinkCalorie || 0),
      drinkDate: new Date(),
    };

    /* -------------------------------------------------------------
    // 【元々の処理】リクエストに含まれるIDやObjectIdで動的にフィルターを変更する処理
    const { userId } = body;
    const searchFilter = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: userId }
      : { userId: Number(userId) };
    ------------------------------------------------------------- */

    // 3. 常に「userId=1（数値型）」のユーザーを対象にするフィルター定義
    const searchFilter = { userId: 1 };

    // 4. データベースのユーザーデータを更新
    const updatedUser = await User.findOneAndUpdate(
      searchFilter,
      {
        $push: { drinkrecord: newRecord },
      },
      { new: true } // 更新後の最新のデータを取得するオプション
    );

    // 5. ユーザーが見つからなかった場合のハンドリング
    if (!updatedUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりませんでした (userId: 1 のデータが必要です)" },
        { status: 404 }
      );
    }

    // 6. 成功した場合のレスポンスを返す
    return NextResponse.json({
      message: "記録を追加しました",
      record: newRecord,
      user: updatedUser,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    // Mongo標準フィールド(_id, __v)の除去
    delete body._id;
    delete body.__v;

    await connectDB();

    const updatedUser = await User.findOneAndUpdate(
      { userId: 1 },
      { $set: body },
      { new: true, runValidators: true, upsert: true }
    );

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return NextResponse.json(
      { message: "更新失敗", error: error.message },
      { status: 500 }
    );
  }
}


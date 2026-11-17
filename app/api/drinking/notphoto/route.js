import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {User} from "@/utils/schemaModels";
import connectDB from "@/utils/database";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      userId = 1,
      reqMyDrinkImgName = "",
      reqMyDrinkImgCalorie = 0,
      customValue,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId が指定されていません" },
        { status: 400 }
      );
    }

    const hasCustomValue =
      customValue !== undefined &&
      customValue !== null &&
      customValue !== "" &&
      !isNaN(Number(customValue));
    const parsedCustomValue = hasCustomValue ? Number(customValue) : 0;

    // 摂取カロリーの計算
    const finalDrinkCalorie = Math.round(
      (parsedCustomValue / 100) * Number(reqMyDrinkImgCalorie)
    );

    // 保存用データオブジェクトの作成
    const newRecord = {
      drinkRecordId: new mongoose.Types.ObjectId().toString(),
      drinkId: new mongoose.Types.ObjectId().toString(),
      drinkName: reqMyDrinkImgName,
      drinkValue: String(parsedCustomValue),
      drinkCalorie: String(finalDrinkCalorie),
      drinkDate: new Date(),
    };

    // MongoDB 検索用クエリ
    const searchFilter = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: userId }
      : { userId: Number(userId) };

    const updatedUser = await User.findOneAndUpdate(
      searchFilter,
      {
        $push: { drinkrecord: newRecord },
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりませんでした" },
        { status: 404 }
      );
    }

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
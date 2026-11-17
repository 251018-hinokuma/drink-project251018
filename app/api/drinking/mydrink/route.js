import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {User} from "@/utils/schemaModels";
import connectDB from "@/utils/database";
export async function POST(request) {
   
  try {
    await connectDB();

    const body = await request.json();
    const { userId = 1, drinkName, drinkValue, drinkCalorie } = body;

    // 入力チェック
    if (!drinkName || drinkValue === undefined || drinkValue === "") {
      return NextResponse.json(
        { error: "ドリンク名と容量は必須項目です" },
        { status: 400 }
      );
    }

    // 保存用マイドリンクオブジェクトの作成
    const newDrinkInfo = {
      drinkId: new mongoose.Types.ObjectId().toString(),
      drinkName: String(drinkName),
      drinkValue: Number(drinkValue),
      drinkCalorie: Number(drinkCalorie) || 0,
    };

    // userId が ObjectId (24文字) か数値 (1, 2等) かで検索フィルターを切り替え
    const searchFilter = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: userId }
      : { userId: Number(userId) };

    // ユーザーの drinkInfo 配列に追加
    const updatedUser = await User.findOneAndUpdate(
      searchFilter,
      { $push: { drinkInfo: newDrinkInfo } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりませんでした" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "マイドリンクを追加しました",
      drinkInfo: newDrinkInfo,
      user: updatedUser,
    });
  } catch (error) {
    console.error("マイドリンク追加APIエラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try{
  await connectDB();
  const body = await request.json();
  const {
    deleteuserId=1,
    deletedrinkId,
  }=body;
  const searchFilter = { userId: deleteuserId };
  const updatedUser=await User.findOneAndUpdate(
    searchFilter,
      {
        $pull: {drinkInfo:{drinkId:String(deletedrinkId)}},
      },
      { new: true } // 更新後の最新のデータを取得するオプション

  )
  if (!updatedUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりませんでした" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "マイドリンクを削除しました",
      user: updatedUser,
    });
  }catch(error){
    return NextResponse.json(
      { error: "削除処理中にサーバーエラーが発生しました", details: error.message },
      { status: 500 }
    );
  }
}
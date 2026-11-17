import { NextResponse } from "next/server";
import { UI } from "@/utils/schemaModels"; // ★ シードデータと同じ正しいモデル名を使用
import connectDB from "@/utils/database";

export async function GET() {
  try {
    await connectDB();

    const ui = await UI.find();

    if (!ui) {
      return NextResponse.json(
        { error: "UIが見つかりませんでした" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: "GET request", ui });
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json(
      { error: "UI情報の取得に失敗しました", details: error.message },
      { status: 500 }
    );
  }
}



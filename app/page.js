"use client"

import { useDrink } from "@/context/DrinkContext";
import HomeMain from "@/components/home/HomeMain";
import DrinkingMain from "@/components/drinking/DrinkingMain";
import MydrinkingMain from "@/components/drinking/mydrinking/MydrinkingMain";
import NotPhotoMain from "@/components/drinking/notphotodrinking/NotPhotoMain";
import PhotoMain from "@/components/drinking/photodrinking/PhotoMain";
import RecordDateInfoMain from "@/components/record/recordDateInfo/RecordDateInfoMain"
import RecordMain from "@/components/record/RecordMain";
import SettingMain from "@/components/setting/SettingMain";
import MydrinkListMain from"@/components/mydrinkList/MydrinkListMain";
import AddmyDrinkMain from "@/components/mydrinkList/addmydrink/AddmyDrinkMain";
import ChangeUI from "@/components/changeUI/ChangeUIMain"

export default function Home() {
  const { nowScreen, loading } = useDrink();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="animate-pulse text-xl font-bold text-yellow-400">
          データを読み込み中...
        </p>
      </div>
    );
  }

  switch (nowScreen) {
    case "HOMEMAIN":
      return <HomeMain />;
    case "DRINKING":
      return <DrinkingMain />;
    case "NOTPHOTOMAIN":
      return <NotPhotoMain />;
    case "PHOTOMAIN":
      return <PhotoMain />;
    case "MYDRINKING":
      return <MydrinkingMain />; 
    case "RECORD":
      return <RecordMain />;
    case "RECORDDATE":
      return <RecordDateInfoMain />;
    case "SETTING":
      return <SettingMain  />
    case "MYDRINKLIST":
      return <MydrinkListMain  />
    case "ADDMYDRINKMAIN":
      return <AddmyDrinkMain  />
    case "CHANGEUI":
      return <ChangeUI/>
    default:
      return <HomeMain />;
  }
}

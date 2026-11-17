"use client";
import {useDrink} from "@/context/DrinkContext"
import {useEffect, useState} from "react";
export default function Header(){
    const {nowScreen,setNowScreen}=useDrink();
    const [deforeScreen,setDeforeScreen]=useState("");

    useEffect(()=>{
    switch(nowScreen){
    case "HOMEMAIN":
      setDeforeScreen();
      break;
    case "DRINKING":
      setDeforeScreen("HOMEMAIN");
      break;
    case "NOTPHOTOMAIN":
      setDeforeScreen("MYDRINKING");
      break;
    case "PHOTOMAIN":
      setDeforeScreen("DRINKING");
      break;
    case "MYDRINKING":
      setDeforeScreen("HOMEMAIN");
      break;
    case "RECORD":
     setDeforeScreen("HOMEMAIN");
     break;
    case "RECORDDATE":
      setDeforeScreen("RECORD");
      break;
    case "SETTING":
      setDeforeScreen("HOMEMAIN");
      break;
    case "MYDRINKLIST":
      setDeforeScreen("HOMEMAIN");
      break;
    case "ADDMYDRINKMAIN":
      setDeforeScreen("MYDRINKLIST");
      break;
    case "CHANGEUI":
      setDeforeScreen("HOMEMAIN");
      break;
    default:
     setDeforeScreen("HOMEMAIN");
     break;
    }
    },[nowScreen])
    

    return(
        <div>
            <button
            onClick={()=>{
                setNowScreen(deforeScreen);
            }}>
                戻る
            </button>
        </div>
    )
}
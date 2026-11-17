
import { useDrink } from "@/context/DrinkContext";
import Header from "@/components/header/Header";
export default function DrinkingMain(){
    const {setUseMydrink,SetUseMydrinkId,user,setNowScreen}=useDrink();
    return(
        <div>
            <Header/>
             <button onClick={() => setNowScreen("HOMEMAIN")}>
        ホーム
      </button>
      <p>
      </p>
      <button 
       onClick={()=>{
        setUseMydrink(false);
        setNowScreen("PHOTOMAIN");
       }
       }>
        市販飲料</button>
        <button 
        onClick={()=>{
        setUseMydrink(true);
        setNowScreen("MYDRINKING");
        }
        }>
        マイドリンク</button>
    </div>
    );
}
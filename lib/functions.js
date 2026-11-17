/**
 * localStorage のタイマー開始時刻を現在時刻に更新する共通関数
 */
export function resetTimerStorage() {
  if (typeof window !== "undefined") {
    const now = Date.now().toString();
    localStorage.setItem("drink_timer_start_time", now);
  }
}

/**
 * user.drinkrecord を日付 (YYYY-MM-DD) ごとにグループ分けしたオブジェクトを返す
 */
export function SearchDate(user) {
  if (!user?.drinkrecord || user.drinkrecord.length === 0) return {};

  return user.drinkrecord.reduce((acc, record) => {
    const d = new Date(record.drinkDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(record);
    return acc;
  }, {});
}

/**
 * user.drinkrecord から指定された searchDate (YYYY-MM-DD) の記録のみを抽出する
 */
export function searchDrinkDate(user, searchDate) {
  if (!user?.drinkrecord || !searchDate) return [];

  return user.drinkrecord.filter((record) => {
    const d = new Date(record.drinkDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;
    return dateKey === searchDate;
  });
}

/**
 * 抽出された記録配列を時間の古い順（昇順）にソートする
 */
export function sortSearchDrinkDate(searchDrinkInfo) {
  if (!Array.isArray(searchDrinkInfo)) return [];
  return [...searchDrinkInfo].sort(
    (a, b) => new Date(a.drinkDate) - new Date(b.drinkDate)
  );
}

export function getuseUI(UI,UIId) {
  if (!Array.isArray(UI)) return null;
  return  UI.find((a)=>{
    const targetId = a.UIId ?? a.UIid;
      return String(targetId) === String(UIId);
      }
  )
}
 
export function showNotification(userProgress) {
  let message = "";

  if (userProgress == 2) {
    message = "時間になりました。水分補給をしてください。";
  } else if (userProgress == 3) {
    message = "前回の水分補給からかなり時間がたっています。すぐに水分補給をしてください。";
  } else if (userProgress == 4) {
    message = "熱中症のリスクがあります。今すぐ水分補給をしてください。";
  } else {
    // 2, 3, 4 以外のときは通知を出さずに終了
    return;
  }

  // if文の外で宣言することで、下の onclick でも使えるようにする
  const notification = new Notification("水分補給のお知らせ", {
    body: message,
    tag: "water-reminder" // 同じタグを指定すると、古い通知が溜まらず最新のものに上書きされる
  });

  // 通知がクリックされたときの動作
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  }
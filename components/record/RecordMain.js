"use client";

import { useState, useMemo } from "react";
import { useDrink } from "@/context/DrinkContext";
import { SearchDate } from "@/lib/functions";
import Header from "@/components/header/Header";
import styles from "./RecordMain.module.css";
import Footer from "@/components/footer/Footer";
export default function RecordMain() {
  const { user, setNowScreen, setSearchDate } = useDrink();
  // 初期状態 {} のときはすべて折りたたみ（true になった項目だけ展開）
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  const datesObj = SearchDate(user) || {};

  // 日付文字列 (例: "2026-10-23") を 年 -> 年/月 -> 日付リスト の階層構造に整理
  const groupedHistory = useMemo(() => {
    const yearsMap = {};

    const sortedEntries = Object.entries(datesObj).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    for (const [rawDate, records] of sortedEntries) {
      const parts = rawDate.split(/[-/]/);
      const year = parts[0] || "不明";
      const month = parts[1] ? `${year}/${parts[1]}` : year;
      const displayDate =
        parts.length >= 3 ? `${parts[0]}/${parts[1]}/${parts[2]}` : rawDate;

      if (!yearsMap[year]) {
        yearsMap[year] = {
          year,
          months: {},
        };
      }

      if (!yearsMap[year].months[month]) {
        yearsMap[year].months[month] = {
          month,
          days: [],
        };
      }

      yearsMap[year].months[month].days.push({
        rawDate,
        displayDate,
        count: Array.isArray(records) ? records.length : 0,
      });
    }

    return Object.values(yearsMap).map((yearGroup) => ({
      year: yearGroup.year,
      months: Object.values(yearGroup.months),
    }));
  }, [datesObj]);

  const toggleYear = (year) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const toggleMonth = (month) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [month]: !prev[month],
    }));
  };

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>ユーザー情報を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.stage}>
        <Header />

        <div className={styles.content}>
          {groupedHistory.length > 0 ? (
            <div className={styles.treeContainer}>
              {groupedHistory.map((yearGroup) => {
                const isYearOpen = Boolean(expandedYears[yearGroup.year]);

                return (
                  <section key={yearGroup.year} className={styles.yearSection}>
                    {/* 第1階層：[ ∨ ] ＋ [ 2026 ] */}
                    <div className={styles.yearHeaderRow}>
                      <button
                        type="button"
                        onClick={() => toggleYear(yearGroup.year)}
                        className={styles.yearToggleBox}
                        aria-expanded={isYearOpen}
                        aria-label={`${yearGroup.year}年を開閉`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className={`${styles.chevronSvg} ${
                            !isYearOpen ? styles.chevronClosed : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="4 5 12 19 20 5" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleYear(yearGroup.year)}
                        className={styles.yearTitleBox}
                      >
                        {yearGroup.year}
                      </button>
                    </div>

                    {/* 2026の後ろに続く外枠div：Vボックスを開いたときだけ表示され中身に合わせて伸びる */}
                    {isYearOpen && (
                      <div className={styles.yearBodyFrame}>
                        <div className={styles.monthList}>
                          {yearGroup.months.map((monthGroup) => {
                            const isMonthOpen = Boolean(
                              expandedMonths[monthGroup.month]
                            );

                            return (
                              <div
                                key={monthGroup.month}
                                className={styles.monthSection}
                              >
                                {/* 第2階層（1段インデント）：[ ∨ ] ＋ [ 2026/10 ] */}
                                <div className={styles.monthHeaderRow}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleMonth(monthGroup.month)
                                    }
                                    className={styles.monthToggleBox}
                                    aria-expanded={isMonthOpen}
                                    aria-label={`${monthGroup.month}を開閉`}
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      className={`${styles.chevronSvg} ${
                                        !isMonthOpen ? styles.chevronClosed : ""
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <polyline points="4 5 12 19 20 5" />
                                    </svg>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleMonth(monthGroup.month)
                                    }
                                    className={styles.monthTitleBox}
                                  >
                                    {monthGroup.month}
                                  </button>
                                </div>

                                {/* 第3階層（2段インデント）：[ 詳細 ] [ 2026/10/23 ] [ ○件 ] */}
                                {isMonthOpen && (
                                  <div className={styles.dayList}>
                                    {monthGroup.days.map((dayItem) => (
                                      <div
                                        key={dayItem.rawDate}
                                        className={styles.dayRow}
                                      >
                                        <button
                                          type="button"
                                          className={styles.detailButton}
                                          onClick={() => {
                                            setSearchDate(dayItem.rawDate);
                                            setNowScreen("RECORDDATE");
                                          }}
                                        >
                                          詳細
                                        </button>

                                        <div className={styles.dateCell}>
                                          {dayItem.displayDate}
                                        </div>

                                        <div className={styles.countCell}>
                                          {dayItem.count}件
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>記録データがありません</div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  );
}
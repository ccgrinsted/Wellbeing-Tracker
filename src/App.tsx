import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Calendar as CalendarIcon, Check, Eye, EyeOff, RotateCcw, LogIn, LogOut, BarChart2, History, Settings, FileDown, AlertTriangle } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { auth, db, loginWithGoogle, logout } from "./firebase";
import { PWAInstallButton } from "./PWAInstallButton";

// Brand Design Tokens
const BRAND = {
  bg: "#0d1412",
  cardBg: "#15201d",
  border: "#283833",
  primary: "#8a9a86",
  accent: "#d4af37",
  text: "#f4f1ea",
  textMuted: "#a3b0a0",
  inputBg: "rgba(13, 20, 18, 0.7)",
};

const DEFAULT_CATEGORIES = [
  "Physical & Energy",
  "Nutrition & Recovery",
  "Mental & Emotional",
  "Spiritual & Purpose",
  "Intellectual & Growth",
  "Romantic & Intimacy",
  "Social & Friendship",
  "Family & Home",
  "Financial",
  "Professional & Career",
  "Creativity & Expression",
  "Community & Service",
];

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeekHabitDetails {
  description: string;
  targetDays: number | null;
}

interface Habit {
  id: number;
  category: string;
  isCustom: boolean;
  completedDates: Record<string, boolean>;
  weekData: Record<string, WeekHabitDetails>;
}

interface WeeklyReport {
  id: string;
  weekStartDate: string;
  totalTargetSum: number;
  totalCappedCompleted: number;
  overallPercentage: number;
}

const formatDateToISO = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const calculateWeekStartDate = (targetDateStr: string, startDayIndex: number): string => {
  const [year, month, day] = targetDateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const currentDayOfWeek = date.getDay();
  
  let diff = currentDayOfWeek - startDayIndex;
  if (diff < 0) diff += 7;
  
  date.setDate(date.getDate() - diff);
  return formatDateToISO(date);
};

function AutoResizingTextarea({ value, onChange, placeholder }: { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder: string }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(52, textareaRef.current.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        backgroundColor: BRAND.inputBg,
        border: `1px solid ${BRAND.border}`,
        borderRadius: "6px",
        padding: "8px 12px",
        color: BRAND.text,
        outline: "none",
        resize: "none",
        whiteSpace: "pre-wrap",
        lineHeight: "1.5",
        overflow: "hidden",
        fontSize: "14px",
        fontFamily: "'Montserrat', sans-serif",
        boxSizing: "border-box",
      }}
    />
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"tracker" | "trends" | "history">("tracker");
  
  const [startDayIndex, setStartDayIndex] = useState<number | null>(() => {
    const saved = localStorage.getItem("tracker_startDayIndex_v2");
    return saved !== null ? Number(saved) : null;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateToISO(new Date()));

  const activeStartDay = startDayIndex ?? 0;
  const weekOf = calculateWeekStartDate(selectedDate, activeStartDay);

  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(() => {
    return localStorage.getItem("tracker_showActiveOnly_v1") === "true";
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempStartDay, setTempStartDay] = useState<number>(activeStartDay);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<WeeklyReport | null>(null);

  const reportPrintRef = useRef<HTMLDivElement>(null);

  const createInitialHabits = (): Habit[] =>
    DEFAULT_CATEGORIES.map((category, index) => ({
      id: index + 1,
      category,
      isCustom: false,
      completedDates: {},
      weekData: {},
    }));

  const [habits, setHabits] = useState<Habit[]>(createInitialHabits);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.habits) setHabits(data.habits);
          if (data.showActiveOnly !== undefined) {
            setShowActiveOnly(data.showActiveOnly);
            localStorage.setItem("tracker_showActiveOnly_v1", String(data.showActiveOnly));
          }
          if (data.startDayIndex !== undefined && data.startDayIndex !== null) {
            setStartDayIndex(data.startDayIndex);
            setTempStartDay(data.startDayIndex);
            localStorage.setItem("tracker_startDayIndex_v2", String(data.startDayIndex));
          }
        }
      });
      return () => unsubscribeDoc();
    } else {
      const savedHabits = localStorage.getItem("tracker_habits_v15");
      if (savedHabits) {
        try {
          const parsed = JSON.parse(savedHabits);
          if (Array.isArray(parsed) && parsed.length > 0) setHabits(parsed);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user]);

  const saveState = async (
    newHabits: Habit[],
    newStartDay?: number | null,
    newActiveOnly?: boolean
  ) => {
    const updatedStartDay = newStartDay !== undefined ? newStartDay : startDayIndex;
    const updatedActiveOnly = newActiveOnly !== undefined ? newActiveOnly : showActiveOnly;

    setHabits(newHabits);

    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          {
            habits: newHabits,
            selectedDate,
            startDayIndex: updatedStartDay,
            showActiveOnly: updatedActiveOnly,
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Firestore sync error:", err);
      }
    } else {
      localStorage.setItem("tracker_habits_v15", JSON.stringify(newHabits));
      if (updatedStartDay !== null) {
        localStorage.setItem("tracker_startDayIndex_v2", String(updatedStartDay));
      }
      localStorage.setItem("tracker_showActiveOnly_v1", String(updatedActiveOnly));
    }
  };

  const handleInitialStartDaySelect = (index: number) => {
    setStartDayIndex(index);
    setTempStartDay(index);
    saveState(habits, index, showActiveOnly);
  };

  const handleStartDayChangeWithReset = () => {
    if (confirm("WARNING: Changing the 'Week Starts On' day will reset ALL past habits, descriptions, targets, and completion history. Are you sure you want to proceed?")) {
      const resetHabits = createInitialHabits();
      setStartDayIndex(tempStartDay);
      setShowSettingsModal(false);
      saveState(resetHabits, tempStartDay, showActiveOnly);
    }
  };

  const getDynamicDaysWithDates = () => {
    const [year, month, day] = weekOf.split("-").map(Number);
    const startDate = new Date(year, month - 1, day);

    return Array.from({ length: 7 }).map((_, offset) => {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + offset);
      const isoDateStr = formatDateToISO(current);
      const dayName = SHORT_DAYS[current.getDay()];
      return {
        name: dayName,
        dateStr: `${current.getMonth() + 1}/${current.getDate()}`,
        isoDateStr,
      };
    });
  };

  const activeDaysWithDates = getDynamicDaysWithDates();
  const currentWeekDateStrings = activeDaysWithDates.map((d) => d.isoDateStr);

  const getComputedReports = (): WeeklyReport[] => {
    const weekSet = new Set<string>();

    habits.forEach((h) => {
      Object.keys(h.completedDates || {}).forEach((d) => {
        weekSet.add(calculateWeekStartDate(d, activeStartDay));
      });
      Object.keys(h.weekData || {}).forEach((wStart) => {
        weekSet.add(wStart);
      });
    });

    weekSet.add(weekOf);

    return Array.from(weekSet)
      .sort((a, b) => b.localeCompare(a))
      .map((wStart) => {
        const wDays = Array.from({ length: 7 }).map((_, idx) => {
          const [y, m, d] = wStart.split("-").map(Number);
          return formatDateToISO(new Date(y, m - 1, d + idx));
        });

        let totalTarget = 0;
        let totalCompleted = 0;

        habits.forEach((h) => {
          const target = h.weekData?.[wStart]?.targetDays || 0;
          const completedInThisWeek = wDays.filter((d) => h.completedDates?.[d]).length;
          if (target > 0) {
            totalTarget += target;
            totalCompleted += Math.min(completedInThisWeek, target);
          }
        });

        const overallPercentage = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

        return {
          id: wStart,
          weekStartDate: wStart,
          totalTargetSum: totalTarget,
          totalCappedCompleted: totalCompleted,
          overallPercentage,
        };
      });
  };

  const computedReports = getComputedReports();

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const toggleShowActiveOnly = () => {
    const newValue = !showActiveOnly;
    setShowActiveOnly(newValue);
    localStorage.setItem("tracker_showActiveOnly_v1", String(newValue));
    saveState(habits, startDayIndex, newValue);
  };

  const handleDescriptionChange = (id: number, text: string) => {
    const updated = habits.map((h) => {
      if (h.id === id) {
        const currentWeekInfo = h.weekData?.[weekOf] || { description: "", targetDays: null };
        return {
          ...h,
          weekData: {
            ...(h.weekData || {}),
            [weekOf]: { ...currentWeekInfo, description: text },
          },
        };
      }
      return h;
    });
    saveState(updated);
  };

  const handleTargetChange = (id: number, value: string) => {
    const targetDays = value === "" ? null : parseInt(value, 10);
    const updated = habits.map((h) => {
      if (h.id === id) {
        const currentWeekInfo = h.weekData?.[weekOf] || { description: "", targetDays: null };
        return {
          ...h,
          weekData: {
            ...(h.weekData || {}),
            [weekOf]: { ...currentWeekInfo, targetDays },
          },
        };
      }
      return h;
    });
    saveState(updated);
  };

  const toggleDayByDate = (id: number, isoDateStr: string) => {
    const updated = habits.map((h) => {
      if (h.id === id) {
        const newCompleted = { ...(h.completedDates || {}) };
        if (newCompleted[isoDateStr]) {
          delete newCompleted[isoDateStr];
        } else {
          newCompleted[isoDateStr] = true;
        }
        return { ...h, completedDates: newCompleted };
      }
      return h;
    });
    saveState(updated);
  };

  const downloadReportPDF = async () => {
    if (!selectedHistoryReport || !reportPrintRef.current) return;
    const element = reportPrintRef.current;
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: `Wellspring_Report_Week_${selectedHistoryReport.weekStartDate}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: BRAND.cardBg },
      jsPDF: { unit: "in", format: "letter", orientation: "landscape" },
    };

    try {
      const html2pdfModule = (await import("html2pdf.js")).default;
      await html2pdfModule().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation error, opening browser print dialog:", err);
      window.print();
    }
  };

  const addCustomCategory = () => {
    const title = prompt("Enter new custom domain name:");
    if (title && title.trim() !== "") {
      const updated: Habit[] = [
        ...habits,
        {
          id: Date.now(),
          category: title.trim(),
          isCustom: true,
          completedDates: {},
          weekData: {},
        },
      ];
      saveState(updated);
    }
  };

  const removeCustomDomain = (id: number, categoryName: string) => {
    if (confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      const updated = habits.filter((h) => h.id !== id);
      saveState(updated);
    }
  };

  const restoreDefaultDomains = () => {
    if (confirm("Restore all default wellbeing domains?")) {
      const fresh = createInitialHabits();
      saveState(fresh);
    }
  };

  const displayedHabits = showActiveOnly
    ? habits.filter((h) => {
        const weekInfo = h.weekData?.[weekOf];
        const hasTarget = weekInfo?.targetDays !== null && weekInfo?.targetDays !== undefined && weekInfo.targetDays > 0;
        const hasDesc = weekInfo?.description && weekInfo.description.trim().length > 0;
        const hasCheckmarks = currentWeekDateStrings.some((d) => h.completedDates?.[d]);
        return hasTarget || hasDesc || hasCheckmarks;
      })
    : habits;

  const totalTargetSum = habits.reduce((acc, h) => acc + (h.weekData?.[weekOf]?.targetDays || 0), 0);
  const totalCappedCompleted = habits.reduce((acc, h) => {
    const target = h.weekData?.[weekOf]?.targetDays || 0;
    const completedInWeek = currentWeekDateStrings.filter((d) => h.completedDates?.[d]).length;
    if (!target) return acc;
    return acc + Math.min(completedInWeek, target);
  }, 0);
  const overallPercentage = totalTargetSum > 0 ? Math.round((totalCappedCompleted / totalTargetSum) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BRAND.bg, color: BRAND.text, padding: "24px", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
      `}</style>

      <PWAInstallButton />

      {/* INITIAL PROMPT: SET START DAY ON FIRST USE */}
      {startDayIndex === null && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13, 20, 18, 0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(6px)" }}>
          <div style={{ backgroundColor: BRAND.cardBg, border: `1px solid ${BRAND.border}`, borderRadius: "12px", padding: "32px", width: "420px", maxWidth: "90%", textAlign: "center" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: BRAND.accent, margin: "0 0 12px 0" }}>Welcome to Wellspring</h2>
            <p style={{ fontSize: "14px", color: BRAND.textMuted, lineHeight: "1.5", margin: "0 0 24px 0" }}>Please choose which day your tracking week begins on. This sets your structure for all trend logging.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {DAYS_OF_WEEK.map((d, idx) => (
                <button key={d} onClick={() => handleInitialStartDaySelect(idx)} style={{ padding: "12px", borderRadius: "8px", border: `1px solid ${BRAND.border}`, backgroundColor: BRAND.bg, color: BRAND.text, fontWeight: "600", cursor: "pointer" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header Navigation */}
        <header style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: BRAND.cardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${BRAND.border}`, marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "26px", margin: 0, color: BRAND.text }}>Wellbeing Accountability Tracker</h1>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={() => { setTempStartDay(activeStartDay); setShowSettingsModal(true); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.textMuted, cursor: "pointer" }} title="Settings">
                <Settings size={18} />
              </button>
              {user ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {user.photoURL && <img src={user.photoURL} alt={user.displayName || "User"} style={{ width: "32px", height: "32px", borderRadius: "50%", border: `1px solid ${BRAND.accent}` }} />}
                  <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: BRAND.bg, color: BRAND.textMuted, border: `1px solid ${BRAND.border}`, padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              ) : (
                <button onClick={loginWithGoogle} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: BRAND.primary, color: BRAND.bg, border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>
                  <LogIn size={14} /> Sign in with Google
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: "8px", borderBottom: `1px solid ${BRAND.border}`, paddingBottom: "12px", flexWrap: "wrap" }}>
            <button onClick={() => setActiveTab("tracker")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: activeTab === "tracker" ? BRAND.primary : "transparent", color: activeTab === "tracker" ? BRAND.bg : BRAND.text, fontWeight: "600", cursor: "pointer" }}>
              <CalendarIcon size={16} /> Tracker
            </button>
            <button onClick={() => setActiveTab("trends")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: activeTab === "trends" ? BRAND.primary : "transparent", color: activeTab === "trends" ? BRAND.bg : BRAND.text, fontWeight: "600", cursor: "pointer" }}>
              <BarChart2 size={16} /> Trend Analytics
            </button>
            <button onClick={() => setActiveTab("history")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: activeTab === "history" ? BRAND.primary : "transparent", color: activeTab === "history" ? BRAND.bg : BRAND.text, fontWeight: "600", cursor: "pointer" }}>
              <History size={16} /> Weekly History ({computedReports.length})
            </button>
          </div>

          {/* Controls Bar */}
          {activeTab === "tracker" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: BRAND.textMuted }}>Week Starts On: <strong style={{ color: BRAND.accent }}>{DAYS_OF_WEEK[activeStartDay]}</strong></span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: BRAND.textMuted }}>Select Date:</span>
                <input type="date" value={selectedDate} onChange={(e) => e.target.value && handleDateChange(e.target.value)} style={{ backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.text, padding: "6px 10px", borderRadius: "6px", outline: "none", fontSize: "12px" }} />
                <button onClick={toggleShowActiveOnly} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", backgroundColor: showActiveOnly ? BRAND.primary : BRAND.bg, color: showActiveOnly ? BRAND.bg : BRAND.text, border: `1px solid ${BRAND.border}`, padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}>
                  {showActiveOnly ? <EyeOff size={14} /> : <Eye size={14} />} {showActiveOnly ? "Show All" : "Active Only"}
                </button>
                <button onClick={restoreDefaultDomains} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", backgroundColor: "transparent", color: BRAND.textMuted, border: `1px solid ${BRAND.border}`, padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}>
                  <RotateCcw size={14} /> Restore Defaults
                </button>
              </div>
            </div>
          )}
        </header>

        {/* TAB 1: MAIN TRACKER */}
        {activeTab === "tracker" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: BRAND.cardBg, padding: "18px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
                <div style={{ fontSize: "12px", color: BRAND.textMuted }}>Active / Total Domains</div>
                <div style={{ fontSize: "24px", fontFamily: "'Playfair Display', serif", fontWeight: "600", marginTop: "4px" }}>
                  {habits.filter((h) => {
                    const weekInfo = h.weekData?.[weekOf];
                    return (weekInfo?.targetDays !== null && weekInfo?.targetDays !== undefined && weekInfo.targetDays > 0) || (weekInfo?.description && weekInfo.description.trim().length > 0) || currentWeekDateStrings.some((d) => h.completedDates?.[d]);
                  }).length} / {habits.length}
                </div>
              </div>
              <div style={{ backgroundColor: BRAND.cardBg, padding: "18px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
                <div style={{ fontSize: "12px", color: BRAND.textMuted }}>Total Days Completed</div>
                <div style={{ fontSize: "24px", fontFamily: "'Playfair Display', serif", fontWeight: "600", color: BRAND.primary, marginTop: "4px" }}>
                  {totalCappedCompleted} / {totalTargetSum} Days
                </div>
              </div>
              <div style={{ backgroundColor: BRAND.cardBg, padding: "18px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
                <div style={{ fontSize: "12px", color: BRAND.textMuted }}>Overall Goal Progress</div>
                <div style={{ fontSize: "24px", fontFamily: "'Playfair Display', serif", fontWeight: "600", color: BRAND.accent, marginTop: "4px" }}>{overallPercentage}%</div>
              </div>
            </div>

            <div style={{ overflowX: "auto", backgroundColor: BRAND.cardBg, borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "1000px" }}>
                <thead>
                  <tr style={{ backgroundColor: BRAND.bg, borderBottom: `1px solid ${BRAND.border}`, fontSize: "12px", color: BRAND.textMuted }}>
                    <th style={{ padding: "16px", width: "160px", fontFamily: "'Playfair Display', serif", fontSize: "14px", color: BRAND.text }}>Domain</th>
                    <th style={{ padding: "16px", width: "360px" }}>Practice / Habit</th>
                    <th style={{ padding: "16px", width: "130px", textAlign: "center" }}>Target</th>
                    {activeDaysWithDates.map((item) => (
                      <th key={item.isoDateStr} style={{ padding: "12px 6px", textAlign: "center", width: "60px" }}>
                        <div>{item.name}</div>
                        {item.dateStr && <div style={{ fontSize: "11px", color: BRAND.accent }}>{item.dateStr}</div>}
                      </th>
                    ))}
                    <th style={{ padding: "16px", textAlign: "center", width: "120px" }}>Result</th>
                    <th style={{ padding: "16px", width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHabits.map((item) => {
                    const weekInfo = item.weekData?.[weekOf] || { description: "", targetDays: null };
                    const completedDaysCount = currentWeekDateStrings.filter((d) => item.completedDates?.[d]).length;
                    const percentage = weekInfo.targetDays && weekInfo.targetDays > 0 ? Math.min(100, Math.round((completedDaysCount / weekInfo.targetDays) * 100)) : 0;
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                        <td style={{ padding: "16px", fontFamily: "'Playfair Display', serif", fontSize: "15px", verticalAlign: "top", paddingTop: "20px" }}>
                          {item.category}
                          {item.isCustom && <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: BRAND.primary, display: "block", marginTop: "2px" }}>(Custom)</span>}
                        </td>
                        <td style={{ padding: "16px", verticalAlign: "top" }}>
                          <AutoResizingTextarea placeholder="Describe practice for this week..." value={weekInfo.description} onChange={(e) => handleDescriptionChange(item.id, e.target.value)} />
                        </td>
                        <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top", paddingTop: "20px" }}>
                          <select value={weekInfo.targetDays === null ? "" : weekInfo.targetDays} onChange={(e) => handleTargetChange(item.id, e.target.value)} style={{ backgroundColor: BRAND.inputBg, border: `1px solid ${BRAND.border}`, borderRadius: "6px", padding: "8px", color: BRAND.text, outline: "none" }}>
                            <option value="">-- Set --</option>
                            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                              <option key={num} value={num}>{num} {num === 1 ? "day" : "days"}</option>
                            ))}
                          </select>
                        </td>
                        {activeDaysWithDates.map((dayInfo) => {
                          const isChecked = !!item.completedDates?.[dayInfo.isoDateStr];
                          return (
                            <td key={dayInfo.isoDateStr} style={{ padding: "6px", textAlign: "center", verticalAlign: "top", paddingTop: "16px" }}>
                              <button onClick={() => toggleDayByDate(item.id, dayInfo.isoDateStr)} style={{ width: "40px", height: "40px", borderRadius: "8px", border: isChecked ? `1px solid ${BRAND.accent}` : `1px solid ${BRAND.border}`, backgroundColor: isChecked ? BRAND.primary : BRAND.inputBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                                <Check size={18} color={isChecked ? BRAND.bg : "transparent"} strokeWidth={3} />
                              </button>
                            </td>
                          );
                        })}
                        <td style={{ padding: "16px", textAlign: "center", fontWeight: "bold", verticalAlign: "top", paddingTop: "20px" }}>
                          {weekInfo.targetDays ? (
                            <div>
                              <span style={{ color: BRAND.accent }}>{completedDaysCount}/{weekInfo.targetDays}</span>
                              <div style={{ fontSize: "11px", color: BRAND.textMuted }}>{percentage}%</div>
                            </div>
                          ) : <span style={{ fontSize: "12px", color: BRAND.textMuted }}>-</span>}
                        </td>
                        <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top", paddingTop: "20px" }}>
                          {item.isCustom && (
                            <button onClick={() => removeCustomDomain(item.id, item.category)} style={{ backgroundColor: "transparent", border: "none", color: "#e57373", cursor: "pointer" }}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "16px" }}>
              <button onClick={addCustomCategory} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: BRAND.primary, color: BRAND.bg, fontWeight: "600", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
                <Plus size={16} /> Add Custom Domain
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TREND ANALYTICS */}
        {activeTab === "trends" && (
          <div style={{ backgroundColor: BRAND.cardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: BRAND.accent, marginTop: 0 }}>Progress Trends Over Time</h2>
            {computedReports.length === 0 ? (
              <p style={{ color: BRAND.textMuted }}>No active weekly data stored yet.</p>
            ) : (
              <div style={{ width: "100%", height: 380, marginTop: "20px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={[...computedReports].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                    <XAxis dataKey="weekStartDate" stroke={BRAND.textMuted} />
                    <YAxis yAxisId="left" orientation="left" stroke={BRAND.primary} />
                    <YAxis yAxisId="right" orientation="right" stroke={BRAND.accent} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: BRAND.bg, borderColor: BRAND.border, color: BRAND.text }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalTargetSum" name="Total Target Days" fill={BRAND.primary} radius={[4, 4, 0, 0]} barSize={32} />
                    <Line yAxisId="right" type="monotone" dataKey="overallPercentage" name="Completion %" stroke={BRAND.accent} strokeWidth={3} dot={{ r: 5, fill: BRAND.accent }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WEEKLY HISTORY */}
        {activeTab === "history" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedHistoryReport ? "300px 1fr" : "1fr", gap: "20px" }}>
            <div style={{ backgroundColor: BRAND.cardBg, padding: "20px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
              <h3 style={{ margin: "0 0 16px 0", fontFamily: "'Playfair Display', serif" }}>Saved Reports</h3>
              {computedReports.length === 0 ? (
                <p style={{ fontSize: "14px", color: BRAND.textMuted }}>No active weekly data recorded yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {computedReports.map((r) => (
                    <button key={r.id} onClick={() => setSelectedHistoryReport(r)} style={{ padding: "12px", backgroundColor: selectedHistoryReport?.id === r.id ? BRAND.primary : BRAND.bg, color: selectedHistoryReport?.id === r.id ? BRAND.bg : BRAND.text, border: `1px solid ${BRAND.border}`, borderRadius: "8px", textAlign: "left", cursor: "pointer", fontWeight: "bold" }}>
                      Week of {r.weekStartDate} ({r.overallPercentage}%)
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedHistoryReport && (
              <div>
                <div ref={reportPrintRef} style={{ backgroundColor: BRAND.cardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                    <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", color: BRAND.accent }}>Week of {selectedHistoryReport.weekStartDate} Report</h3>
                    <button onClick={downloadReportPDF} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: BRAND.primary, color: BRAND.bg, border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
                      <FileDown size={14} /> Download PDF
                    </button>
                  </div>
                  <p style={{ color: BRAND.textMuted, fontSize: "14px" }}>Completed: {selectedHistoryReport.totalCappedCompleted} / {selectedHistoryReport.totalTargetSum} Target Days ({selectedHistoryReport.overallPercentage}%)</p>
                  
                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BRAND.border}`, color: BRAND.textMuted, fontSize: "12px" }}>
                        <th style={{ padding: "8px" }}>Domain</th>
                        <th style={{ padding: "8px" }}>Description</th>
                        <th style={{ padding: "8px", textAlign: "center" }}>Week Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {habits.map((h) => {
                        const wStart = selectedHistoryReport.weekStartDate;
                        const weekInfo = h.weekData?.[wStart] || { description: "", targetDays: null };
                        const [y, m, d] = wStart.split("-").map(Number);
                        const weekDays = Array.from({ length: 7 }).map((_, idx) => {
                          const dt = new Date(y, m - 1, d + idx);
                          return formatDateToISO(dt);
                        });
                        const count = weekDays.filter((dateStr) => h.completedDates?.[dateStr]).length;
                        return (
                          <tr key={h.id} style={{ borderBottom: `1px solid ${BRAND.border}`, fontSize: "14px" }}>
                            <td style={{ padding: "8px", fontWeight: "bold" }}>{h.category}</td>
                            <td style={{ padding: "8px" }}>{weekInfo.description || "-"}</td>
                            <td style={{ padding: "8px", textAlign: "center", color: BRAND.accent }}>
                              {count} / {weekInfo.targetDays || 0} Days
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS MODAL */}
        {showSettingsModal && (
          <div onClick={() => setShowSettingsModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13, 20, 18, 0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: BRAND.cardBg, border: `1px solid ${BRAND.border}`, borderRadius: "12px", padding: "28px", width: "420px", maxWidth: "90%", color: BRAND.text }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Settings size={20} color={BRAND.accent} />
                <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "20px" }}>Settings</h3>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "13px", color: BRAND.textMuted, display: "block", marginBottom: "8px" }}>Week Starts On:</label>
                <select value={tempStartDay} onChange={(e) => setTempStartDay(Number(e.target.value))} style={{ width: "100%", backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.text, padding: "10px", borderRadius: "6px", outline: "none", fontSize: "14px" }}>
                  {DAYS_OF_WEEK.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </div>

              {tempStartDay !== activeStartDay && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", backgroundColor: "rgba(229, 115, 115, 0.15)", border: "1px solid #e57373", borderRadius: "8px", padding: "12px", marginBottom: "20px", fontSize: "12px", color: "#f8d7da" }}>
                  <AlertTriangle size={20} color="#e57373" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Warning:</strong> Changing the week start day will clear all past habits, descriptions, and checkmark history across all dates.
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={() => setShowSettingsModal(false)} style={{ backgroundColor: "transparent", color: BRAND.textMuted, border: `1px solid ${BRAND.border}`, padding: "8px 14px", borderRadius: "6px", cursor: "pointer" }}>
                  Cancel
                </button>
                {tempStartDay !== activeStartDay ? (
                  <button onClick={handleStartDayChangeWithReset} style={{ backgroundColor: "#e57373", color: "#fff", border: "none", fontWeight: "bold", padding: "8px 14px", borderRadius: "6px", cursor: "pointer" }}>
                    Apply & Reset Data
                  </button>
                ) : (
                  <button onClick={() => setShowSettingsModal(false)} style={{ backgroundColor: BRAND.primary, color: BRAND.bg, border: "none", fontWeight: "bold", padding: "8px 14px", borderRadius: "6px", cursor: "pointer" }}>
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
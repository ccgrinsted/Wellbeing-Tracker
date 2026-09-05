import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Calendar as CalendarIcon, Check, RefreshCw, Eye, EyeOff, RotateCcw, LogIn, LogOut, BarChart2, History, Settings, FileDown } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
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

interface Habit {
  id: number;
  category: string;
  description: string;
  targetDays: number | null;
  days: boolean[];
  isCustom: boolean;
}

interface WeeklyReport {
  id: string;
  weekStartDate: string;
  habitsSnapshot: Habit[];
  totalTargetSum: number;
  totalCappedCompleted: number;
  overallPercentage: number;
  createdAt: string;
}

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
  const [startDayIndex, setStartDayIndex] = useState<number>(() => {
    return Number(localStorage.getItem("tracker_startDayIndex")) || 0;
  });

  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [weekOf, setWeekOf] = useState<string>(() => {
    return localStorage.getItem("tracker_weekOf_v1") || getTodayString();
  });

  // Sticky User Preference
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(() => {
    return localStorage.getItem("tracker_showActiveOnly_v1") === "true";
  });

  const [showResetModal, setShowResetModal] = useState(false);

  const [reports, setReports] = useState<WeeklyReport[]>(() => {
    const saved = localStorage.getItem("tracker_reports_v1");
    return saved ? JSON.parse(saved) : [];
  });

  const [pendingReport, setPendingReport] = useState<WeeklyReport | null>(null);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<WeeklyReport | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const reportPrintRef = useRef<HTMLDivElement>(null);

  const createInitialHabits = (): Habit[] =>
    DEFAULT_CATEGORIES.map((category, index) => ({
      id: index + 1,
      category,
      description: "",
      targetDays: null,
      days: [false, false, false, false, false, false, false],
      isCustom: false,
    }));

  const [habits, setHabits] = useState<Habit[]>(createInitialHabits);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Sync state with LocalStorage/Firestore across devices
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.habits) setHabits(data.habits);
          if (data.weekOf) setWeekOf(data.weekOf);
          if (data.showActiveOnly !== undefined) {
            setShowActiveOnly(data.showActiveOnly);
            localStorage.setItem("tracker_showActiveOnly_v1", String(data.showActiveOnly));
          }
          if (data.startDayIndex !== undefined) setStartDayIndex(data.startDayIndex);
          if (data.reports) setReports(data.reports);
        }
      });
      return () => unsubscribeDoc();
    } else {
      const savedHabits = localStorage.getItem("tracker_habits_v12");
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

  // Centralized State Persister
  const saveState = async (
    newHabits: Habit[],
    newWeekOf?: string,
    newReports?: WeeklyReport[],
    newStartDay?: number,
    newActiveOnly?: boolean
  ) => {
    const updatedWeek = newWeekOf !== undefined ? newWeekOf : weekOf;
    const updatedReports = newReports !== undefined ? newReports : reports;
    const updatedStartDay = newStartDay !== undefined ? newStartDay : startDayIndex;
    const updatedActiveOnly = newActiveOnly !== undefined ? newActiveOnly : showActiveOnly;

    setHabits(newHabits);
    setReports(updatedReports);

    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          {
            habits: newHabits,
            weekOf: updatedWeek,
            reports: updatedReports,
            startDayIndex: updatedStartDay,
            showActiveOnly: updatedActiveOnly,
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Firestore sync error:", err);
      }
    } else {
      localStorage.setItem("tracker_habits_v12", JSON.stringify(newHabits));
      localStorage.setItem("tracker_weekOf_v1", updatedWeek);
      localStorage.setItem("tracker_reports_v1", JSON.stringify(updatedReports));
      localStorage.setItem("tracker_startDayIndex", String(updatedStartDay));
      localStorage.setItem("tracker_showActiveOnly_v1", String(updatedActiveOnly));
    }
  };

  const handleStartDayChange = (index: number) => {
    setStartDayIndex(index);
    saveState(habits, weekOf, reports, index, showActiveOnly);
  };

  // Toggle button exclusively controls the preference
  const toggleShowActiveOnly = () => {
    const newValue = !showActiveOnly;
    setShowActiveOnly(newValue);
    localStorage.setItem("tracker_showActiveOnly_v1", String(newValue));
    saveState(habits, weekOf, reports, startDayIndex, newValue);
  };

  const getDynamicDaysWithDates = () => {
    if (!weekOf) return SHORT_DAYS.map((name) => ({ name, dateStr: "" }));
    const [year, month, day] = weekOf.split("-").map(Number);
    if (!year || !month || !day) return SHORT_DAYS.map((name) => ({ name, dateStr: "" }));

    const startDate = new Date(year, month - 1, day);

    return Array.from({ length: 7 }).map((_, offset) => {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + offset);
      const dayName = SHORT_DAYS[(startDayIndex + offset) % 7];
      return {
        name: dayName,
        dateStr: `${current.getMonth() + 1}/${current.getDate()}`,
      };
    });
  };

  const activeDaysWithDates = getDynamicDaysWithDates();

  const handleDescriptionChange = (id: number, text: string) => {
    const updated = habits.map((h) => (h.id === id ? { ...h, description: text } : h));
    saveState(updated);
  };

  const handleTargetChange = (id: number, value: string) => {
    const targetDays = value === "" ? null : parseInt(value, 10);
    const updated = habits.map((h) => (h.id === id ? { ...h, targetDays } : h));
    saveState(updated);
  };

  const toggleDay = (id: number, dayIndex: number) => {
    const updated = habits.map((h) => {
      if (h.id === id) {
        const newDays = [...h.days];
        newDays[dayIndex] = !newDays[dayIndex];
        return { ...h, days: newDays };
      }
      return h;
    });
    saveState(updated);
  };

  const clearFormCheckmarks = () => {
    const updated = habits.map((h) => ({
      ...h,
      days: [false, false, false, false, false, false, false],
    }));
    saveState(updated);
  };

  const generatePDFAndReset = async (shouldDownload: boolean) => {
    setShowResetModal(false);

    if (shouldDownload && printRef.current) {
      const element = printRef.current;
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `Wellspring_Accountability_Tracker_Week_${weekOf || "Results"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: BRAND.bg },
        jsPDF: { unit: "in", format: "letter", orientation: "landscape" },
      };

      try {
        const html2pdfModule = (await import("html2pdf.js")).default;
        await html2pdfModule().set(opt).from(element).save();
      } catch (err) {
        console.error("PDF generation error, opening browser print dialog:", err);
        window.print();
      }
    }

    clearFormCheckmarks();
  };

  const finalizeReportAndStartNewWeek = async (downloadPdf: boolean) => {
    if (!pendingReport) return;

    if (downloadPdf && reportPrintRef.current) {
      const element = reportPrintRef.current;
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `Wellspring_Report_${pendingReport.weekStartDate}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: BRAND.bg },
        jsPDF: { unit: "in", format: "letter", orientation: "landscape" },
      };
      try {
        const html2pdfModule = (await import("html2pdf.js")).default;
        await html2pdfModule().set(opt).from(element).save();
      } catch (e) {
        console.error(e);
      }
    }

    const updatedReports = [pendingReport, ...reports.filter((r) => r.id !== pendingReport.id)];

    const [year, month, day] = weekOf.split("-").map(Number);
    const nextWeekDate = new Date(year, month - 1, day + 7);
    const yyyy = nextWeekDate.getFullYear();
    const mm = String(nextWeekDate.getMonth() + 1).padStart(2, "0");
    const dd = String(nextWeekDate.getDate()).padStart(2, "0");
    const newWeekStr = `${yyyy}-${mm}-${dd}`;

    const resetHabits = habits.map((h) => ({
      ...h,
      days: [false, false, false, false, false, false, false],
    }));

    setWeekOf(newWeekStr);
    setPendingReport(null);
    saveState(resetHabits, newWeekStr, updatedReports);
  };

  const downloadReportPdf = async (report: WeeklyReport) => {
    if (!reportPrintRef.current) return;
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: `Wellspring_Report_${report.weekStartDate}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: BRAND.bg },
      jsPDF: { unit: "in", format: "letter", orientation: "landscape" },
    };

    try {
      const html2pdfModule = (await import("html2pdf.js")).default;
      await html2pdfModule().set(opt).from(reportPrintRef.current).save();
    } catch (err) {
      console.error("Error downloading PDF report:", err);
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
          description: "",
          targetDays: null,
          days: [false, false, false, false, false, false, false],
          isCustom: true,
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

  // Filter displaying habits cleanly based on explicitly set user options
  const displayedHabits = showActiveOnly
    ? habits.filter(
        (h) =>
          (h.targetDays !== null && h.targetDays > 0) ||
          h.description.trim().length > 0 ||
          h.days.some(Boolean)
      )
    : habits;

  const totalTargetSum = habits.reduce((acc, h) => acc + (h.targetDays || 0), 0);
  const totalCappedCompleted = habits.reduce((acc, h) => {
    const completed = h.days.filter(Boolean).length;
    if (!h.targetDays || h.targetDays === 0) return acc;
    return acc + Math.min(completed, h.targetDays);
  }, 0);
  const overallPercentage = totalTargetSum > 0 ? Math.round((totalCappedCompleted / totalTargetSum) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BRAND.bg, color: BRAND.text, padding: "24px", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
      `}</style>

      <PWAInstallButton />

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header Navigation */}
        <header style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: BRAND.cardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${BRAND.border}`, marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "26px", margin: 0, color: BRAND.text }}>Wellbeing Accountability Tracker</h1>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
              <History size={16} /> Weekly History ({reports.length})
            </button>
          </div>

          {/* Settings & Controls */}
          {activeTab === "tracker" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Settings size={16} color={BRAND.accent} />
                <span style={{ fontSize: "12px", color: BRAND.textMuted }}>Week Starts On:</span>
                <select value={startDayIndex} onChange={(e) => handleStartDayChange(Number(e.target.value))} style={{ backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.text, padding: "6px 10px", borderRadius: "6px", outline: "none", fontSize: "12px" }}>
                  {DAYS_OF_WEEK.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: BRAND.textMuted }}>Week of:</span>
                <input type="date" value={weekOf} onChange={(e) => e.target.value && setWeekOf(e.target.value)} style={{ backgroundColor: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.text, padding: "6px 10px", borderRadius: "6px", outline: "none", fontSize: "12px" }} />
                <button onClick={toggleShowActiveOnly} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", backgroundColor: showActiveOnly ? BRAND.primary : BRAND.bg, color: showActiveOnly ? BRAND.bg : BRAND.text, border: `1px solid ${BRAND.border}`, padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}>
                  {showActiveOnly ? <EyeOff size={14} /> : <Eye size={14} />} {showActiveOnly ? "Show All" : "Active Only"}
                </button>
                <button onClick={() => setShowResetModal(true)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", backgroundColor: BRAND.bg, color: BRAND.text, border: `1px solid ${BRAND.border}`, padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}>
                  <RefreshCw size={14} color={BRAND.primary} /> Reset Week
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
                  {habits.filter((h) => (h.targetDays !== null && h.targetDays > 0) || h.description.trim().length > 0 || h.days.some(Boolean)).length} / {habits.length}
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

            <div ref={printRef} style={{ overflowX: "auto", backgroundColor: BRAND.cardBg, borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "1000px" }}>
                <thead>
                  <tr style={{ backgroundColor: BRAND.bg, borderBottom: `1px solid ${BRAND.border}`, fontSize: "12px", color: BRAND.textMuted }}>
                    <th style={{ padding: "16px", width: "160px", fontFamily: "'Playfair Display', serif", fontSize: "14px", color: BRAND.text }}>Domain</th>
                    <th style={{ padding: "16px", width: "360px" }}>Practice / Habit</th>
                    <th style={{ padding: "16px", width: "130px", textAlign: "center" }}>Target</th>
                    {activeDaysWithDates.map((item, i) => (
                      <th key={i} style={{ padding: "12px 6px", textAlign: "center", width: "60px" }}>
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
                    const completedDays = item.days.filter(Boolean).length;
                    const percentage = item.targetDays && item.targetDays > 0 ? Math.min(100, Math.round((completedDays / item.targetDays) * 100)) : 0;
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                        <td style={{ padding: "16px", fontFamily: "'Playfair Display', serif", fontSize: "15px", verticalAlign: "top", paddingTop: "20px" }}>
                          {item.category}
                          {item.isCustom && <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: BRAND.primary, display: "block", marginTop: "2px" }}>(Custom)</span>}
                        </td>
                        <td style={{ padding: "16px", verticalAlign: "top" }}>
                          <AutoResizingTextarea placeholder="Describe practice..." value={item.description} onChange={(e) => handleDescriptionChange(item.id, e.target.value)} />
                        </td>
                        <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top", paddingTop: "20px" }}>
                          <select value={item.targetDays === null ? "" : item.targetDays} onChange={(e) => handleTargetChange(item.id, e.target.value)} style={{ backgroundColor: BRAND.inputBg, border: `1px solid ${BRAND.border}`, borderRadius: "6px", padding: "8px", color: BRAND.text, outline: "none" }}>
                            <option value="">-- Set --</option>
                            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                              <option key={num} value={num}>{num} {num === 1 ? "day" : "days"}</option>
                            ))}
                          </select>
                        </td>
                        {item.days.map((checked, index) => (
                          <td key={index} style={{ padding: "6px", textAlign: "center", verticalAlign: "top", paddingTop: "16px" }}>
                            <button onClick={() => toggleDay(item.id, index)} style={{ width: "40px", height: "40px", borderRadius: "8px", border: checked ? `1px solid ${BRAND.accent}` : `1px solid ${BRAND.border}`, backgroundColor: checked ? BRAND.primary : BRAND.inputBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                              <Check size={18} color={checked ? BRAND.bg : "transparent"} strokeWidth={3} />
                            </button>
                          </td>
                        ))}
                        <td style={{ padding: "16px", textAlign: "center", fontWeight: "bold", verticalAlign: "top", paddingTop: "20px" }}>
                          {item.targetDays ? (
                            <div>
                              <span style={{ color: BRAND.accent }}>{completedDays}/{item.targetDays}</span>
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
            {reports.length === 0 ? (
              <p style={{ color: BRAND.textMuted }}>No completed weekly reports logged yet. Complete a weekly cycle to populate trends!</p>
            ) : (
              <div style={{ width: "100%", height: 350, marginTop: "20px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...reports].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
                    <XAxis dataKey="weekStartDate" stroke={BRAND.textMuted} />
                    <YAxis yAxisId="left" stroke={BRAND.accent} domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke={BRAND.primary} />
                    <Tooltip contentStyle={{ backgroundColor: BRAND.bg, borderColor: BRAND.border, color: BRAND.text }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="overallPercentage" name="Completion %" stroke={BRAND.accent} strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="totalTargetSum" name="Total Target Days" stroke={BRAND.primary} strokeWidth={2} />
                  </LineChart>
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
              {reports.length === 0 ? (
                <p style={{ fontSize: "14px", color: BRAND.textMuted }}>No saved historical reports.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {reports.map((r) => (
                    <button key={r.id} onClick={() => setSelectedHistoryReport(r)} style={{ padding: "12px", backgroundColor: selectedHistoryReport?.id === r.id ? BRAND.primary : BRAND.bg, color: selectedHistoryReport?.id === r.id ? BRAND.bg : BRAND.text, border: `1px solid ${BRAND.border}`, borderRadius: "8px", textAlign: "left", cursor: "pointer", fontWeight: "bold" }}>
                      Week of {r.weekStartDate} ({r.overallPercentage}%)
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedHistoryReport && (
              <div ref={reportPrintRef} style={{ backgroundColor: BRAND.cardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", color: BRAND.accent }}>Week of {selectedHistoryReport.weekStartDate} Report</h3>
                  <button onClick={() => downloadReportPdf(selectedHistoryReport)} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: BRAND.primary, color: BRAND.bg, border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                    <FileDown size={14} /> Download PDF
                  </button>
                </div>
                <p style={{ color: BRAND.textMuted, fontSize: "14px" }}>Completed: {selectedHistoryReport.totalCappedCompleted} / {selectedHistoryReport.totalTargetSum} Target Days ({selectedHistoryReport.overallPercentage}%)</p>
                
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BRAND.border}`, color: BRAND.textMuted, fontSize: "12px" }}>
                      <th style={{ padding: "8px" }}>Domain</th>
                      <th style={{ padding: "8px" }}>Description</th>
                      <th style={{ padding: "8px", textAlign: "center" }}>Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistoryReport.habitsSnapshot.filter(h => h.targetDays).map((h) => (
                      <tr key={h.id} style={{ borderBottom: `1px solid ${BRAND.border}`, fontSize: "14px" }}>
                        <td style={{ padding: "8px", fontWeight: "bold" }}>{h.category}</td>
                        <td style={{ padding: "8px" }}>{h.description || "-"}</td>
                        <td style={{ padding: "8px", textAlign: "center", color: BRAND.accent }}>
                          {h.days.filter(Boolean).length} / {h.targetDays} Days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MANUAL RESET MODAL POPUP */}
        {showResetModal && (
          <div onClick={() => setShowResetModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13, 20, 18, 0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: BRAND.cardBg, border: `1px solid ${BRAND.border}`, borderRadius: "12px", padding: "28px", width: "400px", maxWidth: "90%", color: BRAND.text }}>
              <h3 style={{ margin: "0 0 12px 0", fontFamily: "'Playfair Display', serif", fontSize: "20px", color: BRAND.accent }}>Reset Weekly Progress</h3>
              <p style={{ fontSize: "14px", color: BRAND.textMuted, lineHeight: "1.5", margin: "0 0 20px 0" }}>Would you like to download a PDF summary of this week's results before resetting?</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button onClick={() => generatePDFAndReset(true)} style={{ backgroundColor: BRAND.primary, color: BRAND.bg, fontWeight: "bold", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer" }}>Yes, Download PDF & Reset Form</button>
                <button onClick={() => generatePDFAndReset(false)} style={{ backgroundColor: BRAND.bg, color: "#e57373", border: `1px solid ${BRAND.border}`, fontWeight: "bold", padding: "12px", borderRadius: "8px", cursor: "pointer" }}>No, Just Reset Form</button>
                <button onClick={() => setShowResetModal(false)} style={{ backgroundColor: "transparent", color: BRAND.textMuted, border: `1px solid ${BRAND.border}`, padding: "10px", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* MANDATORY END-OF-WEEK REPORT MODAL */}
        {pendingReport && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13, 20, 18, 0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
            <div style={{ backgroundColor: BRAND.cardBg, border: `1px solid ${BRAND.border}`, borderRadius: "12px", padding: "28px", maxWidth: "600px", width: "100%", color: BRAND.text }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: BRAND.accent, marginTop: 0 }}>Weekly Report Ready!</h2>
              <p style={{ color: BRAND.textMuted, fontSize: "14px" }}>
                The tracking cycle for the week of <strong>{pendingReport.weekStartDate}</strong> has ended. Here is your summary:
              </p>

              <div style={{ backgroundColor: BRAND.bg, padding: "16px", borderRadius: "8px", border: `1px solid ${BRAND.border}`, margin: "16px 0" }}>
                <div>Total Completed: <strong>{pendingReport.totalCappedCompleted} / {pendingReport.totalTargetSum} Target Days</strong></div>
                <div style={{ fontSize: "20px", color: BRAND.accent, fontWeight: "bold", marginTop: "4px" }}>Overall Progress: {pendingReport.overallPercentage}%</div>
              </div>

              <p style={{ fontSize: "13px", color: BRAND.textMuted }}>Your results will automatically be stored in your <strong>Weekly History</strong> tab for trend tracking.</p>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button onClick={() => finalizeReportAndStartNewWeek(true)} style={{ flex: 1, backgroundColor: BRAND.primary, color: BRAND.bg, fontWeight: "bold", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <FileDown size={16} /> Download PDF & Start New Week
                </button>
                <button onClick={() => finalizeReportAndStartNewWeek(false)} style={{ backgroundColor: BRAND.bg, color: BRAND.text, border: `1px solid ${BRAND.border}`, padding: "12px 18px", borderRadius: "8px", cursor: "pointer" }}>
                  Skip PDF & Start New Week
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
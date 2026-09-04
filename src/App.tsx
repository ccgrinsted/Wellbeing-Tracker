import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Calendar as CalendarIcon, Check, RefreshCw, Eye, EyeOff, RotateCcw, LogIn, LogOut } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, loginWithGoogle, logout } from "./firebase";

// Brand Design Tokens
const BRAND = {
  bg: "#0d1412",          // Deep Forest / Charcoal (Primary BG)
  cardBg: "#15201d",      // Slightly lighter forest container background
  border: "#283833",      // Subtle muted dark green-gray border
  primary: "#8a9a86",     // Sage Green (Primary Brand)
  accent: "#d4af37",      // Signature Gold (Accent)
  text: "#f4f1ea",        // Cream / Off-White (Typography)
  textMuted: "#a3b0a0",   // Soft muted sage for labels/subtitles
  inputBg: "rgba(13, 20, 18, 0.7)",
};

const DEFAULT_CATEGORIES = [
  "Physical", "Spiritual", "Mental", "Romantic", "Sexual", 
  "Social", "Family", "Financial", "Professional", "Creativity", "Community"
];

const BASE_DAYS = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];

interface Habit {
  id: number;
  category: string;
  description: string;
  targetDays: number | null;
  days: boolean[];
  isCustom: boolean;
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

  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(() => {
    return localStorage.getItem("tracker_showActiveOnly_v1") === "true";
  });

  const [showResetModal, setShowResetModal] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeDoc = onSnapshot(
        userDocRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.habits) setHabits(data.habits);
            if (data.weekOf) setWeekOf(data.weekOf);
            if (data.showActiveOnly !== undefined) setShowActiveOnly(data.showActiveOnly);
          }
        },
        (error) => {
          console.error("Firestore listener error:", error);
        }
      );
      return () => unsubscribeDoc();
    } else {
      const savedHabits = localStorage.getItem("tracker_habits_v12");
      if (savedHabits) {
        try {
          const parsed = JSON.parse(savedHabits);
          if (Array.isArray(parsed) && parsed.length > 0) setHabits(parsed);
        } catch (e) {
          console.error("Failed to parse local habits", e);
        }
      }
      const savedDate = localStorage.getItem("tracker_weekOf_v1");
      if (savedDate) setWeekOf(savedDate);
      
      const savedActiveOnly = localStorage.getItem("tracker_showActiveOnly_v1");
      if (savedActiveOnly !== null) setShowActiveOnly(savedActiveOnly === "true");
    }
  }, [user]);

  const saveHabits = async (newHabits: Habit[]) => {
    setHabits(newHabits);
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { habits: newHabits }, { merge: true });
      } catch (error) {
        console.error("Error saving habits to Firestore:", error);
      }
    } else {
      localStorage.setItem("tracker_habits_v12", JSON.stringify(newHabits));
    }
  };

  const handleWeekOfChange = async (newDate: string) => {
    setWeekOf(newDate);
    localStorage.setItem("tracker_weekOf_v1", newDate);

    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { weekOf: newDate }, { merge: true });
      } catch (error) {
        console.error("Error saving weekOf date to Firestore:", error);
      }
    }
  };

  const handleShowActiveOnlyToggle = async () => {
    const newValue = !showActiveOnly;
    setShowActiveOnly(newValue);
    localStorage.setItem("tracker_showActiveOnly_v1", String(newValue));

    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { showActiveOnly: newValue }, { merge: true });
      } catch (error) {
        console.error("Error saving showActiveOnly to Firestore:", error);
      }
    }
  };

  const getDynamicDaysWithDates = () => {
    if (!weekOf) return BASE_DAYS.map((name) => ({ name, dateStr: "" }));
    
    const [year, month, day] = weekOf.split("-").map(Number);
    if (!year || !month || !day) return BASE_DAYS.map((name) => ({ name, dateStr: "" }));

    const startDate = new Date(year, month - 1, day);
    const startDayIndex = startDate.getDay();

    return Array.from({ length: 7 }).map((_, offset) => {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + offset);
      const dayName = BASE_DAYS[(startDayIndex + offset) % 7];
      return {
        name: dayName,
        dateStr: `${current.getMonth() + 1}/${current.getDate()}`,
      };
    });
  };

  const activeDaysWithDates = getDynamicDaysWithDates();

  const handleDescriptionChange = (id: number, text: string) => {
    const updated = habits.map((h) => (h.id === id ? { ...h, description: text } : h));
    saveHabits(updated);
  };

  const handleTargetChange = (id: number, value: string) => {
    const targetDays = value === "" ? null : parseInt(value, 10);
    const updated = habits.map((h) => (h.id === id ? { ...h, targetDays } : h));
    saveHabits(updated);
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
    saveHabits(updated);
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
      saveHabits(updated);
    }
  };

  const removeCustomDomain = (id: number, categoryName: string) => {
    if (confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      const updated = habits.filter((h) => h.id !== id);
      saveHabits(updated);
    }
  };

  const restoreDefaultDomains = () => {
    if (confirm("Restore all default wellbeing domains?")) {
      const fresh = createInitialHabits();
      saveHabits(fresh);
    }
  };

  const clearFormCheckmarks = () => {
    const updated = habits.map((h) => ({
      ...h,
      days: [false, false, false, false, false, false, false],
    }));
    saveHabits(updated);
  };

  const generatePDFAndReset = async (shouldDownload: boolean) => {
    setShowResetModal(false);

    if (shouldDownload) {
      const element = printRef.current;
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `Wellspring_Accountability_Tracker_Week_${weekOf || "Results"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "in", format: "letter", orientation: "landscape" },
      };

      if ((window as any).html2pdf) {
        await (window as any).html2pdf().set(opt).from(element).save();
      } else {
        window.print();
      }
    }

    clearFormCheckmarks();
  };

  const displayedHabits = showActiveOnly
    ? habits.filter((h) => h.targetDays !== null && h.targetDays > 0)
    : habits;

  const totalTargetSum = habits.reduce((acc, h) => acc + (h.targetDays || 0), 0);

  // Capped completion sum: caps each domain's completed days at its designated target
  const totalCappedCompleted = habits.reduce((acc, h) => {
    const completed = h.days.filter(Boolean).length;
    if (!h.targetDays || h.targetDays === 0) return acc;
    return acc + Math.min(completed, h.targetDays);
  }, 0);

  const overallPercentage = totalTargetSum > 0 ? Math.round((totalCappedCompleted / totalTargetSum) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BRAND.bg, color: BRAND.text, padding: "24px", fontFamily: "'Montserrat', sans-serif" }}>
      {/* Font imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }} ref={printRef}>
        
        {/* Header */}
        <header style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", backgroundColor: BRAND.cardBg, padding: "28px 24px", borderRadius: "12px", border: `1px solid ${BRAND.border}`, marginBottom: "24px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <div style={{ flex: 1 }} />
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: "600", color: BRAND.text, margin: 0, flex: 2, textAlign: "center", letterSpacing: "0.5px" }}>
              Wellbeing Accountability Tracker
            </h1>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              {user ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {user.photoURL && <img src={user.photoURL} alt={user.displayName || "User"} style={{ width: "32px", height: "32px", borderRadius: "50%", border: `1px solid ${BRAND.accent}` }} />}
                  <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: BRAND.bg, color: BRAND.textMuted, border: `1px solid ${BRAND.border}`, padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "'Montserrat', sans-serif" }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              ) : (
                <button onClick={loginWithGoogle} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: BRAND.primary, color: BRAND.bg, border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", fontFamily: "'Montserrat', sans-serif" }}>
                  <LogIn size={14} /> Sign in with Google
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap", width: "100%" }}>
            <button onClick={handleShowActiveOnlyToggle} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", backgroundColor: showActiveOnly ? BRAND.primary : BRAND.bg, color: showActiveOnly ? BRAND.bg : BRAND.text, border: `1px solid ${showActiveOnly ? BRAND.primary : BRAND.border}`, padding: "10px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>
              {showActiveOnly ? <EyeOff size={14} /> : <Eye size={14} />}
              {showActiveOnly ? "Show All Domains" : "Show Active Domains"}
            </button>

            {/* Date Input Box */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: BRAND.bg, padding: "8px 14px", borderRadius: "8px", border: `1px solid ${BRAND.border}`, color: BRAND.text, fontSize: "14px" }}>
              <CalendarIcon size={16} color={BRAND.accent} />
              <span style={{ fontSize: "12px", color: BRAND.textMuted }}>Week of:</span>
              <input 
                type="date" 
                value={weekOf} 
                onChange={(e) => {
                  if (e.target.value) handleWeekOfChange(e.target.value);
                }} 
                style={{ 
                  backgroundColor: "transparent", 
                  border: "none", 
                  color: BRAND.text, 
                  fontWeight: "bold", 
                  outline: "none", 
                  cursor: "pointer",
                  colorScheme: "dark",
                  fontFamily: "'Montserrat', sans-serif"
                }} 
              />
            </div>

            <button onClick={() => setShowResetModal(true)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", backgroundColor: BRAND.bg, color: BRAND.text, border: `1px solid ${BRAND.border}`, padding: "10px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>
              <RefreshCw size={14} color={BRAND.primary} /> Reset Week
            </button>

            <button onClick={restoreDefaultDomains} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", backgroundColor: "transparent", color: BRAND.textMuted, border: `1px solid ${BRAND.border}`, padding: "10px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>
              <RotateCcw size={14} /> Restore Defaults
            </button>
          </div>
        </header>

        {/* Dashboard Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: BRAND.cardBg, padding: "18px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
            <div style={{ fontSize: "12px", color: BRAND.textMuted }}>Active / Total Domains</div>
            <div style={{ fontSize: "24px", fontFamily: "'Playfair Display', serif", fontWeight: "600", marginTop: "4px" }}>
              {habits.filter((h) => h.targetDays !== null && h.targetDays > 0).length}{" "}
              <span style={{ fontSize: "14px", color: BRAND.textMuted, fontFamily: "'Montserrat', sans-serif", fontWeight: "normal" }}>/ {habits.length} Total</span>
            </div>
          </div>
          <div style={{ backgroundColor: BRAND.cardBg, padding: "18px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
            <div style={{ fontSize: "12px", color: BRAND.textMuted }}>Total Days Completed</div>
            <div style={{ fontSize: "24px", fontFamily: "'Playfair Display', serif", fontWeight: "600", color: BRAND.primary, marginTop: "4px" }}>
              {totalCappedCompleted}{" "}
              <span style={{ fontSize: "14px", color: BRAND.textMuted, fontFamily: "'Montserrat', sans-serif", fontWeight: "normal" }}>/ {totalTargetSum} Target Days</span>
            </div>
          </div>
          <div style={{ backgroundColor: BRAND.cardBg, padding: "18px", borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
            <div style={{ fontSize: "12px", color: BRAND.textMuted }}>Overall Goal Progress</div>
            <div style={{ fontSize: "24px", fontFamily: "'Playfair Display', serif", fontWeight: "600", color: BRAND.accent, marginTop: "4px" }}>{overallPercentage}%</div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto", backgroundColor: BRAND.cardBg, borderRadius: "12px", border: `1px solid ${BRAND.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "1000px" }}>
            <thead>
              <tr style={{ backgroundColor: BRAND.bg, borderBottom: `1px solid ${BRAND.border}`, fontSize: "12px", color: BRAND.textMuted }}>
                <th style={{ padding: "16px", width: "140px", fontFamily: "'Playfair Display', serif", fontSize: "14px", color: BRAND.text }}>Wellbeing Domain</th>
                <th style={{ padding: "16px", width: "380px" }}>Habit / Practice Description</th>
                <th style={{ padding: "16px", width: "130px", textAlign: "center" }}>Target (Days/Wk)</th>
                {activeDaysWithDates.map((item, i) => (
                  <th key={i} style={{ padding: "12px 6px", textAlign: "center", width: "60px" }}>
                    <div>{item.name}</div>
                    {item.dateStr && <div style={{ fontSize: "11px", color: BRAND.accent, marginTop: "2px" }}>{item.dateStr}</div>}
                  </th>
                ))}
                <th style={{ padding: "16px", textAlign: "center", width: "120px" }}>Actual Results</th>
                <th style={{ padding: "16px", width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {displayedHabits.map((item) => {
                const completedDays = item.days.filter(Boolean).length;
                const percentage = item.targetDays && item.targetDays > 0 
                  ? Math.min(100, Math.round((completedDays / item.targetDays) * 100)) 
                  : 0;

                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                    <td style={{ padding: "16px", fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: "500", verticalAlign: "top", paddingTop: "20px", color: BRAND.text }}>
                      {item.category}
                      {item.isCustom && <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: BRAND.primary, display: "block", marginTop: "2px" }}>(Custom)</span>}
                    </td>
                    <td style={{ padding: "16px", verticalAlign: "top" }}>
                      <AutoResizingTextarea
                        placeholder="Describe habit clearly..."
                        value={item.description}
                        onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                      />
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top", paddingTop: "20px" }}>
                      <select
                        value={item.targetDays === null ? "" : item.targetDays}
                        onChange={(e) => handleTargetChange(item.id, e.target.value)}
                        style={{ backgroundColor: BRAND.inputBg, border: `1px solid ${BRAND.border}`, borderRadius: "6px", padding: "8px", color: BRAND.text, width: "100%", outline: "none", fontFamily: "'Montserrat', sans-serif" }}
                      >
                        <option value="">-- Select --</option>
                        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                          <option key={num} value={num}>{num} {num === 1 ? "day" : "days"}</option>
                        ))}
                      </select>
                    </td>
                    {item.days.map((checked, index) => (
                      <td key={index} style={{ padding: "6px", textAlign: "center", verticalAlign: "top", paddingTop: "16px" }}>
                        <button
                          onClick={() => toggleDay(item.id, index)}
                          style={{ 
                            width: "42px", 
                            height: "42px", 
                            borderRadius: "8px", 
                            border: checked ? `1px solid ${BRAND.accent}` : `1px solid ${BRAND.border}`, 
                            backgroundColor: checked ? BRAND.primary : BRAND.inputBg, 
                            color: checked ? BRAND.bg : "transparent", 
                            cursor: "pointer", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            margin: "0 auto",
                            transition: "all 0.15s ease-in-out"
                          }}
                        >
                          <Check size={20} strokeWidth={3} color={checked ? BRAND.bg : "transparent"} />
                        </button>
                      </td>
                    ))}
                    <td style={{ padding: "16px", textAlign: "center", fontWeight: "bold", verticalAlign: "top", paddingTop: "20px" }}>
                      {item.targetDays ? (
                        <>
                          <div style={{ color: completedDays > 0 ? BRAND.accent : BRAND.textMuted }}>{completedDays}/{item.targetDays} Days</div>
                          <div style={{ fontSize: "12px", color: BRAND.textMuted, fontWeight: "normal" }}>{percentage}%</div>
                        </>
                      ) : (
                        <div style={{ color: BRAND.textMuted, fontSize: "12px", fontWeight: "normal" }}>Set Target First</div>
                      )}
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
          <button onClick={addCustomCategory} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: BRAND.primary, color: BRAND.bg, fontWeight: "600", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontFamily: "'Montserrat', sans-serif" }}>
            <Plus size={16} /> Add Custom Domain
          </button>
        </div>
      </div>

      {/* Reset Modal Popup */}
      {showResetModal && (
        <div onClick={() => setShowResetModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13, 20, 18, 0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: BRAND.cardBg, border: `1px solid ${BRAND.border}`, borderRadius: "12px", padding: "28px", width: "400px", maxWidth: "90%", color: BRAND.text }}>
            <h3 style={{ margin: "0 0 12px 0", fontFamily: "'Playfair Display', serif", fontSize: "20px", color: BRAND.accent }}>Reset Weekly Progress</h3>
            <p style={{ fontSize: "14px", color: BRAND.textMuted, lineHeight: "1.5", margin: "0 0 20px 0" }}>Would you like to download a PDF summary of this week's results before resetting?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button onClick={() => generatePDFAndReset(true)} style={{ backgroundColor: BRAND.primary, color: BRAND.bg, fontWeight: "bold", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>Yes, Download PDF & Reset Form</button>
              <button onClick={() => generatePDFAndReset(false)} style={{ backgroundColor: BRAND.bg, color: "#e57373", border: `1px solid ${BRAND.border}`, fontWeight: "bold", padding: "12px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>No, Just Reset Form</button>
              <button onClick={() => setShowResetModal(false)} style={{ backgroundColor: "transparent", color: BRAND.textMuted, border: `1px solid ${BRAND.border}`, padding: "10px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Calendar as CalendarIcon, Check, RefreshCw, Eye, EyeOff, RotateCcw, LogIn, LogOut } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, loginWithGoogle, logout } from "./firebase";

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
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        border: "1px solid #334155",
        borderRadius: "6px",
        padding: "8px 12px",
        color: "#f8fafc",
        outline: "none",
        resize: "none",
        whiteSpace: "pre-wrap",
        lineHeight: "1.5",
        overflow: "hidden",
        fontSize: "14px",
        boxSizing: "border-box",
      }}
    />
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [weekOf, setWeekOf] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
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

  // Set default "Week Of" date to current local YYYY-MM-DD on initial mount
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setWeekOf(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Monitor Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Sync data with Firestore if logged in; fall back to localStorage if logged out
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeDoc = onSnapshot(
        userDocRef, 
        (docSnap) => {
          if (docSnap.exists() && docSnap.data().habits) {
            setHabits(docSnap.data().habits);
          }
        },
        (error) => {
          console.error("Firestore listener error:", error);
        }
      );
      return () => unsubscribeDoc();
    } else {
      const saved = localStorage.getItem("tracker_habits_v12");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setHabits(parsed);
        } catch (e) {
          console.error("Failed to parse local habits", e);
        }
      }
    }
  }, [user]);

  // Save changes to Firestore or localStorage
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
        filename: `Wellbeing_Accountability_Tracker_Week_${weekOf || "Results"}.pdf`,
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

  const totalCompleted = habits.reduce((acc, h) => acc + h.days.filter(Boolean).length, 0);
  const totalTargetSum = habits.reduce((acc, h) => acc + (h.targetDays || 0), 0);
  const overallPercentage = totalTargetSum > 0 ? Math.round((totalCompleted / totalTargetSum) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }} ref={printRef}>
        
        {/* Header */}
        <header style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155", marginBottom: "24px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <div style={{ flex: 1 }} />
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#34d399", margin: 0, flex: 2, textAlign: "center" }}>
              Wellbeing Accountability Tracker
            </h1>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              {user ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {user.photoURL && <img src={user.photoURL} alt={user.displayName || "User"} style={{ width: "32px", height: "32px", borderRadius: "50%" }} />}
                  <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#334155", color: "#f8fafc", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              ) : (
                <button onClick={loginWithGoogle} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#10b981", color: "#020617", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>
                  <LogIn size={14} /> Sign in with Google
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap", width: "100%" }}>
            <button onClick={() => setShowActiveOnly(!showActiveOnly)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", backgroundColor: showActiveOnly ? "#10b981" : "#334155", color: showActiveOnly ? "#020617" : "#f8fafc", border: "none", padding: "10px 14px", borderRadius: "8px", cursor: "pointer" }}>
              {showActiveOnly ? <EyeOff size={14} /> : <Eye size={14} />}
              {showActiveOnly ? "Show All Domains" : "Show Active Domains"}
            </button>

            {/* Date Input Box */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#0f172a", padding: "8px 14px", borderRadius: "8px", border: "1px solid #334155", color: "#f8fafc", fontSize: "14px" }}>
              <CalendarIcon size={16} color="#34d399" />
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Week of:</span>
              <input 
                type="date" 
                value={weekOf} 
                onChange={(e) => {
                  if (e.target.value) setWeekOf(e.target.value);
                }} 
                style={{ 
                  backgroundColor: "transparent", 
                  border: "none", 
                  color: "#f8fafc", 
                  fontWeight: "bold", 
                  outline: "none", 
                  cursor: "pointer",
                  colorScheme: "dark"
                }} 
              />
            </div>

            <button onClick={() => setShowResetModal(true)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", backgroundColor: "#334155", color: "#f8fafc", border: "none", padding: "10px 14px", borderRadius: "8px", cursor: "pointer" }}>
              <RefreshCw size={14} /> Reset Week
            </button>

            <button onClick={restoreDefaultDomains} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", backgroundColor: "#0f172a", color: "#94a3b8", border: "1px solid #334155", padding: "10px 14px", borderRadius: "8px", cursor: "pointer" }}>
              <RotateCcw size={14} /> Restore Defaults
            </button>
          </div>
        </header>

        {/* Dashboard Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "12px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Active / Total Domains</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>
              {habits.filter((h) => h.targetDays !== null && h.targetDays > 0).length}{" "}
              <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "normal" }}>/ {habits.length} Total</span>
            </div>
          </div>
          <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "12px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Total Days Completed</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#34d399" }}>
              {totalCompleted}{" "}
              <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "normal" }}>/ {totalTargetSum} Target Days</span>
            </div>
          </div>
          <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "12px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Overall Goal Progress</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#34d399" }}>{overallPercentage}%</div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto", backgroundColor: "#1e293b", borderRadius: "12px", border: "1px solid #334155" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "1000px" }}>
            <thead>
              <tr style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", borderBottom: "1px solid #334155", fontSize: "12px", color: "#94a3b8" }}>
                <th style={{ padding: "16px", width: "140px" }}>Wellbeing Domain</th>
                <th style={{ padding: "16px", width: "380px" }}>Habit / Practice Description</th>
                <th style={{ padding: "16px", width: "130px", textAlign: "center" }}>Target (Days/Wk)</th>
                {activeDaysWithDates.map((item, i) => (
                  <th key={i} style={{ padding: "12px 6px", textAlign: "center", width: "60px" }}>
                    <div>{item.name}</div>
                    {item.dateStr && <div style={{ fontSize: "11px", color: "#34d399", marginTop: "2px" }}>{item.dateStr}</div>}
                  </th>
                ))}
                <th style={{ padding: "16px", textAlign: "center", width: "120px" }}>Actual Results</th>
                <th style={{ padding: "16px", width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {displayedHabits.map((item) => {
                const completedDays = item.days.filter(Boolean).length;
                const percentage = item.targetDays && item.targetDays > 0 ? Math.round((completedDays / item.targetDays) * 100) : 0;

                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #334155" }}>
                    <td style={{ padding: "16px", fontWeight: "500", verticalAlign: "top", paddingTop: "20px" }}>
                      {item.category}
                      {item.isCustom && <span style={{ fontSize: "10px", color: "#34d399", display: "block", marginTop: "2px" }}>(Custom)</span>}
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
                        style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid #334155", borderRadius: "6px", padding: "8px", color: "#f8fafc", width: "100%", outline: "none" }}
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
                          style={{ width: "42px", height: "42px", borderRadius: "8px", border: checked ? "1px solid #10b981" : "1px solid #475569", backgroundColor: checked ? "#10b981" : "rgba(15, 23, 42, 0.8)", color: checked ? "#020617" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}
                        >
                          <Check size={20} strokeWidth={3} />
                        </button>
                      </td>
                    ))}
                    <td style={{ padding: "16px", textAlign: "center", fontWeight: "bold", verticalAlign: "top", paddingTop: "20px" }}>
                      {item.targetDays ? (
                        <>
                          <div style={{ color: completedDays > 0 ? "#34d399" : "#64748b" }}>{completedDays}/{item.targetDays} Days</div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "normal" }}>{percentage}%</div>
                        </>
                      ) : (
                        <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "normal" }}>Set Target First</div>
                      )}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top", paddingTop: "20px" }}>
                      {item.isCustom && (
                        <button onClick={() => removeCustomDomain(item.id, item.category)} style={{ backgroundColor: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}>
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
          <button onClick={addCustomCategory} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#10b981", color: "#020617", fontWeight: "600", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
            <Plus size={16} /> Add Custom Domain
          </button>
        </div>
      </div>

      {/* Reset Modal Popup */}
      {showResetModal && (
        <div onClick={() => setShowResetModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "400px", maxWidth: "90%", color: "#f8fafc" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#34d399" }}>Reset Weekly Progress</h3>
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 20px 0" }}>Would you like to download a PDF summary of this week's results before resetting?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button onClick={() => generatePDFAndReset(true)} style={{ backgroundColor: "#10b981", color: "#020617", fontWeight: "bold", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer" }}>Yes, Download PDF & Reset Form</button>
              <button onClick={() => generatePDFAndReset(false)} style={{ backgroundColor: "#ef4444", color: "#ffffff", fontWeight: "bold", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer" }}>No, Just Reset Form</button>
              <button onClick={() => setShowResetModal(false)} style={{ backgroundColor: "transparent", color: "#94a3b8", border: "1px solid #334155", padding: "10px", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
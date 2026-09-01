import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Calendar as CalendarIcon, Check, RefreshCw, ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw } from "lucide-react";

const DEFAULT_CATEGORIES = [
  "Physical",
  "Spiritual",
  "Mental",
  "Romantic",
  "Sexual",
  "Social",
  "Family",
  "Financial",
  "Professional",
  "Creativity",
  "Community",
];

const BASE_DAYS = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];

function AutoResizingTextarea({ value, onChange, placeholder }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(
        52,
        textareaRef.current.scrollHeight
      )}px`;
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

function DatePickerModal({ selectedDate, onSelect, onClose }) {
  const today = new Date();
  const initialDate = selectedDate ? new Date(selectedDate + "T00:00:00") : today;
  
  const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const changeMonth = (offset) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  const formatDateString = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleDayClick = (dayNumber) => {
    const picked = new Date(year, month, dayNumber);
    onSelect(formatDateString(picked));
  };

  const handleTodayClick = () => {
    onSelect(formatDateString(today));
  };

  const todayStr = formatDateString(today);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
          padding: "20px",
          width: "320px",
          color: "#f8fafc",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <button
            onClick={() => changeMonth(-1)}
            style={{ backgroundColor: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ fontWeight: "bold", fontSize: "16px" }}>
            {monthNames[month]} {year}
          </div>
          <button
            onClick={() => changeMonth(1)}
            style={{ backgroundColor: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
          {BASE_DAYS.map((d) => (
            <div key={d}>{d[0]}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "16px" }}>
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: totalDaysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const currentCellDateStr = formatDateString(new Date(year, month, dayNum));
            const isToday = currentCellDateStr === todayStr;
            const isSelected = currentCellDateStr === selectedDate;

            return (
              <button
                key={dayNum}
                onClick={() => handleDayClick(dayNum)}
                style={{
                  height: "36px",
                  borderRadius: "6px",
                  border: isToday ? "2px solid #34d399" : "none",
                  backgroundColor: isSelected ? "#10b981" : isToday ? "rgba(52, 211, 153, 0.15)" : "#0f172a",
                  color: isSelected ? "#020617" : isToday ? "#34d399" : "#f8fafc",
                  fontWeight: isSelected || isToday ? "bold" : "normal",
                  cursor: "pointer",
                }}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <button
            onClick={handleTodayClick}
            style={{
              flex: 1,
              backgroundColor: "#10b981",
              color: "#020617",
              fontWeight: "bold",
              border: "none",
              padding: "8px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Today
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              backgroundColor: "#334155",
              color: "#f8fafc",
              border: "none",
              padding: "8px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [weekOf, setWeekOf] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const printRef = useRef(null);

  const createInitialHabits = () =>
    DEFAULT_CATEGORIES.map((category, index) => ({
      id: index + 1,
      category,
      description: "",
      targetDays: null,
      days: [false, false, false, false, false, false, false],
      isCustom: false,
    }));

  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem("tracker_habits_v12");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse habits", e);
      }
    }
    return createInitialHabits();
  });

  useEffect(() => {
    localStorage.setItem("tracker_habits_v12", JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setWeekOf(`${yyyy}-${mm}-${dd}`);
  }, []);

  const getDynamicDaysWithDates = () => {
    if (!weekOf) return BASE_DAYS.map((name) => ({ name, dateStr: "" }));

    const startDate = new Date(weekOf + "T00:00:00");
    const startDayIndex = startDate.getDay();

    return Array.from({ length: 7 }).map((_, offset) => {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + offset);

      const dayName = BASE_DAYS[(startDayIndex + offset) % 7];
      const month = current.getMonth() + 1;
      const day = current.getDate();

      return {
        name: dayName,
        dateStr: `${month}/${day}`,
      };
    });
  };

  const activeDaysWithDates = getDynamicDaysWithDates();

  const handleDescriptionChange = (id, text) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, description: text } : h))
    );
  };

  const handleTargetChange = (id, value) => {
    const targetDays = value === "" ? null : parseInt(value);
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, targetDays } : h))
    );
  };

  const toggleDay = (id, dayIndex) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const newDays = [...h.days];
          newDays[dayIndex] = !newDays[dayIndex];
          return { ...h, days: newDays };
        }
        return h;
      })
    );
  };

  const addCustomCategory = () => {
    const title = prompt("Enter new custom domain name:");
    if (title && title.trim() !== "") {
      setHabits((prev) => [
        ...prev,
        {
          id: Date.now(),
          category: title.trim(),
          description: "",
          targetDays: null,
          days: [false, false, false, false, false, false, false],
          isCustom: true,
        },
      ]);
    }
  };

  const removeCustomDomain = (id, categoryName) => {
    if (confirm(`Are you sure you want to delete the custom domain "${categoryName}"?`)) {
      setHabits((prev) => prev.filter((h) => h.id !== id));
    }
  };

  const restoreDefaultDomains = () => {
    if (confirm("Restore all default wellbeing domains?")) {
      const fresh = createInitialHabits();
      setHabits(fresh);
      localStorage.setItem("tracker_habits_v12", JSON.stringify(fresh));
    }
  };

  const clearFormCheckmarks = () => {
    setHabits((prev) =>
      prev.map((h) => ({
        ...h,
        days: [false, false, false, false, false, false, false],
      }))
    );
  };

  const generatePDFAndReset = async (shouldDownload) => {
    setShowResetModal(false);

    if (shouldDownload) {
      const element = printRef.current;
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `Accountability_Tracker_Week_${weekOf || "Results"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "in", format: "letter", orientation: "landscape" },
      };

      if (window.html2pdf) {
        await window.html2pdf().set(opt).from(element).save();
      } else {
        window.print();
      }
    }

    clearFormCheckmarks();
  };

  const displayedHabits = showActiveOnly
    ? habits.filter((h) => h.targetDays !== null && h.targetDays > 0)
    : habits;

  const totalCompleted = habits.reduce(
    (acc, h) => acc + h.days.filter(Boolean).length,
    0
  );
  const totalTargetSum = habits.reduce((acc, h) => acc + (h.targetDays || 0), 0);
  const overallPercentage =
    totalTargetSum > 0 ? Math.round((totalCompleted / totalTargetSum) * 100) : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }} ref={printRef}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            backgroundColor: "#1e293b",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #334155",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#34d399",
                margin: 0,
              }}
            >
              Accountability Tracker
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <button
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: "600",
                backgroundColor: showActiveOnly ? "#10b981" : "#334155",
                color: showActiveOnly ? "#020617" : "#f8fafc",
                border: "none",
                padding: "10px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {showActiveOnly ? <EyeOff size={14} /> : <Eye size={14} />}
              {showActiveOnly ? "Show All Domains" : "Show Active Domains"}
            </button>

            <button
              onClick={() => setIsCalendarOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#0f172a",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #334155",
                color: "#f8fafc",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              <CalendarIcon size={16} color="#34d399" />
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Week of:</span>
              <span style={{ fontWeight: "bold" }}>{weekOf || "Select Date"}</span>
            </button>

            <button
              onClick={() => setShowResetModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                backgroundColor: "#334155",
                color: "#f8fafc",
                border: "none",
                padding: "10px 14px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} /> Reset Week
            </button>

            <button
              onClick={restoreDefaultDomains}
              title="Restore all default domains if any are missing"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                backgroundColor: "#0f172a",
                color: "#94a3b8",
                border: "1px solid #334155",
                padding: "10px 14px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={14} /> Restore Defaults
            </button>
          </div>
        </header>

        {/* Dashboard Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
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
              <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "normal" }}>
                / {totalTargetSum} Target Days
              </span>
            </div>
          </div>
          <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "12px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Overall Goal Progress</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#34d399" }}>
              {overallPercentage}%
            </div>
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
                    {item.dateStr && (
                      <div style={{ fontSize: "11px", color: "#34d399", marginTop: "2px" }}>
                        {item.dateStr}
                      </div>
                    )}
                  </th>
                ))}
                <th style={{ padding: "16px", textAlign: "center", width: "120px" }}>Actual Results</th>
                <th style={{ padding: "16px", width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {displayedHabits.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>
                    No active domains selected. Choose a Target (Days/Wk) for any domain or click <strong>Show All Domains</strong>.
                  </td>
                </tr>
              ) : (
                displayedHabits.map((item) => {
                  const completedDays = item.days.filter(Boolean).length;
                  const percentage =
                    item.targetDays && item.targetDays > 0
                      ? Math.round((completedDays / item.targetDays) * 100)
                      : 0;

                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "16px", fontWeight: "500", verticalAlign: "top", paddingTop: "20px" }}>
                        {item.category}
                        {item.isCustom && (
                          <span style={{ fontSize: "10px", color: "#34d399", display: "block", marginTop: "2px" }}>
                            (Custom)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "16px", verticalAlign: "top" }}>
                        <AutoResizingTextarea
                          placeholder="Describe habit clearly... (Press Enter to add lines)"
                          value={item.description}
                          onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                        />
                      </td>
                      <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top", paddingTop: "20px" }}>
                        <select
                          value={item.targetDays === null ? "" : item.targetDays}
                          onChange={(e) => handleTargetChange(item.id, e.target.value)}
                          style={{
                            backgroundColor: "rgba(15, 23, 42, 0.6)",
                            border: "1px solid #334155",
                            borderRadius: "6px",
                            padding: "8px",
                            color: "#f8fafc",
                            width: "100%",
                            outline: "none",
                          }}
                        >
                          <option value="">-- Select --</option>
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                            <option key={num} value={num}>
                              {num} {num === 1 ? "day" : "days"}
                            </option>
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
                              border: checked ? "1px solid #10b981" : "1px solid #475569",
                              backgroundColor: checked ? "#10b981" : "rgba(15, 23, 42, 0.8)",
                              color: checked ? "#020617" : "transparent",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto",
                            }}
                          >
                            <Check size={20} strokeWidth={3} />
                          </button>
                        </td>
                      ))}
                      <td style={{ padding: "16px", textAlign: "center", fontWeight: "bold", verticalAlign: "top", paddingTop: "20px" }}>
                        {item.targetDays ? (
                          <>
                            <div style={{ color: completedDays > 0 ? "#34d399" : "#64748b" }}>
                              {completedDays}/{item.targetDays} Days
                            </div>
                            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "normal" }}>
                              {percentage}%
                            </div>
                          </>
                        ) : (
                          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "normal" }}>
                            Set Target First
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top", paddingTop: "20px" }}>
                        {item.isCustom ? (
                          <button
                            onClick={() => removeCustomDomain(item.id, item.category)}
                            title="Delete custom domain"
                            style={{
                              backgroundColor: "transparent",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "16px" }}>
          <button
            onClick={addCustomCategory}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#10b981",
              color: "#020617",
              fontWeight: "600",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            <Plus size={16} /> Add Custom Domain
          </button>
        </div>
      </div>

      {/* Reset Modal Popup */}
      {showResetModal && (
        <div
          onClick={() => setShowResetModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "24px",
              width: "400px",
              maxWidth: "90%",
              color: "#f8fafc",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#34d399" }}>
              Reset Weekly Progress
            </h3>
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 20px 0" }}>
              Would you like to download a PDF summary of this week's completed results before resetting the form?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => generatePDFAndReset(true)}
                style={{
                  backgroundColor: "#10b981",
                  color: "#020617",
                  fontWeight: "bold",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Yes, Download PDF & Reset Form
              </button>
              <button
                onClick={() => generatePDFAndReset(false)}
                style={{
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  fontWeight: "bold",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                No, Just Reset Form
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                style={{
                  backgroundColor: "transparent",
                  color: "#94a3b8",
                  border: "1px solid #334155",
                  padding: "10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {isCalendarOpen && (
        <DatePickerModal
          selectedDate={weekOf}
          onSelect={(dateStr) => {
            setWeekOf(dateStr);
            setIsCalendarOpen(false);
          }}
          onClose={() => setIsCalendarOpen(false)}
        />
      )}
    </div>
  );
}
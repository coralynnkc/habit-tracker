import { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  CheckCheck,
} from "lucide-react";

// --- Types ---
type Level = { id: string; label: string };

type Habit = {
  id: string;
  name: string;
  levels: Level[]; // 2–5 user-defined levels
  logs: Record<string, number>; // YYYY-MM-DD -> level index (1..N), 0/absent = not logged
};

type View = "month" | "track";

// --- Constants ---
const STORAGE_KEY = "bujo-habit-tracker.v1";

// Predefined monochromatic palette per month (base color for ombre)
const MONTH_COLORS: string[] = [
  "#7EC8E3", // Jan – icy blue
  "#D4607A", // Feb – valentines pink
  "#4A9B6F", // Mar – clover green
  "#9B7FD4", // Apr – lavender purple
  "#E8C832", // May – golden yellow
  "#6A35B0", // Jun – royal purple
  "#C02040", // Jul – ruby red
  "#E08820", // Aug – yellow orange
  "#8B2040", // Sep – burgundy red
  "#D06020", // Oct – pumpkin orange
  "#A05530", // Nov – orange-brown
  "#2855A8", // Dec – sapphire blue
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// --- Color utilities ---
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Blend month color with white. Level 0 returns empty string (render as white). */
function getLevelColor(
  monthHex: string,
  level: number,
  totalLevels: number,
): string {
  if (level === 0) return "";
  const [r, g, b] = hexToRgb(monthHex);
  const alpha = level / totalLevels; // 0 < alpha ≤ 1
  const mix = (ch: number) => Math.round(255 * (1 - alpha) + ch * alpha);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// --- Persistence ---
const uid = () => Math.random().toString(36).slice(2, 9);

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns a 0–10 score for a habit in a given month.
 *  Each day contributes (level / totalLevels) * 10; unlogged days = 0. */
function habitMonthScore(habit: Habit, year: number, month: number): number {
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const daysElapsed = isCurrentMonth
    ? today.getDate()
    : getDaysInMonth(year, month);
  let total = 0;
  for (let d = 1; d <= daysElapsed; d++) {
    const key = dateKey(year, month, d);
    const level = habit.logs[key] ?? 0;
    total += (level / habit.levels.length) * 10;
  }
  return total / daysElapsed;
}

function load(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Habit[]) : [];
  } catch {
    return [];
  }
}

// --- App ---
export default function App() {
  const [habits, setHabits] = useState<Habit[]>(() => load());
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<View>("month");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  const monthColor = MONTH_COLORS[month];

  function addHabit(name: string, levels: Level[]) {
    setHabits((hs) => [...hs, { id: uid(), name, levels, logs: {} }]);
  }

  function deleteHabit(id: string) {
    setHabits((hs) => hs.filter((h) => h.id !== id));
  }

  function logHabit(habitId: string, date: string, level: number) {
    setHabits((hs) =>
      hs.map((h) =>
        h.id === habitId ? { ...h, logs: { ...h.logs, [date]: level } } : h,
      ),
    );
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F7F4EE" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1
            className="text-lg font-bold text-gray-800 tracking-tight"
            style={{ fontFamily: "Georgia, serif" }}
          >
            habit journal
          </h1>
          {view === "month" ? (
            <button
              onClick={() => setView("track")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: monthColor }}
            >
              <CheckCheck className="w-4 h-4" />
              Track today
            </button>
          ) : (
            <button
              onClick={() => setView("month")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>
      </header>

      {view === "month" ? (
        <MonthView
          habits={[...habits].sort((a, b) => a.name.localeCompare(b.name))}
          month={month}
          year={year}
          monthColor={monthColor}
          onShiftMonth={shiftMonth}
          onDeleteHabit={deleteHabit}
          onLogHabit={logHabit}
          onAddHabit={() => setShowAddModal(true)}
        />
      ) : (
        <TrackToday
          habits={[...habits].sort((a, b) => a.name.localeCompare(b.name))}
          monthColor={monthColor}
          onLog={logHabit}
          onDone={() => setView("month")}
        />
      )}

      {showAddModal && (
        <AddHabitModal
          monthColor={monthColor}
          onAdd={(name, levels) => {
            addHabit(name, levels);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// --- Month View ---
function MonthView({
  habits,
  month,
  year,
  monthColor,
  onShiftMonth,
  onDeleteHabit,
  onLogHabit,
  onAddHabit,
}: {
  habits: Habit[];
  month: number;
  year: number;
  monthColor: string;
  onShiftMonth: (delta: number) => void;
  onDeleteHabit: (id: string) => void;
  onLogHabit: (id: string, date: string, level: number) => void;
  onAddHabit: () => void;
}) {
  const [hoveredHabit, setHoveredHabit] = useState<string | null>(null);
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayDay =
    new Date().getMonth() === month && new Date().getFullYear() === year
      ? new Date().getDate()
      : null;

  function handleCellClick(habit: Habit, day: number) {
    const key = dateKey(year, month, day);
    const current = habit.logs[key] ?? 0;
    const next = current >= habit.levels.length ? 0 : current + 1;
    onLogHabit(habit.id, key, next);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onShiftMonth(-1)}
          className="p-2 rounded-lg hover:bg-white text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2
            className="text-2xl font-bold text-gray-800"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {MONTH_NAMES[month]}
          </h2>
          <p className="text-sm text-gray-400">{year}</p>
        </div>
        <button
          onClick={() => onShiftMonth(1)}
          className="p-2 rounded-lg hover:bg-white text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {habits.length === 0 ? (
        <EmptyState onAddHabit={onAddHabit} monthColor={monthColor} />
      ) : (
        <>
          {/* Grid */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table
                className="border-collapse"
                style={{ minWidth: `${132 + daysInMonth * 30}px` }}
              >
                <thead>
                  <tr>
                    <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      habit
                    </th>
                    {days.map((d) => (
                      <th
                        key={d}
                        className="w-7 pb-2 pt-3 text-center text-xs border-b border-gray-100 select-none"
                        style={{
                          color: d === todayDay ? monthColor : "#9CA3AF",
                          fontWeight: d === todayDay ? 700 : 400,
                        }}
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {habits.map((habit, idx) => (
                    <tr
                      key={habit.id}
                      className={
                        idx < habits.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }
                      onMouseEnter={() => setHoveredHabit(habit.id)}
                      onMouseLeave={() => setHoveredHabit(null)}
                    >
                      {/* Name cell */}
                      <td className="px-4 py-2 border-r border-gray-100">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {habit.name}
                          </span>
                          <button
                            onClick={() => onDeleteHabit(habit.id)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-all shrink-0"
                            style={{
                              opacity: hoveredHabit === habit.id ? 1 : 0,
                            }}
                            title="Delete habit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      {/* Day cells */}
                      {days.map((d) => {
                        const key = dateKey(year, month, d);
                        const level = habit.logs[key] ?? 0;
                        const bg = getLevelColor(
                          monthColor,
                          level,
                          habit.levels.length,
                        );
                        return (
                          <td key={d} className="p-0.5">
                            <button
                              onClick={() => handleCellClick(habit, d)}
                              title={
                                level > 0
                                  ? habit.levels[level - 1]?.label
                                  : "Not logged — click to log"
                              }
                              className="w-6 h-6 rounded-sm transition-all hover:scale-110 active:scale-95"
                              style={{
                                backgroundColor: bg || "white",
                                border: bg
                                  ? "1px solid transparent"
                                  : "1px solid #E5E7EB",
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly averages */}
          <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-1 border-b border-gray-100">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Monthly averages
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {habits.map((habit) => {
                const score = habitMonthScore(habit, year, month);
                return (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span className="text-sm text-gray-600 w-32 truncate shrink-0">
                      {habit.name}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${score * 10}%`,
                          backgroundColor: monthColor,
                          opacity: 0.7 + score * 0.03,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-500 w-8 text-right tabular-nums">
                      {score.toFixed(1)}
                    </span>
                  </div>
                );
              })}
              {/* Overall */}
              {habits.length > 1 &&
                (() => {
                  const overall =
                    habits.reduce(
                      (sum, h) => sum + habitMonthScore(h, year, month),
                      0,
                    ) / habits.length;
                  return (
                    <div className="flex items-center gap-3 px-5 py-3 bg-gray-50">
                      <span className="text-sm font-semibold text-gray-500 w-32 shrink-0">
                        Overall
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${overall * 10}%`,
                            backgroundColor: monthColor,
                          }}
                        />
                      </div>
                      <span
                        className="text-sm font-bold w-8 text-right tabular-nums"
                        style={{ color: monthColor }}
                      >
                        {overall.toFixed(1)}
                      </span>
                    </div>
                  );
                })()}
            </div>
          </div>

          {/* Add habit */}
          <button
            onClick={onAddHabit}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: monthColor }}
          >
            <Plus className="w-4 h-4" />
            Add habit
          </button>
        </>
      )}
    </main>
  );
}

// --- Track Today ---
function TrackToday({
  habits,
  monthColor,
  onLog,
  onDone,
}: {
  habits: Habit[];
  monthColor: string;
  onLog: (id: string, date: string, level: number) => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const today = todayStr();

  if (habits.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">No habits to track yet.</p>
        <button
          onClick={onDone}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  if (step >= habits.length) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: `${monthColor}20` }}
        >
          <CheckCheck className="w-8 h-8" style={{ color: monthColor }} />
        </div>
        <h2
          className="text-2xl font-bold text-gray-800 mb-2"
          style={{ fontFamily: "Georgia, serif" }}
        >
          All done!
        </h2>
        <p className="text-gray-400 text-sm mb-8">
          You've logged all your habits for today.
        </p>
        <button
          onClick={onDone}
          className="px-6 py-3 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: monthColor }}
        >
          View this month
        </button>
      </div>
    );
  }

  const habit = habits[step];
  const currentLevel = habit.logs[today] ?? 0;

  function select(level: number) {
    onLog(habit.id, today, level);
    setStep((s) => s + 1);
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>
            {step + 1} of {habits.length}
          </span>
          <span>{today}</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${(step / habits.length) * 100}%`,
              backgroundColor: monthColor,
            }}
          />
        </div>
      </div>

      {/* Habit card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Color strip */}
        <div className="h-1.5" style={{ backgroundColor: monthColor }} />

        <div className="p-6">
          <h2
            className="text-2xl font-bold text-gray-800 mb-6"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {habit.name}
          </h2>

          <div className="space-y-2">
            {/* Skip / nothing */}
            <button
              onClick={() => select(0)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: currentLevel === 0 ? "#D1D5DB" : "#F3F4F6",
                backgroundColor: currentLevel === 0 ? "#F9FAFB" : "white",
              }}
            >
              <span className="w-8 h-8 rounded-md border-2 border-gray-200 bg-white shrink-0" />
              <span className="text-gray-500 font-medium">Not done / skip</span>
            </button>

            {/* Level options */}
            {habit.levels.map((lv, i) => {
              const lvl = i + 1;
              const color = getLevelColor(monthColor, lvl, habit.levels.length);
              const isSelected = currentLevel === lvl;
              return (
                <button
                  key={lv.id}
                  onClick={() => select(lvl)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                  style={{
                    borderColor: isSelected ? monthColor : "#F3F4F6",
                    backgroundColor: isSelected
                      ? getLevelColor(monthColor, lvl, habit.levels.length) +
                        "30"
                      : "white",
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-md shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-gray-700">{lv.label}</span>
                </button>
              );
            })}
          </div>

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              Skip (keep existing) <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// --- Add Habit Modal ---
function AddHabitModal({
  monthColor,
  onAdd,
  onClose,
}: {
  monthColor: string;
  onAdd: (name: string, levels: Level[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [levels, setLevels] = useState<Level[]>([{ id: uid(), label: "" }]);

  const canSubmit =
    name.trim().length > 0 && levels.every((l) => l.label.trim().length > 0);

  function addLevel() {
    if (levels.length < 5) setLevels((ls) => [...ls, { id: uid(), label: "" }]);
  }

  function removeLevel(id: string) {
    if (levels.length > 1) setLevels((ls) => ls.filter((l) => l.id !== id));
  }

  function updateLevel(id: string, label: string) {
    setLevels((ls) => ls.map((l) => (l.id === id ? { ...l, label } : l)));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onAdd(
      name.trim(),
      levels.map((l) => ({ ...l, label: l.label.trim() })),
    );
  }

  const PLACEHOLDERS = ["30 min", "1 hour", "2 hours", "3 hours", "4 hours"];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Modal header with color strip */}
        <div
          className="h-1.5 rounded-t-2xl"
          style={{ backgroundColor: monthColor }}
        />
        <div className="px-6 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-lg font-bold text-gray-800"
              style={{ fontFamily: "Georgia, serif" }}
            >
              New habit
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Name */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && canSubmit && handleSubmit()
              }
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-gray-800 text-sm"
              placeholder="e.g. Exercise, Reading, Water"
            />
          </div>

          {/* Levels */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Completion levels{" "}
              <span className="text-gray-300 normal-case font-normal">
                ({levels.length}/5)
              </span>
            </label>

            <div className="space-y-2">
              {levels.map((lv, i) => (
                <div key={lv.id} className="flex items-center gap-2">
                  {/* Color swatch preview */}
                  <span
                    className="w-5 h-5 rounded-sm shrink-0 border border-gray-100"
                    style={{
                      backgroundColor: getLevelColor(
                        monthColor,
                        i + 1,
                        levels.length,
                      ),
                    }}
                  />
                  <input
                    value={lv.label}
                    onChange={(e) => updateLevel(lv.id, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2"
                    placeholder={PLACEHOLDERS[i]}
                  />
                  {levels.length > 1 && (
                    <button
                      onClick={() => removeLevel(lv.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {levels.length < 5 && (
              <button
                onClick={addLevel}
                className="mt-2 text-sm flex items-center gap-1 font-medium hover:opacity-80"
                style={{ color: monthColor }}
              >
                <Plus className="w-3.5 h-3.5" /> Add level
              </button>
            )}
          </div>

          {/* Ombre preview */}
          <div className="mb-5 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Ombre preview</p>
            <div className="flex items-center gap-1.5">
              <span
                className="w-6 h-6 rounded-sm border border-gray-200"
                title="Not logged"
              />
              {levels.map((lv, i) => (
                <span
                  key={lv.id}
                  className="w-6 h-6 rounded-sm"
                  title={lv.label || `Level ${i + 1}`}
                  style={{
                    backgroundColor: getLevelColor(
                      monthColor,
                      i + 1,
                      levels.length,
                    ),
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: monthColor }}
            >
              Add habit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Empty State ---
function EmptyState({
  onAddHabit,
  monthColor,
}: {
  onAddHabit: () => void;
  monthColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
      <div
        className="w-12 h-12 rounded-xl mx-auto mb-5 flex items-center justify-center"
        style={{ backgroundColor: `${monthColor}20` }}
      >
        <span className="text-2xl">📓</span>
      </div>
      <h2
        className="text-xl font-bold text-gray-700 mb-2"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Start your habit journal
      </h2>
      <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
        Add habits with completion levels. Each day fills in with the month's
        ombre as you log your progress.
      </p>
      <button
        onClick={onAddHabit}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
        style={{ backgroundColor: monthColor }}
      >
        <Plus className="w-4 h-4" />
        Add your first habit
      </button>
    </div>
  );
}

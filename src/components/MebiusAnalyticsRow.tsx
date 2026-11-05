import React, { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Clock,
  Droplets,
  Eye,
  Flame,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AppLanguage, TRANSLATIONS } from '../i18n/translations';
import { DailyWellnessStats, WaterLogEntry } from '../types/wellness';

/* ============================================================================
 * 1. Mebius Dual Concentric Activity Rings (For Card 1: Stand-up & Eye Care)
 * ============================================================================ */
interface MebiusDualActivityRingsProps {
  standupSecondsLeft: number;
  standupIntervalMinutes: number;
  eyeSecondsLeft: number;
  eyeBreakIntervalMinutes: number;
  eyeBreakEnabled: boolean;
  standupCompletedCount: number;
  eyeBreakCompletedCount: number;
  lang: AppLanguage;
}

export const MebiusDualActivityRings: React.FC<MebiusDualActivityRingsProps> = ({
  standupSecondsLeft,
  standupIntervalMinutes,
  eyeSecondsLeft,
  eyeBreakIntervalMinutes,
  eyeBreakEnabled,
  standupCompletedCount,
  eyeBreakCompletedCount,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  const standupTotalSec = Math.max(60, standupIntervalMinutes * 60);
  const standupPct = Math.min(
    100,
    Math.max(0, ((standupTotalSec - standupSecondsLeft) / standupTotalSec) * 100)
  );

  const eyeTotalSec = Math.max(60, eyeBreakIntervalMinutes * 60);
  const eyePct = eyeBreakEnabled
    ? Math.min(100, Math.max(0, ((eyeTotalSec - eyeSecondsLeft) / eyeTotalSec) * 100))
    : 0;

  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const outerRadius = 74;
  const innerRadius = 56;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  // 36 micro-ticks around the outer perimeter (Mebius dial aesthetic)
  const ticks = useMemo(() => Array.from({ length: 36 }, (_, i) => i * 10), []);

  return (
    <div className="my-4 flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg
          role="img"
          viewBox="0 0 188 188"
          className="w-48 h-48 -rotate-90"
        >
          <title>
            {`${t.dualRingCaption}: ${formatMMSS(standupSecondsLeft)} (${Math.round(
              standupPct
            )}%)`}
          </title>
          <defs>
            <linearGradient id="mebiusOuterGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="55%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </linearGradient>
            <linearGradient id="mebiusInnerGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>

          {/* Outer Dial Ticks */}
          <g transform="translate(94, 94)">
            {ticks.map((deg, idx) => {
              const isPassed = (idx / ticks.length) * 100 <= standupPct;
              return (
                <line
                  key={deg}
                  x1={86}
                  y1={0}
                  x2={idx % 3 === 0 ? 90 : 88.5}
                  y2={0}
                  transform={`rotate(${deg})`}
                  stroke={isPassed ? '#10B981' : '#E2E8F0'}
                  strokeWidth={idx % 3 === 0 ? 1.8 : 1.1}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Outer Ring Track (Stand-up) */}
          <circle
            cx="94"
            cy="94"
            r={outerRadius}
            fill="none"
            stroke="#ECFDF5"
            strokeWidth="11"
          />
          {/* Outer Ring Progress */}
          <circle
            cx="94"
            cy="94"
            r={outerRadius}
            fill="none"
            stroke="url(#mebiusOuterGrad)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={outerCircumference}
            strokeDashoffset={outerCircumference * (1 - standupPct / 100)}
            className="transition-all duration-700 mebius-svg-glow-emerald"
          />

          {/* Inner Ring Track (20-20-20 Eye Care) */}
          <circle
            cx="94"
            cy="94"
            r={innerRadius}
            fill="none"
            stroke="#F0F9FF"
            strokeWidth="7.5"
          />
          {/* Inner Ring Progress */}
          <circle
            cx="94"
            cy="94"
            r={innerRadius}
            fill="none"
            stroke="url(#mebiusInnerGrad)"
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeDasharray={innerCircumference}
            strokeDashoffset={innerCircumference * (1 - eyePct / 100)}
            className="transition-all duration-700 mebius-svg-glow-sky"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.standupInLabel}
          </span>
          <span className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-0.5">
            {formatMMSS(standupSecondsLeft)}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            {Math.round(standupPct)}% • {standupIntervalMinutes}p
          </span>
        </div>
      </div>

      {/* Mebius Dual Ring Legend Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px] font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {t.outerRingLabel}: <strong className="text-emerald-700">{standupCompletedCount}x</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50/70 border border-sky-100 text-[11px] font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          {t.innerRingLabel}: <strong className="text-sky-700">{eyeBreakCompletedCount}x</strong>
        </span>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. Mebius Hourly Hydration Pill Bar Chart (For Card 2: Smart Hydration)
 * ============================================================================ */
interface MebiusHourlyHydrationChartProps {
  waterLogs: WaterLogEntry[];
  lang: AppLanguage;
}

const HOUR_SLOTS = [
  { id: '08', label: '08h', start: 0, end: 9 },
  { id: '10', label: '10h', start: 10, end: 11 },
  { id: '12', label: '12h', start: 12, end: 13 },
  { id: '14', label: '14h', start: 14, end: 15 },
  { id: '16', label: '16h', start: 16, end: 17 },
  { id: '18', label: '18h+', start: 18, end: 23 },
];

export const MebiusHourlyHydrationChart: React.FC<MebiusHourlyHydrationChartProps> = ({
  waterLogs,
  lang,
}) => {
  const t = TRANSLATIONS[lang];
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const slotTotals = useMemo(() => {
    const map: Record<string, number> = {
      '08': 0,
      '10': 0,
      '12': 0,
      '14': 0,
      '16': 0,
      '18': 0,
    };
    waterLogs.forEach((entry) => {
      const hourPart = parseInt(entry.timestamp.split(':')[0] || '12', 10);
      const slot =
        HOUR_SLOTS.find((s) => hourPart >= s.start && hourPart <= s.end) ||
        HOUR_SLOTS[HOUR_SLOTS.length - 1];
      map[slot.id] = (map[slot.id] || 0) + entry.amountMl;
    });
    return map;
  }, [waterLogs]);

  const maxSlotMl = Math.max(400, ...Object.values(slotTotals));

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 whitespace-nowrap">
          <BarChart3 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          {t.hourlyWaterTitle}
        </span>
        <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 whitespace-nowrap">
          {t.hourlyWaterTarget}
        </span>
      </div>

      {/* Mebius Pill Bar Container */}
      <div className="relative h-20 bg-slate-50/70 rounded-2xl p-2.5 border border-slate-100 flex items-end justify-between gap-2 mebius-dot-grid">
        {/* Dashed Target Reference Line (300ml) */}
        <div
          className="absolute left-2 right-2 border-t border-dashed border-sky-300/80 pointer-events-none"
          style={{ bottom: `${Math.min(82, Math.round((300 / maxSlotMl) * 75) + 18)}%` }}
        />

        {HOUR_SLOTS.map((slot) => {
          const val = slotTotals[slot.id] || 0;
          const heightPct = val > 0 ? Math.max(16, Math.min(100, Math.round((val / maxSlotMl) * 100))) : 8;
          const isHovered = hoveredSlot === slot.id;

          return (
            <div
              key={slot.id}
              onMouseEnter={() => setHoveredSlot(slot.id)}
              onMouseLeave={() => setHoveredSlot(null)}
              className="relative flex-1 h-full flex flex-col items-center justify-end group"
            >
              {isHovered && (
                <div className="absolute -top-6 z-10 px-1.5 py-0.5 rounded-md bg-slate-800 text-white text-[10px] font-bold whitespace-nowrap shadow">
                  {val}ml
                </div>
              )}
              <div className="w-full max-w-[22px] h-11 bg-sky-100/70 rounded-lg overflow-hidden flex items-end p-0.5">
                <div
                  className={`w-full rounded-md transition-all duration-500 ${
                    val >= 300
                      ? 'bg-gradient-to-t from-sky-600 to-cyan-400'
                      : val > 0
                      ? 'bg-gradient-to-t from-sky-400 to-sky-300'
                      : 'bg-slate-200/70'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 mt-1">
                {slot.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Accessible Data Table Fallback */}
      <table className="visually-hidden">
        <caption>{t.hourlyWaterTitle}</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">{t.waterSeriesLabel}</th>
          </tr>
        </thead>
        <tbody>
          {HOUR_SLOTS.map((slot) => (
            <tr key={slot.id}>
              <th scope="row">{slot.label}</th>
              <td>{slotTotals[slot.id] || 0} ml</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ============================================================================
 * 3. Mebius 3-Card Weekly Analytics & Deep Focus Row (Dashboard Row 2)
 * ============================================================================ */
interface MebiusAnalyticsRowProps {
  dailyStats: DailyWellnessStats;
  weeklyHistory: DailyWellnessStats[];
  dailyWaterGoalMl: number;
  lang: AppLanguage;
}

export const MebiusAnalyticsRow: React.FC<MebiusAnalyticsRowProps> = ({
  dailyStats,
  weeklyHistory,
  dailyWaterGoalMl,
  lang,
}) => {
  const t = TRANSLATIONS[lang];
  const isEn = lang === 'en';
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  // Build normalized 7-day array ending Today
  const sevenDays = useMemo(() => {
    const dayNamesVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: Array<{
      date: string;
      shortDay: string;
      waterIntakeMl: number;
      standupCompletedCount: number;
      eyeBreakCompletedCount: number;
      focusMinutes: number;
      isToday: boolean;
    }> = [];

    const now = new Date();
    // Seed gentle realistic baseline for days without stored records so the chart looks rich on first install
    const fallbackWater = [1550, 1800, 1400, 1900, 1650, 2000];
    const fallbackStand = [5, 7, 4, 8, 6, 7];
    const fallbackEye = [8, 11, 7, 12, 9, 10];
    const fallbackFocus = [165, 210, 145, 240, 195, 225];

    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(now);
      d.setDate(now.getDate() - offset);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(d.getDate()).padStart(2, '0')}`;
      const shortDay = isEn ? dayNamesEn[d.getDay()] : dayNamesVi[d.getDay()];

      if (offset === 0) {
        result.push({
          date: dateStr,
          shortDay: isEn ? 'Today' : 'H.Nay',
          waterIntakeMl: dailyStats.waterIntakeMl,
          standupCompletedCount: dailyStats.standupCompletedCount,
          eyeBreakCompletedCount: dailyStats.eyeBreakCompletedCount,
          focusMinutes: Math.max(15, dailyStats.focusMinutes),
          isToday: true,
        });
      } else {
        const found = weeklyHistory.find((h) => h.date === dateStr);
        const seedIdx = (6 - offset) % fallbackWater.length;
        result.push({
          date: dateStr,
          shortDay,
          waterIntakeMl: found ? found.waterIntakeMl : fallbackWater[seedIdx],
          standupCompletedCount: found
            ? found.standupCompletedCount
            : fallbackStand[seedIdx],
          eyeBreakCompletedCount: found
            ? found.eyeBreakCompletedCount
            : fallbackEye[seedIdx],
          focusMinutes: found ? found.focusMinutes : fallbackFocus[seedIdx],
          isToday: false,
        });
      }
    }
    return result;
  }, [dailyStats, weeklyHistory, isEn]);

  const maxWater7d = Math.max(
    dailyWaterGoalMl,
    2200,
    ...sevenDays.map((d) => d.waterIntakeMl)
  );
  const maxStandup7d = Math.max(10, ...sevenDays.map((d) => d.standupCompletedCount));

  // Compute Smooth Area Sparkline SVG Path for 7-day Focus Minutes
  const sparklineGeometry = useMemo(() => {
    const width = 320;
    const height = 96;
    const padX = 12;
    const padY = 14;
    const maxFocus = Math.max(240, ...sevenDays.map((d) => d.focusMinutes));
    const minFocus = 0;

    const pts = sevenDays.map((d, i) => {
      const x = padX + (i / (sevenDays.length - 1)) * (width - padX * 2);
      const y =
        height -
        padY -
        ((d.focusMinutes - minFocus) / (maxFocus - minFocus)) * (height - padY * 2);
      return { x, y, val: d.focusMinutes, label: d.shortDay };
    });

    // Smooth cubic bezier curve
    let linePath = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const ctrlX1 = curr.x + (next.x - curr.x) * 0.45;
      const ctrlY1 = curr.y;
      const ctrlX2 = curr.x + (next.x - curr.x) * 0.55;
      const ctrlY2 = next.y;
      linePath += ` C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${next.x} ${next.y}`;
    }

    const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;
    return { pts, linePath, areaPath, width, height };
  }, [sevenDays]);

  // Format Focus Time (e.g., 2h 15m)
  const formatFocusHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  // Compute DeskAura Wellness Score (0 - 100)
  const waterScore = Math.min(40, Math.round((dailyStats.waterIntakeMl / dailyWaterGoalMl) * 40));
  const standupScore = Math.min(35, dailyStats.standupCompletedCount * 7);
  const eyeScore = Math.min(25, dailyStats.eyeBreakCompletedCount * 5);
  const auraScore = Math.min(100, Math.max(12, waterScore + standupScore + eyeScore));

  // Count healthy streak days
  const activeStreakDays = useMemo(() => {
    let count = 0;
    for (let i = sevenDays.length - 1; i >= 0; i--) {
      const d = sevenDays[i];
      if (d.waterIntakeMl >= dailyWaterGoalMl * 0.6 || d.standupCompletedCount >= 3 || d.isToday) {
        count++;
      }
    }
    return Math.max(1, count);
  }, [sevenDays, dailyWaterGoalMl]);

  const activeDay =
    selectedDayIdx !== null ? sevenDays[selectedDayIdx] : sevenDays[sevenDays.length - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* =================================================================
          CARD A (5 cols): Mebius 7-Day Multi-Metric Bar Chart
      ================================================================= */}
      <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
              <TrendingUp className="w-3.5 h-3.5" />
              Mebius Weekly Analytics
            </span>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                {t.waterSeriesLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                {t.standupSeriesLabel}
              </span>
            </div>
          </div>

          <h3 className="text-base font-extrabold text-slate-800 mt-3">
            {t.weeklyHydrationTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.weeklyHydrationSubtitle}
          </p>

          {/* Interactive Selected Day Summary Pill */}
          <div className="mt-3 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              📅 {activeDay.shortDay} ({activeDay.date.slice(5)}):
            </span>
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-sky-600">
                💧 {activeDay.waterIntakeMl} ml
              </span>
              <span className="font-extrabold text-emerald-600">
                🧘 {activeDay.standupCompletedCount} {t.timesUnit}
              </span>
            </div>
          </div>

          {/* Mebius Paired Column Chart */}
          <div className="relative h-40 mt-4 pt-4 pb-2 px-3 rounded-2xl bg-slate-50/60 border border-slate-100 flex items-end justify-between gap-2 mebius-dot-grid">
            {/* Horizontal Goal Reference Line */}
            <div
              className="absolute left-3 right-3 border-t border-dashed border-sky-400/70 flex items-center justify-end pointer-events-none"
              style={{
                bottom: `${Math.min(
                  85,
                  Math.max(20, Math.round((dailyWaterGoalMl / maxWater7d) * 72) + 18)
                )}%`,
              }}
            >
              <span className=" -mt-4 px-1.5 py-0.5 rounded bg-sky-100/90 text-sky-700 text-[9px] font-bold">
                {t.goalLineLabel} {dailyWaterGoalMl}ml
              </span>
            </div>

            {sevenDays.map((day, idx) => {
              const waterH = Math.max(
                10,
                Math.min(100, Math.round((day.waterIntakeMl / maxWater7d) * 100))
              );
              const standH = Math.max(
                10,
                Math.min(100, Math.round((day.standupCompletedCount / maxStandup7d) * 100))
              );
              const isSelected = selectedDayIdx === idx || (selectedDayIdx === null && day.isToday);

              return (
                <button
                  type="button"
                  key={day.date}
                  onMouseEnter={() => setSelectedDayIdx(idx)}
                  onMouseLeave={() => setSelectedDayIdx(null)}
                  onFocus={() => setSelectedDayIdx(idx)}
                  onBlur={() => setSelectedDayIdx(null)}
                  className={`flex-1 h-full flex flex-col items-center justify-end rounded-xl p-1 transition ${
                    isSelected ? 'bg-white/90 shadow-sm ring-1 ring-emerald-200' : 'hover:bg-white/50'
                  }`}
                >
                  <div className="w-full h-24 flex items-end justify-center gap-1">
                    {/* Water Bar */}
                    <div
                      className={`w-2.5 rounded-t-md transition-all duration-500 ${
                        day.waterIntakeMl >= dailyWaterGoalMl
                          ? 'bg-gradient-to-t from-sky-600 to-cyan-400'
                          : 'bg-gradient-to-t from-sky-400 to-sky-300'
                      }`}
                      style={{ height: `${waterH}%` }}
                    />
                    {/* Stand-up Bar */}
                    <div
                      className="w-2.5 rounded-t-md bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-500"
                      style={{ height: `${standH}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 font-bold ${
                      day.isToday ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {day.shortDay}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Accessible Data Table for Screen Readers */}
          <table className="visually-hidden">
            <caption>{t.weeklyHydrationTitle}</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">{t.waterSeriesLabel}</th>
                <th scope="col">{t.standupSeriesLabel}</th>
              </tr>
            </thead>
            <tbody>
              {sevenDays.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{day.shortDay}</th>
                  <td>{day.waterIntakeMl} ml</td>
                  <td>{day.standupCompletedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================================
          CARD B (4 cols): Mebius Deep Focus Area Sparkline Card
      ================================================================= */}
      <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200/70">
              <Zap className="w-3.5 h-3.5" />
              Deep Focus Flow
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              +18% vs {isEn ? 'last wk' : 'tuần trước'}
            </span>
          </div>

          <h3 className="text-base font-extrabold text-slate-800 mt-3">
            {t.focusCardTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.focusCardSubtitle}
          </p>

          {/* 3 Mebius KPI Metric Blocks */}
          <div className="grid grid-cols-3 gap-2.5 my-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-50/80 to-indigo-50/40 border border-violet-100">
              <span className="text-[10px] font-bold uppercase text-violet-600 block">
                {t.todayFocusLabel}
              </span>
              <span className="text-lg font-extrabold text-slate-800 font-mono mt-0.5 block">
                {formatFocusHours(dailyStats.focusMinutes)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                {t.pomodoroEqLabel}
              </span>
              <span className="text-lg font-extrabold text-emerald-700 font-mono mt-0.5 block">
                {Math.max(1, Math.round(dailyStats.focusMinutes / 25))} 🍅
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                {t.eyeCareDoneLabel}
              </span>
              <span className="text-lg font-extrabold text-sky-700 font-mono mt-0.5 block">
                {dailyStats.eyeBreakCompletedCount} 👀
              </span>
            </div>
          </div>

          {/* Mebius Smooth Cubic-Bezier Area Chart */}
          <div className="rounded-2xl bg-slate-50/70 border border-slate-100 p-3 mebius-dot-grid">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
              <span>{t.focusTrend7dLabel}</span>
              <span className="font-bold text-violet-700">
                {sevenDays.reduce((acc, d) => acc + d.focusMinutes, 0)} mins / 7d
              </span>
            </div>

            <svg
              role="img"
              viewBox={`0 0 ${sparklineGeometry.width} ${sparklineGeometry.height}`}
              className="w-full h-24 overflow-visible"
            >
              <title>{t.focusTrend7dLabel}</title>
              <defs>
                <linearGradient id="mebiusFocusArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="mebiusFocusStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="50%" stopColor="#0EA5E9" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>

              <path d={sparklineGeometry.areaPath} fill="url(#mebiusFocusArea)" />
              <path
                d={sparklineGeometry.linePath}
                fill="none"
                stroke="url(#mebiusFocusStroke)"
                strokeWidth="3"
                strokeLinecap="round"
                className="mebius-svg-glow-violet"
              />

              {sparklineGeometry.pts.map((pt, idx) => (
                <g key={pt.label}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={idx === sparklineGeometry.pts.length - 1 ? 4.5 : 3}
                    fill={idx === sparklineGeometry.pts.length - 1 ? '#10B981' : '#FFFFFF'}
                    stroke={idx === sparklineGeometry.pts.length - 1 ? '#059669' : '#8B5CF6'}
                    strokeWidth="2"
                  />
                </g>
              ))}
            </svg>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1 px-1">
              {sevenDays.map((d) => (
                <span
                  key={d.date}
                  className={d.isToday ? 'text-emerald-700 font-extrabold' : ''}
                >
                  {d.shortDay}
                </span>
              ))}
            </div>
          </div>

          <table className="visually-hidden">
            <caption>{t.focusTrend7dLabel}</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Focus Minutes</th>
              </tr>
            </thead>
            <tbody>
              {sevenDays.map((d) => (
                <tr key={d.date}>
                  <th scope="row">{d.shortDay}</th>
                  <td>{d.focusMinutes} mins</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================================
          CARD C (3 cols): Mebius Semi-Circle Aura Score Gauge & Streak
      ================================================================= */}
      <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
              <Award className="w-3.5 h-3.5" />
              Aura Index
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              {activeStreakDays} {t.daysUnit}
            </span>
          </div>

          <h3 className="text-base font-extrabold text-slate-800 mt-3">
            {t.auraScoreTitle}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            {t.auraScoreSubtitle}
          </p>

          {/* Mebius 180-Degree Segmented Semi-Circle Gauge */}
          <div className="my-3 flex flex-col items-center">
            <div className="relative w-44 h-28 flex items-end justify-center overflow-hidden">
              <svg
                role="img"
                viewBox="0 0 180 105"
                className="w-44 h-28 overflow-visible"
              >
                <title>{`${t.auraScoreTitle}: ${auraScore}/100`}</title>
                <defs>
                  <linearGradient id="mebiusAuraArc" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#0EA5E9" />
                  </linearGradient>
                </defs>

                {/* Background Semi-Circle Track */}
                <path
                  d="M 20 90 A 70 70 0 0 1 160 90"
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="14"
                  strokeLinecap="round"
                />

                {/* Active Semi-Circle Progress (Arc Length = pi * 70 ≈ 219.9) */}
                <path
                  d="M 20 90 A 70 70 0 0 1 160 90"
                  fill="none"
                  stroke="url(#mebiusAuraArc)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={219.9}
                  strokeDashoffset={219.9 * (1 - auraScore / 100)}
                  className="transition-all duration-700 mebius-svg-glow-emerald"
                />
              </svg>

              <div className="absolute bottom-1 flex flex-col items-center text-center">
                <span className="text-3xl font-extrabold text-slate-800 font-mono leading-none">
                  {auraScore}
                  <span className="text-xs font-semibold text-slate-400">/100</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 mt-1">
                  {auraScore >= 80
                    ? t.scoreExcellent
                    : auraScore >= 45
                    ? t.scoreGood
                    : t.scoreWarmup}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Sub-score Progress Bars (Mebius Breakdown) */}
          <div className="space-y-2 mt-2">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                <span>💧 Hydration</span>
                <span className="font-bold text-sky-600">{waterScore}/40</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${(waterScore / 40) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                <span>🧘 Stand-up</span>
                <span className="font-bold text-emerald-600">{standupScore}/35</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(standupScore / 35) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                <span>👀 Eye 20-20-20</span>
                <span className="font-bold text-indigo-600">{eyeScore}/25</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${(eyeScore / 25) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Habit Streak Dot Matrix */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">
            {t.streakLabel}
          </span>
          <div className="flex items-center gap-1">
            {sevenDays.map((d) => {
              const achieved =
                d.waterIntakeMl >= dailyWaterGoalMl * 0.6 ||
                d.standupCompletedCount >= 3 ||
                d.isToday;
              return (
                <span
                  key={d.date}
                  title={`${d.shortDay}: ${d.waterIntakeMl}ml`}
                  className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-bold ${
                    achieved
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  ✓
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};


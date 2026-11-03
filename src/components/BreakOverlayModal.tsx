import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Droplets,
  RefreshCw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { DESK_EXERCISES } from '../data/wellnessCatalog';
import { BreakType } from '../types/wellness';
import { ExerciseIllustration } from './ExerciseIllustration';

interface BreakOverlayModalProps {
  isOpen: boolean;
  breakType: BreakType;
  remainingSeconds: number;
  totalSeconds: number;
  holdToSkip: boolean;
  duckedAppsCount: number;
  lang?: 'vi' | 'en';
  onCompleteBreak: () => void;
  onSnoozeBreak: (minutes: number) => void;
  onSkipBreak: () => void;
  onQuickDrinkWater: (amountMl: number) => void;
  onReplayVoice: () => void;
}

export const BreakOverlayModal: React.FC<BreakOverlayModalProps> = ({
  isOpen,
  breakType,
  remainingSeconds,
  totalSeconds,
  holdToSkip,
  duckedAppsCount,
  lang = 'vi',
  onCompleteBreak,
  onSnoozeBreak,
  onSkipBreak,
  onQuickDrinkWater,
  onReplayVoice,
}) => {
  const isEn = lang === 'en';
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [drankDuringBreak, setDrankDuringBreak] = useState(false);
  const holdTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDrankDuringBreak(false);
      if (breakType === 'eye') {
        const eyeIdx = DESK_EXERCISES.findIndex((e) => e.svgType === 'eyes');
        setExerciseIdx(eyeIdx >= 0 ? eyeIdx : 0);
      } else {
        setExerciseIdx(Math.floor(Math.random() * (DESK_EXERCISES.length - 1)));
      }
    }
  }, [isOpen, breakType]);

  if (!isOpen) return null;

  const exercise = DESK_EXERCISES[exerciseIdx] || DESK_EXERCISES[0];
  const progressPct =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))
      : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startHoldSkip = () => {
    if (!holdToSkip) {
      onSkipBreak();
      return;
    }
    let current = 0;
    holdTimerRef.current = window.setInterval(() => {
      current += 8;
      setHoldProgress(current);
      if (current >= 100) {
        if (holdTimerRef.current) window.clearInterval(holdTimerRef.current);
        setHoldProgress(0);
        onSkipBreak();
      }
    }, 80);
  };

  const stopHoldSkip = () => {
    if (holdTimerRef.current) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50/95 via-sky-50/95 to-white/95 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-emerald-100 shadow-2xl shadow-emerald-500/10 p-8 overflow-hidden">
        {/* Top Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            {breakType === 'eye'
              ? isEn
                ? '20-20-20 Eye Care Break'
                : 'Nghỉ Mắt Quy Tắc 20-20-20'
              : breakType === 'combo'
              ? isEn
                ? 'Stand Up, Stretch & Hydrate'
                : 'Đứng Dậy Vươn Vai & Bổ Sung Nước'
              : isEn
              ? 'Time to Stand Up & Stretch'
              : 'Giờ Đứng Dậy Thư Giãn Cơ Thể'}
          </span>

          <div className="flex items-center gap-2">
            {duckedAppsCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                <Volume2 className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
                {isEn
                  ? `Lowered volume of ${duckedAppsCount} other apps`
                  : `Đã giảm âm lượng ${duckedAppsCount} ứng dụng khác`}
              </span>
            )}
            <button
              onClick={onReplayVoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title={isEn ? 'Replay voice reminder' : 'Phát lại giọng nhắc'}
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              {isEn ? 'Replay Voice' : 'Nghe lại lời nhắc'}
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Illustration & Countdown */}
          <div className="md:col-span-5 flex flex-col items-center text-center bg-gradient-to-b from-emerald-50/60 to-sky-50/40 rounded-2xl p-5 border border-emerald-100/80">
            <ExerciseIllustration type={exercise.svgType} lang={lang} />
            <div className="mt-3 text-4xl font-extrabold tracking-tight text-slate-800 font-mono">
              {formatTime(remainingSeconds)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isEn ? 'Remaining break time' : 'Thời gian thư giãn còn lại'}
            </p>
          </div>

          {/* Right: Guided Stretch & Hydration Prompt */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  {isEn ? 'Guided Desk Stretch' : 'Bài tập gợi ý tại bàn'}
                </span>
                <button
                  onClick={() =>
                    setExerciseIdx((prev) => (prev + 1) % DESK_EXERCISES.length)
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-600 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  {isEn ? 'Next Stretch' : 'Đổi động tác khác'}
                </button>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mt-1">
                {exercise.title}
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {exercise.instruction}
              </p>
              <p className="text-xs font-medium text-emerald-700 mt-2">
                ✨ {isEn ? 'Benefit:' : 'Lợi ích:'} {exercise.benefit}
              </p>
            </div>

            {/* Quick Hydration Combo Action */}
            <div className="bg-sky-50/90 border border-sky-100 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {isEn ? 'Hydrate while standing up' : 'Kết hợp uống nước khi đứng dậy'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {drankDuringBreak
                      ? isEn
                        ? 'Awesome! Logged +200ml of refreshing water.'
                        : 'Tuyệt vời! Bạn đã bổ sung thêm 200ml nước mát.'
                      : isEn
                      ? 'Drink a glass of water to refresh your body'
                      : 'Hãy uống 1 cốc nước để cơ thể sảng khoái hơn'}
                  </p>
                </div>
              </div>
              <button
                disabled={drankDuringBreak}
                onClick={() => {
                  onQuickDrinkWater(200);
                  setDrankDuringBreak(true);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  drankDuringBreak
                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                    : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20'
                }`}
              >
                {drankDuringBreak
                  ? isEn
                    ? '✓ +200ml Logged'
                    : '✓ Đã +200ml'
                  : isEn
                  ? '+ Drink 200ml'
                  : '+ Uống 200ml'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="mt-7 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSnoozeBreak(5)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <Clock className="w-3.5 h-3.5" />
              {isEn ? 'Snooze 5m' : 'Hoãn 5 phút'}
            </button>
            <button
              onClick={() => onSnoozeBreak(15)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              {isEn ? 'In Meeting (15m)' : 'Đang họp (Hoãn 15p)'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Hold to skip button */}
            <button
              onMouseDown={startHoldSkip}
              onMouseUp={stopHoldSkip}
              onMouseLeave={stopHoldSkip}
              onTouchStart={startHoldSkip}
              onTouchEnd={stopHoldSkip}
              className="relative overflow-hidden px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition select-none"
            >
              <span
                className="absolute inset-y-0 left-0 bg-slate-300/60 transition-all"
                style={{ width: `${holdProgress}%` }}
              />
              <span className="relative z-10">
                {holdToSkip
                  ? isEn
                    ? 'Hold to Skip'
                    : 'Nhấn giữ để bỏ qua'
                  : isEn
                  ? 'Skip'
                  : 'Bỏ qua'}
              </span>
            </button>

            <button
              onClick={onCompleteBreak}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isEn ? 'Complete Break' : 'Hoàn thành nghỉ ngơi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


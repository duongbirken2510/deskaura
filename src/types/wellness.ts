export type BreakType = 'standup' | 'eye' | 'combo';

export interface StandupSettings {
  standupIntervalMinutes: number;     // Mặc định v1.2: 60 phút (Chu kỳ Combo Đứng dậy + Uống nước)
  standupDurationSeconds: number;     // Mặc định: 180 giây (3 phút)
  eyeBreakEnabled: boolean;           // Quy tắc 20-20-20 (Nhắc thụ động qua Icon Tray)
  eyeBreakIntervalMinutes: number;    // Mặc định: 20 phút
  eyeBreakDurationSeconds: number;    // Mặc định: 20 giây
  autoResetIdleSeconds: number;       // Mặc định: 300 giây (5 phút rời máy tự reset chu kỳ)
  pauseOnFullscreen: boolean;         // Không làm phiền khi đang họp/Fullscreen
  reminderMode: 'overlay' | 'gentle'; // Toàn màn hình hoặc Thẻ nhắc nhẹ nhàng
  holdToSkip: boolean;                // Nhấn giữ 2 giây để bỏ qua (chống bấm vô thức)
  nextStandupAt?: number;             // Mốc timestamp (ms) đồng bộ đếm ngược Combo/Đứng dậy đa thiết bị
  nextEyeAt?: number;                 // Mốc timestamp (ms) đồng bộ đếm ngược Nghỉ mắt 20-20-20
  nextWaterAt?: number;               // Mốc timestamp (ms) đồng bộ đếm ngược Uống nước
  timerSyncUpdatedAt?: number;        // Thời điểm cập nhật mốc đếm ngược gần nhất
}

export interface WaterLogEntry {
  id: string;
  timestamp: string; // HH:mm
  amountMl: number;
}

export interface HydrationSettings {
  dailyGoalMl: number;                // Mặc định: 1800 ml
  weightKg: number;                   // Cân nặng gợi ý
  intervalMinutes: number;            // Mặc định: 40 phút nhắc 1 lần
  quickAmounts: [number, number, number]; // Mặc định: [100, 200, 300]
}

export type VoicePackId = 'female_neural' | 'male_neural' | 'english_neural' | 'custom_tts';

export interface VoiceReminderSettings {
  enabled: boolean;
  voicePack: VoicePackId;
  volume: number;                     // 0.0 -> 1.0
  duckOtherApps: boolean;             // Giảm âm lượng ứng dụng khác trên Windows (WASAPI)
  duckRatio: number;                  // Mặc định: 0.2 (Giảm còn 20%)
  playChimeBeforeVoice: boolean;      // Tiếng chuông chữa lành trước lời nhắc
  customStandupText: string;
  customWaterText: string;
}

export type SoundId =
  | 'rain'
  | 'stream'
  | 'ocean'
  | 'wind'
  | 'campfire'
  | 'singing_bowl'
  | 'alpha_waves'
  | 'theta_waves'
  | 'brown_noise'
  | 'pink_noise';

export interface AmbientSoundItem {
  id: SoundId;
  name: string;
  subtitle: string;
  category: 'nature' | 'healing' | 'focus';
  iconName: string;
  color: string;
  defaultVolume: number;
}

export interface OnlineRadioStation {
  id: string;
  name: string;
  genre: string;
  description: string;
  streamUrl: string;
  badge: string;
  websiteUrl: string;
}

export interface FreeMusicResource {
  name: string;
  category: string;
  description: string;
  url: string;
  license: string;
}

export interface ExerciseItem {
  id: string;
  title: string;
  durationSec: number;
  instruction: string;
  benefit: string;
  svgType: 'neck' | 'shoulder' | 'wrist' | 'back' | 'eyes';
}

export interface DailyWellnessStats {
  date: string; // YYYY-MM-DD
  waterIntakeMl: number;
  waterLogs: WaterLogEntry[];
  standupCompletedCount: number;
  eyeBreakCompletedCount: number;
  focusMinutes: number;
}


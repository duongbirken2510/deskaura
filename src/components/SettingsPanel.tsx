import React from 'react';
import {
  BellRing,
  Check,
  Laptop,
  Mic,
  MonitorCheck,
  Power,
  ShieldCheck,
  Sliders,
  Volume2,
} from 'lucide-react';
import {
  HydrationSettings,
  StandupSettings,
  VoiceReminderSettings,
} from '../types/wellness';

interface SettingsPanelProps {
  standupSettings: StandupSettings;
  hydrationSettings: HydrationSettings;
  voiceSettings: VoiceReminderSettings;
  autostartEnabled: boolean;
  startMinimized: boolean;
  isTestingVoice: boolean;
  lastDuckedCount: number;
  lang?: 'vi' | 'en';
  onUpdateStandup: (partial: Partial<StandupSettings>) => void;
  onUpdateHydration: (partial: Partial<HydrationSettings>) => void;
  onUpdateVoice: (partial: Partial<VoiceReminderSettings>) => void;
  onToggleAutostart: (enabled: boolean, minimized: boolean) => void;
  onTestVietnameseVoice: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  standupSettings,
  hydrationSettings,
  voiceSettings,
  autostartEnabled,
  startMinimized,
  isTestingVoice,
  lastDuckedCount,
  lang = 'vi',
  onUpdateStandup,
  onUpdateHydration,
  onUpdateVoice,
  onToggleAutostart,
  onTestVietnameseVoice,
}) => {
  const isEn = lang === 'en';
  return (
    <div className="space-y-6">
      {/* Section 1: Voice Reminder & Windows WASAPI Audio Ducking */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Mic className="w-5 h-5 text-emerald-500" />
              {isEn
                ? 'Voice Reminders & Windows WASAPI Audio Ducking'
                : 'Nhắc Nhở Giọng Nói & Tự Động Giảm Âm Lượng (WASAPI Audio Ducking)'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? 'Automatically lowers volume of YouTube, Spotify, Browser... on Windows while speaking reminders'
                : 'Tự động làm nhỏ tiếng của YouTube, Spotify, Trình duyệt... trên Windows khi phát lời nhắc sức khỏe'}
            </p>
          </div>

          <button
            disabled={isTestingVoice}
            onClick={onTestVietnameseVoice}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-500/20 transition disabled:opacity-60"
          >
            <Volume2 className="w-4 h-4" />
            {isTestingVoice
              ? isEn
                ? 'Playing voice reminder...'
                : 'Đang phát giọng nhắc...'
              : isEn
              ? 'Test Voice & Audio Ducking'
              : 'Nghe thử giọng nhắc & Test giảm âm lượng'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          {/* Voice Selection */}
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 cursor-pointer">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isEn
                    ? 'Enable Voice Reminders (VI / EN)'
                    : 'Bật nhắc nhở bằng giọng nói (VI / EN)'}
                </p>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'Speak gentle voice prompts when it is time to stand up or drink water'
                    : 'Phát lời nhắc ấm áp khi đến giờ đứng dậy hoặc uống nước'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={voiceSettings.enabled}
                onChange={(e) => onUpdateVoice({ enabled: e.target.checked })}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {isEn
                  ? 'Select Voice Pack (Vietnamese / English):'
                  : 'Chọn giọng đọc Nhắc nhở (Tiếng Việt / English):'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'female_neural',
                    title: '🇻🇳 Nữ Dịu Dàng (VI)',
                    desc: 'Giọng chuẩn Tiếng Việt (Offline MP3)',
                  },
                  {
                    id: 'male_neural',
                    title: '🇻🇳 Nam Trầm Ấm (VI)',
                    desc: 'Giọng Nam Minh Neural (Offline MP3)',
                  },
                  {
                    id: 'english_neural',
                    title: '🇬🇧 English Voice (EN)',
                    desc: 'Natural English AI Voice (Offline MP3)',
                  },
                  {
                    id: 'custom_tts',
                    title: '✍️ Tự Nhập Câu Nhắc',
                    desc: 'Đọc câu tùy chỉnh qua Windows TTS',
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onUpdateVoice({
                        voicePack: opt.id as VoiceReminderSettings['voicePack'],
                      })
                    }
                    className={`p-3 rounded-2xl border text-left transition ${
                      voiceSettings.voicePack === opt.id
                        ? 'bg-emerald-50/90 border-emerald-400 text-emerald-900'
                        : 'bg-slate-50 border-slate-200/70 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{opt.title}</span>
                      {voiceSettings.voicePack === opt.id && (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {voiceSettings.voicePack === 'custom_tts' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Câu nhắc đứng dậy tùy chỉnh:
                  </label>
                  <input
                    type="text"
                    value={voiceSettings.customStandupText}
                    onChange={(e) =>
                      onUpdateVoice({ customStandupText: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Câu nhắc uống nước tùy chỉnh:
                  </label>
                  <input
                    type="text"
                    value={voiceSettings.customWaterText}
                    onChange={(e) =>
                      onUpdateVoice({ customWaterText: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Windows Audio Ducking Controls */}
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 cursor-pointer">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isEn
                    ? 'Auto-duck other Windows applications'
                    : 'Tự động giảm âm lượng ứng dụng khác trên Windows'}
                </p>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'Lowers music/video apps while speaking voice reminders and restores volume right after'
                    : 'Hạ nhỏ âm lượng các ứng dụng đang phát nhạc/video khi phát giọng nhắc và khôi phục ngay sau đó'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={voiceSettings.duckOtherApps}
                onChange={(e) =>
                  onUpdateVoice({ duckOtherApps: e.target.checked })
                }
                className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
              />
            </label>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {isEn
                    ? 'Other apps volume during voice prompt:'
                    : 'Mức âm lượng ứng dụng khác khi đang nhắc:'}
                </span>
                <span className="text-xs font-extrabold text-sky-600">
                  {isEn
                    ? `${Math.round(voiceSettings.duckRatio * 100)}% of original volume`
                    : `Còn ${Math.round(voiceSettings.duckRatio * 100)}% âm lượng gốc`}
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.6}
                step={0.05}
                value={voiceSettings.duckRatio}
                onChange={(e) =>
                  onUpdateVoice({ duckRatio: parseFloat(e.target.value) })
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{isEn ? 'Very quiet (5%)' : 'Nhỏ hẳn (5%)'}</span>
                <span>{isEn ? 'Balanced (20% - Recommended)' : 'Vừa phải (20% - Khuyên dùng)'}</span>
                <span>{isEn ? 'Gentle (60%)' : 'Nhẹ (60%)'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div>
                <p className="text-xs font-bold text-slate-700">
                  {isEn
                    ? 'Play 528Hz healing chime before voice prompt'
                    : 'Phát tiếng chuông chữa lành 528Hz trước giọng nói'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isEn
                    ? 'Helps your mind transition smoothly without being startled'
                    : 'Giúp não bộ chuyển trạng thái nhẹ nhàng, không giật mình'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={voiceSettings.playChimeBeforeVoice}
                onChange={(e) =>
                  onUpdateVoice({ playChimeBeforeVoice: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {lastDuckedCount > 0 && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                {isEn
                  ? `✓ Last check: Automatically adjusted ${lastDuckedCount} active Windows audio sessions.`
                  : `✓ Lần kiểm tra gần nhất: Đã điều chỉnh tự động ${lastDuckedCount} ứng dụng âm thanh trên Windows.`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Windows System Integration (Auto-start, Reminder Mode & Background Tray) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
            <BellRing className="w-5 h-5 text-emerald-500" />
            {isEn
              ? 'Reminder Display Mode (Popup Screen vs. Taskbar / Tray Alert)'
              : 'Kiểu Hiển Thị Khi Đến Giờ Nhắc Nhở (Màn Hình Nhắc vs. Icon Taskbar)'}
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            {isEn
              ? 'Choose whether DeskAura pops up the guided exercise window or notifies quietly from the Taskbar/Tray icon'
              : 'Lựa chọn cách ứng dụng thông báo khi đồng hồ đếm ngược về 00:00'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onUpdateStandup({ reminderMode: 'overlay' })}
              className={`p-4 rounded-2xl border text-left transition flex items-start justify-between gap-3 ${
                standupSettings.reminderMode === 'overlay'
                  ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-sm'
                  : 'bg-slate-50 border-slate-200/70 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {isEn
                      ? '🖥️ Pop-up Exercise Screen (Overlay)'
                      : '🖥️ Hiển thị Màn hình Nhắc nhở (Bung cửa sổ)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isEn
                    ? 'Automatically brings the guided stretch window to the front of your screen when it is time for a break.'
                    : 'Tự động bung cửa sổ hướng dẫn bài tập giãn cơ lên màn hình kết hợp giọng nói nhắc nhở khi đến giờ nghỉ.'}
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  standupSettings.reminderMode === 'overlay'
                    ? 'bg-emerald-500 text-white'
                    : 'border border-slate-300 bg-white'
                }`}
              >
                {standupSettings.reminderMode === 'overlay' && (
                  <Check className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onUpdateStandup({ reminderMode: 'gentle' })}
              className={`p-4 rounded-2xl border text-left transition flex items-start justify-between gap-3 ${
                standupSettings.reminderMode === 'gentle'
                  ? 'bg-sky-50/90 border-sky-400 text-sky-950 shadow-sm'
                  : 'bg-slate-50 border-slate-200/70 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {isEn
                      ? '🔔 Taskbar / System Tray Notification Only'
                      : '🔔 Chỉ nhắc ở Icon Taskbar / Khay hệ thống'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isEn
                    ? 'Never interrupts your typing: flashes the Taskbar/Tray icon, shows a corner notification, and plays the voice prompt.'
                    : 'Không bung cửa sổ làm gián đoạn việc đang gõ: chỉ phát thông báo ở Icon Taskbar / góc màn hình kèm giọng nhắc nhẹ nhàng.'}
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  standupSettings.reminderMode === 'gentle'
                    ? 'bg-sky-500 text-white'
                    : 'border border-slate-300 bg-white'
                }`}
              >
                {standupSettings.reminderMode === 'gentle' && (
                  <Check className="w-3.5 h-3.5" />
                )}
              </div>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Power className="w-5 h-5 text-sky-500" />
            {isEn
              ? 'Background System Tray & System Startup'
              : 'Chạy Nền & Tự Khởi Động Cùng Máy Tính'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/70 cursor-pointer">
              <div className="flex items-start gap-3">
                <Laptop className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {isEn
                      ? 'Start automatically on system boot'
                      : 'Tự khởi động cùng máy tính (Auto-start on Boot)'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEn
                      ? 'Automatically launch DeskAura when you sign in'
                      : 'Tự động mở ứng dụng mỗi khi bật máy tính làm việc'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autostartEnabled}
                onChange={(e) =>
                  onToggleAutostart(e.target.checked, startMinimized)
                }
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/70 cursor-pointer">
              <div className="flex items-start gap-3">
                <MonitorCheck className="w-5 h-5 text-sky-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {isEn
                      ? 'Start minimized in System Tray'
                      : 'Khởi động ẩn dưới Khay hệ thống (System Tray)'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEn
                      ? 'When booting or clicking Close (X), minimize quietly to the taskbar tray'
                      : 'Khi bật máy hoặc bấm nút đóng (X), ứng dụng thu gọn xuống góc phải Taskbar để chạy ngầm siêu nhẹ'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={startMinimized}
                onChange={(e) =>
                  onToggleAutostart(autostartEnabled, e.target.checked)
                }
                className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Section 3: Schedule & Smart Context Configuration */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-emerald-500" />
          {isEn
            ? 'Stand-up, Hydration & Smart Context Schedule'
            : 'Cấu Hình Chu Kỳ Đứng Dậy, Uống Nước & Nhận Diện Thông Minh'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Standup Interval */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {isEn ? '🌱 Stand-up & Stretch Cycle' : '🌱 Nhịp Đứng Dậy Vận Động'}
            </p>
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>{isEn ? 'Max sitting interval:' : 'Thời gian ngồi tối đa:'}</span>
                <span className="font-bold text-emerald-600">
                  {standupSettings.standupIntervalMinutes} {isEn ? 'mins' : 'phút'}
                </span>
              </label>
              <input
                type="range"
                min={15}
                max={90}
                step={5}
                value={standupSettings.standupIntervalMinutes}
                onChange={(e) =>
                  onUpdateStandup({
                    standupIntervalMinutes: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>{isEn ? 'Stand-up break duration:' : 'Thời lượng đứng dậy nghỉ:'}</span>
                <span className="font-bold text-emerald-600">
                  {Math.round(standupSettings.standupDurationSeconds / 60)} {isEn ? 'mins' : 'phút'}
                </span>
              </label>
              <input
                type="range"
                min={60}
                max={600}
                step={30}
                value={standupSettings.standupDurationSeconds}
                onChange={(e) =>
                  onUpdateStandup({
                    standupDurationSeconds: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          {/* Hydration Goal */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
              {isEn ? '💧 Daily Hydration Schedule' : '💧 Nhịp Uống Nước Văn Phòng'}
            </p>
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>{isEn ? 'Daily water goal:' : 'Mục tiêu nước mỗi ngày:'}</span>
                <span className="font-bold text-sky-600">
                  {hydrationSettings.dailyGoalMl} ml
                </span>
              </label>
              <input
                type="range"
                min={1000}
                max={3500}
                step={100}
                value={hydrationSettings.dailyGoalMl}
                onChange={(e) =>
                  onUpdateHydration({
                    dailyGoalMl: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>{isEn ? 'Hydration reminder interval:' : 'Chu kỳ nhắc uống nước:'}</span>
                <span className="font-bold text-sky-600">
                  {isEn
                    ? `Every ${hydrationSettings.intervalMinutes} mins`
                    : `Mỗi ${hydrationSettings.intervalMinutes} phút`}
                </span>
              </label>
              <input
                type="range"
                min={15}
                max={90}
                step={5}
                value={hydrationSettings.intervalMinutes}
                onChange={(e) =>
                  onUpdateHydration({
                    intervalMinutes: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-sky-500"
              />
            </div>
          </div>

          {/* Smart Windows Context */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {isEn ? 'Smart Context Detection' : 'Nhận Diện Ngữ Cảnh Thông Minh'}
            </p>

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>
                {isEn
                  ? 'Postpone breaks during fullscreen meetings/presentations'
                  : 'Tạm hoãn màn hình khóa khi đang họp / Fullscreen'}
              </span>
              <input
                type="checkbox"
                checked={standupSettings.pauseOnFullscreen}
                onChange={(e) =>
                  onUpdateStandup({ pauseOnFullscreen: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>
                {isEn
                  ? '20-20-20 Eye Care Reminders (Every 20 mins)'
                  : 'Nhắc nghỉ mắt 20-20-20 (Mỗi 20 phút)'}
              </span>
              <input
                type="checkbox"
                checked={standupSettings.eyeBreakEnabled}
                onChange={(e) =>
                  onUpdateStandup({ eyeBreakEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>
                {isEn
                  ? 'Require press-and-hold to skip breaks'
                  : 'Yêu cầu nhấn giữ để bỏ qua giờ nghỉ'}
              </span>
              <input
                type="checkbox"
                checked={standupSettings.holdToSkip}
                onChange={(e) =>
                  onUpdateStandup({ holdToSkip: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};


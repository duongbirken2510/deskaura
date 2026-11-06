import React, { useState } from 'react';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Cloud,
  Droplets,
  Eye,
  Headphones,
  HelpCircle,
  Laptop,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  lang?: 'vi' | 'en';
  onClose: () => void;
}

type GuideTab = 'quickstart' | 'smartbreaks' | 'eyeshield' | 'sync' | 'sounds';

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  lang = 'vi',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('quickstart');
  const isEn = lang === 'en';

  if (!isOpen) return null;

  const tabs: { id: GuideTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'quickstart',
      label: isEn ? '1. Quick Start' : '1. Bắt đầu nhanh',
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    {
      id: 'smartbreaks',
      label: isEn ? '2. Smart Breaks' : '2. Nhắc nghỉ thông minh',
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      id: 'eyeshield',
      label: isEn ? '3. Eye-Shield 20-20-20' : '3. Bảo vệ mắt 20-20-20',
      icon: <Eye className="w-3.5 h-3.5" />,
    },
    {
      id: 'sync',
      label: isEn ? '4. Multi-Device Sync' : '4. Đồng bộ nhiều máy',
      icon: <Cloud className="w-3.5 h-3.5" />,
    },
    {
      id: 'sounds',
      label: isEn ? '5. Sound Hub & Tips' : '5. Nhạc nền & Mẹo hay',
      icon: <Headphones className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[88vh] bg-white rounded-3xl border border-emerald-100 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {isEn
                  ? 'DeskAura — Complete User Guide & Smart Rules'
                  : 'Cẩm Nang Hướng Dẫn Sử Dụng DeskAura'}
              </h2>
              <p className="text-xs text-emerald-50">
                {isEn
                  ? 'Everything you need to master spine care, 20-20-20 eye protection, hydration & multi-device sync'
                  : 'Hướng dẫn chi tiết cách vận hành các cơ chế thông minh bảo vệ cột sống, thị lực & đồng bộ đa thiết bị'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer"
            title={isEn ? 'Close' : 'Đóng'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200/80 flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-700 text-sm leading-relaxed">
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                  <h3 className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    {isEn
                      ? 'Dual Countdown Activity Rings'
                      : 'Vòng Đếm Đồng Tâm Kép (Dual Rings)'}
                  </h3>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                    <li>
                      <strong>{isEn ? 'Outer Emerald Ring:' : 'Vòng ngoài (Xanh ngọc):'}</strong>{' '}
                      {isEn
                        ? 'Counts down to your 60-minute Stand-up & Stretch ritual.'
                        : 'Đếm ngược đến kỳ Đứng dậy & Giãn cơ (mặc định 60 phút).'}
                    </li>
                    <li>
                      <strong>{isEn ? 'Inner Sky Ring:' : 'Vòng trong (Xanh lam):'}</strong>{' '}
                      {isEn
                        ? 'Counts down to your 20-minute 20-20-20 Eye Care break.'
                        : 'Đếm ngược đến kỳ Nghỉ mắt 20-20-20 (mặc định 20 phút).'}
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-2">
                  <h3 className="text-sm font-extrabold text-sky-900 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-sky-600" />
                    {isEn
                      ? '1-Click Hydration & Virtual Desk Plant'
                      : 'Cấp Nước 1-Chạm & Chậu Cây 4 Cấp Độ'}
                  </h3>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                    <li>
                      {isEn
                        ? 'Click +50ml, +100ml, +200ml, or +300ml to log water. A 5-second Undo button appears automatically if you misclick.'
                        : 'Bấm +50ml, +100ml, +200ml, +300ml mỗi khi uống nước. Nếu bấm nhầm, có sẵn nút Hoàn tác trong 5 giây.'}
                    </li>
                    <li>
                      {isEn
                        ? 'Your desk plant grows through 4 stages (Seed → Sprout → Lush → Blooming at 100%) and sleeps (💤 Night-Owl) after 23:00.'
                        : 'Chậu cây lớn dần qua 4 cấp độ (Hạt mầm → Cây non → Xanh tốt → Nở hoa khi đạt 100%) và tự ngủ (💤 Night-Owl) sau 23h đêm.'}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-teal-600" />
                  {isEn
                    ? 'System Tray / Menu Bar Water Droplet Icon'
                    : 'Ý Nghĩa Biểu Tượng Giọt Nước Trên Thanh Taskbar / Menu Bar'}
                </h3>
                <p className="text-xs text-slate-600">
                  {isEn
                    ? 'When you minimize DeskAura to the tray, it consumes 0% GPU/CPU and communicates via the droplet icon:'
                    : 'Khi bấm "Ẩn xuống khay" (hoặc nút X), DeskAura chạy ngầm với 0% GPU và báo trạng thái qua màu sắc giọt nước:'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-emerald-700">
                      🟢 {isEn ? 'Emerald Fill (0–100%)' : 'Xanh Ngọc (Dâng 0–100%)'}
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      {isEn
                        ? 'Normal mode — water level inside the droplet matches your daily hydration %.'
                        : 'Bình thường — mực nước trong giọt dâng cao theo % nước uống trong ngày.'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-amber-600">
                      🟡 {isEn ? 'Amber Gold (20s)' : 'Vàng Hổ Phách (20s)'}
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      {isEn
                        ? 'Active 20-second 20-20-20 eye rest cue.'
                        : 'Đang trong 20 giây thư giãn mắt quy tắc 20-20-20.'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-rose-600">
                      🔴 {isEn ? 'Ruby Red (Deferred)' : 'Đỏ Ruby (Tạm hoãn)'}
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      {isEn
                        ? 'Break is deferred while you are in a Fullscreen meeting or presentation.'
                        : 'Đã đến giờ nghỉ nhưng tự động hoãn vì bạn đang họp/thuyết trình Toàn màn hình.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'smartbreaks' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                <h3 className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {isEn
                    ? '1. Auto +1 Standup Credit After 3 Minutes Away (Smart 180s Idle Sensor)'
                    : '1. Tự Động Cộng +1 Lần Đứng Dậy Khi Rời Bàn 3 Phút (Cảm Biến 180 Giây)'}
                </h3>
                <p className="text-xs text-slate-700">
                  {isEn
                    ? 'When a break reminder appears (in either Fullscreen Overlay or Gentle Taskbar Mode) and you simply stand up and walk away without clicking any button: once the OS sensor detects 3 minutes (180s) of zero mouse/keyboard input, DeskAura automatically credits +1 Standup, closes the reminder, and resets the 60-minute timer.'
                    : 'Khi đến giờ nghỉ (ở cả chế độ Toàn màn hình lẫn Nhắc nhẹ dưới Taskbar), nếu bạn đứng dậy rời khỏi bàn luôn mà không cần bấm nút: ngay khi cảm biến phát hiện không có thao tác chuột & bàn phím đủ 3 phút (180 giây), ứng dụng tự động cộng +1 lần đứng dậy, tự tắt thông báo và đặt lại đồng hồ 60 phút.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                <h3 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  {isEn
                    ? '2. Honest Tracking When Ignoring a Break Reminder'
                    : '2. Chống Cộng Ảo Khi "Lờ Đi" Và Vẫn Dùng Máy Tính'}
                </h3>
                <p className="text-xs text-slate-700">
                  {isEn
                    ? 'If a standup reminder appears and you ignore it (switching windows and continuing to type or move the mouse during the 3-minute countdown) or click Skip, DeskAura will reset the cycle WITHOUT adding +1 to your standup count.'
                    : 'Nếu bảng nhắc đứng dậy hiện lên mà bạn lờ đi (chuyển cửa sổ khác và vẫn tiếp tục gõ phím/di chuột làm việc trong 3 phút) hoặc bấm Bỏ qua, ứng dụng sẽ đóng bảng và đặt lại chu kỳ mới nhưng KHÔNG cộng +1 lần đứng dậy.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1.5">
                <h3 className="text-sm font-extrabold text-sky-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  {isEn
                    ? '3. Unified 3-in-1 Combo Ritual & Instant Voice Cut-Off'
                    : '3. Gộp Thông Báo Combo 3-Trong-1 & Ngắt Âm Thanh Tức Thì Khi Hoãn'}
                </h3>
                <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                  <li>
                    {isEn
                      ? 'When Hydration, Eye Care, and Stand-up timers align at the 60-minute mark, DeskAura merges them into a single "60m Combo Ritual" modal with a built-in +200ml water button so you never get stacked popups.'
                      : 'Khi giờ Uống nước, Nghỉ mắt và Đứng dậy trùng nhau ở mốc 60 phút, ứng dụng tự gộp thành 1 bảng "Nghi Thức Combo" duy nhất (có sẵn nút +Uống 200ml bên trong) để không hiện nhiều thông báo chồng chéo.'}
                  </li>
                  <li>
                    {isEn
                      ? 'Clicking Snooze 5m, In Meeting (15m), or Skip immediately cuts off the voice prompt (0ms) and restores background music volume.'
                      : 'Khi bấm "Hoãn 5 phút", "Đang họp (Hoãn 15p)" hoặc "Bỏ qua", giọng đọc nhắc nhở sẽ ngắt ngay lập tức (0ms).'}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'eyeshield' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                <h3 className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  {isEn
                    ? '20-20-20 Eye Care Rule & Independent Snooze'
                    : 'Quy Tắc Nghỉ Mắt 20-20-20 & Bộ Đếm Hoãn Độc Lập'}
                </h3>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                  <li>
                    {isEn
                      ? 'Every 20 minutes, DeskAura dims the screen gently for 20 seconds (Breathing Dimmer) and prompts you to look 20 feet (6 meters) away.'
                      : 'Cứ mỗi 20 phút làm việc, màn hình tự động dịu sáng trong 20 giây (Breathing Dimmer) và nhắc bạn nhìn xa 6 mét để thư giãn cơ điều tiết mắt.'}
                  </li>
                  <li>
                    {isEn
                      ? 'Independent Timer: Clicking "Snooze 5m" or "In Meeting (15m)" on the Eye Care screen ONLY snoozes the Eye Care timer — your 60-minute Stand-up countdown continues running normally without being reset or frozen.'
                      : 'Hoãn độc lập: Khi bấm "Hoãn 5 phút" hoặc "Đang họp (15p)" trên bảng Nghỉ mắt, chỉ bộ đếm Nghỉ mắt được đặt lại 5p/15p — bộ đếm Đứng dậy vẫn tiếp tục đếm ngược bình thường, không bị ảnh hưởng.'}
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <h3 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  {isEn
                    ? 'Hardware Gamma Blue-Light Filter (Aura Eye-Shield)'
                    : 'Bộ Lọc Ánh Sáng Xanh Phần Cứng (Aura Eye-Shield)'}
                </h3>
                <p className="text-xs text-slate-700">
                  {isEn
                    ? 'Enable Eye-Shield in Settings (or via the System Tray right-click menu) to filter blue light directly via GPU Gamma LUT with 0% CPU/GPU overhead:'
                    : 'Bật trong tab Cài đặt (hoặc menu chuột phải dưới khay hệ thống) để lọc ánh sáng xanh trực tiếp trên phần cứng màn hình với 3 chế độ:'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200/80">
                    <span className="font-bold text-amber-800">
                      ☀️ {isEn ? 'Auto (Circadian)' : 'Tự động theo giờ'}
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      {isEn
                        ? '96% day → 88% evening (18h) → 75% warm night (22h).'
                        : 'Ban ngày 96% → Chiều tối (18h) 88% → Đêm khuya (22h) 75% ấm dịu.'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200/80">
                    <span className="font-bold text-emerald-800">
                      🌿 {isEn ? 'Office Mode' : 'Văn phòng'}
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      {isEn
                        ? 'Fixed 92% brightness & 20% warmth all day.'
                        : 'Cố định độ sáng 92% & độ ấm 20% chống chói đèn văn phòng.'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200/80">
                    <span className="font-bold text-indigo-800">
                      🌙 {isEn ? 'Night OT' : 'Đêm OT'}
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      {isEn
                        ? 'Deep 75% brightness & 50% amber warmth for dark rooms.'
                        : 'Độ sáng 75% & lọc 50% ánh sáng xanh khi cày đêm.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-2">
                <h3 className="text-sm font-extrabold text-sky-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  {isEn
                    ? 'Single-Leader Active Routing (Only Notify the Machine in Use!)'
                    : 'Chỉ Thông Báo Trên Máy Đang Sử Dụng (Single-Leader Active Routing)'}
                </h3>
                <p className="text-xs text-slate-700">
                  {isEn
                    ? 'When you link 2 or more computers via Google Sign-In, Email, or a 6-character Aura Sync Code in Settings:'
                    : 'Khi bạn đồng bộ từ 2 máy tính trở lên (qua Google, Email hoặc mã Aura Code 6 ký tự trong tab Cài đặt):'}
                </p>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                  <li>
                    <strong>
                      {isEn
                        ? 'Machine 1 in use, Machine 2 untouched:'
                        : 'Máy 1 đang dùng, Máy 2 để không:'}
                    </strong>{' '}
                    {isEn
                      ? 'Break notifications, voice reminders, and screen dimming ONLY fire on Machine 1. Machine 2 rolls over its timer silently without popping up.'
                      : 'Thông báo nghỉ ngơi và âm thanh CHỈ phát trên Máy 1. Máy 2 tự động xoay vòng đồng hồ trong im lặng tuyệt đối.'}
                  </li>
                  <li>
                    <strong>
                      {isEn
                        ? 'Both machines active:'
                        : 'Cả 2 máy đều đang mở:'}
                    </strong>{' '}
                    {isEn
                      ? 'Only the single computer with the most recent mouse/keyboard input receives the notification and logs focus minutes — preventing duplicate alarms and double-counted stats.'
                      : 'Chỉ duy nhất 1 máy vừa có thao tác chuột/phím gần nhất nhận thông báo và cộng số phút tập trung — không bao giờ kêu cùng lúc 2 máy hay cộng gấp đôi (x2) thống kê.'}
                  </li>
                  <li>
                    <strong>
                      {isEn
                        ? 'Both machines idle (>= 3 mins):'
                        : 'Cả 2 máy đều đang nghỉ (>= 3 phút):'}
                    </strong>{' '}
                    {isEn
                      ? 'Both machines stay completely silent and start a fresh 60-minute cycle when you return.'
                      : 'Cả 2 máy đều giữ im lặng hoàn toàn và tự bắt đầu chu kỳ 60 phút mới khi bạn chạm chuột quay lại.'}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'sounds' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                <h3 className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-emerald-600" />
                  {isEn
                    ? '10 Offline Ambient Layers + Zing MP3 / Global Lofi Hub'
                    : '10 Lớp Nhạc Nền Offline + Đài Zing MP3 / Global Lofi'}
                </h3>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                  <li>
                    {isEn
                      ? 'Mix 10 procedural offline sounds (Rain, Forest Stream, Ocean Waves, Campfire, Tibetan Singing Bowl, Alpha/Theta Brainwaves, Brown/Pink Noise) with zero internet required.'
                      : 'Phối trộn 10 lớp âm thanh thiên nhiên & sóng não chạy Offline 100% (Mưa, Suối, Sóng biển, Lửa trại, Chuông xoay Tây Tạng, Sóng Alpha/Theta, Brown/Pink Noise).'}
                  </li>
                  <li>
                    {isEn
                      ? 'Smart Audio Ducking: Whenever a voice reminder speaks, DeskAura smoothly lowers background music to 20% and restores it afterward.'
                      : 'Tự động giảm nhạc nền (Audio Ducking): Khi giọng nhắc cất lên, nhạc nền tự dịu xuống 20% để nghe rõ lời nhắc rồi mượt mà tăng lại.'}
                  </li>
                  <li>
                    {isEn
                      ? 'Silent Background OTA Updates: New versions download quietly in the background and show a small green dot on the Settings tab when ready.'
                      : 'Cập nhật ngầm (Silent OTA): Bản mới tự tải ngầm trong nền và báo bằng chấm xanh nhỏ tại tab Cài đặt khi sẵn sàng.'}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            {isEn
              ? 'Full documentation available in HUONG_DAN_SU_DUNG.md'
              : 'Tài liệu đầy đủ được lưu tại file HUONG_DAN_SU_DUNG.md trong thư mục dự án'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
          >
            {isEn ? 'Got It!' : 'Đã hiểu!'}
          </button>
        </div>
      </div>
    </div>
  );
};


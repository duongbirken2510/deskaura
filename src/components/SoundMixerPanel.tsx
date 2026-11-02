import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BookmarkPlus,
  CloudRain,
  Disc3,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  FolderOpen,
  HeartHandshake,
  Music,
  Pause,
  Play,
  PowerOff,
  Radio,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  Sunrise,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from 'lucide-react';
import {
  AMBIENT_SOUNDS,
  FREE_MUSIC_RESOURCES,
  ONLINE_STATIONS,
  SOUND_PRESETS,
} from '../data/wellnessCatalog';
import {
  closeWebMusicPlayer,
  controlWebMusicPlayer,
  hideWebMusicPlayer,
  onTauriEvent,
  openInSystemBrowser,
  openWebMusicPlayer,
} from '../services/tauriBridge';
import { SoundId } from '../types/wellness';

interface SavedZingBookmark {
  id: string;
  title: string;
  url: string;
}

const DEFAULT_ZING_CHANNELS: SavedZingBookmark[] = [
  {
    id: 'zing_new',
    title: '🔥 Nhạc Mới Phát Hành',
    url: 'https://zingmp3.vn/moi-phat-hanh',
  },
  {
    id: 'zing_chart',
    title: '🏆 Bảng Xếp Hạng #zingchart',
    url: 'https://zingmp3.vn/zing-chart',
  },
  {
    id: 'zing_lofi',
    title: '☕ Lofi Chill & Acoustic Làm Việc',
    url: 'https://zingmp3.vn/tim-kiem/tat-ca?q=lofi%20chill%20lam%20viec',
  },
  {
    id: 'zing_piano',
    title: '🎹 Nhạc Không Lời & Piano Tập Trung',
    url: 'https://zingmp3.vn/tim-kiem/tat-ca?q=nhac%20khong%20loi%20piano%20thu%20gian',
  },
  {
    id: 'zing_healing',
    title: '🧘 Nhạc Thiền & Chữa Lành Tâm Hồn',
    url: 'https://zingmp3.vn/tim-kiem/tat-ca?q=nhac%20thien%20chua%20lanh%20tinh%20tam',
  },
  {
    id: 'zing_ballad',
    title: '🌧️ Acoustic & Ballad Nhẹ Nhàng',
    url: 'https://zingmp3.vn/tim-kiem/tat-ca?q=acoustic%20nhe%20nhang%20thu%20gian',
  },
];

const BOOKMARKS_KEY = 'mamxanh_zing_bookmarks_v1';

interface SoundMixerPanelProps {
  activeSounds: Record<SoundId, boolean>;
  soundVolumes: Record<SoundId, number>;
  masterVolume: number;
  isMasterMuted: boolean;
  activeStationUrl: string | null;
  isRadioPlaying: boolean;
  radioVolume: number;
  radioError: string | null;
  onToggleSound: (id: SoundId) => void;
  onChangeSoundVolume: (id: SoundId, vol: number) => void;
  onApplyPreset: (mix: Partial<Record<SoundId, number>>) => void;
  onStopAllSounds: () => void;
  onChangeMasterVolume: (vol: number) => void;
  onToggleMasterMute: () => void;
  onPlayRadioStream: (url: string, label?: string) => void;
  onStopRadio: () => void;
  onChangeRadioVolume: (vol: number) => void;
}

export const SoundMixerPanel: React.FC<SoundMixerPanelProps> = ({
  activeSounds,
  soundVolumes,
  masterVolume,
  isMasterMuted,
  activeStationUrl,
  isRadioPlaying,
  radioVolume,
  radioError,
  onToggleSound,
  onChangeSoundVolume,
  onApplyPreset,
  onStopAllSounds,
  onChangeMasterVolume,
  onToggleMasterMute,
  onPlayRadioStream,
  onStopRadio,
  onChangeRadioVolume,
}) => {
  const [customStreamUrl, setCustomStreamUrl] = useState('');
  const [zingCustomUrl, setZingCustomUrl] = useState('https://zingmp3.vn/moi-phat-hanh');
  const [zingCustomTitle, setZingCustomTitle] = useState('');
  const [zingWindowState, setZingWindowState] = useState<'closed' | 'visible' | 'hidden_playing'>('closed');
  const [zingVolume, setZingVolume] = useState<number>(0.8);
  const [savedBookmarks, setSavedBookmarks] = useState<SavedZingBookmark[]>(() => {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(savedBookmarks));
  }, [savedBookmarks]);

  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    onTauriEvent<string>('zing-window-state', (state) => {
      if (state === 'visible' || state === 'hidden_playing' || state === 'closed') {
        setZingWindowState(state);
      }
    }).then((fn) => {
      unlistenFn = fn;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  const handleOpenZingUrl = async (url: string, title?: string) => {
    setZingCustomUrl(url);
    setZingWindowState('visible');
    await openWebMusicPlayer(url, title || '🎶 Mầm Xanh — Trình Phát Nhạc Zing MP3');
  };

  const handleAddBookmark = () => {
    const cleanUrl = zingCustomUrl.trim();
    if (!cleanUrl) return;
    const label =
      zingCustomTitle.trim() ||
      `🎵 Playlist Zing MP3 #${savedBookmarks.length + 1}`;
    setSavedBookmarks((prev) => [
      { id: `${Date.now()}`, title: label, url: cleanUrl },
      ...prev,
    ]);
    setZingCustomTitle('');
  };

  const renderSoundIcon = (iconName: string) => {
    const props = { className: 'w-5 h-5' };
    switch (iconName) {
      case 'CloudRain':
        return <CloudRain {...props} />;
      case 'Waves':
        return <Waves {...props} />;
      case 'Sunrise':
        return <Sunrise {...props} />;
      case 'Wind':
        return <Wind {...props} />;
      case 'Flame':
        return <Flame {...props} />;
      case 'Bell':
        return <Bell {...props} />;
      case 'Sparkles':
        return <Sparkles {...props} />;
      case 'HeartHandshake':
        return <HeartHandshake {...props} />;
      case 'Sliders':
        return <Sliders {...props} />;
      default:
        return <Volume2 {...props} />;
    }
  };

  const activeCount =
    Object.values(activeSounds).filter(Boolean).length + (isRadioPlaying ? 1 : 0);

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setLocalFileName(file.name);
    onPlayRadioStream(objectUrl, file.name);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Master Volume & Presets */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Music className="w-5 h-5 text-emerald-500" />
              Phòng Thu Âm Thanh Chữa Lành & Tập Trung (Offline + Online + Zing MP3)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bật nhiều lớp âm thanh thiên nhiên Offline cùng lúc và hòa trộn với Zing MP3 hoặc đài Radio Lofi
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/70">
              <button
                onClick={onToggleMasterMute}
                className="text-slate-600 hover:text-emerald-600 transition"
                title={isMasterMuted ? 'Bật tiếng' : 'Tắt tiếng tạm thời'}
              >
                {isMasterMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                )}
              </button>
              <span className="text-xs font-semibold text-slate-600">
                Âm lượng tổng
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMasterMuted ? 0 : masterVolume}
                onChange={(e) => onChangeMasterVolume(parseFloat(e.target.value))}
                className="w-24 accent-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 w-9 text-right">
                {Math.round((isMasterMuted ? 0 : masterVolume) * 100)}%
              </span>
            </div>

            {activeCount > 0 && (
              <button
                onClick={onStopAllSounds}
                className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
              >
                Tắt tất cả ({activeCount})
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Mood Presets */}
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Tổ hợp âm thanh gợi ý 1-chạm (Offline Presets)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SOUND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset.mix)}
                className="text-left p-3.5 rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50/50 via-white to-sky-50/40 hover:border-emerald-300 hover:shadow-sm transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    {preset.badge}
                  </span>
                  <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                </div>
                <p className="text-sm font-bold text-slate-800 mt-2">
                  {preset.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section: Advanced Zing MP3 Hub & Background Remote Controller */}
      <div className="bg-gradient-to-br from-purple-50/90 via-white to-fuchsia-50/70 rounded-3xl p-6 border border-purple-200/80 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
                🎶 Trung Tâm Điều Khiển Zing MP3 Nâng Cao
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                🛡️ Đã bật Chặn Nhạc Quảng Cáo 3 Lớp (Auto-Skip Ad)
              </span>
              {zingWindowState === 'hidden_playing' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                  <Disc3 className="w-3.5 h-3.5 animate-spin" />
                  Đang chạy ngầm phát nhạc
                </span>
              )}
              {zingWindowState === 'visible' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                  Đang mở cửa sổ trình phát
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Phát Nhạc Zing MP3 Chạy Ngầm & Điều Khiển Từ Xa Ngay Trên Mầm Xanh
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              💡 <strong>Mẹo hay:</strong> Khi bấm nút <strong>X (Đóng)</strong> trên cửa sổ Zing MP3, cửa sổ sẽ <strong>tự động ẩn xuống chạy ngầm và nhạc vẫn tiếp tục phát</strong>! Bạn chỉ cần dùng bảng điều khiển bên dưới để chuyển bài hoặc chỉnh âm lượng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {zingWindowState === 'hidden_playing' ? (
              <button
                onClick={() => openWebMusicPlayer('__SHOW_ONLY__')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
              >
                <Eye className="w-4 h-4" />
                Hiện lại cửa sổ Zing MP3
              </button>
            ) : (
              <button
                onClick={() =>
                  handleOpenZingUrl(
                    'https://zingmp3.vn/moi-phat-hanh',
                    '🎶 Mầm Xanh — Zing MP3 Mới Phát Hành'
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white shadow-md shadow-purple-500/20 transition"
              >
                <Play className="w-4 h-4" />
                Mở Zing MP3 — Mới Phát Hành
              </button>
            )}

            {zingWindowState === 'visible' && (
              <button
                onClick={() => {
                  hideWebMusicPlayer();
                  setZingWindowState('hidden_playing');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                title="Ẩn cửa sổ Zing MP3 xuống chạy ngầm, nhạc vẫn phát bình thường"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Ẩn xuống chạy ngầm
              </button>
            )}

            {zingWindowState !== 'closed' && (
              <button
                onClick={() => {
                  closeWebMusicPlayer();
                  setZingWindowState('closed');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                title="Đóng hoàn toàn trình phát và tắt nhạc Zing MP3"
              >
                <PowerOff className="w-3.5 h-3.5" />
                Tắt hẳn nhạc Zing MP3
              </button>
            )}
          </div>
        </div>

        {/* Remote Control Bar for Zing MP3 (Works even when Zing window is hidden!) */}
        <div className="bg-white/95 rounded-2xl p-4 border border-purple-200/80 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-900 mr-1">
              🎛️ Điều khiển từ xa:
            </span>
            <button
              onClick={() => controlWebMusicPlayer('prev')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition"
              title="Bài trước trên Zing MP3"
            >
              <SkipBack className="w-3.5 h-3.5" /> Bài trước
            </button>
            <button
              onClick={() => controlWebMusicPlayer('play_pause')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
              title="Phát hoặc Tạm dừng nhạc Zing MP3"
            >
              <Play className="w-3.5 h-3.5" /> Phát / Tạm dừng
            </button>
            <button
              onClick={() => controlWebMusicPlayer('next')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition"
              title="Bài tiếp theo trên Zing MP3"
            >
              Bài tiếp <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => controlWebMusicPlayer('play_first')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 transition"
              title="Tự động bấm nút Phát Tất Cả trên trang Zing MP3 hiện tại"
            >
              <Sparkles className="w-3.5 h-3.5" /> Phát tất cả trang này
            </button>
          </div>

          {/* Dedicated Zing MP3 Volume Slider */}
          <div className="flex items-center gap-2.5 bg-purple-50/80 px-3.5 py-2 rounded-xl border border-purple-200/70">
            <Volume2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-900">
              Âm lượng Zing MP3:
            </span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={zingVolume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setZingVolume(v);
                controlWebMusicPlayer('volume', v);
              }}
              className="w-28 accent-purple-600 cursor-pointer"
            />
            <span className="text-xs font-extrabold text-purple-700 w-9 text-right">
              {Math.round(zingVolume * 100)}%
            </span>
          </div>
        </div>

        {/* 6 Curated Office & Healing Zing MP3 Channels */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-800/70 mb-2.5">
            Chuyên mục Zing MP3 chọn lọc cho dân văn phòng (1-Click):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {DEFAULT_ZING_CHANNELS.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  handleOpenZingUrl(item.url, `🎶 Mầm Xanh — ${item.title}`)
                }
                className="p-3 rounded-2xl bg-white/90 hover:bg-white border border-purple-100 hover:border-purple-300 text-left transition flex items-center justify-between group shadow-sm"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.url.replace('https://', '')}
                  </p>
                </div>
                <Play className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* User Saved Zing MP3 Playlists / Bookmarks */}
        {savedBookmarks.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-purple-800/70 mb-2">
              ⭐ Playlist Zing MP3 Yêu Thích Của Bạn:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {savedBookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="inline-flex items-center gap-1.5 bg-white pl-3 pr-2 py-1.5 rounded-xl border border-purple-200 shadow-sm"
                >
                  <button
                    onClick={() => handleOpenZingUrl(bm.url, bm.title)}
                    className="text-xs font-bold text-purple-700 hover:underline"
                  >
                    {bm.title}
                  </button>
                  <button
                    onClick={() =>
                      setSavedBookmarks((prev) =>
                        prev.filter((x) => x.id !== bm.id)
                      )
                    }
                    className="text-slate-400 hover:text-rose-500 p-0.5"
                    title="Xóa khỏi danh sách yêu thích"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Zing URL Input + Bookmark Saver + External Browser Option */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 bg-white/85 p-3 rounded-2xl border border-purple-100">
          <input
            type="text"
            value={zingCustomTitle}
            onChange={(e) => setZingCustomTitle(e.target.value)}
            placeholder="Tên gợi nhớ (VD: Nhạc chiều thứ 6)..."
            className="lg:col-span-3 bg-white px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-400"
          />
          <input
            type="text"
            value={zingCustomUrl}
            onChange={(e) => setZingCustomUrl(e.target.value)}
            placeholder="Dán link Zing MP3, Album hoặc Playlist bất kỳ..."
            className="lg:col-span-5 bg-white px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-400"
          />
          <div className="lg:col-span-4 flex items-center gap-2">
            <button
              onClick={() => {
                if (zingCustomUrl.trim()) {
                  handleOpenZingUrl(
                    zingCustomUrl.trim(),
                    zingCustomTitle.trim() || '🎶 Mầm Xanh — Zing MP3'
                  );
                }
              }}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition whitespace-nowrap"
            >
              Mở trên App
            </button>
            <button
              onClick={handleAddBookmark}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition whitespace-nowrap"
              title="Lưu link này vào danh sách Playlist yêu thích"
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> Lưu
            </button>
            <button
              onClick={() => {
                if (zingCustomUrl.trim()) {
                  openInSystemBrowser(zingCustomUrl.trim());
                }
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title="Mở link này bằng trình duyệt Chrome/Edge bên ngoài"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Offline Nature, Healing & Brainwave Soundscape Mixer */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              1. Bộ Trộn Âm Thanh Tự Nhiên & Sóng Não Chữa Lành (Hoạt động 100% Offline)
            </h3>
            <p className="text-xs text-slate-500">
              Chạm vào thẻ để bật/tắt và kéo thanh trượt để pha trộn cùng nhạc Zing MP3 hoặc nghe độc lập
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Không cần Internet
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {AMBIENT_SOUNDS.map((item) => {
            const isActive = !!activeSounds[item.id];
            const vol = soundVolumes[item.id] ?? item.defaultVolume;
            return (
              <div
                key={item.id}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-gradient-to-br from-emerald-50/90 to-sky-50/70 border-emerald-300 shadow-sm'
                    : 'bg-slate-50/60 hover:bg-slate-50 border-slate-100'
                }`}
              >
                <div
                  onClick={() => onToggleSound(item.id)}
                  className="cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${
                        item.color
                      } ${isActive ? 'shadow-md scale-105' : 'opacity-80'} transition`}
                    >
                      {renderSoundIcon(item.iconName)}
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200/70 text-slate-600'
                      }`}
                    >
                      {isActive ? 'Đang phát' : 'Tắt'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-3">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {item.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-2">
                  <Volume2
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.02}
                    value={vol}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      onChangeSoundVolume(item.id, v);
                      if (!isActive) {
                        onToggleSound(item.id);
                      }
                    }}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5"
                  />
                  <span className="text-[11px] font-semibold text-slate-600 w-8 text-right">
                    {Math.round(vol * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Online Healing / Lofi Radio Streams + Local File Player */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Radio className="w-5 h-5 text-sky-500" />
              2. Đài Radio Nhạc Chữa Lành & Lofi Quốc Tế (Không Quảng Cáo) + Nhạc Trong Máy
            </h3>
            <p className="text-xs text-slate-500">
              Các kênh phát trực tiếp chuẩn Icecast MP3 không lời hoặc chọn file nhạc từ ổ cứng máy tính
            </p>
          </div>

          <div className="flex items-center gap-2 bg-sky-50 px-3.5 py-1.5 rounded-2xl border border-sky-100">
            <span className="text-xs font-semibold text-sky-800">
              Âm lượng đài/nhạc:
            </span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.02}
              value={radioVolume}
              onChange={(e) => onChangeRadioVolume(parseFloat(e.target.value))}
              className="w-24 accent-sky-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-sky-700">
              {Math.round(radioVolume * 100)}%
            </span>
          </div>
        </div>

        {radioError && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            ⚠️ {radioError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {ONLINE_STATIONS.map((station) => {
            const isSelected =
              isRadioPlaying && activeStationUrl === station.streamUrl;
            return (
              <div
                key={station.id}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-sky-50 to-emerald-50/60 border-sky-300 shadow-sm'
                    : 'bg-slate-50/70 hover:bg-slate-50 border-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700">
                      {station.badge}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {station.genre}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-2">
                    {station.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {station.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <button
                    onClick={() =>
                      isSelected
                        ? onStopRadio()
                        : onPlayRadioStream(station.streamUrl, station.name)
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? 'bg-rose-500 hover:bg-rose-600 text-white'
                        : 'bg-sky-500 hover:bg-sky-600 text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Dừng phát
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Phát kênh này
                      </>
                    )}
                  </button>

                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <Disc3 className="w-4 h-4 animate-spin" /> Đang phát
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Local Audio File & Custom Stream Input */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700">
                📂 Phát file nhạc chữa lành từ máy tính (.mp3, .wav, .ogg)
              </p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {localFileName
                  ? `Đang chọn: ${localFileName}`
                  : 'Chọn bản nhạc yêu thích lưu sẵn trong máy của bạn'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleLocalFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 transition whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Chọn file nhạc
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
            <input
              type="text"
              value={customStreamUrl}
              onChange={(e) => setCustomStreamUrl(e.target.value)}
              placeholder="Dán link stream nhạc trực tuyến (.mp3 / Icecast URL)..."
              className="flex-1 bg-white px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-sky-400"
            />
            <button
              onClick={() => {
                if (customStreamUrl.trim()) {
                  onPlayRadioStream(customStreamUrl.trim(), 'Kênh tùy chỉnh');
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition whitespace-nowrap"
            >
              Phát Link
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Curated Free Healing/Work Music Repositories */}
      <div className="bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/70 rounded-3xl p-6 border border-emerald-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-800">
          3. Kho Nhạc Chữa Lành & Làm Việc Miễn Phí Bản Quyền (Khuyên Dùng)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          Danh sách các thư viện âm nhạc mở hoàn toàn miễn phí để anh tải thêm nhạc MP3 chất lượng cao về máy
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {FREE_MUSIC_RESOURCES.map((res) => (
            <a
              key={res.name}
              href={res.url}
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-emerald-300 hover:shadow-sm transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    {res.category}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-2 group-hover:text-emerald-700 transition">
                  {res.name}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {res.description}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400">
                Giấy phép: {res.license}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

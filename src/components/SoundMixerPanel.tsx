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
  Globe,
  HeartHandshake,
  Music,
  Pause,
  Play,
  PowerOff,
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

const DEFAULT_GLOBAL_CHANNELS: SavedZingBookmark[] = [
  {
    id: 'global_lofigirl',
    title: '☕ Lofi Girl — Beats to Relax / Study to',
    url: 'https://soundcloud.com/lofigirl/sets/lofi-hip-hop-beats',
  },
  {
    id: 'global_coderadio',
    title: '💻 freeCodeCamp — 24/7 Code Radio',
    url: 'https://coderadio.freecodecamp.org',
  },
  {
    id: 'global_chillhop',
    title: '🌌 Chillhop — Jazz & Lofi Hip Hop Mix',
    url: 'https://soundcloud.com/chillhopdotcom/sets/lofi-hip-hop-beats-music-to',
  },
  {
    id: 'global_piano',
    title: '🎹 Peaceful Piano & Deep Focus Instrumental',
    url: 'https://soundcloud.com/relaxdaily/sets/deep-focus-music-studying-concentration-work',
  },
  {
    id: 'global_ambient',
    title: '🧘 Ambient Space & Meditation Soundscapes',
    url: 'https://soundcloud.com/ambientmusicalgenre/sets/ambient-music',
  },
  {
    id: 'global_acoustic',
    title: '🌧️ Indie & Acoustic Coffeehouse Chill',
    url: 'https://soundcloud.com/alexrainbirdmusic',
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
  lang?: 'vi' | 'en';
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
  isRadioPlaying,
  lang = 'vi',
  onToggleSound,
  onChangeSoundVolume,
  onApplyPreset,
  onStopAllSounds,
  onChangeMasterVolume,
  onToggleMasterMute,
  onPlayRadioStream,
  onStopRadio,
}) => {
  const isEn = lang === 'en';
  const [musicPlatform, setMusicPlatform] = useState<'zing' | 'global'>(
    lang === 'en' ? 'global' : 'zing'
  );
  const [zingCustomUrl, setZingCustomUrl] = useState(
    lang === 'en'
      ? 'https://soundcloud.com/lofigirl/sets/lofi-hip-hop-beats'
      : 'https://zingmp3.vn/moi-phat-hanh'
  );
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

  // Sync default music platform when user toggles VI <-> EN language
  useEffect(() => {
    if (lang === 'en') {
      setMusicPlatform('global');
      setZingCustomUrl('https://soundcloud.com/lofigirl/sets/lofi-hip-hop-beats');
    } else {
      setMusicPlatform('zing');
      setZingCustomUrl('https://zingmp3.vn/moi-phat-hanh');
    }
  }, [lang]);

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

  const isGlobalHub = musicPlatform === 'global';
  const activeChannelList = isGlobalHub ? DEFAULT_GLOBAL_CHANNELS : DEFAULT_ZING_CHANNELS;
  const platformName = isGlobalHub
    ? isEn
      ? 'Global Lofi & SoundCloud'
      : 'Lofi Quốc Tế & SoundCloud'
    : 'Zing MP3';

  const handleOpenZingUrl = async (url: string, title?: string) => {
    setZingCustomUrl(url);
    setZingWindowState('visible');
    const defaultTitle = isEn
      ? `🎶 DeskAura — ${platformName} Background Player`
      : `🎶 DeskAura — Trình Phát Nhạc ${platformName}`;
    await openWebMusicPlayer(url, title || defaultTitle);
  };

  const handleAddBookmark = () => {
    const cleanUrl = zingCustomUrl.trim();
    if (!cleanUrl) return;
    const label =
      zingCustomTitle.trim() ||
      (isEn
        ? `🎵 Saved Playlist #${savedBookmarks.length + 1}`
        : `🎵 Playlist Yêu Thích #${savedBookmarks.length + 1}`);
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
    Object.values(activeSounds).filter(Boolean).length +
    (isRadioPlaying ? 1 : 0) +
    (zingWindowState !== 'closed' ? 1 : 0);

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setLocalFileName(file.name);
    onPlayRadioStream(objectUrl, file.name);
  };

  return (
    <div className="space-y-6">
      {/* Section: Smart Regional Web Music Hub (Zing MP3 for VI / Global Lofi & SoundCloud for EN) */}
      <div className="bg-gradient-to-br from-purple-50/90 via-white to-fuchsia-50/70 rounded-3xl p-6 border border-purple-200/80 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
                {isGlobalHub
                  ? isEn
                    ? '🎧 Global Lofi & SoundCloud Focus Hub'
                    : '🎧 Trung Tâm Nhạc Lofi Quốc Tế & SoundCloud'
                  : isEn
                  ? '🎶 Zing MP3 Background Music Hub'
                  : '🎶 Trung Tâm Điều Khiển Zing MP3 Nâng Cao'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {isEn
                  ? '🛡️ 3-Layer Audio Ad-Blocker Active'
                  : '🛡️ Đã bật Chặn Nhạc Quảng Cáo 3 Lớp'}
              </span>

              {/* 1-Click Regional Platform Switcher Pill */}
              <div className="inline-flex items-center bg-white rounded-full p-0.5 border border-purple-200 shadow-2xs">
                <button
                  onClick={() => {
                    setMusicPlatform('zing');
                    setZingCustomUrl('https://zingmp3.vn/moi-phat-hanh');
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
                    !isGlobalHub
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 hover:text-purple-700'
                  }`}
                >
                  🇻🇳 Zing MP3
                </button>
                <button
                  onClick={() => {
                    setMusicPlatform('global');
                    setZingCustomUrl('https://soundcloud.com/lofigirl/sets/lofi-hip-hop-beats');
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
                    isGlobalHub
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 hover:text-purple-700'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  {isEn ? 'Global Lofi / SoundCloud' : 'Lofi Quốc Tế'}
                </button>
              </div>

              {zingWindowState === 'hidden_playing' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                  <Disc3 className="w-3.5 h-3.5 animate-spin" />
                  {isEn ? 'Playing in background' : 'Đang chạy ngầm phát nhạc'}
                </span>
              )}
              {zingWindowState === 'visible' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                  {isEn ? 'Player window open' : 'Đang mở cửa sổ trình phát'}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {isEn
                ? `Stream ${platformName} in the Background & Remote-Control from DeskAura`
                : `Phát Nhạc ${platformName} Chạy Ngầm & Điều Khiển Từ Xa Ngay Trên DeskAura`}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {isEn ? (
                <>
                  💡 <strong>Pro tip:</strong> Closing (<strong>X</strong>) the music window{' '}
                  <strong>minimizes it to the background while keeping your music playing</strong>! Use the remote control bar below to skip tracks or adjust volume.
                </>
              ) : (
                <>
                  💡 <strong>Mẹo hay:</strong> Khi bấm nút <strong>X (Đóng)</strong> trên cửa sổ nhạc, cửa sổ sẽ <strong>tự động ẩn xuống chạy ngầm và nhạc vẫn tiếp tục phát</strong>! Bạn chỉ cần dùng bảng điều khiển bên dưới để chuyển bài hoặc chỉnh âm lượng.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {zingWindowState === 'hidden_playing' ? (
              <button
                onClick={() => openWebMusicPlayer('__SHOW_ONLY__')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
              >
                <Eye className="w-4 h-4" />
                {isEn ? `Show ${platformName} Window` : `Hiện lại cửa sổ ${platformName}`}
              </button>
            ) : (
              <button
                onClick={() =>
                  handleOpenZingUrl(
                    activeChannelList[0].url,
                    `🎶 DeskAura — ${activeChannelList[0].title}`
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white shadow-md shadow-purple-500/20 transition"
              >
                <Play className="w-4 h-4" />
                {isGlobalHub
                  ? isEn
                    ? 'Open Lofi Girl Beats'
                    : 'Mở Lofi Girl Quốc Tế'
                  : isEn
                  ? 'Open Zing MP3 — New Releases'
                  : 'Mở Zing MP3 — Mới Phát Hành'}
              </button>
            )}

            {zingWindowState === 'visible' && (
              <button
                onClick={() => {
                  hideWebMusicPlayer();
                  setZingWindowState('hidden_playing');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                title={
                  isEn
                    ? 'Hide player window to background while music keeps playing'
                    : 'Ẩn cửa sổ nhạc xuống chạy ngầm, nhạc vẫn phát bình thường'
                }
              >
                <EyeOff className="w-3.5 h-3.5" />
                {isEn ? 'Hide to Background' : 'Ẩn xuống chạy ngầm'}
              </button>
            )}

            {zingWindowState !== 'closed' && (
              <button
                onClick={() => {
                  closeWebMusicPlayer();
                  setZingWindowState('closed');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                title={
                  isEn
                    ? 'Completely close the web music player'
                    : 'Đóng hoàn toàn trình phát và tắt nhạc'
                }
              >
                <PowerOff className="w-3.5 h-3.5" />
                {isEn ? 'Close Player' : 'Tắt hẳn trình phát'}
              </button>
            )}
          </div>
        </div>

        {/* Remote Control Bar (Works even when music window is hidden!) */}
        <div className="bg-white/95 rounded-2xl p-4 border border-purple-200/80 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-900 mr-1">
              {isEn ? '🎛️ Remote Control:' : '🎛️ Điều khiển từ xa:'}
            </span>
            <button
              onClick={() => controlWebMusicPlayer('prev')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition"
              title={isEn ? 'Previous track' : 'Bài trước'}
            >
              <SkipBack className="w-3.5 h-3.5" /> {isEn ? 'Prev' : 'Bài trước'}
            </button>
            <button
              onClick={() => controlWebMusicPlayer('play_pause')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
              title={isEn ? 'Play or Pause' : 'Phát hoặc Tạm dừng'}
            >
              <Play className="w-3.5 h-3.5" /> {isEn ? 'Play / Pause' : 'Phát / Tạm dừng'}
            </button>
            <button
              onClick={() => controlWebMusicPlayer('next')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition"
              title={isEn ? 'Next track' : 'Bài tiếp theo'}
            >
              {isEn ? 'Next' : 'Bài tiếp'} <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => controlWebMusicPlayer('play_first')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 transition"
              title={
                isEn
                  ? 'Click Play All on the current page'
                  : 'Tự động bấm nút Phát Tất Cả trên trang hiện tại'
              }
            >
              <Sparkles className="w-3.5 h-3.5" />{' '}
              {isEn ? 'Play All on Page' : 'Phát tất cả trang này'}
            </button>
          </div>

          {/* Dedicated Web Player Volume Slider */}
          <div className="flex items-center gap-2.5 bg-purple-50/80 px-3.5 py-2 rounded-xl border border-purple-200/70">
            <Volume2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-900">
              {isEn ? 'Player Volume:' : 'Âm lượng trình phát:'}
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

        {/* 6 Curated Office & Healing Channels */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-800/70 mb-2.5">
            {isGlobalHub
              ? isEn
                ? 'Curated Global Focus & Lofi Channels (1-Click):'
                : 'Kênh Nhạc Lofi & Tập Trung Quốc Tế Chọn Lọc (1-Chạm):'
              : isEn
              ? 'Curated Zing MP3 Office Channels (1-Click):'
              : 'Chuyên mục Zing MP3 chọn lọc cho dân văn phòng (1-Click):'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeChannelList.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  handleOpenZingUrl(item.url, `🎶 DeskAura — ${item.title}`)
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

        {/* User Saved Playlists / Bookmarks */}
        {savedBookmarks.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-purple-800/70 mb-2">
              {isEn
                ? '⭐ Your Saved Favorite Playlists:'
                : '⭐ Playlist Yêu Thích Của Bạn:'}
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
                    title={isEn ? 'Remove bookmark' : 'Xóa khỏi danh sách yêu thích'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom URL Input + Bookmark Saver + External Browser Option */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 bg-white/85 p-3 rounded-2xl border border-purple-100">
          <input
            type="text"
            value={zingCustomTitle}
            onChange={(e) => setZingCustomTitle(e.target.value)}
            placeholder={
              isEn
                ? 'Custom label (e.g. Friday Chill)...'
                : 'Tên gợi nhớ (VD: Nhạc chiều thứ 6)...'
            }
            className="lg:col-span-3 bg-white px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-400"
          />
          <input
            type="text"
            value={zingCustomUrl}
            onChange={(e) => setZingCustomUrl(e.target.value)}
            placeholder={
              isEn
                ? 'Paste any SoundCloud, YouTube Music, CodeRadio or Zing MP3 URL...'
                : 'Dán link Zing MP3, SoundCloud, Album hoặc Playlist bất kỳ...'
            }
            className="lg:col-span-5 bg-white px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-400"
          />
          <div className="lg:col-span-4 flex items-center gap-2">
            <button
              onClick={() => {
                if (zingCustomUrl.trim()) {
                  handleOpenZingUrl(
                    zingCustomUrl.trim(),
                    zingCustomTitle.trim() || `🎶 DeskAura — ${platformName}`
                  );
                }
              }}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition whitespace-nowrap"
            >
              {isEn ? 'Open in App' : 'Mở trên App'}
            </button>
            <button
              onClick={handleAddBookmark}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition whitespace-nowrap"
              title={
                isEn
                  ? 'Save this URL to your favorite playlists'
                  : 'Lưu link này vào danh sách Playlist yêu thích'
              }
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> {isEn ? 'Save' : 'Lưu'}
            </button>
            <button
              onClick={() => {
                if (zingCustomUrl.trim()) {
                  openInSystemBrowser(zingCustomUrl.trim());
                }
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title={
                isEn
                  ? 'Open in external browser (Chrome/Edge/Safari)'
                  : 'Mở link này bằng trình duyệt bên ngoài'
              }
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Bar: Master Volume & Presets */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Music className="w-5 h-5 text-emerald-500" />
              {isEn
                ? `Ambient Sound Studio & Focus Music (Offline + ${platformName})`
                : `Phòng Thu Âm Thanh Chữa Lành & Tập Trung (Offline + ${platformName})`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? `Layer multiple offline nature soundscapes and mix seamlessly with ${platformName}`
                : `Bật nhiều lớp âm thanh thiên nhiên Offline cùng lúc và hòa trộn với nhạc ${platformName}`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/70">
              <button
                onClick={onToggleMasterMute}
                className="text-slate-600 hover:text-emerald-600 transition"
                title={isMasterMuted ? (isEn ? 'Unmute' : 'Bật tiếng') : isEn ? 'Mute' : 'Tắt tiếng tạm thời'}
              >
                {isMasterMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                )}
              </button>
              <span className="text-xs font-semibold text-slate-600">
                {isEn ? 'Master Vol' : 'Âm lượng tổng'}
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
                onClick={() => {
                  setZingWindowState('closed');
                  onStopAllSounds();
                }}
                className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
              >
                {isEn ? `Stop All (${activeCount})` : `Tắt tất cả (${activeCount})`}
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Mood Presets */}
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            {isEn ? '1-Click Mood Soundscapes (Offline Presets)' : 'Tổ hợp âm thanh gợi ý 1-chạm (Offline Presets)'}
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
                    {isEn ? preset.badgeEn || preset.badge : preset.badge}
                  </span>
                  <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                </div>
                <p className="text-sm font-bold text-slate-800 mt-2">
                  {isEn ? preset.nameEn || preset.name : preset.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {isEn ? preset.descriptionEn || preset.description : preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 1: Offline Nature, Healing & Brainwave Soundscape Mixer */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isEn
                ? '1. Natural Soundscapes & Healing Brainwaves (100% Offline)'
                : '1. Bộ Trộn Âm Thanh Tự Nhiên & Sóng Não Chữa Lành (Hoạt động 100% Offline)'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEn
                ? `Click any card to toggle and drag the slider to blend with ${platformName} or listen standalone`
                : `Chạm vào thẻ để bật/tắt và kéo thanh trượt để pha trộn cùng nhạc ${platformName} hoặc nghe độc lập`}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            {isEn ? 'No Internet Needed' : 'Không cần Internet'}
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
                      {isActive ? (isEn ? 'Playing' : 'Đang phát') : isEn ? 'Off' : 'Tắt'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-3">
                    {isEn ? item.nameEn || item.name : item.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {isEn ? item.subtitleEn || item.subtitle : item.subtitle}
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

        {/* Local Audio File Player kept neatly inside Offline Mixer */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-700">
              {isEn
                ? '📂 Play Local Healing Audio File (.mp3, .wav, .ogg)'
                : '📂 Phát file nhạc chữa lành từ máy tính (.mp3, .wav, .ogg)'}
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {localFileName
                ? isEn
                  ? `Selected: ${localFileName}`
                  : `Đang chọn: ${localFileName}`
                : isEn
                ? 'Choose a favorite audio track saved on your computer'
                : 'Chọn bản nhạc yêu thích lưu sẵn trong máy của bạn'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleLocalFileChange}
              className="hidden"
            />
            {isRadioPlaying && localFileName && (
              <button
                onClick={onStopRadio}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition whitespace-nowrap"
              >
                <Pause className="w-3.5 h-3.5" />
                {isEn ? 'Stop Local File' : 'Dừng phát file'}
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-emerald-50 text-emerald-700 border border-emerald-200 transition whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {isEn ? 'Choose Audio File' : 'Chọn file nhạc từ máy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import {
  AmbientSoundItem,
  ExerciseItem,
  FreeMusicResource,
  OnlineRadioStation,
  SoundId,
} from '../types/wellness';

export const AMBIENT_SOUNDS: AmbientSoundItem[] = [
  {
    id: 'rain',
    name: 'Mưa Hiên Nhà',
    subtitle: 'Tiếng mưa rơi êm dịu ngoài khung cửa',
    category: 'nature',
    iconName: 'CloudRain',
    color: 'from-sky-400 to-blue-500',
    defaultVolume: 0.55,
  },
  {
    id: 'stream',
    name: 'Suối Rừng Mát Lành',
    subtitle: 'Dòng nước chảy róc rách qua khe đá',
    category: 'nature',
    iconName: 'Waves',
    color: 'from-cyan-400 to-teal-500',
    defaultVolume: 0.45,
  },
  {
    id: 'ocean',
    name: 'Sóng Biển Bình Minh',
    subtitle: 'Nhịp sóng vỗ bờ đều đặn như hơi thở',
    category: 'nature',
    iconName: 'Sunrise',
    color: 'from-blue-400 to-indigo-500',
    defaultVolume: 0.5,
  },
  {
    id: 'wind',
    name: 'Gió Đồi Thông',
    subtitle: 'Làn gió nhẹ thổi qua tán lá rừng',
    category: 'nature',
    iconName: 'Wind',
    color: 'from-emerald-400 to-green-500',
    defaultVolume: 0.4,
  },
  {
    id: 'campfire',
    name: 'Lửa Trại Ấm Áp',
    subtitle: 'Tiếng củi khô tí tách thư thái',
    category: 'nature',
    iconName: 'Flame',
    color: 'from-amber-400 to-orange-500',
    defaultVolume: 0.45,
  },
  {
    id: 'singing_bowl',
    name: 'Chuông Xoay Tây Tạng',
    subtitle: 'Tần số cộng hưởng 432Hz & 528Hz chữa lành',
    category: 'healing',
    iconName: 'Bell',
    color: 'from-violet-400 to-purple-500',
    defaultVolume: 0.4,
  },
  {
    id: 'alpha_waves',
    name: 'Sóng Não Alpha 10Hz',
    subtitle: 'Tăng cường tập trung sâu & giảm căng thẳng',
    category: 'focus',
    iconName: 'Sparkles',
    color: 'from-teal-400 to-emerald-500',
    defaultVolume: 0.3,
  },
  {
    id: 'theta_waves',
    name: 'Sóng Não Theta 6Hz',
    subtitle: 'Thư giãn sâu, cân bằng cảm xúc & sáng tạo',
    category: 'healing',
    iconName: 'HeartHandshake',
    color: 'from-rose-400 to-pink-500',
    defaultVolume: 0.3,
  },
  {
    id: 'brown_noise',
    name: 'Brown Noise Trầm Ấm',
    subtitle: 'Che lấp tiếng ồn văn phòng cực kỳ hiệu quả',
    category: 'focus',
    iconName: 'Volume2',
    color: 'from-amber-500 to-yellow-600',
    defaultVolume: 0.35,
  },
  {
    id: 'pink_noise',
    name: 'Pink Noise Cân Bằng',
    subtitle: 'Âm nền mềm mại giúp giữ nhịp làm việc bền bỉ',
    category: 'focus',
    iconName: 'Sliders',
    color: 'from-pink-400 to-rose-500',
    defaultVolume: 0.35,
  },
];

export interface SoundPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  mix: Partial<Record<SoundId, number>>;
}

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'deep_work_rain',
    name: 'Mưa Nhẹ & Tập Trung Sâu',
    description: 'Mưa hiên nhà + Brown Noise chống ồn + Sóng Alpha 10Hz',
    badge: 'Deep Work',
    mix: {
      rain: 0.55,
      brown_noise: 0.25,
      alpha_waves: 0.22,
    },
  },
  {
    id: 'zen_healing',
    name: 'Suối Nguồn Chữa Lành',
    description: 'Suối rừng mát lành + Chuông xoay Tây Tạng + Sóng Theta 6Hz',
    badge: 'Chữa lành',
    mix: {
      stream: 0.5,
      singing_bowl: 0.42,
      theta_waves: 0.25,
    },
  },
  {
    id: 'forest_breeze',
    name: 'Rừng Thông Buổi Sớm',
    description: 'Gió đồi thông + Suối chảy nhẹ + Pink Noise dịu mắt',
    badge: 'Tươi mới',
    mix: {
      wind: 0.48,
      stream: 0.38,
      pink_noise: 0.18,
    },
  },
  {
    id: 'cozy_evening',
    name: 'Góc Nhỏ Ấm Áp',
    description: 'Lửa trại tí tách + Mưa rơi ngoài hiên',
    badge: 'Thư giãn',
    mix: {
      campfire: 0.55,
      rain: 0.42,
    },
  },
];

export const ONLINE_STATIONS: OnlineRadioStation[] = [
  {
    id: 'somafm_groovesalad',
    name: 'SomaFM: Groove Salad',
    genre: 'Ambient Chill & Downtempo',
    description: 'Đài radio nhạc nền làm việc kinh điển nhất thế giới, êm dịu và hoàn toàn không quảng cáo.',
    streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3',
    badge: 'Tập trung',
    websiteUrl: 'https://somafm.com/groovesalad/',
  },
  {
    id: 'somafm_dronezone',
    name: 'SomaFM: Drone Zone',
    genre: 'Deep Healing & Meditation Ambient',
    description: 'Không gian âm thanh tĩnh lặng, sâu lắng, không nhịp trống mạnh giúp tĩnh tâm & chữa lành.',
    streamUrl: 'https://ice2.somafm.com/dronezone-128-mp3',
    badge: 'Chữa lành',
    websiteUrl: 'https://somafm.com/dronezone/',
  },
  {
    id: 'ilove_chillhop',
    name: 'I Love Chillhop & Lofi',
    genre: 'Lofi Hip-Hop & Study Beats',
    description: 'Giai điệu Lofi trẻ trung, tươi sáng giúp duy trì năng lượng tích cực suốt buổi làm việc.',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    badge: 'Lofi Chill',
    websiteUrl: 'https://ilovemusic.de/',
  },
  {
    id: 'somafm_fluid',
    name: 'SomaFM: Fluid',
    genre: 'Instrumental Hip-Hop & Future Soul',
    description: 'Nhạc không lời hiện đại, giàu nhịp điệu mềm mại, rất hợp khi lập trình hoặc thiết kế.',
    streamUrl: 'https://ice2.somafm.com/fluid-128-mp3',
    badge: 'Coding / Flow',
    websiteUrl: 'https://somafm.com/fluid/',
  },
  {
    id: 'somafm_deepspace',
    name: 'SomaFM: Deep Space One',
    genre: 'Cosmic Ambient & Serenity',
    description: 'Giai điệu không gian thanh bình giúp tách biệt hoàn toàn khỏi sự ồn ào nơi công sở.',
    streamUrl: 'https://ice2.somafm.com/deepspaceone-128-mp3',
    badge: 'Tĩnh tâm',
    websiteUrl: 'https://somafm.com/deepspaceone/',
  },
  {
    id: 'somafm_lush',
    name: 'SomaFM: Lush',
    genre: 'Mellow Vocal & Chillout',
    description: 'Nhạc điện tử nhẹ nhàng chống buồn ngủ vào khung giờ chiều 14h - 16h.',
    streamUrl: 'https://ice2.somafm.com/lush-128-mp3',
    badge: 'Buổi chiều',
    websiteUrl: 'https://somafm.com/lush/',
  },
];

export const FREE_MUSIC_RESOURCES: FreeMusicResource[] = [
  {
    name: 'Pixabay Music — Healing, Lofi & Ambient',
    category: 'Tải MP3 miễn phí (CC0)',
    description: 'Hơn 100.000 bản nhạc Piano chữa lành, Lofi Study, Meditation, Acoustic Guitar miễn phí 100% bản quyền để tải về máy.',
    url: 'https://pixabay.com/music/search/healing%20relaxing/',
    license: 'Pixabay Content License (Free)',
  },
  {
    name: 'Moodist Open-Source Sound Library',
    category: 'Mã nguồn mở GitHub (MIT)',
    description: 'Kho 80+ âm thanh thiên nhiên, tiếng mưa, quán cà phê, chuông gió được cắt chuẩn loop không ngắt quãng.',
    url: 'https://github.com/remvze/moodist',
    license: 'MIT Open Source',
  },
  {
    name: 'SomaFM Listener-Supported Commercial-Free Radio',
    category: 'Radio Stream Trực Tuyến 24/7',
    description: 'Hệ thống hơn 30 kênh radio phát trực tuyến chất lượng cao chuyên cho dân văn phòng, lập trình và thiền định.',
    url: 'https://somafm.com/',
    license: 'Free Public Stream',
  },
  {
    name: 'Chosic Free Ambient & Mindful Music',
    category: 'Tải MP3 Chill / Piano',
    description: 'Tuyển tập nhạc không lời nhẹ nhàng, nhạc đọc sách và thư giãn tinh thần miễn phí.',
    url: 'https://www.chosic.com/free-music/calm/',
    license: 'Creative Commons / Free',
  },
  {
    name: 'Freesound.org — Nature & Soundscapes',
    category: 'Kho âm thanh tự nhiên',
    description: 'Cộng đồng chia sẻ âm thanh thu âm thực địa (rừng mưa, suối chảy, sóng biển, chuông thiền) lớn nhất thế giới.',
    url: 'https://freesound.org/',
    license: 'CC0 / CC-BY',
  },
];

export const DESK_EXERCISES: ExerciseItem[] = [
  {
    id: 'neck_stretch',
    title: 'Giãn cơ cổ & Thả lỏng đốt sống cổ',
    durationSec: 45,
    instruction: 'Đứng thẳng hoặc ngồi thẳng lưng. Nghiêng đầu chậm rãi sang phải giữ 5 giây, sau đó nghiêng sang trái 5 giây. Tuyệt đối không xoay giật mạnh.',
    benefit: 'Giảm đau mỏi vai gáy do cúi nhìn màn hình lâu',
    svgType: 'neck',
  },
  {
    id: 'shoulder_roll',
    title: 'Mở ngực & Xoay tròn khớp vai',
    durationSec: 45,
    instruction: 'Đứng dậy rời khỏi ghế, đan hai tay sau lưng, ưỡn nhẹ lồng ngực và hít sâu. Sau đó xoay tròn hai bả vai về phía sau 10 vòng.',
    benefit: 'Chống gù lưng văn phòng & mở rộng dung tích phổi',
    svgType: 'shoulder',
  },
  {
    id: 'wrist_relief',
    title: 'Giãn cổ tay chống hội chứng ống cổ tay (RSI)',
    durationSec: 45,
    instruction: 'Duỗi thẳng tay phải ra trước, dùng tay trái kéo nhẹ các ngón tay hướng lên trên rồi hướng xuống dưới, mỗi bên giữ 10 giây.',
    benefit: 'Bảo vệ khớp cổ tay khi gõ phím & dùng chuột liên tục',
    svgType: 'wrist',
  },
  {
    id: 'spine_twist',
    title: 'Vươn vai cao & Nghiêng lườn cột sống',
    durationSec: 45,
    instruction: 'Đứng hai chân rộng bằng vai, đan hai tay đẩy thẳng lên trần nhà, hít sâu và nghiêng người nhẹ sang hai bên trái - phải.',
    benefit: 'Kích thích tuần hoàn máu xuống chân & giảm áp lực đĩa đệm',
    svgType: 'back',
  },
  {
    id: 'eye_20_20_20',
    title: 'Thư giãn điều tiết mắt 20-20-20',
    durationSec: 20,
    instruction: 'Phóng tầm mắt nhìn ra xa ngoài cửa sổ (cách ít nhất 6 mét) và chớp mắt chậm rãi 10 lần để làm ẩm giác mạc.',
    benefit: 'Ngăn ngừa khô mắt, mỏi mắt và cận thị văn phòng',
    svgType: 'eyes',
  },
];


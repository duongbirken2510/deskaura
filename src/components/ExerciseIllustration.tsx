import React, { useEffect, useState } from 'react';

interface ExerciseSvgProps {
  type: 'neck' | 'shoulder' | 'wrist' | 'back' | 'eyes';
  lang?: 'vi' | 'en';
}

export const ExerciseIllustration: React.FC<ExerciseSvgProps> = ({
  type,
  lang = 'vi',
}) => {
  const isEn = lang === 'en';
  const [phase, setPhase] = useState<0 | 1>(0);

  // Synchronized live coaching phase badge (switches in rhythm with the keyframe loop)
  useEffect(() => {
    setPhase(0);
    const intervalMs = type === 'wrist' ? 2400 : type === 'neck' ? 2600 : 2500;
    const id = window.setInterval(() => {
      setPhase((p) => (p === 0 ? 1 : 0));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [type]);

  const getPhaseLabel = () => {
    switch (type) {
      case 'neck':
        return phase === 0
          ? isEn
            ? '◀ Tilt Left & Breathe'
            : '◀ Nghiêng trái & Hít sâu'
          : isEn
          ? 'Tilt Right & Hold ▶'
          : 'Nghiêng phải & Thả lỏng ▶';
      case 'shoulder':
        return phase === 0
          ? isEn
            ? '🫁 Inhale • Open Chest'
            : '🫁 Hít sâu • Mở rộng lồng ngực'
          : isEn
          ? '🔄 Exhale • Roll Shoulders Back'
          : '🔄 Thở ra • Xoay tròn bả vai';
      case 'wrist':
        return phase === 0
          ? isEn
            ? '✋ Pull Fingers Up (+35°)'
            : '✋ Kéo nhẹ ngón tay lên (+35°)'
          : isEn
          ? '👇 Flex Wrist Down (-35°)'
          : '👇 Gập nhẹ cổ tay xuống (-35°)';
      case 'back':
        return phase === 0
          ? isEn
            ? '↖ Reach Up & Bend Left'
            : '↖ Vươn cao & Nghiêng lườn trái'
          : isEn
          ? 'Reach Up & Bend Right ↗'
          : 'Vươn cao & Nghiêng lườn phải ↗';
      case 'eyes':
        return phase === 0
          ? isEn
            ? '🏔️ Look 20ft (6m) Away'
            : '🏔️ Phóng tầm mắt xa 6 mét'
          : isEn
          ? '😌 Blink Slowly 10 Times'
          : '😌 Chớp mắt chậm làm ẩm giác mạc';
    }
  };

  const renderAnimatedScene = () => {
    switch (type) {
      /* =====================================================================
         1. NECK STRETCH: Articulated upper-body character tilting head L <-> R
         ===================================================================== */
      case 'neck':
        return (
          <svg
            role="img"
            viewBox="0 0 180 180"
            className="w-40 h-40 mx-auto overflow-visible"
          >
            <title>
              {isEn ? 'Animated Neck Stretch Guide' : 'Hoạt ảnh hướng dẫn giãn cơ cổ'}
            </title>
            <defs>
              <radialGradient id="neckBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#D1FAE5" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#F0FDFA" stopOpacity="0.2" />
              </radialGradient>
              <linearGradient id="shirtGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#0D9488" />
              </linearGradient>
              <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="100%" stopColor="#FCD34D" />
              </linearGradient>
            </defs>

            {/* Soft Ambient Halo */}
            <circle cx="90" cy="90" r="76" fill="url(#neckBg)" />
            <circle
              cx="90"
              cy="98"
              r="24"
              fill="none"
              stroke="#34D399"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="anim-joint-ring"
            />

            {/* Motion Guide Arcs Left & Right */}
            <path
              d="M36 66 C36 40, 62 26, 78 26"
              stroke="#0EA5E9"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              fill="none"
              strokeLinecap="round"
            />
            <polygon points="36,69 32,61 40,61" fill="#0EA5E9" />
            <path
              d="M144 66 C144 40, 118 26, 102 26"
              stroke="#0EA5E9"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              fill="none"
              strokeLinecap="round"
            />
            <polygon points="144,69 140,61 148,61" fill="#0EA5E9" />

            {/* Relaxed Shoulders & Torso */}
            <path
              d="M42 158 C42 122, 64 114, 90 114 C116 114, 138 122, 138 158 Z"
              fill="url(#shirtGrad)"
            />
            {/* Collarbone / V-neck */}
            <path d="M77 114 L90 128 L103 114 Z" fill="#FEF3C7" />

            {/* Cervical Spine / Neck Base */}
            <rect x="81" y="94" width="18" height="24" rx="9" fill="#FBBF24" />
            <circle cx="90" cy="104" r="3" fill="#10B981" />
            <circle cx="90" cy="111" r="2.5" fill="#10B981" />

            {/* Articulated Tilting Head Group */}
            <g className="anim-neck-tilt">
              {/* Ears */}
              <circle cx="61" cy="70" r="6" fill="url(#skinGrad)" />
              <circle cx="119" cy="70" r="6" fill="url(#skinGrad)" />
              {/* Head */}
              <rect
                x="64"
                y="40"
                width="52"
                height="58"
                rx="26"
                fill="url(#skinGrad)"
                stroke="#059669"
                strokeWidth="2.5"
              />
              {/* Modern Hair */}
              <path
                d="M64 62 C64 38, 116 38, 116 62 C110 49, 70 49, 64 62 Z"
                fill="#1E293B"
              />
              {/* Calm Closed/Relaxed Eyes */}
              <path
                d="M75 68 Q80 64 85 68"
                stroke="#1E293B"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M95 68 Q100 64 105 68"
                stroke="#1E293B"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              {/* Rosy Cheeks & Gentle Smile */}
              <circle cx="74" cy="75" r="3.5" fill="#FB7185" opacity="0.45" />
              <circle cx="106" cy="75" r="3.5" fill="#FB7185" opacity="0.45" />
              <path
                d="M83 81 Q90 87 97 81"
                stroke="#059669"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          </svg>
        );

      /* =====================================================================
         2. SHOULDER ROLL: Articulated left & right shoulder circular orbits
         ===================================================================== */
      case 'shoulder':
        return (
          <svg
            role="img"
            viewBox="0 0 180 180"
            className="w-40 h-40 mx-auto overflow-visible"
          >
            <title>
              {isEn
                ? 'Animated Shoulder Roll Guide'
                : 'Hoạt ảnh hướng dẫn xoay khớp vai'}
            </title>
            <defs>
              <radialGradient id="shoulderBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#F0FDF4" stopOpacity="0.2" />
              </radialGradient>
              <linearGradient id="bodyBlue" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
            </defs>

            <circle cx="90" cy="90" r="76" fill="url(#shoulderBg)" />

            {/* Chest Expansion Breathing Aura */}
            <circle
              cx="90"
              cy="122"
              r="34"
              fill="#34D399"
              opacity="0.18"
              className="anim-joint-ring"
            />

            {/* Head & Neck */}
            <rect x="83" y="84" width="14" height="20" rx="7" fill="#FBBF24" />
            <circle
              cx="90"
              cy="60"
              r="23"
              fill="#FDE68A"
              stroke="#0284C7"
              strokeWidth="2.5"
            />
            <path
              d="M67 56 C67 36, 113 36, 113 56 C105 46, 75 46, 67 56 Z"
              fill="#1E293B"
            />
            <path
              d="M80 60 Q83 57 86 60 M94 60 Q97 57 100 60"
              stroke="#1E293B"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M84 70 Q90 75 96 70"
              stroke="#0284C7"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Central Torso */}
            <path
              d="M54 156 L62 104 L118 104 L126 156 Z"
              fill="url(#bodyBlue)"
              rx="12"
            />
            {/* Expanding Lungs / Chest Heart Icon */}
            <path
              d="M90 115 L90 142 M78 126 Q90 118 102 126"
              stroke="#E0F2FE"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Left Articulated Shoulder & Arm */}
            <g className="anim-shoulder-left">
              <circle cx="54" cy="114" r="16" fill="#0284C7" />
              <path
                d="M42 114 L34 148"
                stroke="#0EA5E9"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <circle
                cx="54"
                cy="114"
                r="19"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeDasharray="5 4"
              />
            </g>

            {/* Right Articulated Shoulder & Arm */}
            <g className="anim-shoulder-right">
              <circle cx="126" cy="114" r="16" fill="#0284C7" />
              <path
                d="M138 114 L146 148"
                stroke="#0EA5E9"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <circle
                cx="126"
                cy="114"
                r="19"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeDasharray="5 4"
              />
            </g>
          </svg>
        );

      /* =====================================================================
         3. WRIST STRETCH (RSI): Articulated Forearm + Flexing Hand + Helper Hand
         ===================================================================== */
      case 'wrist':
        return (
          <svg
            role="img"
            viewBox="0 0 180 180"
            className="w-40 h-40 mx-auto overflow-visible"
          >
            <title>
              {isEn
                ? 'Animated Wrist RSI Stretch Guide'
                : 'Hoạt ảnh hướng dẫn giãn cổ tay chống RSI'}
            </title>
            <defs>
              <radialGradient id="wristBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#D1FAE5" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.25" />
              </radialGradient>
              <linearGradient id="sleeveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="armSkin" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
            </defs>

            <circle cx="90" cy="90" r="76" fill="url(#wristBg)" />

            {/* Degree Arc Protractor Indicator */}
            <path
              d="M118 48 A 48 48 0 0 1 118 144"
              fill="none"
              stroke="#0EA5E9"
              strokeWidth="2.2"
              strokeDasharray="4 4"
            />
            <text
              x="130"
              y="54"
              fill="#0284C7"
              fontSize="10"
              fontWeight="bold"
            >
              +35°
            </text>
            <text
              x="130"
              y="146"
              fill="#0284C7"
              fontSize="10"
              fontWeight="bold"
            >
              -35°
            </text>

            {/* Wrist Carpal Tunnel Healing Pulse Ring */}
            <circle
              cx="96"
              cy="96"
              r="22"
              fill="#10B981"
              opacity="0.16"
              className="anim-joint-ring"
            />
            <circle
              cx="96"
              cy="96"
              r="15"
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              strokeDasharray="3 3"
            />

            {/* Extended Right Forearm + Sleeve */}
            <rect
              x="18"
              y="82"
              width="36"
              height="28"
              rx="10"
              fill="url(#sleeveGrad)"
            />
            <rect
              x="48"
              y="85"
              width="48"
              height="22"
              rx="8"
              fill="url(#armSkin)"
              stroke="#D97706"
              strokeWidth="1.8"
            />

            {/* Articulated Wrist Joint Pivot + Palm + Fingers */}
            <g className="anim-wrist-hand">
              {/* Wrist Pivot Circle */}
              <circle
                cx="96"
                cy="96"
                r="9"
                fill="#FBBF24"
                stroke="#059669"
                strokeWidth="2.5"
              />
              {/* Palm & Extended Fingers */}
              <path
                d="M96 87 L122 83 C128 82, 132 86, 131 91 L136 91 C141 91, 142 97, 136 98 L131 99 L126 105 C120 108, 104 106, 96 105 Z"
                fill="url(#armSkin)"
                stroke="#D97706"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Thumb */}
              <path
                d="M104 87 C108 77, 116 77, 116 84"
                fill="url(#armSkin)"
                stroke="#D97706"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Tendon Stretch Highlight Line */}
              <line
                x1="96"
                y1="96"
                x2="126"
                y2="94"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>

            {/* Helper Left Hand Gently Pulling Fingers */}
            <g className="anim-wrist-helper">
              <circle
                cx="126"
                cy="74"
                r="10"
                fill="#38BDF8"
                opacity="0.25"
              />
              <path
                d="M142 58 C134 62, 126 68, 122 76"
                stroke="#0284C7"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx="121" cy="77" r="4.5" fill="#0EA5E9" />
            </g>
          </svg>
        );

      /* =====================================================================
         4. EYES 20-20-20: Expressive Gazing Eyes + 20ft Window Scenery + Blink
         ===================================================================== */
      case 'eyes':
        return (
          <svg
            role="img"
            viewBox="0 0 180 180"
            className="w-40 h-40 mx-auto overflow-visible"
          >
            <title>
              {isEn
                ? 'Animated 20-20-20 Eye Care Guide'
                : 'Hoạt ảnh thư giãn mắt quy tắc 20-20-20'}
            </title>
            <defs>
              <radialGradient id="eyeBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ECFDF5" stopOpacity="0.3" />
              </radialGradient>
              <linearGradient id="irisGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#0369A1" />
              </linearGradient>
              <clipPath id="eyeClip">
                <path d="M26 98 Q90 48 154 98 Q90 148 26 98 Z" />
              </clipPath>
            </defs>

            <circle cx="90" cy="90" r="76" fill="url(#eyeBg)" />

            {/* Distant 20ft (6m) Nature Window Badge at Top */}
            <g transform="translate(56, 16)">
              <rect
                x="0"
                y="0"
                width="68"
                height="28"
                rx="10"
                fill="#FFFFFF"
                stroke="#38BDF8"
                strokeWidth="2"
              />
              {/* Mini Mountain & Sun (6m Target) */}
              <circle cx="16" cy="10" r="4" fill="#FBBF24" />
              <polygon points="24,24 38,9 50,24" fill="#10B981" />
              <polygon points="40,24 52,13 62,24" fill="#34D399" />
            </g>

            {/* Gaze Ray Lines to 6m Target */}
            <line
              x1="72"
              y1="62"
              x2="80"
              y2="46"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
            <line
              x1="108"
              y1="62"
              x2="100"
              y2="46"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeDasharray="3 3"
            />

            {/* Sclera (Eye White) */}
            <path
              d="M26 98 Q90 48 154 98 Q90 148 26 98 Z"
              fill="#FFFFFF"
              stroke="#0284C7"
              strokeWidth="3.5"
            />

            {/* Clipped Moving Iris + Blinking Eyelid */}
            <g clipPath="url(#eyeClip)">
              {/* Animated Gazing Iris & Pupil */}
              <g className="anim-eye-gaze">
                <circle cx="90" cy="98" r="25" fill="url(#irisGrad)" />
                <circle cx="90" cy="98" r="11" fill="#0F172A" />
                <circle cx="98" cy="90" r="5" fill="#FFFFFF" />
                <circle cx="83" cy="104" r="2.5" fill="#FFFFFF" opacity="0.8" />
              </g>

              {/* Animated Blinking Upper Eyelid */}
              <rect
                x="20"
                y="45"
                width="140"
                height="110"
                fill="#BAE6FD"
                className="anim-eye-blink"
              />
            </g>

            {/* Upper Eyelash Contour */}
            <path
              d="M24 98 Q90 46 156 98"
              fill="none"
              stroke="#0369A1"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        );

      /* =====================================================================
         5. BACK / SPINE STRETCH: Interlocked Overhead Reach & Side-Bend Sway
         ===================================================================== */
      default:
        return (
          <svg
            role="img"
            viewBox="0 0 180 180"
            className="w-40 h-40 mx-auto overflow-visible"
          >
            <title>
              {isEn
                ? 'Animated Spine Stretch Guide'
                : 'Hoạt ảnh vươn vai kéo giãn cột sống'}
            </title>
            <defs>
              <radialGradient id="spineBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#D1FAE5" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0.25" />
              </radialGradient>
            </defs>

            <circle cx="90" cy="90" r="76" fill="url(#spineBg)" />

            {/* Side Sway Guide Arc */}
            <path
              d="M44 38 Q90 14 136 38"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />

            {/* Stable Lower Hips Base */}
            <rect
              x="68"
              y="140"
              width="44"
              height="20"
              rx="8"
              fill="#334155"
            />

            {/* Articulated Swaying Upper Body & Raised Arms */}
            <g className="anim-spine-sway">
              {/* Raised Interlocked Arms Framing Head */}
              <path
                d="M68 106 C48 80, 56 38, 90 28 C124 38, 132 80, 112 106"
                fill="none"
                stroke="#34D399"
                strokeWidth="11"
                strokeLinecap="round"
              />
              {/* Clasp Hands at Peak */}
              <ellipse
                cx="90"
                cy="27"
                rx="12"
                ry="6"
                fill="#FDE68A"
                stroke="#059669"
                strokeWidth="2"
              />

              {/* Torso */}
              <path
                d="M66 100 L114 100 L108 144 L72 144 Z"
                fill="#10B981"
              />

              {/* glowing Spine Vertebrae Alignment Dots */}
              <circle cx="90" cy="108" r="3" fill="#ECFDF5" />
              <circle cx="90" cy="118" r="3" fill="#ECFDF5" />
              <circle cx="90" cy="128" r="3" fill="#ECFDF5" />
              <circle cx="90" cy="138" r="3" fill="#ECFDF5" />

              {/* Head */}
              <circle
                cx="90"
                cy="72"
                r="20"
                fill="#FDE68A"
                stroke="#059669"
                strokeWidth="2.5"
              />
              <path
                d="M72 68 C72 52, 108 52, 108 68 C102 60, 78 60, 72 68 Z"
                fill="#1E293B"
              />
              <path
                d="M84 78 Q90 83 96 78"
                stroke="#059669"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col items-center">
      {renderAnimatedScene()}
      {/* Live Synchronized Movement Phase Badge */}
      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-emerald-200/80 shadow-sm text-[11px] font-bold text-emerald-800 transition-all duration-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>{getPhaseLabel()}</span>
      </div>
    </div>
  );
};

interface DeskPlantProps {
  growthPercent: number; // 0 -> 100
}

export const VirtualDeskPlant: React.FC<DeskPlantProps> = ({ growthPercent }) => {
  const stage =
    growthPercent >= 85 ? 4 : growthPercent >= 55 ? 3 : growthPercent >= 25 ? 2 : 1;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg aria-hidden="true" viewBox="0 0 140 140" className="w-28 h-28 overflow-visible">
        <defs>
          <linearGradient id="potGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="sproutGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Soft Sun Halo */}
        <circle cx="70" cy="62" r="48" fill="#ECFDF5" />

        {/* Stem */}
        <path
          d={stage >= 3 ? 'M70 92 Q68 62 70 38' : 'M70 92 Q69 74 70 58'}
          stroke="#059669"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Stage 1+: Base pair of leaves */}
        <g className="origin-center animate-float">
          <path
            d="M70 76 C52 74, 42 58, 56 50 C66 52, 70 66, 70 76 Z"
            fill="url(#sproutGrad)"
          />
          <path
            d="M70 72 C88 70, 98 54, 84 46 C74 48, 70 62, 70 72 Z"
            fill="#10B981"
          />

          {/* Stage 2+: Upper lush leaves */}
          {stage >= 2 && (
            <>
              <path
                d="M70 56 C48 52, 38 34, 54 28 C66 32, 70 46, 70 56 Z"
                fill="#34D399"
              />
              <path
                d="M70 54 C92 50, 102 32, 86 26 C74 30, 70 44, 70 54 Z"
                fill="url(#sproutGrad)"
              />
            </>
          )}

          {/* Stage 3+: Top sprout */}
          {stage >= 3 && (
            <path
              d="M70 40 C62 24, 78 24, 70 40 Z"
              fill="#6EE7B7"
              stroke="#059669"
              strokeWidth="1.5"
            />
          )}

          {/* Stage 4: Blooming Flower */}
          {stage >= 4 && (
            <g transform="translate(70, 24)">
              <circle cx="0" cy="-7" r="6" fill="#F472B6" />
              <circle cx="7" cy="0" r="6" fill="#FB7185" />
              <circle cx="0" cy="7" r="6" fill="#F472B6" />
              <circle cx="-7" cy="0" r="6" fill="#FB7185" />
              <circle cx="0" cy="0" r="4.5" fill="#FBBF24" />
            </g>
          )}
        </g>

        {/* Minimalist Ceramic Pot */}
        <rect x="44" y="88" width="52" height="10" rx="4" fill="#FB923C" />
        <path
          d="M48 98 L92 98 L85 126 C84 129, 82 130, 79 130 L61 130 C58 130, 56 129, 55 126 Z"
          fill="url(#potGrad)"
        />
        {/* Happy Face on Pot */}
        <circle cx="63" cy="111" r="2" fill="#FFF7ED" />
        <circle cx="77" cy="111" r="2" fill="#FFF7ED" />
        <path
          d="M66 116 Q70 120 74 116"
          stroke="#FFF7ED"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

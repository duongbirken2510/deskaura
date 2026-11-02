import React from 'react';

interface ExerciseSvgProps {
  type: 'neck' | 'shoulder' | 'wrist' | 'back' | 'eyes';
}

export const ExerciseIllustration: React.FC<ExerciseSvgProps> = ({ type }) => {
  switch (type) {
    case 'neck':
      return (
        <svg viewBox="0 0 180 180" className="w-36 h-36 mx-auto">
          <circle cx="90" cy="90" r="80" fill="#ECFDF5" />
          <path d="M55 155 C55 125, 125 125, 125 155" fill="#10B981" opacity="0.85" />
          <rect x="82" y="96" width="16" height="26" rx="8" fill="#FDE68A" />
          <g className="origin-center animate-float">
            <circle cx="90" cy="72" r="26" fill="#FEF3C7" stroke="#10B981" strokeWidth="3" />
            <path d="M80 70 Q84 66 88 70" stroke="#065F46" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M92 70 Q96 66 100 70" stroke="#065F46" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M83 82 Q90 88 97 82" stroke="#059669" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
          <path d="M42 68 C42 44, 65 34, 78 34" stroke="#38BDF8" strokeWidth="3" strokeDasharray="4 4" fill="none" strokeLinecap="round" />
          <path d="M138 68 C138 44, 115 34, 102 34" stroke="#38BDF8" strokeWidth="3" strokeDasharray="4 4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'shoulder':
      return (
        <svg viewBox="0 0 180 180" className="w-36 h-36 mx-auto">
          <circle cx="90" cy="90" r="80" fill="#F0F9FF" />
          <circle cx="90" cy="60" r="22" fill="#FEF3C7" stroke="#0EA5E9" strokeWidth="3" />
          <path d="M46 145 C46 105, 134 105, 134 145" fill="#38BDF8" opacity="0.85" />
          <circle cx="54" cy="118" r="14" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="5 4" className="animate-spin" style={{ animationDuration: '6s' }} />
          <circle cx="126" cy="118" r="14" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="5 4" className="animate-spin" style={{ animationDuration: '6s' }} />
        </svg>
      );
    case 'wrist':
      return (
        <svg viewBox="0 0 180 180" className="w-36 h-36 mx-auto">
          <circle cx="90" cy="90" r="80" fill="#ECFDF5" />
          <rect x="36" y="84" width="65" height="22" rx="11" fill="#FDE68A" stroke="#10B981" strokeWidth="2.5" />
          <path d="M100 95 L125 65 C130 60, 138 65, 132 74 L112 104 Z" fill="#FEF3C7" stroke="#10B981" strokeWidth="2.5" />
          <circle cx="102" cy="95" r="18" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeDasharray="4 4" />
        </svg>
      );
    case 'eyes':
      return (
        <svg viewBox="0 0 180 180" className="w-36 h-36 mx-auto">
          <circle cx="90" cy="90" r="80" fill="#F0F9FF" />
          <path d="M30 90 Q90 42 150 90 Q90 138 30 90 Z" fill="#FFFFFF" stroke="#0EA5E9" strokeWidth="4" />
          <circle cx="90" cy="90" r="22" fill="#38BDF8" className="animate-pulse-soft" />
          <circle cx="90" cy="90" r="10" fill="#0369A1" />
          <circle cx="97" cy="83" r="4" fill="#FFFFFF" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 180 180" className="w-36 h-36 mx-auto">
          <circle cx="90" cy="90" r="80" fill="#ECFDF5" />
          <circle cx="90" cy="68" r="20" fill="#FEF3C7" stroke="#10B981" strokeWidth="3" />
          <path d="M90 88 L90 146" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
          <path d="M90 105 L52 52" stroke="#34D399" strokeWidth="7" strokeLinecap="round" />
          <path d="M90 105 L128 52" stroke="#34D399" strokeWidth="7" strokeLinecap="round" />
        </svg>
      );
  }
};

interface DeskPlantProps {
  growthPercent: number; // 0 -> 100
}

export const VirtualDeskPlant: React.FC<DeskPlantProps> = ({ growthPercent }) => {
  const stage =
    growthPercent >= 85 ? 4 : growthPercent >= 55 ? 3 : growthPercent >= 25 ? 2 : 1;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg viewBox="0 0 140 140" className="w-28 h-28 overflow-visible">
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
        <path d="M48 98 L92 98 L85 126 C84 129, 82 130, 79 130 L61 130 C58 130, 56 129, 55 126 Z" fill="url(#potGrad)" />
        {/* Happy Face on Pot */}
        <circle cx="63" cy="111" r="2" fill="#FFF7ED" />
        <circle cx="77" cy="111" r="2" fill="#FFF7ED" />
        <path d="M66 116 Q70 120 74 116" stroke="#FFF7ED" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};


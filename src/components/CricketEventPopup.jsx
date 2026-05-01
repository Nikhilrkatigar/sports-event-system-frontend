import { useEffect, useState } from 'react';

/**
 * CricketEventPopup – Full-screen animated overlay for key cricket moments.
 *
 * Props:
 *   event: { type: 'four'|'six'|'wicket'|'allout', data: {...} } | null
 *   onDismiss: () => void
 */

const EVENT_CONFIG = {
  four: {
    emoji: '4️⃣',
    title: 'FOUR!',
    subtitle: 'Boundary!',
    gradient: 'from-cyan-600 via-blue-600 to-indigo-700',
    glow: 'shadow-[0_0_120px_40px_rgba(59,130,246,0.5)]',
    ringColor: 'border-cyan-400',
    particleColor: 'bg-cyan-400',
    textColor: 'text-cyan-300',
    accentColor: 'text-blue-200',
    duration: 3000,
    icon: (
      <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-2xl">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeDasharray="8 4" className="animate-[spin_8s_linear_infinite]" />
        <text x="50" y="58" textAnchor="middle" fontSize="48" fontWeight="900" fill="white" className="drop-shadow-lg">4</text>
      </svg>
    ),
  },
  six: {
    emoji: '6️⃣',
    title: 'SIX!',
    subtitle: 'Maximum!',
    gradient: 'from-purple-700 via-fuchsia-600 to-pink-600',
    glow: 'shadow-[0_0_120px_40px_rgba(168,85,247,0.5)]',
    ringColor: 'border-fuchsia-400',
    particleColor: 'bg-fuchsia-400',
    textColor: 'text-fuchsia-300',
    accentColor: 'text-purple-200',
    duration: 3500,
    icon: (
      <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-2xl">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeDasharray="8 4" className="animate-[spin_8s_linear_infinite]" />
        <text x="50" y="58" textAnchor="middle" fontSize="48" fontWeight="900" fill="white" className="drop-shadow-lg">6</text>
      </svg>
    ),
  },
  wicket: {
    emoji: '🔴',
    title: 'WICKET!',
    subtitle: 'OUT!',
    gradient: 'from-red-800 via-red-600 to-orange-600',
    glow: 'shadow-[0_0_120px_40px_rgba(239,68,68,0.5)]',
    ringColor: 'border-red-400',
    particleColor: 'bg-red-400',
    textColor: 'text-red-300',
    accentColor: 'text-red-200',
    duration: 4500,
    icon: (
      <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-2xl">
        {/* Stumps */}
        <rect x="30" y="20" width="5" height="60" rx="2" fill="white" opacity="0.9" className="origin-bottom animate-[stumps-left_0.6s_ease-out_0.3s_both]" />
        <rect x="47" y="20" width="5" height="60" rx="2" fill="white" opacity="0.9" className="origin-bottom animate-[stumps-center_0.5s_ease-out_0.2s_both]" />
        <rect x="64" y="20" width="5" height="60" rx="2" fill="white" opacity="0.9" className="origin-bottom animate-[stumps-right_0.6s_ease-out_0.35s_both]" />
        {/* Bails */}
        <rect x="28" y="18" width="22" height="4" rx="2" fill="#fbbf24" className="origin-center animate-[bail-fly_0.8s_ease-out_0.3s_both]" />
        <rect x="50" y="18" width="22" height="4" rx="2" fill="#fbbf24" className="origin-center animate-[bail-fly-right_0.8s_ease-out_0.35s_both]" />
      </svg>
    ),
  },
  allout: {
    emoji: '💥',
    title: 'ALL OUT!',
    subtitle: 'Innings Over',
    gradient: 'from-gray-900 via-red-900 to-gray-900',
    glow: 'shadow-[0_0_120px_40px_rgba(220,38,38,0.4)]',
    ringColor: 'border-red-500',
    particleColor: 'bg-red-500',
    textColor: 'text-red-400',
    accentColor: 'text-gray-300',
    duration: 5000,
    icon: (
      <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-2xl">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="3" />
        <line x1="25" y1="25" x2="75" y2="75" stroke="rgba(239,68,68,0.8)" strokeWidth="4" strokeLinecap="round" />
        <line x1="75" y1="25" x2="25" y2="75" stroke="rgba(239,68,68,0.8)" strokeWidth="4" strokeLinecap="round" />
        <text x="50" y="95" textAnchor="middle" fontSize="12" fontWeight="900" fill="white" opacity="0.8">ALL OUT</text>
      </svg>
    ),
  },
};

// Particle burst component
function ParticleBurst({ color, count = 20 }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const distance = 80 + Math.random() * 200;
        const size = 4 + Math.random() * 8;
        const delay = Math.random() * 0.3;
        const duration = 0.8 + Math.random() * 0.6;
        return (
          <div
            key={i}
            className={`absolute left-1/2 top-1/2 rounded-full ${color} opacity-0`}
            style={{
              width: size,
              height: size,
              animation: `particle-burst ${duration}s ease-out ${delay}s forwards`,
              '--particle-x': `${Math.cos((angle * Math.PI) / 180) * distance}px`,
              '--particle-y': `${Math.sin((angle * Math.PI) / 180) * distance}px`,
            }}
          />
        );
      })}
    </div>
  );
}

// Shockwave ring
function ShockwaveRing({ color }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`rounded-full border-2 ${color} opacity-0`}
        style={{
          width: 80,
          height: 80,
          animation: 'shockwave 1s ease-out 0.1s forwards',
        }}
      />
      <div
        className={`absolute rounded-full border ${color} opacity-0`}
        style={{
          width: 80,
          height: 80,
          animation: 'shockwave 1.2s ease-out 0.3s forwards',
        }}
      />
    </div>
  );
}

export default function CricketEventPopup({ event, onDismiss }) {
  const [phase, setPhase] = useState('enter'); // enter → show → exit

  const config = event ? EVENT_CONFIG[event.type] : null;

  useEffect(() => {
    if (!event || !config) return;

    setPhase('enter');

    const showTimer = setTimeout(() => setPhase('show'), 50);

    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, config.duration - 500);

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, config.duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [event, config, onDismiss]);

  if (!event || !config) return null;

  const data = event.data || {};

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${
        phase === 'exit' ? 'opacity-0 scale-110' : phase === 'show' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}
      onClick={onDismiss}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Shockwave */}
      <ShockwaveRing color={config.ringColor} />

      {/* Particle burst */}
      <ParticleBurst color={config.particleColor} count={event.type === 'six' ? 30 : 20} />

      {/* Main content card */}
      <div
        className={`relative z-10 flex flex-col items-center gap-4 p-8 rounded-3xl bg-gradient-to-br ${config.gradient} ${config.glow} border border-white/10`}
        style={{
          animation: phase === 'show' ? 'popup-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : undefined,
          minWidth: 280,
          maxWidth: 420,
        }}
      >
        {/* Pulsing glow ring behind icon */}
        <div className="relative">
          <div
            className={`absolute inset-0 rounded-full border-2 ${config.ringColor} opacity-40`}
            style={{ animation: 'pulse-ring 1.5s ease-out infinite', margin: -12 }}
          />
          {config.icon}
        </div>

        {/* Title */}
        <div className="text-center">
          <h2
            className="text-5xl sm:text-6xl font-black text-white tracking-wider drop-shadow-2xl"
            style={{ animation: 'title-slam 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both', textShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
          >
            {config.title}
          </h2>
          <p
            className={`text-lg font-bold ${config.textColor} mt-1 uppercase tracking-widest`}
            style={{ animation: 'fadeIn 0.5s ease-out 0.4s both' }}
          >
            {config.subtitle}
          </p>
        </div>

        {/* Event-specific details */}
        {event.type === 'wicket' && data.batsmanName && (
          <div
            className="text-center mt-2 space-y-1.5"
            style={{ animation: 'slideUp 0.5s ease-out 0.5s both' }}
          >
            <p className="text-2xl font-bold text-white">{data.batsmanName}</p>
            {data.wicketType && (
              <p className={`text-sm font-semibold ${config.accentColor} uppercase tracking-wider`}>
                {data.wicketType.replace(/_/g, ' ')}
                {data.bowlerName ? ` • b ${data.bowlerName}` : ''}
              </p>
            )}
            {data.fielder && (
              <p className={`text-xs ${config.accentColor} opacity-70`}>c {data.fielder}</p>
            )}
            {data.score && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-white font-bold text-sm">
                  {data.score}
                </span>
                {data.over && (
                  <span className="bg-white/10 px-3 py-1.5 rounded-full text-white/70 text-xs">
                    {data.over} ov
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {event.type === 'four' && data.batsmanName && (
          <div
            className="text-center mt-1"
            style={{ animation: 'slideUp 0.5s ease-out 0.5s both' }}
          >
            <p className="text-xl font-bold text-white">{data.batsmanName}</p>
            {data.bowlerName && (
              <p className={`text-sm ${config.accentColor} opacity-80`}>off {data.bowlerName}</p>
            )}
          </div>
        )}

        {event.type === 'six' && data.batsmanName && (
          <div
            className="text-center mt-1"
            style={{ animation: 'slideUp 0.5s ease-out 0.5s both' }}
          >
            <p className="text-xl font-bold text-white">{data.batsmanName}</p>
            {data.bowlerName && (
              <p className={`text-sm ${config.accentColor} opacity-80`}>off {data.bowlerName}</p>
            )}
            <p className="text-3xl mt-2" style={{ animation: 'float 2s ease-in-out infinite' }}>🏏💫</p>
          </div>
        )}

        {event.type === 'allout' && (
          <div
            className="text-center mt-1"
            style={{ animation: 'slideUp 0.5s ease-out 0.5s both' }}
          >
            {data.teamName && (
              <p className="text-xl font-bold text-white">{data.teamName}</p>
            )}
            {data.score && (
              <p className="text-3xl font-black text-white mt-2">{data.score}</p>
            )}
            {data.overs && (
              <p className={`text-sm ${config.accentColor} opacity-80 mt-1`}>({data.overs} overs)</p>
            )}
          </div>
        )}

        {/* Tap to dismiss hint */}
        <p
          className="text-xs text-white/30 mt-4 uppercase tracking-widest"
          style={{ animation: 'fadeIn 0.5s ease-out 1s both' }}
        >
          Tap to dismiss
        </p>
      </div>

      {/* Floating emojis for six */}
      {event.type === 'six' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {['🏏', '🔥', '💥', '⭐', '🏏', '🔥'].map((emoji, i) => (
            <span
              key={i}
              className="absolute text-3xl opacity-0"
              style={{
                left: `${15 + i * 14}%`,
                bottom: '10%',
                animation: `float-emoji ${2 + Math.random()}s ease-out ${0.3 + i * 0.15}s forwards`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* Floating emojis for four */}
      {event.type === 'four' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {['🏏', '💙', '🌊', '🏏'].map((emoji, i) => (
            <span
              key={i}
              className="absolute text-2xl opacity-0"
              style={{
                left: `${20 + i * 18}%`,
                bottom: '15%',
                animation: `float-emoji ${2 + Math.random()}s ease-out ${0.4 + i * 0.2}s forwards`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

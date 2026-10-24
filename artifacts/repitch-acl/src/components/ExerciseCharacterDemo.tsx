import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle2, Activity } from 'lucide-react';

export interface ExerciseCharacterDemoProps {
  exerciseId: string;
  exerciseName: string;
  target?: string;
  warning?: string;
  cues?: string[];
  compact?: boolean;
  activeLeg?: 'left' | 'right';
  highlightColor?: string;
}

export function ExerciseCharacterDemo({
  exerciseId,
  exerciseName,
  target = 'Controlled repetition',
  cues = ['Maintain steady breathing.', 'Focus on controlled form.', 'Do not rush the movement.'],
  compact = false,
  highlightColor = '#10b981',
}: ExerciseCharacterDemoProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const exKey = `${exerciseId} ${exerciseName}`.toLowerCase();
  const isQuad = exKey.includes('quad');
  const isRaise = exKey.includes('raise') || exKey.includes('slr') || exKey.includes('straight leg');
  const isHeel = exKey.includes('heel') || exKey.includes('slide') || exKey.includes('flexion');
  const isPatella = exKey.includes('patell') || exKey.includes('mobili');

  const cycleDuration = isQuad ? 8000 : isRaise ? 7000 : isHeel ? 7500 : isPatella ? 6000 : 5000;

  useEffect(() => {
    lastTimeRef.current = performance.now();
    const update = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTimeRef.current) * speed;
        setProgress((prev) => (prev + delta / cycleDuration) % 1);
      }
      lastTimeRef.current = now;
      animRef.current = requestAnimationFrame(update);
    };
    animRef.current = requestAnimationFrame(update);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, speed, cycleDuration]);

  let phaseName = 'Ready';
  let kneeAngle = 180;
  let hipAngle = 180;
  let isHoldPhase = false;
  let quadTension = 0;

  if (isQuad) {
    if (progress < 0.15) {
      phaseName = '1. Tighten Quadriceps Firmly';
      const t = progress / 0.15;
      quadTension = t;
      kneeAngle = 175 + t * 5;
    } else if (progress < 0.75) {
      phaseName = '2. Hold Terminal Extension Lock (5s)';
      isHoldPhase = true;
      quadTension = 1;
      kneeAngle = 180;
    } else {
      phaseName = '3. Controlled Release & Rest';
      const t = (progress - 0.75) / 0.25;
      quadTension = 1 - t;
      kneeAngle = 180 - t * 4;
    }
  } else if (isRaise) {
    kneeAngle = 180;
    if (progress < 0.3) {
      phaseName = '1. Lock Knee Straight & Elevate Leg';
      const t = progress / 0.3;
      hipAngle = 180 - t * 45;
      quadTension = 0.8;
    } else if (progress < 0.7) {
      phaseName = '2. Hold at 45° Peak (Zero Knee Lag)';
      isHoldPhase = true;
      hipAngle = 135;
      quadTension = 1;
    } else if (progress < 0.95) {
      phaseName = '3. Controlled Eccentric Lowering';
      const t = (progress - 0.7) / 0.25;
      hipAngle = 135 + t * 45;
      quadTension = 0.6;
    } else {
      phaseName = '4. Rest & Reset';
      hipAngle = 180;
      quadTension = 0;
    }
  } else if (isHeel) {
    if (progress < 0.4) {
      phaseName = '1. Smoothly Slide Heel Toward Glutes';
      const t = progress / 0.4;
      kneeAngle = 180 - t * 70;
      hipAngle = 180 - t * 45;
    } else if (progress < 0.65) {
      phaseName = '2. End-Range Flexion Hold';
      isHoldPhase = true;
      kneeAngle = 110;
      hipAngle = 135;
    } else if (progress < 0.95) {
      phaseName = '3. Glide Leg Smoothly Back to Straight';
      const t = (progress - 0.65) / 0.3;
      kneeAngle = 110 + t * 70;
      hipAngle = 135 + t * 45;
    } else {
      phaseName = '4. Full Extension Reset';
      kneeAngle = 180;
      hipAngle = 180;
    }
  } else if (isPatella) {
    kneeAngle = 180;
    if (progress < 0.25) {
      phaseName = '1. Superior Patellar Glide (Upward)';
    } else if (progress < 0.5) {
      phaseName = '2. Inferior Patellar Glide (Downward)';
    } else if (progress < 0.75) {
      phaseName = '3. Medial Patellar Glide (Inward)';
    } else {
      phaseName = '4. Lateral Patellar Glide (Outward)';
    }
  } else {
    phaseName = 'Controlled Cadence Demo';
    const t = Math.sin(progress * Math.PI * 2);
    kneeAngle = Math.round(180 - Math.abs(t) * 60);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0e1422 0%, #080c14 100%)',
        border: '1px solid rgba(0, 242, 254, 0.2)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Top Header Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '8px 12px' : '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: highlightColor,
              boxShadow: `0 0 10px ${highlightColor}`,
            }}
          />
          <span style={{ fontSize: compact ? 11 : 12, fontWeight: 700, letterSpacing: '0.05em', color: '#ffffff' }}>
            CHARACTER DEMO: {exerciseName.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 20,
              background: isHoldPhase ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 242, 254, 0.15)',
              color: isHoldPhase ? '#10b981' : '#00f2fe',
              border: `1px solid ${isHoldPhase ? '#10b981' : '#00f2fe'}`,
            }}
          >
            {isHoldPhase ? '● ISOMETRIC HOLD' : '● MOVING'}
          </span>
        </div>
      </div>

      {/* SVG Biomechanical Character Canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: compact ? '16 / 9' : '16 / 10',
          maxHeight: compact ? 220 : 340,
          background: 'radial-gradient(ellipse at 50% 60%, rgba(0, 242, 254, 0.08) 0%, rgba(0,0,0,0) 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 800 480"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="skinGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f3c299" />
              <stop offset="100%" stopColor="#d89b6f" />
            </linearGradient>
            <linearGradient id="shortGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Floor / Mat */}
          <rect x="60" y="380" width="680" height="14" rx="7" fill="#1e293b" />
          <line x1="80" y1="380" x2="720" y2="380" stroke="#334155" strokeWidth="2" strokeDasharray="6 6" />

          {/* RENDER SPECIFIC EXERCISE POSTURES */}
          {isQuad && (
            <QuadSetScene
              quadTension={quadTension}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}

          {isRaise && (
            <StraightLegRaiseScene
              hipAngle={hipAngle}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}

          {isHeel && (
            <HeelSlideScene
              kneeAngle={kneeAngle}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}

          {isPatella && (
            <PatellarMobScene
              progress={progress}
              highlightColor={highlightColor}
            />
          )}

          {!isQuad && !isRaise && !isHeel && !isPatella && (
            <GeneralScene
              progress={progress}
              exerciseName={exerciseName}
              highlightColor={highlightColor}
            />
          )}
        </svg>

        {/* Live Joint Angle HUD Tag */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 16,
            background: 'rgba(10, 15, 25, 0.88)',
            border: `1px solid ${highlightColor}`,
            borderRadius: 8,
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Activity size={13} color={highlightColor} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>
            DEMO KNEE: <span style={{ color: highlightColor, fontFamily: 'monospace' }}>{kneeAngle}°</span>
          </span>
          {isHoldPhase && (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981' }}>
              ✓ LOCKED
            </span>
          )}
        </div>

        {/* Speed / Controls floating button */}
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#ffffff',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />} {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 0.5 : s === 0.5 ? 1.5 : 1))}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#00f2fe',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {speed}x
          </button>
        </div>
      </div>

      {/* Movement Phase Progress Bar */}
      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.round(progress * 100)}%`,
            background: `linear-gradient(90deg, #00f2fe, ${highlightColor})`,
            transition: 'width 0.05s linear',
          }}
        />
      </div>

      {/* Dynamic Phase Title & Form Cues */}
      <div style={{ padding: compact ? '10px 12px' : '14px 18px', background: 'rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#00f2fe' }}>
            {phaseName}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
            Target: {target}
          </span>
        </div>

        {!compact && cues.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {cues.map((cue, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 11,
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '3px 9px',
                  borderRadius: 6,
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <CheckCircle2 size={11} color={highlightColor} /> {cue}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuadSetScene({
  quadTension,
  highlightColor,
  isHoldPhase,
}: {
  quadTension: number;
  highlightColor: string;
  isHoldPhase: boolean;
}) {
  const kneeY = 328 + quadTension * 12;
  const kneeX = 440;

  return (
    <g>
      <ellipse cx="610" cy="372" rx="28" ry="12" fill="#3b82f6" />
      <text x="610" y="394" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">
        Rolled Towel
      </text>

      <polygon points="120,380 220,380 180,260" fill="#334155" opacity="0.6" />

      <circle cx="180" cy="180" r="28" fill="url(#skinGrad)" />
      <circle cx="194" cy="176" r="3" fill="#0f172a" />
      <path d="M 194 184 Q 200 188 196 192" stroke="#0f172a" strokeWidth="2" fill="none" />
      <path d="M 180 208 L 195 240" stroke="url(#skinGrad)" strokeWidth="16" strokeLinecap="round" />
      <path d="M 195 230 L 255 330" stroke="#0284c7" strokeWidth="48" strokeLinecap="round" />
      <path d="M 205 245 L 140 310 L 130 380" stroke="url(#skinGrad)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <path d="M 260 330 Q 320 290 410 375" stroke="#475569" strokeWidth="22" strokeLinecap="round" fill="none" opacity="0.4" />

      <path
        d={`M 260 330 L ${kneeX} ${kneeY}`}
        stroke="#1e293b"
        strokeWidth="36"
        strokeLinecap="round"
      />

      {quadTension > 0.05 && (
        <path
          d={`M 290 320 Q 350 ${kneeY - 24 - quadTension * 8} ${kneeX - 20} ${kneeY - 14}`}
          stroke={highlightColor}
          strokeWidth={14 + quadTension * 6}
          strokeLinecap="round"
          fill="none"
          opacity={0.3 + quadTension * 0.6}
          filter="url(#glowFilter)"
        />
      )}

      <path
        d={`M ${kneeX} ${kneeY} L 610 360`}
        stroke="url(#skinGrad)"
        strokeWidth="24"
        strokeLinecap="round"
      />

      <path d="M 610 360 L 616 325" stroke="url(#skinGrad)" strokeWidth="20" strokeLinecap="round" />
      <polygon points="606,330 636,322 626,365 604,365" fill="#f8fafc" />

      <line x1="620" y1="310" x2="620" y2="280" stroke="#00f2fe" strokeWidth="2" strokeDasharray="3 3" />
      <polygon points="616,284 620,274 624,284" fill="#00f2fe" />
      <text x="635" y="295" fill="#00f2fe" fontSize="10" fontWeight="700">TOE UP</text>

      <circle cx={kneeX} cy={kneeY} r={18 + (isHoldPhase ? 4 : 0)} stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={kneeX} cy={kneeY} r="8" fill={highlightColor} />
      <circle cx={kneeX} cy={kneeY} r="3" fill="#ffffff" />

      {quadTension > 0.4 && (
        <g>
          <line x1={kneeX} y1={kneeY - 45} x2={kneeX} y2={kneeY - 25} stroke={highlightColor} strokeWidth="3" />
          <polygon points={`${kneeX - 5},${kneeY - 28} ${kneeX},${kneeY - 20} ${kneeX + 5},${kneeY - 28}`} fill={highlightColor} />
          <text x={kneeX + 16} y={kneeY - 30} fill={highlightColor} fontSize="11" fontWeight="800">
            PRESS DOWN
          </text>
        </g>
      )}

      <g transform={`translate(${kneeX - 70}, ${kneeY - 80})`}>
        <rect x="0" y="0" width="140" height="32" rx="8" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.5" />
        <text x="70" y="20" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">
          {isHoldPhase ? 'TERMINAL LOCK 180°' : 'FLATTEN KNEE'}
        </text>
      </g>
    </g>
  );
}

function StraightLegRaiseScene({
  hipAngle,
  highlightColor,
  isHoldPhase,
}: {
  hipAngle: number;
  highlightColor: string;
  isHoldPhase: boolean;
}) {
  const rad = ((180 - hipAngle) * Math.PI) / 180;
  const legLen1 = 140;
  const legLen2 = 140;

  const kneeX = 340 + Math.cos(rad) * legLen1;
  const kneeY = 360 - Math.sin(rad) * legLen1;

  const ankleX = kneeX + Math.cos(rad) * legLen2;
  const ankleY = kneeY - Math.sin(rad) * legLen2;

  return (
    <g>
      <rect x="110" y="350" width="50" height="25" rx="6" fill="#475569" />
      <circle cx="140" cy="345" r="24" fill="url(#skinGrad)" />
      <circle cx="146" cy="338" r="3" fill="#0f172a" />
      <path d="M 160 360 L 340 360" stroke="#0284c7" strokeWidth="44" strokeLinecap="round" />
      <path d="M 190 350 L 250 330 L 290 350" stroke="url(#skinGrad)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <path d="M 340 360 L 400 280 L 460 375" stroke="#475569" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45" />
      <polygon points="450,375 480,375 460,355" fill="#64748b" opacity="0.45" />
      <text x="410" y="270" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">
        Opposite Leg Bent (Stabilizer)
      </text>

      <path d="M 600 360 A 260 260 0 0 0 525 176" stroke="rgba(0, 242, 254, 0.25)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      <text x="545" y="190" fill="#00f2fe" fontSize="11" fontWeight="700">45° TARGET</text>

      <line x1="340" y1="360" x2={kneeX} y2={kneeY} stroke="#1e293b" strokeWidth="32" strokeLinecap="round" />
      <line x1={kneeX} y1={kneeY} x2={ankleX} y2={ankleY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />

      <line x1={ankleX} y1={ankleY} x2={ankleX - Math.sin(rad) * 32} y2={ankleY - Math.cos(rad) * 32} stroke="#f8fafc" strokeWidth="18" strokeLinecap="round" />

      <circle cx={kneeX} cy={kneeY} r={18} stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={kneeX} cy={kneeY} r="7" fill={highlightColor} />
      <circle cx={kneeX} cy={kneeY} r="3" fill="#ffffff" />

      <g transform={`translate(${kneeX - 70}, ${kneeY - 55})`}>
        <rect x="0" y="0" width="140" height="28" rx="7" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="70" y="18" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          {isHoldPhase ? '✓ ZERO EXTENSION LAG' : 'KNEE LOCKED 180°'}
        </text>
      </g>
    </g>
  );
}

function HeelSlideScene({
  kneeAngle,
  highlightColor,
  isHoldPhase,
}: {
  kneeAngle: number;
  highlightColor: string;
  isHoldPhase: boolean;
}) {
  const flexT = (180 - kneeAngle) / 70;
  const kneeX = 460 - flexT * 70;
  const kneeY = 360 - flexT * 110;
  const heelX = 620 - flexT * 190;
  const heelY = 372;

  return (
    <g>
      <rect x="420" y="375" width="220" height="8" rx="4" fill="rgba(0, 242, 254, 0.2)" />
      <g opacity="0.6">
        <line x1="470" y1="392" x2="580" y2="392" stroke="#00f2fe" strokeWidth="2" strokeDasharray="4 4" />
        <polygon points="466,392 474,388 474,396" fill="#00f2fe" />
        <polygon points="584,392 576,388 576,396" fill="#00f2fe" />
        <text x="525" y="408" fill="#00f2fe" fontSize="10" textAnchor="middle" fontWeight="600">
          GLIDE CADENCE
        </text>
      </g>

      <rect x="100" y="350" width="50" height="25" rx="6" fill="#475569" />
      <circle cx="130" cy="345" r="24" fill="url(#skinGrad)" />
      <path d="M 150 360 L 320 360" stroke="#0284c7" strokeWidth="44" strokeLinecap="round" />

      <line x1="320" y1="365" x2="600" y2="365" stroke="#475569" strokeWidth="20" strokeLinecap="round" opacity="0.35" />

      <line x1="320" y1="360" x2={kneeX} y2={kneeY} stroke="#1e293b" strokeWidth="32" strokeLinecap="round" />
      <line x1={kneeX} y1={kneeY} x2={heelX} y2={heelY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />

      <circle cx={heelX} cy={heelY} r="14" fill="#38bdf8" />

      <circle cx={kneeX} cy={kneeY} r={24} stroke={highlightColor} strokeWidth="2.5" strokeDasharray="3 3" fill="none" />
      <circle cx={kneeX} cy={kneeY} r={16} stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={kneeX} cy={kneeY} r="7" fill={highlightColor} />
      <circle cx={kneeX} cy={kneeY} r="3" fill="#ffffff" />

      <g transform={`translate(${kneeX - 65}, ${kneeY - 60})`}>
        <rect x="0" y="0" width="130" height="32" rx="8" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="65" y="16" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          {isHoldPhase ? 'END RANGE HOLD' : `FLEXION: ${kneeAngle}°`}
        </text>
        <text x="65" y="27" fill={highlightColor} fontSize="9" fontWeight="600" textAnchor="middle">
          TARGET: 110°
        </text>
      </g>
    </g>
  );
}

function PatellarMobScene({
  progress,
  highlightColor,
}: {
  progress: number;
  highlightColor: string;
}) {
  const kneeX = 460;
  const kneeY = 350;

  let dx = 0;
  let dy = 0;
  let dirText = 'SUPERIOR GLIDE';
  if (progress < 0.25) {
    dy = -Math.sin((progress / 0.25) * Math.PI) * 14;
    dirText = 'SUPERIOR (UPWARD)';
  } else if (progress < 0.5) {
    dy = Math.sin(((progress - 0.25) / 0.25) * Math.PI) * 14;
    dirText = 'INFERIOR (DOWNWARD)';
  } else if (progress < 0.75) {
    dx = -Math.sin((progress - 0.5) / 0.25 * Math.PI) * 14;
    dirText = 'MEDIAL (INWARD)';
  } else {
    dx = Math.sin(((progress - 0.75) / 0.25) * Math.PI) * 14;
    dirText = 'LATERAL (OUTWARD)';
  }

  return (
    <g>
      <circle cx="160" cy="220" r="26" fill="url(#skinGrad)" />
      <path d="M 175 240 L 260 360" stroke="#0284c7" strokeWidth="44" strokeLinecap="round" />
      <line x1="260" y1="360" x2="640" y2="360" stroke="url(#skinGrad)" strokeWidth="26" strokeLinecap="round" />

      <rect x="290" y="325" width="130" height="26" rx="6" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
      <text x="355" y="342" fill="#10b981" fontSize="10" fontWeight="700" textAnchor="middle">
        QUAD RELAXED 100%
      </text>

      <circle cx={kneeX - 35} cy={kneeY - 20} r="16" fill="url(#skinGrad)" opacity="0.9" />
      <circle cx={kneeX + 35} cy={kneeY - 20} r="16" fill="url(#skinGrad)" opacity="0.9" />
      <path d="M 210 280 L 425 330" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" />
      <path d="M 210 280 L 495 330" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" />

      <ellipse cx={kneeX + dx} cy={kneeY - 8 + dy} rx="20" ry="16" fill={highlightColor} opacity="0.85" filter="url(#glowFilter)" />
      <circle cx={kneeX + dx} cy={kneeY - 8 + dy} r="6" fill="#ffffff" />

      <g stroke="#00f2fe" strokeWidth="2.5" opacity="0.8">
        <line x1={kneeX} y1={kneeY - 45} x2={kneeX} y2={kneeY - 25} />
        <polygon points={`${kneeX - 4},${kneeY - 40} ${kneeX},${kneeY - 48} ${kneeX + 4},${kneeY - 40}`} fill="#00f2fe" />

        <line x1={kneeX} y1={kneeY + 15} x2={kneeX} y2={kneeY + 35} />
        <polygon points={`${kneeX - 4},${kneeY + 30} ${kneeX},${kneeY + 38} ${kneeX + 4},${kneeY + 30}`} fill="#00f2fe" />

        <line x1={kneeX - 45} y1={kneeY - 8} x2={kneeX - 25} y2={kneeY - 8} />
        <polygon points={`${kneeX - 40},${kneeY - 12} ${kneeX - 48},${kneeY - 8} ${kneeX - 40},${kneeY - 4}`} fill="#00f2fe" />

        <line x1={kneeX + 25} y1={kneeY - 8} x2={kneeX + 45} y2={kneeY - 8} />
        <polygon points={`${kneeX + 40},${kneeY - 12} ${kneeX + 48},${kneeY - 8} ${kneeX + 40},${kneeY - 4}`} fill="#00f2fe" />
      </g>

      <g transform={`translate(${kneeX - 80}, ${kneeY - 90})`}>
        <rect x="0" y="0" width="160" height="30" rx="7" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="80" y="19" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">
          {dirText}
        </text>
      </g>
    </g>
  );
}

function GeneralScene({
  progress,
  exerciseName,
  highlightColor,
}: {
  progress: number;
  exerciseName: string;
  highlightColor: string;
}) {
  const t = Math.sin(progress * Math.PI * 2);
  const hipY = 240 + Math.abs(t) * 40;
  const kneeY = 320 + Math.abs(t) * 20;

  return (
    <g>
      <circle cx="400" cy="120" r="24" fill="url(#skinGrad)" />
      <line x1="400" y1="144" x2="400" y2={hipY} stroke="#0284c7" strokeWidth="36" strokeLinecap="round" />
      <path d="M 400 170 L 340 220 L 400 250" stroke="url(#skinGrad)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 400 170 L 460 220 L 400 250" stroke="url(#skinGrad)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <line x1="385" y1={hipY} x2="360" y2={kneeY} stroke="#1e293b" strokeWidth="26" strokeLinecap="round" />
      <line x1="360" y1={kneeY} x2="360" y2={380} stroke="url(#skinGrad)" strokeWidth="20" strokeLinecap="round" />

      <line x1="415" y1={hipY} x2="440" y2={kneeY} stroke={highlightColor} strokeWidth="26" strokeLinecap="round" />
      <line x1="440" y1={kneeY} x2="440" y2={380} stroke="url(#skinGrad)" strokeWidth="20" strokeLinecap="round" />

      <circle cx={440} cy={kneeY} r="16" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={440} cy={kneeY} r="6" fill={highlightColor} />

      <g transform="translate(320, 420)">
        <rect x="0" y="0" width="160" height="28" rx="6" fill="rgba(10,15,25,0.9)" stroke="#00f2fe" strokeWidth="1" />
        <text x="80" y="18" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          {exerciseName}
        </text>
      </g>
    </g>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle2, Activity, X } from 'lucide-react';

export interface ExerciseCharacterDemoProps {
  exerciseId: string;
  exerciseName: string;
  target?: string;
  warning?: string;
  cues?: string[];
  compact?: boolean;
  activeLeg?: 'left' | 'right';
  highlightColor?: string;
  onClose?: () => void;
}

export function ExerciseCharacterDemo({
  exerciseId,
  exerciseName,
  target = 'Controlled repetition',
  cues = ['Maintain steady breathing.', 'Focus on controlled form.', 'Do not rush the movement.'],
  compact = false,
  highlightColor = '#10b981',
  onClose,
}: ExerciseCharacterDemoProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const exKey = `${exerciseId} ${exerciseName}`.toLowerCase();
  const isQuad = exKey.includes('quad') && !exKey.includes('wall') && !exKey.includes('split');
  const isRaise = (exKey.includes('raise') || exKey.includes('slr') || exKey.includes('straight leg')) && !exKey.includes('step');
  const isHeel = (exKey.includes('heel') || exKey.includes('slide') || exKey.includes('flexion')) && !exKey.includes('wall');
  const isPatella = exKey.includes('patell') || exKey.includes('mobili');
  const isMiniSquat = exKey.includes('mini') || (exKey.includes('squat') && !exKey.includes('split') && !exKey.includes('bulgarian') && !exKey.includes('wall'));
  const isWallSit = (exKey.includes('wall') || exKey.includes('sit')) && !isMiniSquat;
  const isStepUp = exKey.includes('step') || exKey.includes('box drop');
  const isBike = exKey.includes('bike') || exKey.includes('cycl') || exKey.includes('rpm');
  const isBulgarian = (exKey.includes('bulgarian') || exKey.includes('split squat') || exKey.includes('lunge') || exKey.includes('rear foot')) && !isMiniSquat;
  const isBoxJump = exKey.includes('boxjump') || (exKey.includes('box') && exKey.includes('landing')) || exKey.includes('jump');
  const isJogging = exKey.includes('jog') || exKey.includes('running') || exKey.includes('linear');
  const isCutting = exKey.includes('cut') || exKey.includes('cone') || exKey.includes('decel');
  const isSkater = exKey.includes('skater') || exKey.includes('bound') || exKey.includes('hop');

  const cycleDuration = isQuad ? 7500
    : isRaise ? 7000
    : isHeel ? 7000
    : isPatella ? 6000
    : isMiniSquat ? 6500
    : isWallSit ? 8000
    : isStepUp ? 6500
    : isBike ? 2400
    : isBulgarian ? 7000
    : isBoxJump ? 6000
    : isJogging ? 1600
    : isCutting ? 5500
    : isSkater ? 6000
    : 5000;

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
    if (progress < 0.18) {
      phaseName = '1. Tighten Quadriceps Firmly';
      const t = progress / 0.18;
      quadTension = t;
      kneeAngle = Math.round(175 + t * 5);
    } else if (progress < 0.75) {
      phaseName = '2. Hold Terminal Extension Lock (5s)';
      isHoldPhase = true;
      quadTension = 1;
      kneeAngle = 180;
    } else {
      phaseName = '3. Controlled Release & Rest';
      const t = (progress - 0.75) / 0.25;
      quadTension = 1 - t;
      kneeAngle = Math.round(180 - t * 5);
    }
  } else if (isRaise) {
    kneeAngle = 180;
    if (progress < 0.3) {
      phaseName = '1. Lock Knee Straight (180°) & Elevate Leg';
      const t = progress / 0.3;
      hipAngle = Math.round(180 - t * 45);
      quadTension = 0.8;
    } else if (progress < 0.7) {
      phaseName = '2. Hold at 45° Peak (Zero Knee Lag)';
      isHoldPhase = true;
      hipAngle = 135;
      quadTension = 1;
    } else if (progress < 0.95) {
      phaseName = '3. Controlled Eccentric Lowering';
      const t = (progress - 0.7) / 0.25;
      hipAngle = Math.round(135 + t * 45);
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
      kneeAngle = Math.round(180 - t * 70);
      hipAngle = Math.round(180 - t * 45);
    } else if (progress < 0.68) {
      phaseName = '2. End-Range Flexion Hold (110°)';
      isHoldPhase = true;
      kneeAngle = 110;
      hipAngle = 135;
    } else if (progress < 0.95) {
      phaseName = '3. Glide Leg Smoothly Back to Straight';
      const t = (progress - 0.68) / 0.27;
      kneeAngle = Math.round(110 + t * 70);
      hipAngle = Math.round(135 + t * 45);
    } else {
      phaseName = '4. Full Extension Reset (180°)';
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
  } else if (isMiniSquat) {
    if (progress < 0.16) {
      phaseName = '1. Athletic Stance (Feet Shoulder-Width)';
      kneeAngle = 180;
      hipAngle = 180;
      quadTension = 0.25;
    } else if (progress < 0.46) {
      phaseName = '2. Controlled Descent to 35°–45° Flexion';
      const t = (progress - 0.16) / 0.30;
      kneeAngle = Math.round(180 - t * 35);
      hipAngle = Math.round(180 - t * 35);
      quadTension = 0.25 + t * 0.75;
    } else if (progress < 0.76) {
      phaseName = '3. 3s Isometric Hold (Knee Over Midfoot · No Valgus)';
      isHoldPhase = true;
      kneeAngle = 145;
      hipAngle = 145;
      quadTension = 1.0;
    } else {
      phaseName = '4. Drive Through Heels to Terminal Lock (180°)';
      const t = (progress - 0.76) / 0.24;
      kneeAngle = Math.round(145 + t * 35);
      hipAngle = Math.round(145 + t * 35);
      quadTension = 1.0 - t * 0.75;
    }
  } else if (isWallSit) {
    if (progress < 0.25) {
      phaseName = '1. Smoothly Slide Down Wall to 60°';
      const t = progress / 0.25;
      kneeAngle = Math.round(180 - t * 120);
    } else if (progress < 0.75) {
      phaseName = '2. Isometric Quad Hold at 60° Flexion';
      isHoldPhase = true;
      kneeAngle = 60;
    } else {
      phaseName = '3. Push Through Heels to Stand';
      const t = (progress - 0.75) / 0.25;
      kneeAngle = Math.round(60 + t * 120);
    }
  } else if (isStepUp) {
    if (progress < 0.25) {
      phaseName = '1. Plant Lead Foot on 6" Rehab Step Box';
      kneeAngle = 100;
    } else if (progress < 0.55) {
      phaseName = '2. Drive Up to Full Knee Extension (180°)';
      const t = (progress - 0.25) / 0.3;
      kneeAngle = Math.round(100 + t * 80);
      isHoldPhase = t > 0.8;
    } else if (progress < 0.88) {
      phaseName = '3. Slow 3s Controlled Step-Down (No Valgus)';
      const t = (progress - 0.55) / 0.33;
      kneeAngle = Math.round(180 - t * 80);
    } else {
      phaseName = '4. Reset Athletic Starting Stance';
      kneeAngle = 180;
    }
  } else if (isBike) {
    const angleRad = progress * Math.PI * 2;
    kneeAngle = Math.round(135 - Math.sin(angleRad) * 28);
    phaseName = 'Cadence: 80 RPM Symmetrical Revolution';
  } else if (isBulgarian) {
    if (progress < 0.32) {
      phaseName = '1. Controlled Descent on Front Leg';
      const t = progress / 0.32;
      kneeAngle = Math.round(180 - t * 90);
    } else if (progress < 0.65) {
      phaseName = '2. 90° Working Depth Hold (Knee Over Toe)';
      isHoldPhase = true;
      kneeAngle = 90;
    } else if (progress < 0.92) {
      phaseName = '3. Drive Through Front Heel to Stand';
      const t = (progress - 0.65) / 0.27;
      kneeAngle = Math.round(90 + t * 90);
    } else {
      phaseName = '4. Full Lockout & Pelvic Reset';
      kneeAngle = 180;
    }
  } else if (isBoxJump) {
    if (progress < 0.25) {
      phaseName = '1. Athletic Load & Arm Swing Prep';
      kneeAngle = 130;
    } else if (progress < 0.45) {
      phaseName = '2. Explosive Vertical Jump onto Box';
      kneeAngle = 160;
    } else if (progress < 0.82) {
      phaseName = '3. Silent Soft Landing (90° Absorption Hold)';
      isHoldPhase = true;
      kneeAngle = 90;
    } else {
      phaseName = '4. Step Down & Return to Starting Position';
      kneeAngle = 180;
    }
  } else if (isJogging) {
    const sinCycle = Math.sin(progress * Math.PI * 2);
    kneeAngle = Math.round(125 + sinCycle * 35);
    phaseName = 'Linear Walk-to-Jog Cadence (~160 SPM)';
  } else if (isCutting) {
    if (progress < 0.3) {
      phaseName = '1. Deceleration Approach Toward Cone';
      kneeAngle = 150;
    } else if (progress < 0.7) {
      phaseName = '2. Plant Outside Foot & Flex 50° (Zero Valgus)';
      isHoldPhase = true;
      kneeAngle = 50;
    } else {
      phaseName = '3. High-Power Directional Push at 45°';
      kneeAngle = 160;
    }
  } else if (isSkater) {
    if (progress < 0.25) {
      phaseName = '1. Load Stance Leg in Quarter Squat (60°)';
      kneeAngle = 60;
    } else if (progress < 0.45) {
      phaseName = '2. Explosive Lateral Bound Across Mat';
      kneeAngle = 140;
    } else if (progress < 0.82) {
      phaseName = '3. Single-Leg Stick Landing (2s Solid Hold)';
      isHoldPhase = true;
      kneeAngle = 60;
    } else {
      phaseName = '4. Reset Athletic Coronal Alignment';
      kneeAngle = 175;
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
          padding: compact ? '6px 10px' : '8px 14px',
          background: 'rgba(0, 0, 0, 0.35)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: highlightColor,
              boxShadow: `0 0 8px ${highlightColor}`,
            }}
          />
          <span
            style={{
              fontSize: compact ? 10 : 11,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {compact ? 'REFERENCE DEMO' : `CHARACTER DEMO: ${exerciseName}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isHoldPhase && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                padding: '2px 6px',
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
              HOLD
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px 5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                lineHeight: 1,
                transition: 'all 0.15s ease'
              }}
              title="Close Reference Demo"
              aria-label="Close Reference Demo"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Stage */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          background: 'radial-gradient(ellipse at 50% 40%, #151d30 0%, #080d18 100%)',
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

          {/* RENDER SPECIFIC CLINICALLY ACCURATE SCENES */}
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

          {isMiniSquat && (
            <MiniSquatScene
              kneeAngle={kneeAngle}
              quadTension={quadTension}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}

          {isWallSit && (
            <WallSitScene
              kneeAngle={kneeAngle}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}

          {isStepUp && (
            <StepUpScene
              progress={progress}
              kneeAngle={kneeAngle}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}

          {isBike && (
            <BikeScene
              progress={progress}
              kneeAngle={kneeAngle}
              highlightColor={highlightColor}
            />
          )}

          {isBulgarian && (
            <BulgarianScene
              kneeAngle={kneeAngle}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}

          {isBoxJump && (
            <BoxJumpScene
              progress={progress}
              kneeAngle={kneeAngle}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}

          {isJogging && (
            <JoggingScene
              progress={progress}
              kneeAngle={kneeAngle}
              highlightColor={highlightColor}
            />
          )}

          {isCutting && (
            <CuttingScene
              progress={progress}
              kneeAngle={kneeAngle}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}

          {isSkater && (
            <SkaterScene
              progress={progress}
              kneeAngle={kneeAngle}
              highlightColor={highlightColor}
              isHoldPhase={isHoldPhase}
            />
          )}
        </svg>

        {/* Live Joint Angle HUD Tag */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 14,
            background: 'rgba(10, 15, 25, 0.9)',
            border: `1px solid ${highlightColor}`,
            boxShadow: `0 0 12px ${highlightColor}44`,
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
      <div style={{ padding: compact ? '8px 12px' : '10px 16px', background: 'rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#00f2fe' }}>
            {phaseName}
          </span>
          <span style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>
            Target: {target}
          </span>
        </div>

        {!compact && cues.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {cues.map((cue, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 10.5,
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CheckCircle2 size={10} color={highlightColor} /> {cue}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 1. Quad Sets Scene
function QuadSetScene({ quadTension, highlightColor, isHoldPhase }: { quadTension: number; highlightColor: string; isHoldPhase: boolean }) {
  const kneeY = 328 + quadTension * 12;
  const kneeX = 440;
  return (
    <g>
      <ellipse cx="610" cy="372" rx="28" ry="12" fill="#3b82f6" />
      <text x="610" y="394" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">Rolled Towel</text>
      <polygon points="120,380 220,380 180,260" fill="#334155" opacity="0.6" />
      <circle cx="180" cy="180" r="28" fill="url(#skinGrad)" />
      <circle cx="194" cy="176" r="3" fill="#0f172a" />
      <path d="M 180 208 L 195 240" stroke="url(#skinGrad)" strokeWidth="16" strokeLinecap="round" />
      <path d="M 195 230 L 255 330" stroke="#0284c7" strokeWidth="48" strokeLinecap="round" />
      <path d="M 205 245 L 140 310 L 130 380" stroke="url(#skinGrad)" strokeWidth="18" strokeLinecap="round" fill="none" />
      <path d="M 260 330 Q 320 290 410 375" stroke="#475569" strokeWidth="22" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d={`M 260 330 L ${kneeX} ${kneeY}`} stroke="#1e293b" strokeWidth="36" strokeLinecap="round" />
      {quadTension > 0.05 && (
        <path d={`M 290 320 Q 350 ${kneeY - 24 - quadTension * 8} ${kneeX - 20} ${kneeY - 14}`} stroke={highlightColor} strokeWidth={14 + quadTension * 6} strokeLinecap="round" fill="none" opacity={0.3 + quadTension * 0.6} filter="url(#glowFilter)" />
      )}
      <path d={`M ${kneeX} ${kneeY} L 610 360`} stroke="url(#skinGrad)" strokeWidth="24" strokeLinecap="round" />
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
          <text x={kneeX + 16} y={kneeY - 30} fill={highlightColor} fontSize="11" fontWeight="800">PRESS DOWN</text>
        </g>
      )}
      <g transform={`translate(${kneeX - 70}, ${kneeY - 80})`}>
        <rect x="0" y="0" width="140" height="32" rx="8" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.5" />
        <text x="70" y="20" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">{isHoldPhase ? 'TERMINAL LOCK 180°' : 'FLATTEN KNEE'}</text>
      </g>
    </g>
  );
}

// 2. Straight Leg Raise Scene
function StraightLegRaiseScene({ hipAngle, highlightColor, isHoldPhase }: { hipAngle: number; highlightColor: string; isHoldPhase: boolean }) {
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
      <path d="M 190 350 L 250 330 L 290 350" stroke="url(#skinGrad)" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M 340 360 L 400 280 L 460 375" stroke="#475569" strokeWidth="22" strokeLinecap="round" fill="none" opacity="0.45" />
      <polygon points="450,375 480,375 460,355" fill="#64748b" opacity="0.45" />
      <text x="410" y="270" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">Opposite Knee Bent</text>
      <line x1="340" y1="360" x2={kneeX} y2={kneeY} stroke="#1e293b" strokeWidth="34" strokeLinecap="round" />
      <line x1="340" y1="360" x2={kneeX} y2={kneeY} stroke={highlightColor} strokeWidth="10" strokeLinecap="round" opacity="0.4" />
      <line x1={kneeX} y1={kneeY} x2={ankleX} y2={ankleY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />
      <circle cx={ankleX} cy={ankleY} r="12" fill="#38bdf8" />
      <circle cx={kneeX} cy={kneeY} r="20" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={kneeX} cy={kneeY} r="8" fill={highlightColor} />
      <circle cx={kneeX} cy={kneeY} r="3" fill="#ffffff" />
      <path d={`M 340 360 L 580 360`} stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
      <path d={`M 420 360 A 80 80 0 0 0 ${340 + Math.cos(rad) * 80} ${360 - Math.sin(rad) * 80}`} stroke="#00f2fe" strokeWidth="2.5" fill="none" />
      <text x="430" y="340" fill="#00f2fe" fontSize="12" fontWeight="800">45° ELEVATION</text>
      <g transform={`translate(${kneeX - 70}, ${kneeY - 60})`}>
        <rect x="0" y="0" width="140" height="30" rx="8" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="70" y="19" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">{isHoldPhase ? 'ZERO EXTENSION LAG' : 'KNEE LOCKED 180°'}</text>
      </g>
    </g>
  );
}

// 3. Heel Slide Scene
function HeelSlideScene({ kneeAngle, highlightColor, isHoldPhase }: { kneeAngle: number; highlightColor: string; isHoldPhase: boolean }) {
  const flexRad = ((180 - kneeAngle) * Math.PI) / 180;
  const femurLen = 130;
  const tibiaLen = 130;
  const hipX = 320;
  const hipY = 360;
  const kneeX = hipX + Math.cos(flexRad * 0.5) * femurLen;
  const kneeY = hipY - Math.sin(flexRad * 0.5) * femurLen;
  const heelX = kneeX + Math.cos(flexRad * 0.5) * tibiaLen;
  const heelY = 370;
  return (
    <g>
      <rect x="100" y="350" width="50" height="25" rx="6" fill="#475569" />
      <circle cx="130" cy="345" r="24" fill="url(#skinGrad)" />
      <path d="M 150 360 L 320 360" stroke="#0284c7" strokeWidth="44" strokeLinecap="round" />
      <line x1="320" y1="365" x2="600" y2="365" stroke="#475569" strokeWidth="20" strokeLinecap="round" opacity="0.35" />
      <line x1="320" y1="360" x2={kneeX} y2={kneeY} stroke="#1e293b" strokeWidth="32" strokeLinecap="round" />
      <line x1={kneeX} y1={kneeY} x2={heelX} y2={heelY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />
      <circle cx={heelX} cy={heelY} r="14" fill="#38bdf8" />
      <circle cx={kneeX} cy={kneeY} r="24" stroke={highlightColor} strokeWidth="2.5" strokeDasharray="3 3" fill="none" />
      <circle cx={kneeX} cy={kneeY} r="16" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={kneeX} cy={kneeY} r="7" fill={highlightColor} />
      <circle cx={kneeX} cy={kneeY} r="3" fill="#ffffff" />
      <g transform={`translate(${kneeX - 65}, ${kneeY - 60})`}>
        <rect x="0" y="0" width="130" height="32" rx="8" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="65" y="16" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">{isHoldPhase ? 'END RANGE HOLD' : `FLEXION: ${kneeAngle}°`}</text>
        <text x="65" y="27" fill={highlightColor} fontSize="9" fontWeight="600" textAnchor="middle">TARGET: 110°</text>
      </g>
    </g>
  );
}

// 4. Patellar Mobilization Scene
function PatellarMobScene({ progress, highlightColor }: { progress: number; highlightColor: string }) {
  const kneeX = 460;
  const kneeY = 350;
  let dx = 0; let dy = 0; let dirText = 'SUPERIOR GLIDE';
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
      <text x="355" y="342" fill="#10b981" fontSize="10" fontWeight="700" textAnchor="middle">QUAD RELAXED 100%</text>
      <circle cx={kneeX - 35} cy={kneeY - 20} r="16" fill="url(#skinGrad)" opacity="0.9" />
      <circle cx={kneeX + 35} cy={kneeY - 20} r="16" fill="url(#skinGrad)" opacity="0.9" />
      <ellipse cx={kneeX + dx} cy={kneeY - 8 + dy} rx="20" ry="16" fill={highlightColor} opacity="0.85" filter="url(#glowFilter)" />
      <circle cx={kneeX + dx} cy={kneeY - 8 + dy} r="6" fill="#ffffff" />
      <g stroke="#00f2fe" strokeWidth="2.5" opacity="0.8">
        <line x1={kneeX} y1={kneeY - 45} x2={kneeX} y2={kneeY - 25} />
        <polygon points={`${kneeX - 4},${kneeY - 40} ${kneeX},${kneeY - 48} ${kneeX + 4},${kneeY - 40}`} fill="#00f2fe" />
        <line x1={kneeX} y1={kneeY + 15} x2={kneeX} y2={kneeY + 35} />
        <polygon points={`${kneeX - 4},${kneeY + 30} ${kneeX},${kneeY + 38} ${kneeX + 4},${kneeY + 30}`} fill="#00f2fe" />
      </g>
      <g transform={`translate(${kneeX - 80}, ${kneeY - 90})`}>
        <rect x="0" y="0" width="160" height="30" rx="7" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="80" y="19" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">{dirText}</text>
      </g>
    </g>
  );
}

// 4b. Mini Squat Scene (Phase 1 Closed-Kinetic-Chain)
function MiniSquatScene({
  kneeAngle,
  quadTension,
  highlightColor,
  isHoldPhase
}: {
  kneeAngle: number;
  quadTension: number;
  highlightColor: string;
  isHoldPhase: boolean;
}) {
  // t: 0 (standing 180°) -> 1 (shallow squat 145°, 35° flexion)
  const t = Math.max(0, Math.min(1, (180 - kneeAngle) / 35));

  // Ankle pinned firmly on the floor at (400, 370)
  const ankleX = 400;
  const ankleY = 370;

  // Knee flexes forward slightly over midfoot (never exceeding toes at x=442)
  const kneeX = 400 + t * 24; // 400 to 424 (safely behind toe line 442)
  const kneeY = 265 + t * 24; // 265 to 289

  // Hips hinge backward and down (posterior hip hinge)
  const hipX = 400 - t * 40; // 400 back to 360
  const hipY = 160 + t * 48; // 160 down to 208

  // Torso maintains proud chest with natural athletic forward lean (~15°)
  const shoulderX = hipX + 14; // 414 to 374
  const shoulderY = hipY - 82; // 78 to 126
  const headX = shoulderX + 2;
  const headY = shoulderY - 26;

  // Arms reach forward for counterbalance as hips sink back
  const elbowX = shoulderX + 26 + t * 20;
  const elbowY = shoulderY + 22 + t * 2;
  const handX = shoulderX + 54 + t * 38;
  const handY = shoulderY + 20 - t * 12;

  // Contralateral (background) leg for depth perception
  const bgHipX = hipX - 16;
  const bgKneeX = kneeX - 30;
  const bgKneeY = kneeY - 4;
  const bgAnkleX = ankleX - 30;
  const bgAnkleY = ankleY - 2;

  return (
    <g>
      {/* Floor Depth Guide */}
      <line x1="300" y1="289" x2="490" y2="289" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
      <text x="295" y="286" fill="#f59e0b" fontSize="9.5" fontWeight="700" textAnchor="end">
        PHASE 1 LIMIT: 45° MAX
      </text>

      {/* Contralateral (Back) Leg */}
      <line x1={bgHipX} y1={hipY} x2={bgKneeX} y2={bgKneeY} stroke="#1e293b" strokeWidth="22" strokeLinecap="round" opacity="0.45" />
      <line x1={bgKneeX} y1={bgKneeY} x2={bgAnkleX} y2={bgAnkleY} stroke="url(#skinGrad)" strokeWidth="16" strokeLinecap="round" opacity="0.45" />
      <polygon points={`${bgAnkleX - 15},380 ${bgAnkleX + 32},380 ${bgAnkleX + 24},364 ${bgAnkleX - 15},364`} fill="#475569" opacity="0.45" />

      {/* Head & Athletic Torso */}
      <circle cx={headX} cy={headY} r="22" fill="url(#skinGrad)" />
      <circle cx={headX + 9} cy={headY - 2} r="2.5" fill="#0f172a" />
      
      {/* Strong Torso Line with athletic shirt */}
      <line x1={shoulderX} y1={shoulderY} x2={hipX} y2={hipY} stroke="#0284c7" strokeWidth="36" strokeLinecap="round" />
      
      {/* Counterbalance Arms reaching forward */}
      <path
        d={`M ${shoulderX} ${shoulderY + 10} Q ${elbowX} ${elbowY} ${handX} ${handY}`}
        stroke="url(#skinGrad)"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />

      {/* Operative Thigh (Femur) */}
      <line x1={hipX} y1={hipY} x2={kneeX} y2={kneeY} stroke="#0f172a" strokeWidth="32" strokeLinecap="round" />

      {/* Quadriceps VMO Activation Glow */}
      <line
        x1={hipX + 3}
        y1={hipY}
        x2={kneeX}
        y2={kneeY}
        stroke={highlightColor}
        strokeWidth={7 + quadTension * 6}
        strokeLinecap="round"
        opacity={0.3 + quadTension * 0.55}
        filter="url(#glowFilter)"
      />

      {/* Operative Shin (Tibia) */}
      <line x1={kneeX} y1={kneeY} x2={ankleX} y2={ankleY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />

      {/* Near Foot & Athletic Trainer Shoe */}
      <polygon points={`${ankleX - 18},380 ${ankleX + 42},380 ${ankleX + 32},362 ${ankleX - 18},362`} fill="#38bdf8" />
      <line x1={ankleX - 18} y1="380" x2={ankleX + 42} y2="380" stroke="#ffffff" strokeWidth="3" />

      {/* Knee Joint Center & Holographic Target Halo */}
      <circle cx={kneeX} cy={kneeY} r={18} stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={kneeX} cy={kneeY} r="7" fill={highlightColor} />
      <circle cx={kneeX} cy={kneeY} r="3" fill="#ffffff" />

      {/* Vertical Alignment Plumbline: Knee tracking safely over midfoot */}
      <line x1={kneeX} y1={kneeY} x2={kneeX} y2="380" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.65" />
      <line x1={ankleX + 42} y1="355" x2={ankleX + 42} y2="380" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.45" />

      {/* Alignment Verification Label */}
      <g transform={`translate(${kneeX + 22}, ${kneeY + 4})`}>
        <rect x="0" y="0" width="138" height="22" rx="5" fill="rgba(10,15,25,0.85)" stroke="#10b981" strokeWidth="1" />
        <text x="69" y="14" fill="#10b981" fontSize="9.5" fontWeight="800" textAnchor="middle">
          ✓ KNEE OVER MIDFOOT
        </text>
      </g>

      {/* Main Dynamic Knee Angle HUD Card */}
      <g transform={`translate(${kneeX - 60}, ${kneeY - 62})`}>
        <rect x="0" y="0" width="158" height="30" rx="8" fill="rgba(8,12,22,0.94)" stroke={highlightColor} strokeWidth="1.4" filter="url(#glowFilter)" />
        <text x="79" y="19" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle">
          {isHoldPhase ? '35° ISOMETRIC HOLD' : `KNEE: ${kneeAngle}° (AIM 145°)`}
        </text>
      </g>
    </g>
  );
}

// 5. Wall Sits Scene (Phase 2)
function WallSitScene({ kneeAngle, highlightColor, isHoldPhase }: { kneeAngle: number; highlightColor: string; isHoldPhase: boolean }) {
  const t = (180 - kneeAngle) / 120; // 0 (standing) to 1 (60 deg)
  const hipY = 240 + t * 65;
  const kneeY = hipY;
  const kneeX = 260 + t * 90;
  const footX = kneeX;
  const footY = 380;
  return (
    <g>
      {/* Wall */}
      <rect x="180" y="80" width="24" height="300" fill="#334155" />
      <line x1="204" y1="80" x2="204" y2="380" stroke="#64748b" strokeWidth="3" />
      <text x="170" y="200" fill="#64748b" fontSize="11" fontWeight="700" transform="rotate(-90 170 200)">CLINICAL WALL</text>

      {/* Head & Torso resting against wall */}
      <circle cx="218" cy={hipY - 110} r="22" fill="url(#skinGrad)" />
      <line x1="210" y1={hipY - 90} x2="210" y2={hipY} stroke="#0284c7" strokeWidth="36" strokeLinecap="round" />
      
      {/* Arm holding across chest */}
      <path d={`M 215 ${hipY - 70} L 270 ${hipY - 40} L 240 ${hipY - 20}`} stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />

      {/* Thigh (Femur) */}
      <line x1="210" y1={hipY} x2={kneeX} y2={kneeY} stroke="#1e293b" strokeWidth="32" strokeLinecap="round" />
      <line x1="210" y1={hipY} x2={kneeX} y2={kneeY} stroke={highlightColor} strokeWidth="10" strokeLinecap="round" opacity="0.5" filter="url(#glowFilter)" />

      {/* Shin (Tibia) straight down to floor */}
      <line x1={kneeX} y1={kneeY} x2={footX} y2={footY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />
      <polygon points={`${footX - 10},${footY} ${footX + 35},${footY} ${footX + 25},${footY - 18} ${footX - 10},${footY - 18}`} fill="#38bdf8" />

      {/* Knee joint highlight */}
      <circle cx={kneeX} cy={kneeY} r="18" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={kneeX} cy={kneeY} r="7" fill={highlightColor} />
      <circle cx={kneeX} cy={kneeY} r="3" fill="#ffffff" />

      {/* Vertical plumbline: Knee over ankle */}
      <line x1={kneeX} y1={kneeY} x2={footX} y2={footY} stroke="#00f2fe" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

      <g transform={`translate(${kneeX - 20}, ${kneeY - 60})`}>
        <rect x="0" y="0" width="150" height="30" rx="7" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="75" y="19" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          {isHoldPhase ? 'WALL SIT: 60° LOCKED' : `FLEXION: ${kneeAngle}°`}
        </text>
      </g>
    </g>
  );
}

// 6. Step-Up Scene (Phase 2)
function StepUpScene({ progress, kneeAngle, highlightColor, isHoldPhase }: { progress: number; kneeAngle: number; highlightColor: string; isHoldPhase: boolean }) {
  const boxX = 430;
  const boxY = 280;
  const isAscending = progress < 0.55;
  const t = isAscending ? (progress - 0.25) / 0.3 : 1 - (progress - 0.55) / 0.33;
  const clampedT = Math.max(0, Math.min(1, t));
  const hipY = 250 - clampedT * 60;
  const leadKneeX = 470;
  const leadKneeY = hipY + 50 + (1 - clampedT) * 30;

  return (
    <g>
      {/* 6-inch Step Box */}
      <rect x={boxX} y={boxY} width="200" height="100" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" />
      <line x1={boxX} y1={boxY + 6} x2={boxX + 200} y2={boxY + 6} stroke="#00f2fe" strokeWidth="2" strokeDasharray="4 4" />
      <text x={boxX + 100} y={boxY + 45} fill="#94a3b8" fontSize="12" fontWeight="700" textAnchor="middle">6" REHAB BOX</text>

      {/* Head & Torso */}
      <circle cx={420} cy={hipY - 95} r="22" fill="url(#skinGrad)" />
      <line x1={420} y1={hipY - 75} x2={420} y2={hipY} stroke="#0284c7" strokeWidth="34" strokeLinecap="round" />

      {/* Trailing leg */}
      <line x1="410" y1={hipY} x2="380" y2={clampedT > 0.8 ? boxY + 20 : 380} stroke="#475569" strokeWidth="20" strokeLinecap="round" opacity="0.6" />

      {/* Lead operative leg on box */}
      <line x1="425" y1={hipY} x2={leadKneeX} y2={leadKneeY} stroke="#1e293b" strokeWidth="30" strokeLinecap="round" />
      <line x1="425" y1={hipY} x2={leadKneeX} y2={leadKneeY} stroke={highlightColor} strokeWidth="10" strokeLinecap="round" opacity="0.6" filter="url(#glowFilter)" />
      <line x1={leadKneeX} y1={leadKneeY} x2="490" y2={boxY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />
      <polygon points="475,280 520,280 510,265 475,265" fill="#38bdf8" />

      {/* Knee joint highlight */}
      <circle cx={leadKneeX} cy={leadKneeY} r="18" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={leadKneeX} cy={leadKneeY} r="7" fill={highlightColor} />
      <circle cx={leadKneeX} cy={leadKneeY} r="3" fill="#ffffff" />

      <g transform={`translate(${leadKneeX - 70}, ${leadKneeY - 50})`}>
        <rect x="0" y="0" width="145" height="28" rx="7" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="72" y="18" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          {isHoldPhase ? '180° TERMINAL DRIVE' : `DRIVE: ${kneeAngle}°`}
        </text>
      </g>
    </g>
  );
}

// 7. Stationary Bike Ergometer Scene (Phase 2)
function BikeScene({ progress, kneeAngle, highlightColor }: { progress: number; kneeAngle: number; highlightColor: string }) {
  const crankAngle = progress * Math.PI * 2;
  const crankX = 400 + Math.cos(crankAngle) * 38;
  const crankY = 320 + Math.sin(crankAngle) * 38;
  const hipX = 320;
  const hipY = 220;
  const kneeX = 380 + Math.sin(crankAngle) * 20;
  const kneeY = 270 + Math.cos(crankAngle) * 15;

  return (
    <g>
      {/* Bike Frame */}
      <line x1="280" y1="380" x2="320" y2="230" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
      <line x1="320" y1="230" x2="400" y2="320" stroke="#0284c7" strokeWidth="12" strokeLinecap="round" />
      <line x1="400" y1="320" x2="480" y2="200" stroke="#0284c7" strokeWidth="10" strokeLinecap="round" />
      <line x1="480" y1="200" x2="480" y2="380" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
      <path d="M 460 190 L 510 190" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
      {/* Saddle */}
      <ellipse cx="320" cy="225" rx="26" ry="8" fill="#0f172a" />
      {/* Flywheel / Crank */}
      <circle cx="400" cy="320" r="44" stroke="#334155" strokeWidth="6" fill="#0f172a" />
      <circle cx="400" cy="320" r="10" fill="#64748b" />
      <line x1="400" y1="320" x2={crankX} y2={crankY} stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx={crankX} cy={crankY} r="6" fill="#38bdf8" />

      {/* Rider Body */}
      <circle cx="340" cy="130" r="22" fill="url(#skinGrad)" />
      <line x1="335" y1="150" x2={hipX} y2={hipY} stroke="#0284c7" strokeWidth="32" strokeLinecap="round" />
      {/* Arms holding handlebars */}
      <path d={`M 350 170 L 430 185 L 490 190`} stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />

      {/* Operative Leg pedaling */}
      <line x1={hipX} y1={hipY} x2={kneeX} y2={kneeY} stroke="#1e293b" strokeWidth="28" strokeLinecap="round" />
      <line x1={hipX} y1={hipY} x2={kneeX} y2={kneeY} stroke={highlightColor} strokeWidth="8" strokeLinecap="round" opacity="0.5" filter="url(#glowFilter)" />
      <line x1={kneeX} y1={kneeY} x2={crankX} y2={crankY} stroke="url(#skinGrad)" strokeWidth="18" strokeLinecap="round" />

      {/* Knee joint ring */}
      <circle cx={kneeX} cy={kneeY} r="16" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={kneeX} cy={kneeY} r="6" fill={highlightColor} />

      <g transform={`translate(${kneeX - 60}, ${kneeY - 55})`}>
        <rect x="0" y="0" width="135" height="28" rx="6" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="67" y="18" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          CYCLING: {kneeAngle}°
        </text>
      </g>
    </g>
  );
}

// 8. Bulgarian Split Squat Scene (Phase 3)
function BulgarianScene({ kneeAngle, highlightColor, isHoldPhase }: { kneeAngle: number; highlightColor: string; isHoldPhase: boolean }) {
  const t = (180 - kneeAngle) / 90; // 0 to 1
  const hipY = 240 + t * 50;
  const frontKneeX = 470;
  const frontKneeY = 320 + t * 15;
  const frontAnkleX = 470;
  const frontAnkleY = 380;

  return (
    <g>
      {/* Bench on left */}
      <rect x="150" y="270" width="130" height="110" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      <text x="215" y="325" fill="#94a3b8" fontSize="11" fontWeight="700" textAnchor="middle">REAR BENCH</text>

      {/* Rear foot elevated on bench */}
      <path d={`M 380 ${hipY} L 280 ${hipY + 30} L 240 270`} stroke="#475569" strokeWidth="18" strokeLinecap="round" fill="none" opacity="0.6" />
      <polygon points="230,270 255,270 250,255 230,255" fill="#64748b" opacity="0.6" />

      {/* Upright Head & Torso */}
      <circle cx="390" cy={hipY - 95} r="22" fill="url(#skinGrad)" />
      <line x1="390" y1={hipY - 75} x2="390" y2={hipY} stroke="#0284c7" strokeWidth="34" strokeLinecap="round" />
      <line x1="390" y1={hipY - 50} x2="420" y2={hipY - 10} stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" />

      {/* Front operative leg descending */}
      <line x1="390" y1={hipY} x2={frontKneeX} y2={frontKneeY} stroke="#1e293b" strokeWidth="30" strokeLinecap="round" />
      <line x1="390" y1={hipY} x2={frontKneeX} y2={frontKneeY} stroke={highlightColor} strokeWidth="10" strokeLinecap="round" opacity="0.5" filter="url(#glowFilter)" />
      <line x1={frontKneeX} y1={frontKneeY} x2={frontAnkleX} y2={frontAnkleY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />
      <polygon points="455,380 495,380 485,362 455,362" fill="#38bdf8" />

      {/* Knee joint */}
      <circle cx={frontKneeX} cy={frontKneeY} r="18" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={frontKneeX} cy={frontKneeY} r="7" fill={highlightColor} />
      <circle cx={frontKneeX} cy={frontKneeY} r="3" fill="#ffffff" />

      {/* Vertical tracking plumbline */}
      <line x1={frontKneeX} y1={frontKneeY} x2={frontAnkleX} y2={frontAnkleY} stroke="#00f2fe" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />

      <g transform={`translate(${frontKneeX - 65}, ${frontKneeY - 55})`}>
        <rect x="0" y="0" width="140" height="28" rx="6" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="70" y="18" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          {isHoldPhase ? '90° WORKING DEPTH' : `KNEE DEPTH: ${kneeAngle}°`}
        </text>
      </g>
    </g>
  );
}

// 9. Box Jump Scene (Phase 3)
function BoxJumpScene({ progress, kneeAngle, highlightColor, isHoldPhase }: { progress: number; kneeAngle: number; highlightColor: string; isHoldPhase: boolean }) {
  const boxX = 490;
  const boxY = 240;
  const isLanded = progress >= 0.45;
  const avatarX = isLanded ? 560 : 320;
  const avatarY = isLanded ? boxY : 380;
  const t = (180 - kneeAngle) / 90;
  const hipY = avatarY - 80 - (isLanded ? (1 - t) * 40 : 0);

  return (
    <g>
      {/* 12-inch Plyometric Box */}
      <rect x={boxX} y={boxY} width="190" height="140" rx="8" fill="#1e293b" stroke="#00f2fe" strokeWidth="2" />
      <text x={boxX + 95} y={boxY + 60} fill="#94a3b8" fontSize="13" fontWeight="800" textAnchor="middle">12" PLYO BOX</text>
      <text x={boxX + 95} y={boxY + 80} fill="#00f2fe" fontSize="10" fontWeight="700" textAnchor="middle">SILENT IMPACT</text>

      {/* Avatar */}
      <circle cx={avatarX} cy={hipY - 75} r="20" fill="url(#skinGrad)" />
      <line x1={avatarX} y1={hipY - 55} x2={avatarX} y2={hipY} stroke="#0284c7" strokeWidth="30" strokeLinecap="round" />
      {/* Arms absorbing */}
      <path d={`M ${avatarX} ${hipY - 45} L ${avatarX + 30} ${hipY - 20} L ${avatarX + 45} ${hipY - 40}`} stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />

      {/* Operative Leg bending to absorb */}
      <line x1={avatarX} y1={hipY} x2={avatarX - 25} y2={avatarY - 45} stroke="#1e293b" strokeWidth="26" strokeLinecap="round" />
      <line x1={avatarX} y1={hipY} x2={avatarX - 25} y2={avatarY - 45} stroke={highlightColor} strokeWidth="8" strokeLinecap="round" opacity="0.5" filter="url(#glowFilter)" />
      <line x1={avatarX - 25} y1={avatarY - 45} x2={avatarX - 10} y2={avatarY} stroke="url(#skinGrad)" strokeWidth="18" strokeLinecap="round" />
      <circle cx={avatarX - 10} cy={avatarY} r="10" fill="#38bdf8" />

      {/* Knee highlight */}
      <circle cx={avatarX - 25} cy={avatarY - 45} r="18" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={avatarX - 25} cy={avatarY - 45} r="6" fill={highlightColor} />

      <g transform={`translate(${avatarX - 70}, ${avatarY - 110})`}>
        <rect x="0" y="0" width="150" height="28" rx="6" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="75" y="18" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          {isHoldPhase ? 'SOFT STICK: 90° HOLD' : `ABSORPTION: ${kneeAngle}°`}
        </text>
      </g>
    </g>
  );
}

// 10. Jogging Scene (Phase 3)
function JoggingScene({ progress, kneeAngle, highlightColor }: { progress: number; kneeAngle: number; highlightColor: string }) {
  const stride = Math.sin(progress * Math.PI * 2);
  const hipX = 400;
  const hipY = 220 + Math.abs(stride) * 12;
  const leadKneeX = hipX + 35 + stride * 30;
  const leadKneeY = 280 - Math.max(0, stride) * 35;
  const trailKneeX = hipX - 35 - stride * 30;
  const trailKneeY = 290 - Math.max(0, -stride) * 30;

  return (
    <g>
      {/* Upright Running Avatar */}
      <circle cx={hipX + 15} cy={hipY - 95} r="22" fill="url(#skinGrad)" />
      <line x1={hipX + 10} y1={hipY - 75} x2={hipX} y2={hipY} stroke="#0284c7" strokeWidth="32" strokeLinecap="round" />

      {/* Running Arms */}
      <path d={`M ${hipX + 10} ${hipY - 55} L ${hipX + 45 - stride * 25} ${hipY - 35} L ${hipX + 60 - stride * 20} ${hipY - 55}`} stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />

      {/* Trailing leg */}
      <line x1={hipX} y1={hipY} x2={trailKneeX} y2={trailKneeY} stroke="#475569" strokeWidth="22" strokeLinecap="round" opacity="0.6" />
      <line x1={trailKneeX} y1={trailKneeY} x2={trailKneeX - 25} y2="370" stroke="#475569" strokeWidth="16" strokeLinecap="round" opacity="0.6" />

      {/* Lead operative leg high knee drive */}
      <line x1={hipX} y1={hipY} x2={leadKneeX} y2={leadKneeY} stroke="#1e293b" strokeWidth="28" strokeLinecap="round" />
      <line x1={hipX} y1={hipY} x2={leadKneeX} y2={leadKneeY} stroke={highlightColor} strokeWidth="10" strokeLinecap="round" opacity="0.5" filter="url(#glowFilter)" />
      <line x1={leadKneeX} y1={leadKneeY} x2={leadKneeX + 10} y2="365" stroke="url(#skinGrad)" strokeWidth="20" strokeLinecap="round" />
      <circle cx={leadKneeX + 10} cy="365" r="11" fill="#38bdf8" />

      {/* Knee joint highlight */}
      <circle cx={leadKneeX} cy={leadKneeY} r="18" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={leadKneeX} cy={leadKneeY} r="7" fill={highlightColor} />

      <g transform={`translate(${leadKneeX - 60}, ${leadKneeY - 55})`}>
        <rect x="0" y="0" width="135" height="28" rx="6" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="67" y="18" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          KNEE DRIVE: {kneeAngle}°
        </text>
      </g>
    </g>
  );
}

// 11. Cutting Scene (Phase 4)
function CuttingScene({ progress, kneeAngle, highlightColor, isHoldPhase }: { progress: number; kneeAngle: number; highlightColor: string; isHoldPhase: boolean }) {
  const coneX = 490;
  const coneY = 380;
  const hipX = 430;
  const hipY = 240;
  const plantKneeX = 480;
  const plantKneeY = 310;

  return (
    <g>
      {/* Agility Deceleration Cone */}
      <polygon points={`${coneX - 20},${coneY} ${coneX},${coneY - 50} ${coneX + 20},${coneY}`} fill="#f97316" />
      <line x1={coneX - 25} y1={coneY} x2={coneX + 25} y2={coneY} stroke="#ea580c" strokeWidth="4" />
      <text x={coneX} y={coneY - 60} fill="#f97316" fontSize="11" fontWeight="800" textAnchor="middle">45° CONE</text>

      {/* Dynamic 45° directional cut arrow */}
      <line x1={coneX + 20} y1={coneY - 30} x2={coneX + 90} y2={coneY - 100} stroke="#00f2fe" strokeWidth="4" strokeDasharray="6 4" />
      <polygon points={`${coneX + 90},${coneY - 110} ${coneX + 75},${coneY - 95} ${coneX + 95},${coneY - 90}`} fill="#00f2fe" />
      <text x={coneX + 105} y={coneY - 100} fill="#00f2fe" fontSize="12" fontWeight="800">45° PUSH</text>

      {/* Athletic low-body posture */}
      <circle cx={hipX - 10} cy={hipY - 80} r="22" fill="url(#skinGrad)" />
      <line x1={hipX - 10} y1={hipY - 60} x2={hipX} y2={hipY} stroke="#0284c7" strokeWidth="32" strokeLinecap="round" />

      {/* Plant leg (operative) wide base */}
      <line x1={hipX} y1={hipY} x2={plantKneeX} y2={plantKneeY} stroke="#1e293b" strokeWidth="30" strokeLinecap="round" />
      <line x1={hipX} y1={hipY} x2={plantKneeX} y2={plantKneeY} stroke={highlightColor} strokeWidth="10" strokeLinecap="round" opacity="0.5" filter="url(#glowFilter)" />
      <line x1={plantKneeX} y1={plantKneeY} x2={coneX - 10} y2={coneY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />
      <polygon points={`${coneX - 25},${coneY} ${coneX + 10},${coneY} ${coneX},${coneY - 16} ${coneX - 25},${coneY - 16}`} fill="#38bdf8" />

      {/* Knee joint highlight */}
      <circle cx={plantKneeX} cy={plantKneeY} r="18" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={plantKneeX} cy={plantKneeY} r="7" fill={highlightColor} />

      <g transform={`translate(${plantKneeX - 75}, ${plantKneeY - 60})`}>
        <rect x="0" y="0" width="160" height="28" rx="6" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="80" y="18" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          {isHoldPhase ? 'ZERO VALGUS (50° FLEX)' : `PLANT: ${kneeAngle}°`}
        </text>
      </g>
    </g>
  );
}

// 12. Skater Bounding Scene (Phase 4)
function SkaterScene({ progress, kneeAngle, highlightColor, isHoldPhase }: { progress: number; kneeAngle: number; highlightColor: string; isHoldPhase: boolean }) {
  const isLanded = progress >= 0.45;
  const avatarX = isLanded ? 480 : 310;
  const hipY = 240;
  const plantKneeX = avatarX + (isLanded ? 20 : -20);
  const plantKneeY = 320;
  const footX = plantKneeX;
  const footY = 380;

  return (
    <g>
      {/* Turf distance marks */}
      <line x1="280" y1="380" x2="280" y2="395" stroke="#475569" strokeWidth="3" />
      <line x1="520" y1="380" x2="520" y2="395" stroke="#00f2fe" strokeWidth="3" />
      <text x="400" y="420" fill="#94a3b8" fontSize="12" fontWeight="700" textAnchor="middle">LATERAL TURF BOUND (2M)</text>

      {/* Lateral Bound flight arc */}
      <path d="M 310 260 Q 400 180 480 260" stroke="#00f2fe" strokeWidth="2.5" strokeDasharray="5 5" fill="none" opacity="0.6" />

      {/* Athletic landing avatar */}
      <circle cx={avatarX} cy={hipY - 80} r="22" fill="url(#skinGrad)" />
      <line x1={avatarX} y1={hipY - 60} x2={avatarX} y2={hipY} stroke="#0284c7" strokeWidth="32" strokeLinecap="round" />
      {/* Counterbalance arms */}
      <path d={`M ${avatarX} ${hipY - 45} L ${avatarX - 45} ${hipY - 20} L ${avatarX - 60} ${hipY - 45}`} stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />

      {/* Floating non-landing leg in back */}
      <path d={`M ${avatarX} ${hipY} L ${avatarX - 50} ${hipY + 30} L ${avatarX - 70} ${hipY + 70}`} stroke="#475569" strokeWidth="18" strokeLinecap="round" fill="none" opacity="0.5" />

      {/* Stance operative leg sticking the landing */}
      <line x1={avatarX} y1={hipY} x2={plantKneeX} y2={plantKneeY} stroke="#1e293b" strokeWidth="30" strokeLinecap="round" />
      <line x1={avatarX} y1={hipY} x2={plantKneeX} y2={plantKneeY} stroke={highlightColor} strokeWidth="10" strokeLinecap="round" opacity="0.5" filter="url(#glowFilter)" />
      <line x1={plantKneeX} y1={plantKneeY} x2={footX} y2={footY} stroke="url(#skinGrad)" strokeWidth="22" strokeLinecap="round" />
      <polygon points={`${footX - 15},${footY} ${footX + 25},${footY} ${footX + 15},${footY - 16} ${footX - 15},${footY - 16}`} fill="#38bdf8" />

      {/* Knee joint highlight */}
      <circle cx={plantKneeX} cy={plantKneeY} r="18" stroke={highlightColor} strokeWidth="3" fill="none" filter="url(#glowFilter)" />
      <circle cx={plantKneeX} cy={plantKneeY} r="7" fill={highlightColor} />

      <g transform={`translate(${plantKneeX - 75}, ${plantKneeY - 60})`}>
        <rect x="0" y="0" width="155" height="28" rx="6" fill="rgba(10,15,25,0.92)" stroke={highlightColor} strokeWidth="1.2" />
        <text x="77" y="18" fill="#ffffff" fontSize="10.5" fontWeight="700" textAnchor="middle">
          {isHoldPhase ? 'SOLID STICK (60° STABLE)' : `STICK: ${kneeAngle}°`}
        </text>
      </g>
    </g>
  );
}

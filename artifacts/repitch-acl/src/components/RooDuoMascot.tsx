import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Flame, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Volume2, 
  VolumeX, 
  ArrowRight,
  Zap,
  Award
} from 'lucide-react';
import type { Exercise } from '../data/defaultPatients';

export type MascotAction = 'idle' | 'clapping' | 'jumping' | 'party' | 'peeking' | 'streak';

export interface RooDuoMascotProps {
  action?: MascotAction;
  speech?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSparkles?: boolean;
  showFire?: boolean;
  showConfetti?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  size: number;
  rot: number;
}

// Consistent canonical Mascot Figure — always uses the single consistent /roo-transparent.png
export function RooDuoMascot({
  action = 'idle',
  speech,
  size = 'md',
  showSparkles = false,
  showFire = false,
  showConfetti = false,
  interactive = false,
  onClick,
  className = ''
}: RooDuoMascotProps) {
  // Confetti particles for celebrations
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (showConfetti || action === 'party' || action === 'jumping') {
      const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
      const newParticles: ConfettiParticle[] = Array.from({ length: 16 }).map((_, i) => ({
        id: i,
        x: 50 + (Math.random() * 20 - 10),
        y: 40 + (Math.random() * 20 - 10),
        tx: (Math.random() - 0.5) * 160,
        ty: -30 - Math.random() * 90,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 5,
        rot: Math.random() * 360,
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [action, showConfetti]);

  return (
    <div 
      className={`roo-mascot-wrapper size-${size} anim-${action} ${className}`}
      onClick={onClick}
      style={{ cursor: interactive || onClick ? 'pointer' : 'default', position: 'relative' }}
      title={interactive || onClick ? "Click Roo for motivation!" : undefined}
    >
      {/* Speech Bubble */}
      {speech && (
        <div className="roo-speech-bubble" role="status" style={{ zIndex: 10 }}>
          <span>{speech}</span>
          <div className="speech-tail" />
        </div>
      )}

      {/* Mascot Main Figure Container */}
      <div className="roo-mascot-figure" style={{ position: 'relative' }}>
        {/* Fire Streak Aura */}
        {(showFire || action === 'streak') && (
          <div 
            className="roo-fire-aura" 
            style={{ 
              position: 'absolute', 
              inset: '-10px', 
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, rgba(239, 68, 68, 0.2) 50%, transparent 75%)',
              filter: 'blur(8px)',
              pointerEvents: 'none',
              animation: 'firePulse 1.2s ease-in-out infinite'
            }}
          >
            <div style={{ position: 'absolute', top: -14, left: '46%', fontSize: 22, animation: 'flameFlicker 0.6s infinite alternate' }}>
              🔥
            </div>
          </div>
        )}

        {/* Confetti Explosion Particles */}
        {particles.length > 0 && (
          <div className="roo-confetti-container" aria-hidden="true">
            {particles.map((p) => (
              <span
                key={p.id}
                className="confetti-piece"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  backgroundColor: p.color,
                  width: `${p.size}px`,
                  height: `${p.size * 0.7}px`,
                  transform: `rotate(${p.rot}deg)`,
                  // @ts-expect-error CSS variable
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Clapping Hand Effect Rings */}
        {action === 'clapping' && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '40%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              pointerEvents: 'none',
              display: 'flex',
              gap: 12
            }}
          >
            <span style={{ fontSize: 20, animation: 'duoClapPaws 0.4s infinite alternate' }}>👏</span>
          </div>
        )}

        {/* Sparkling Stars */}
        {(showSparkles || action === 'jumping' || action === 'party') && (
          <div className="roo-sparkles" aria-hidden="true">
            <span className="sparkle s1">✨</span>
            <span className="sparkle s2">⭐</span>
            <span className="sparkle s3">🌟</span>
          </div>
        )}

        {/* Strictly consistent single canonical mascot image */}
        <img
          src="/roo-transparent.png"
          alt="Roo the cheerful recovery mascot"
          className="roo-mascot-img"
          draggable={false}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/roo.png';
          }}
        />
      </div>
    </div>
  );
}

// Motivational energetic punchy quotes ("come on do it etc")
export const MOTIVATIONAL_ROO_QUOTES = {
  betweenExercises: [
    "Come on, do it! You've got this!",
    "Come on, push through! Keep that knee strong and steady!",
    "Boom! That was great! Come on, let's crush the next exercise!",
    "Don't stop now! Your quadriceps are getting stronger every rep!",
    "Come on, let's do it! Full terminal extension, no hesitation!",
    "One more set crushed! Come on, keep this momentum rolling! 🔥"
  ],
  halfway: [
    "Halfway there! Come on, hold it steady!",
    "Come on, don't drop! Feel that quad engagement!",
    "Hold it right there! You're doing amazing, come on!"
  ],
  completion: [
    "Boom! Set complete! You crushed it! 🏆",
    "Yes! That was textbook form! Fantastic effort! ⭐",
    "Sensational work! Ready for the next one? Come on, let's do it!"
  ]
};

// Duolingo Pop-up Between Exercises: Motivates patient to keep going with the next exercise
export function RooBetweenExercisePopup({
  open,
  onClose,
  completedExercise,
  nextExercise,
  onStartNext,
  onRepeatCurrent,
  soundEnabled = true,
  onSoundTrigger
}: {
  open: boolean;
  onClose: () => void;
  completedExercise?: Exercise | null;
  nextExercise?: Exercise | null;
  onStartNext: (exercise: Exercise) => void;
  onRepeatCurrent?: (exercise: Exercise) => void;
  soundEnabled?: boolean;
  onSoundTrigger?: (action: MascotAction, quote: string) => void;
}) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (open) {
      const idx = Math.floor(Math.random() * MOTIVATIONAL_ROO_QUOTES.betweenExercises.length);
      setQuoteIndex(idx);
      const q = MOTIVATIONAL_ROO_QUOTES.betweenExercises[idx];
      if (onSoundTrigger) {
        onSoundTrigger('jumping', q);
      }
    }
  }, [open]);

  if (!open) return null;

  const quote = MOTIVATIONAL_ROO_QUOTES.betweenExercises[quoteIndex];

  return (
    <div 
      className="roo-set-celebration-backdrop" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 1200 }}
    >
      <div 
        className="roo-set-celebration-card" 
        style={{ 
          maxWidth: 440, 
          padding: '28px 24px 22px', 
          border: '2px solid var(--accent-emerald)',
          borderRadius: 22
        }}
      >
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <span className="tag tag-emerald" style={{ fontSize: 11.5, padding: '3px 10px', fontWeight: 700 }}>
            <Award size={13} style={{ marginRight: 4 }}/> SET CRUSHED!
          </span>
          <span className="tag tag-amber" style={{ fontSize: 11.5, padding: '3px 10px', fontWeight: 700 }}>
            <Zap size={13} style={{ marginRight: 4 }}/> +15 RECOVERY XP
          </span>
        </div>

        <h2 style={{ fontSize: 22, margin: '2px 0 6px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {completedExercise ? `${completedExercise.name} Done!` : 'Set Completed!'}
        </h2>

        {/* Animated Canonical Roo Mascot */}
        <div style={{ width: 140, height: 140, margin: '10px auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RooDuoMascot
            action="jumping"
            size="lg"
            showSparkles
            showConfetti
            speech={quote}
          />
        </div>

        <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
          {nextExercise ? (
            <>
              Next up is <strong style={{ color: 'var(--text-primary)' }}>{nextExercise.name}</strong>. Come on, don't break the streak!
            </>
          ) : (
            <>
              You've crushed your sets for today! Keep that knee strong and rested.
            </>
          )}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {nextExercise && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onStartNext(nextExercise);
              }}
              style={{ 
                width: '100%', 
                padding: '13px', 
                fontSize: 15, 
                fontWeight: 800, 
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'var(--accent-emerald)',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)'
              }}
            >
              <span>COME ON, DO IT: {nextExercise.name}</span>
              <ArrowRight size={17} />
            </button>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {completedExercise && onRepeatCurrent && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  onClose();
                  onRepeatCurrent(completedExercise);
                }}
                style={{ flex: 1, fontSize: 12.5, padding: '9px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <RotateCcw size={13}/> Repeat Set
              </button>
            )}
            <button
              type="button"
              className="btn btn-quiet"
              onClick={onClose}
              style={{ flex: 1, fontSize: 12.5, padding: '9px 12px' }}
            >
              Back to Routine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// On-Screen Exercise Coach: Pops up directly ON SCREEN while patient does the exercise
export function RooOnScreenExerciseCoach({
  action = 'clapping',
  speech,
  soundEnabled = true,
  onToggleSound,
  size = 'md',
  position = 'bottom-right'
}: {
  action?: MascotAction;
  speech: string;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  size?: 'sm' | 'md' | 'lg';
  position?: 'bottom-right' | 'center-bottom';
}) {
  return (
    <div 
      className="roo-onscreen-coach"
      style={{
        position: 'absolute',
        bottom: 16,
        ...(position === 'center-bottom' ? {
          left: '50%',
          transform: 'translateX(-50%)'
        } : {
          right: 18
        }),
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.5))',
        animation: 'slideUpOnScreen 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Dynamic Pop-up Speech Bubble */}
      {speech && (
        <div 
          className="speech-bubble"
          style={{
            background: 'rgba(8, 14, 26, 0.94)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            border: '2px solid var(--accent-emerald, #10b981)',
            borderRadius: 16,
            padding: '8px 14px',
            fontWeight: 800,
            fontSize: 13,
            maxWidth: 270,
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 16px rgba(16, 185, 129, 0.35)',
            marginBottom: 8,
            position: 'relative',
            pointerEvents: 'auto'
          }}
        >
          <span>{speech}</span>
          <div 
            style={{
              position: 'absolute',
              bottom: -7,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid var(--accent-emerald, #10b981)'
            }}
          />
        </div>
      )}

      {/* Mascot Animated Figure */}
      <div 
        style={{ 
          width: size === 'sm' ? 80 : size === 'lg' ? 140 : 110,
          height: size === 'sm' ? 80 : size === 'lg' ? 140 : 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto'
        }}
      >
        <RooDuoMascot
          action={action}
          size={size}
          showSparkles={action === 'jumping' || action === 'party'}
        />
      </div>
    </div>
  );
}

// Floating Discreet Corner Mascot Companion for quick encouragement
export function RooFloatingCompanion({
  onSoundTrigger,
  soundEnabled = true,
}: {
  onSoundTrigger?: (action: MascotAction, quote: string) => void;
  soundEnabled?: boolean;
}) {
  const [action, setAction] = useState<MascotAction>('idle');
  const [speech, setSpeech] = useState<string>("Come on, do it! 🦘");
  const [showBubble, setShowBubble] = useState(false);

  const triggerMotivation = () => {
    const quotes = MOTIVATIONAL_ROO_QUOTES.betweenExercises;
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    const act = Math.random() > 0.5 ? 'jumping' : 'clapping';
    setAction(act);
    setSpeech(q);
    setShowBubble(true);

    if (onSoundTrigger) {
      onSoundTrigger(act, q);
    }

    setTimeout(() => {
      setAction('idle');
      setTimeout(() => setShowBubble(false), 2500);
    }, 3800);
  };

  return (
    <div className="roo-corner-widget" aria-label="Roo Recovery Motivator">
      {/* Speech Bubble */}
      {showBubble && (
        <div className="roo-corner-bubble">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
            <span>{speech}</span>
            <button
              type="button"
              onClick={() => setShowBubble(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={12} />
            </button>
          </div>
          <div className="roo-corner-bubble-tail" />
        </div>
      )}

      {/* Floating Mascot Button */}
      <div 
        onClick={triggerMotivation}
        style={{ 
          cursor: 'pointer',
          background: 'var(--bg-card)', 
          border: '2px solid var(--accent-emerald)', 
          borderRadius: 24, 
          padding: '8px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 16px rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        title="Click Roo for motivation!"
      >
        <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RooDuoMascot
            action={action}
            size="sm"
          />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase' }}>
            Roo Coach
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            Come on, do it! 💪
          </div>
        </div>
      </div>
    </div>
  );
}

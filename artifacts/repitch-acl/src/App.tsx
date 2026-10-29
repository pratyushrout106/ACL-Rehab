import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { 
  Activity, 
  ArrowRight, 
  Award, 
  Calendar,
  Camera, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  CircleHelp, 
  Clock3, 
  Download, 
  Dumbbell, 
  Edit3,
  ExternalLink,
  FileText, 
  Flame, 
  HeartPulse, 
  Laptop,
  LockKeyhole, 
  Moon, 
  Play, 
  Plus,
  RotateCcw,
  Search,
  ShieldAlert, 
  Sparkles, 
  Stethoscope, 
  Sun,
  Trash2,
  Trophy,
  User,
  Users,
  Video, 
  Volume2,
  VolumeX,
  X,
  Zap
} from 'lucide-react';
import { useTheme } from './lib/theme';
import { ExerciseCharacterDemo } from './components/ExerciseCharacterDemo';
import { VideoPlaylistExplorer, type VideoClipEntry, type TelemetryPoint } from './components/VideoPlaylistExplorer';
import { 
  RooDuoMascot, 
  RooBetweenExercisePopup, 
  MOTIVATIONAL_ROO_QUOTES,
  type MascotAction 
} from './components/RooDuoMascot';
import { PhysioClinicalReport } from './components/PhysioClinicalReport';
import { ConfettiCanvas } from './components/ConfettiCanvas';
import { RECOVERY_MASTERPLAN, type PhasePlan } from './data/recoveryMasterplan';
import { INITIAL_PATIENTS, type Patient, type Exercise, type Swelling, type Entry, type Session } from './data/defaultPatients';

type Role = 'patient' | 'clinician';
type VideoMeta = { at: string; exercise: string; duration: number; telemetry?: TelemetryPoint[] };

const STORAGE = { 
  patients: 'repitch.patients.v2', 
  selectedPatientId: 'repitch.selectedPatientId.v2',
  role: 'repitch.role.v2'
};

const readJson = <T,>(key: string, fallback: T): T => { 
  try { 
    const value = localStorage.getItem(key); 
    return value ? JSON.parse(value) as T : fallback; 
  } catch { 
    return fallback; 
  } 
};

const loadInitialPatients = (): Patient[] => {
  const stored = readJson<Patient[]>(STORAGE.patients, []);
  if (!stored || stored.length === 0) return INITIAL_PATIENTS;
  const storedIds = new Set(stored.map((p) => p.id));
  const missing = INITIAL_PATIENTS.filter((p) => !storedIds.has(p.id));
  const base = missing.length > 0 ? [...stored, ...missing] : stored;

  // Ensure default Phase 1 patients have the mini squats exercise
  return base.map((p) => {
    if (p.currentPhase === 1) {
      const hasMiniSquat = p.prescribedExercises.some((e) => e.id.includes('mini') || e.name.toLowerCase().includes('mini squat'));
      if (!hasMiniSquat) {
        const defaultMini = INITIAL_PATIENTS[0].prescribedExercises.find((e) => e.id.includes('mini'));
        if (defaultMini) {
          return {
            ...p,
            prescribedExercises: [...p.prescribedExercises, defaultMini]
          };
        }
      }
    }
    return p;
  });
};

const dayStamp = () => new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const dateTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const angleAt = (a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark) => {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!denominator) return null;
  return Math.round(Math.acos(Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / denominator))) * (180 / Math.PI));
};

export const getExerciseTargetAngle = (exercise: Exercise): number => {
  const exKey = `${exercise.id} ${exercise.name}`.toLowerCase();
  if (exKey.includes('quad')) return 180;
  if (exKey.includes('raise')) return 135;
  if (exKey.includes('heel')) return 110;
  if (exKey.includes('patell')) return 180;
  // Mini Squats: Target angle 145° (±5° acceptable range: 140° to 150°)
  if (exKey.includes('mini') || (exKey.includes('squat') && !exKey.includes('split') && !exKey.includes('bulgarian'))) return 145;
  if (exKey.includes('wall')) return 60;
  if (exKey.includes('step')) return 180;
  if (exKey.includes('bike')) return 110;
  if (exKey.includes('bulgarian')) return 90;
  if (exKey.includes('box')) return 90;
  if (exKey.includes('jog')) return 90;
  if (exKey.includes('cut')) return 50;
  if (exKey.includes('skater')) return 60;
  return 180;
};

// Roo Companion Lines: Energetic Duolingo-style recovery motivation ("come on do it etc")
const ROO_LINES = {
  greetings: [
    "Come on, do it! Let's get that knee strong and steady today!",
    "You can do this! I'm right here cheering you on every step of the way!",
    "Come on! Every single repetition counts, let's crush today's routine!"
  ],
  start: "Come on, do it! Lock that knee straight and push through!",
  halfway: "Halfway through! Come on, don't drop, hold that form steady!",
  nearEnd: "Almost there! Three, two, one... hold it right there! Awesome job!",
  completed: "Boom! Set complete! You crushed it! Ready for the next one? Come on, let's do it! ⭐",
  retry: "Would you like to try that set again? Come on, we can do it together! 💚",
  retryConfirm: "Wonderful! Let's give it another shot! Come on, do it!"
};

// Roo Sound & Voice Engine
class RooSoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  // Soft subtle warm acoustic cue (D5, A5)
  playWarmCue() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [587.33, 880.0];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.08;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  // Joyful celebratory victory fanfare on set completion
  playVictoryFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.09;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.20, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  // Duolingo-style crisp rhythmic hand clapping
  playClapSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.12, 0.24].forEach((offset) => {
      const t = now + offset;
      const bufferSize = Math.floor(ctx.sampleRate * 0.04);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(2.5, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(t);
    });
  }

  // Duolingo-style bouncy jumping boing
  playJumpBoing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.26);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Celebratory cheering fanfare + rhythmic applause clapping on 5-second target hold completion
  playTargetHoldCheer() {
    this.playVictoryFanfare();
    setTimeout(() => this.playClapSound(), 180);
    setTimeout(() => this.playClapSound(), 360);
    setTimeout(() => this.playClapSound(), 540);
  }
}

const rooAudio = new RooSoundEngine();

// Cache voices asynchronously so speech synthesis is reliable across browsers
let cachedVoices: SpeechSynthesisVoice[] = [];
function updateVoicesCache() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateVoicesCache();
  window.speechSynthesis.onvoiceschanged = updateVoicesCache;
}

// Selects a natural human female voice, explicitly rejecting novelty/cartoon/chipmunk voices
function findFemaleHumanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Novelty, cartoon, chipmunk, animal, sound effects, or male voice names to strictly exclude
  const excludedPattern = /sandy|flo|shelley|eddy|reed|rocko|grandma|grandpa|junior|jester|bad news|bahh|bells|boing|bubbles|cellos|wobble|organ|superstar|ralph|trinoids|whisper|zarvox|albert|fred|daniel|alex|david|bruce|tom|george|male/i;

  const validVoices = voices.filter(v => v.lang.startsWith('en') && !excludedPattern.test(v.name));

  // 1. Premier natural human female voices (Samantha is macOS gold standard, Google US English in Chrome, Microsoft Aria/Jenny/Zira on Windows)
  const topTier = validVoices.find(v =>
    /^(samantha|victoria|karen|moira|tessa|tara|kathy|fiona)$/i.test(v.name.trim()) ||
    /^(samantha|victoria)\s/i.test(v.name.trim()) ||
    /aria|jenny|zira/i.test(v.name) ||
    /google.*female|google us english/i.test(v.name)
  );
  if (topTier) return topTier;

  // 2. Any voice explicitly containing female or woman
  const taggedFemale = validVoices.find(v => /female|woman/i.test(v.name));
  if (taggedFemale) return taggedFemale;

  // 3. Fallback to any Samantha, Victoria or remaining valid natural voice
  const namedFallback = validVoices.find(v => /samantha|victoria|karen/i.test(v.name));
  if (namedFallback) return namedFallback;

  return validVoices[0] || voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
}

let activeUtteranceRef: SpeechSynthesisUtterance | null = null;

// Roo Voice Synthesizer: Natural Human Female Voice
function speakRoo(text: string, enabled: boolean = true, isVictory: boolean = false) {
  if (!enabled || typeof window === 'undefined') return;

  try {
    if (isVictory) {
      rooAudio.playVictoryFanfare();
    } else {
      rooAudio.playWarmCue();
    }
  } catch (e) {
    console.warn('Audio cue error:', e);
  }

  if (!('speechSynthesis' in window)) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*_#~`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtteranceRef = utterance;

    utterance.pitch = 1.0;
    utterance.rate = 1.02;
    utterance.volume = 1.0;

    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    const femaleVoice = findFemaleHumanVoice(voices);
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onend = () => {
      activeUtteranceRef = null;
    };
    utterance.onerror = () => {
      activeUtteranceRef = null;
    };

    const delay = isVictory ? 320 : 50;
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech error:', e);
      }
    }, delay);
  } catch (err) {
    console.warn('Speech synthesis unavailable:', err);
  }
}

// Duolingo Mascot Multi-Sensory Audio & Voice Trigger
function triggerMascotReaction(action: MascotAction, quote: string, enabled: boolean = true) {
  if (!enabled) return;
  try {
    if (action === 'clapping') {
      rooAudio.playClapSound();
    } else if (action === 'jumping') {
      rooAudio.playJumpBoing();
    } else if (action === 'party') {
      rooAudio.playVictoryFanfare();
    } else {
      rooAudio.playWarmCue();
    }
  } catch (e) {
    console.warn('Audio cue error:', e);
  }
  speakRoo(quote, enabled, action === 'party');
}

interface RooMascotProps {
  mood?: 'idle' | 'cheering' | 'wondering';
  action?: MascotAction;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  speech?: string;
  showSparkles?: boolean;
  onClick?: () => void;
  className?: string;
}

function RooMascot({
  mood = 'idle',
  action,
  size = 'md',
  speech,
  showSparkles = false,
  onClick,
  className = ''
}: RooMascotProps) {
  // Translate legacy mood to modern Duolingo mascot action if action is not provided
  const resolvedAction: MascotAction = action || (mood === 'cheering' ? 'jumping' : mood === 'wondering' ? 'peeking' : 'idle');

  return (
    <RooDuoMascot
      action={resolvedAction}
      size={size}
      speech={speech}
      showSparkles={showSparkles || resolvedAction === 'jumping' || resolvedAction === 'party'}
      showConfetti={resolvedAction === 'party'}
      showFire={resolvedAction === 'streak'}
      onClick={onClick}
      className={className}
      interactive={!!onClick}
    />
  );
}

function Roo() {
  return <RooMascot size="md" mood="idle" />;
}

function Art({ kind }: { kind?: Exercise['icon'] }) {
  if (kind === 'hand') return <Activity size={28} strokeWidth={1.8}/>;
  if (kind === 'bend') return (
    <svg width="44" height="38" viewBox="0 0 50 43" fill="none">
      <path d="M7 32h16l8-13 13-8M23 32l8-8 11 3" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="31" cy="19" r="3.2" fill="currentColor"/>
    </svg>
  );
  if (kind === 'leg') return (
    <svg width="44" height="38" viewBox="0 0 50 43" fill="none">
      <path d="M19 5v18l19 10M19 22l-9 12m9-12 10 4" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="19" cy="22" r="3.2" fill="currentColor"/>
    </svg>
  );
  return <Dumbbell size={28} strokeWidth={1.8}/>;
}

function App() {
  const { theme, setTheme } = useTheme();
  const [role, setRole] = useState<Role>(() => readJson(STORAGE.role, 'patient' as Role));
  const [patients, setPatients] = useState<Patient[]>(() => loadInitialPatients());
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    const list = loadInitialPatients();
    const stored = readJson<string>(STORAGE.selectedPatientId, list[0].id);
    return list.some((p) => p.id === stored) ? stored : list[0].id;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.patients, JSON.stringify(patients));
    } catch {}
  }, [patients]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.selectedPatientId, JSON.stringify(selectedPatientId));
    } catch {}
  }, [selectedPatientId]);
  
  // Patient tab switcher: 'routine' vs 'masterplan'
  const [patientTab, setPatientTab] = useState<'routine' | 'masterplan'>('routine');

  // Currently selected patient
  const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const [pain, setPain] = useState(2);
  const [swelling, setSwelling] = useState<Swelling>('None');
  const [sleep, setSleep] = useState('Good');
  const [saved, setSaved] = useState(false);

  // Guided / Camera modal
  const [modal, setModal] = useState<'guided' | 'camera' | null>(null);
  const [exercise, setExercise] = useState<Exercise>(patient.prescribedExercises[0]);
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [poseState, setPoseState] = useState<{ status: 'loading' | 'searching' | 'tracking' | 'error'; angle: number | null; measure: string; message: string }>({ status: 'loading', angle: null, measure: 'joint angle', message: 'Waiting for camera.' });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [toast, setToast] = useState('');
  const [clips, setClips] = useState<VideoClipEntry[]>([]);
  const clipsRef = useRef<VideoClipEntry[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [videoPlaybackTime, setVideoPlaybackTime] = useState(0);

  // 5-second target hold timer & celebration states (with ±5° accuracy tolerance)
  const [holdProgress, setHoldProgress] = useState<{ seconds: number; isHolding: boolean; completed: boolean }>({ seconds: 0, isHolding: false, completed: false });
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [celebrationBanner, setCelebrationBanner] = useState<string>('');
  const holdStartRef = useRef<number | null>(null);
  const holdCompletedRef = useRef<boolean>(false);

  // Selected Leg & Knee Highlight Color for ACL telemetry
  const [selectedLeg, setSelectedLeg] = useState<'left' | 'right'>(patient.affectedLeg || 'left');
  const [legColor, setLegColor] = useState<string>(patient.legHighlightColor || '#10b981');
  const selectedLegRef = useRef<'left' | 'right'>(selectedLeg);
  selectedLegRef.current = selectedLeg;
  const legColorRef = useRef<string>(legColor);
  legColorRef.current = legColor;

  // Exercise Demo Character states
  const [showDemoInCamera, setShowDemoInCamera] = useState(true);
  const [demoModal, setDemoModal] = useState<{ open: boolean; ex: Exercise | null }>({ open: false, ex: null });
  const smoothedLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const currentAngleRef = useRef<number | null>(null);

  // Mascot Roo coaching state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [guidedSpeech, setGuidedSpeech] = useState<string>(ROO_LINES.greetings[0]);
  const [guidedMood, setGuidedMood] = useState<'idle' | 'cheering' | 'wondering'>('idle');
  const lastCheerSecRef = useRef<number>(-1);

  // Duolingo Roo between-exercise motivation popup ("come on do it etc")
  const [betweenExerciseModal, setBetweenExerciseModal] = useState<{
    open: boolean;
    completedEx: Exercise | null;
    nextEx: Exercise | null;
  }>({ open: false, completedEx: null, nextEx: null });

  // Physio modal to edit/create exercise
  const [exerciseModal, setExerciseModal] = useState<{ open: boolean; mode: 'add' | 'edit'; targetEx: Exercise | null }>({ open: false, mode: 'add', targetEx: null });
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formWarning, setFormWarning] = useState('');
  const [formSeconds, setFormSeconds] = useState(5);
  const [formCategory, setFormCategory] = useState('Activation');
  const [formCues, setFormCues] = useState('');

  // Patient Profile & Add Patient Modals
  const [profileModal, setProfileModal] = useState<{ open: boolean; patient: Patient | null }>({ open: false, patient: null });
  const [addPatientModal, setAddPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientSport, setNewPatientSport] = useState('');
  const [newPatientAge, setNewPatientAge] = useState(22);
  const [newPatientGraft, setNewPatientGraft] = useState('Bone-Patellar Tendon-Bone (BPTB)');
  const [newPatientSurgeryDate, setNewPatientSurgeryDate] = useState(dayStamp());
  const [newPatientLeg, setNewPatientLeg] = useState<'left' | 'right'>('right');
  const [newPatientPhase, setNewPatientPhase] = useState<1 | 2 | 3 | 4>(1);
  const [newPatientNotes, setNewPatientNotes] = useState('Patient initiated on postoperative rehab protocol.');

  const videoRef = useRef<HTMLVideoElement>(null);
  const poseCanvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const cameraRequestRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const savedAt = useRef('');
  const recordingRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const telemetryRef = useRef<TelemetryPoint[]>([]);
  const lastTelemetryAtRef = useRef(0);

  // Save state to localStorage
  useEffect(() => { localStorage.setItem(STORAGE.patients, JSON.stringify(patients)); }, [patients]);
  useEffect(() => { localStorage.setItem(STORAGE.selectedPatientId, JSON.stringify(selectedPatientId)); }, [selectedPatientId]);
  useEffect(() => { localStorage.setItem(STORAGE.role, JSON.stringify(role)); }, [role]);

  // Keep active exercise, leg and color in sync when patient changes
  useEffect(() => {
    if (patient.prescribedExercises.length > 0 && !patient.prescribedExercises.some((e) => e.id === exercise.id)) {
      setExercise(patient.prescribedExercises[0]);
    }
    if (patient.affectedLeg) setSelectedLeg(patient.affectedLeg);
    if (patient.legHighlightColor) setLegColor(patient.legHighlightColor);
  }, [patient]);

  const updateCurrentPatient = (updater: (prev: Patient) => Patient) => {
    setPatients((prevList) => prevList.map((p) => p.id === patient.id ? updater(p) : p));
  };

  // Target Joint Angle & Accuracy (Mini Squats: 145° ±5° [140°–150°], Quad Sets: 180°, etc.)
  const targetAngle = getExerciseTargetAngle(exercise);

  // Manual Trigger for 5-Second Celebration (instant verification & clinician demo)
  const triggerTestHoldCelebration = () => {
    setHoldProgress({ seconds: 5, isHolding: true, completed: true });
    rooAudio.playTargetHoldCheer();
    speakRoo(`Awesome 5-second hold locked at ${targetAngle} degrees! Perfect knee control!`, soundEnabled, false);
    setShowConfetti(true);
    setCelebrationBanner(`🎉 5-SECOND TARGET LOCKED at ${targetAngle}° (±5° ACCURACY) 🎉`);
    updateCurrentPatient((p) => ({
      ...p,
      repitchPoints: p.repitchPoints + 15
    }));
    window.setTimeout(() => {
      setShowConfetti(false);
      setCelebrationBanner('');
    }, 4500);
  };

  // 5-Second Continuous Target Hold tracking effect with ±5° accuracy tolerance
  useEffect(() => {
    if (modal !== 'camera') {
      holdStartRef.current = null;
      holdCompletedRef.current = false;
      setHoldProgress({ seconds: 0, isHolding: false, completed: false });
      return;
    }

    const currentTarget = getExerciseTargetAngle(exercise);
    const liveAngle = poseState.angle;
    const isWithinTolerance = liveAngle !== null && Math.abs(liveAngle - currentTarget) <= 5;

    let intervalId: number | null = null;

    if (isWithinTolerance) {
      if (holdCompletedRef.current) {
        // Patient finished 5s hold and is still in zone
        return;
      }

      if (holdStartRef.current === null) {
        holdStartRef.current = Date.now();
      }

      intervalId = window.setInterval(() => {
        if (holdStartRef.current === null) return;
        const elapsed = (Date.now() - holdStartRef.current) / 1000;

        if (elapsed >= 5.0) {
          // Continuous 5 seconds completed!
          holdCompletedRef.current = true;
          holdStartRef.current = null;
          setHoldProgress({ seconds: 5, isHolding: true, completed: true });

          // 1. Celebratory audio cheer fanfare + clapping
          rooAudio.playTargetHoldCheer();

          // 2. Roo vocal encouragement
          speakRoo(
            `Awesome 5-second hold locked at ${liveAngle} degrees! Perfect knee control!`,
            soundEnabled,
            false
          );

          // 3. Trigger confetti pop-up & banner
          setShowConfetti(true);
          setCelebrationBanner(`🎉 5-SECOND TARGET LOCKED at ${liveAngle}° (±5° ACCURACY) 🎉`);

          // 4. Award bonus Repitch points
          updateCurrentPatient((p) => ({
            ...p,
            repitchPoints: p.repitchPoints + 15
          }));

          window.setTimeout(() => {
            setShowConfetti(false);
            setCelebrationBanner('');
          }, 4500);

          if (intervalId) clearInterval(intervalId);
        } else {
          setHoldProgress({
            seconds: Math.round(elapsed * 10) / 10,
            isHolding: true,
            completed: false
          });
        }
      }, 80);
    } else {
      // Patient moved outside the ±5° range
      if (holdCompletedRef.current) {
        // Reset completion status when relaxing out of position to allow the next repetition
        holdCompletedRef.current = false;
      }
      holdStartRef.current = null;
      setHoldProgress((prev) => (prev.seconds === 0 && !prev.isHolding ? prev : { seconds: 0, isHolding: false, completed: false }));
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [poseState.angle, modal, exercise, soundEnabled]);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((s) => running ? modal === 'guided' ? Math.min(s + 1, exercise.seconds) : s + 1 : s), 1000);
    return () => window.clearInterval(timer);
  }, [running, exercise.seconds, modal]);

  // Roo automatic speech and motivation coach lifecycle during active exercise (Guided & Camera)
  useEffect(() => {
    if (!modal) {
      lastCheerSecRef.current = -1;
      return;
    }

    // A. Guided Mode Coaching
    if (modal === 'guided') {
      if (step !== exercise.cues.length - 1) {
        lastCheerSecRef.current = -1;
        return;
      }

      // Condition 1: Set completed properly
      if (seconds >= exercise.seconds && exercise.seconds > 0) {
        if (lastCheerSecRef.current !== 9999) {
          lastCheerSecRef.current = 9999;
          setGuidedMood('cheering');
          const cheerText = ROO_LINES.completed;
          setGuidedSpeech(cheerText);
          speakRoo(cheerText, soundEnabled, true);
        }
        return;
      }

      // Condition 2: Ongoing set (running)
      if (running && seconds < exercise.seconds) {
        setGuidedMood('cheering');
        
        if (seconds === 1 && lastCheerSecRef.current !== 1) {
          lastCheerSecRef.current = 1;
          const msg = "Come on, do it! Lock that knee straight and push through!";
          setGuidedSpeech(msg);
          speakRoo(msg, soundEnabled);
        } else if (seconds === Math.floor(exercise.seconds / 2) && seconds > 1 && lastCheerSecRef.current !== seconds) {
          lastCheerSecRef.current = seconds;
          const msg = "Halfway there! Come on, don't drop, hold that quad steady!";
          setGuidedSpeech(msg);
          speakRoo(msg, soundEnabled);
        } else if (seconds === Math.max(2, exercise.seconds - 2) && exercise.seconds > 4 && lastCheerSecRef.current !== seconds) {
          lastCheerSecRef.current = seconds;
          const msg = "Almost there! 3, 2, 1... hold it right there, come on!";
          setGuidedSpeech(msg);
          speakRoo(msg, soundEnabled);
        }
        return;
      }

      // Condition 3: Else (stopped early / paused before reaching target seconds)
      if (!running && seconds > 0 && seconds < exercise.seconds) {
        if (lastCheerSecRef.current !== -888) {
          lastCheerSecRef.current = -888;
          setGuidedMood('wondering');
          const retryText = ROO_LINES.retry;
          setGuidedSpeech(retryText);
          speakRoo(retryText, soundEnabled);
        }
      }
      return;
    }
  }, [modal, step, running, seconds, exercise.seconds, exercise.cues.length, soundEnabled]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream, modal]);

  useEffect(() => {
    if (modal !== 'camera' || !stream) return;
    let stopped = false;
    let frame = 0;
    let lastInference = 0;
    let lastUiUpdate = 0;
    setPoseState({ status: 'loading', angle: null, measure: 'joint angle', message: 'Loading the on-device pose model…' });

    const runPoseTracking = async () => {
      try {
        const files = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm');
        const options = {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.3,
          minPosePresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        } as const;
        let landmarker: PoseLandmarker;
        try {
          landmarker = await PoseLandmarker.createFromOptions(files, { ...options, baseOptions: { ...options.baseOptions, delegate: 'GPU' } });
        } catch {
          landmarker = await PoseLandmarker.createFromOptions(files, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } });
        }
        if (stopped) {
          landmarker.close();
          return;
        }
        poseLandmarkerRef.current = landmarker;
        setPoseState({ status: 'searching', angle: null, measure: 'joint angle', message: 'Position your working leg in view.' });

        // Draw pose on canvas (runs at smooth 60 FPS)
        const drawPose = (landmarks: NormalizedLandmark[] | undefined, activeAngle: number | null, now: number) => {
          const canvas = poseCanvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video || !video.videoWidth || !video.videoHeight) return;
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // 1. Draw mirrored camera video frame
          ctx.save();
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, width, height);
          ctx.restore();

          const isLeft = selectedLegRef.current === 'left';
          const chosenColor = legColorRef.current;
          const otherColor = 'rgba(148, 163, 184, 0.45)';
          const upperBodyColor = 'rgba(56, 189, 248, 0.35)';

          // Map normalized landmark point to mirrored canvas pixels
          const toCanvas = (p?: NormalizedLandmark) => {
            if (!p) return null;
            return { x: (1 - p.x) * width, y: p.y * height, vis: p.visibility ?? 1 };
          };

          // 2. Broadcast Telemetry HUD Banner (Top Left)
          ctx.save();
          ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
          const bannerW = Math.min(380, width - 32);
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(16, 16, bannerW, 48, 10);
            ctx.fill();
            ctx.strokeStyle = chosenColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else {
            ctx.fillRect(16, 16, bannerW, 48);
            ctx.strokeStyle = chosenColor;
            ctx.strokeRect(16, 16, bannerW, 48);
          }

          ctx.fillStyle = '#ffffff';
          ctx.font = '700 12.5px Inter, system-ui, sans-serif';
          ctx.fillText(exercise.name.toUpperCase(), 28, 35);

          ctx.fillStyle = chosenColor;
          ctx.font = '600 11px Inter, monospace';
          const legTag = isLeft ? 'LEFT LEG (OPERATIVE)' : 'RIGHT LEG (OPERATIVE)';
          ctx.fillText(`TARGET: ${legTag}`, 28, 51);

          // Recording indicator in HUD
          if (recordingRef.current) {
            const rx = width - 95;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
            if (typeof ctx.roundRect === 'function') {
              ctx.beginPath();
              ctx.roundRect(rx, 16, 80, 36, 8);
              ctx.fill();
            } else {
              ctx.fillRect(rx, 16, 80, 36);
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.fillText('● REC', rx + 17, 39);
          }
          ctx.restore();

          if (!landmarks || landmarks.length < 33) return;

          // Helper to safely draw a connection line between two landmark indices
          const drawBone = (idx1: number, idx2: number, color: string, lineWidth: number, glow = false) => {
            const a = toCanvas(landmarks[idx1]);
            const b = toCanvas(landmarks[idx2]);
            if (!a || !b) return;
            // Draw if points exist within a reasonable bounding area
            if (a.x >= -40 && a.x <= width + 40 && b.x >= -40 && b.x <= width + 40) {
              ctx.save();
              const alpha = Math.max(0.4, Math.min(1, (a.vis + b.vis) / 2));
              ctx.globalAlpha = alpha;
              if (glow) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 12;
              }
              ctx.strokeStyle = color;
              ctx.lineWidth = lineWidth;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
              ctx.restore();
            }
          };

          // 3. Draw Upper Body Connections (Wireframe)
          const upperBones: [number, number][] = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
            [11, 23], [12, 24], [23, 24]
          ];
          for (const [from, to] of upperBones) {
            drawBone(from, to, upperBodyColor, Math.max(2, width / 240));
          }

          // 4. Non-chosen Leg (Healthy leg in subtle dimmed slate)
          const otherHip = isLeft ? 24 : 23;
          const otherKnee = isLeft ? 26 : 25;
          const otherAnkle = isLeft ? 28 : 27;
          const otherHeel = isLeft ? 30 : 29;
          const otherFoot = isLeft ? 32 : 31;

          drawBone(otherHip, otherKnee, otherColor, Math.max(2.5, width / 180));
          drawBone(otherKnee, otherAnkle, otherColor, Math.max(2.5, width / 180));
          drawBone(otherAnkle, otherHeel, otherColor, Math.max(2, width / 200));
          drawBone(otherHeel, otherFoot, otherColor, Math.max(2, width / 200));
          drawBone(otherAnkle, otherFoot, otherColor, Math.max(2, width / 200));

          const otherKneePt = toCanvas(landmarks[otherKnee]);
          if (otherKneePt) {
            ctx.fillStyle = otherColor;
            ctx.beginPath();
            ctx.arc(otherKneePt.x, otherKneePt.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          // 5. Chosen (Operative) Leg in Chosen Highlight Color!
          const chosenHip = isLeft ? 23 : 24;
          const chosenKnee = isLeft ? 25 : 26;
          const chosenAnkle = isLeft ? 27 : 28;
          const chosenHeel = isLeft ? 29 : 30;
          const chosenFoot = isLeft ? 31 : 32;

          const hipPt = toCanvas(landmarks[chosenHip]);
          const kneePt = toCanvas(landmarks[chosenKnee]);
          const anklePt = toCanvas(landmarks[chosenAnkle]);

          // Femur (Hip -> Knee) with neon glow
          drawBone(chosenHip, chosenKnee, chosenColor, Math.max(4.5, width / 110), true);
          // Tibia (Knee -> Ankle) with neon glow
          drawBone(chosenKnee, chosenAnkle, chosenColor, Math.max(4.5, width / 110), true);
          // Foot bones
          drawBone(chosenAnkle, chosenHeel, chosenColor, 3, false);
          drawBone(chosenHeel, chosenFoot, chosenColor, 3, false);
          drawBone(chosenAnkle, chosenFoot, chosenColor, 3, false);

          // 6. KNEE JOINT HIGHLIGHT TAILORED FOR ACL REHABILITATION
          if (kneePt) {
            const kx = kneePt.x;
            const ky = kneePt.y;
            const pulse = Math.sin(now / 150) * 4;

            ctx.save();
            ctx.shadowColor = chosenColor;
            ctx.shadowBlur = 18;

            // Outer Pulsing Target Ring
            ctx.strokeStyle = chosenColor;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(kx, ky, 22 + pulse, 0, Math.PI * 2);
            ctx.stroke();

            // Precision Crosshairs on Knee Joint
            const rTick = 22 + pulse;
            const tLen = 6;
            ctx.beginPath();
            ctx.moveTo(kx, ky - rTick - tLen); ctx.lineTo(kx, ky - rTick + 2);
            ctx.moveTo(kx, ky + rTick - 2); ctx.lineTo(kx, ky + rTick + tLen);
            ctx.moveTo(kx - rTick - tLen, ky); ctx.lineTo(kx - rTick + 2, ky);
            ctx.moveTo(kx + rTick - 2, ky); ctx.lineTo(kx + rTick + tLen, ky);
            ctx.stroke();

            // Core Knee Joint Center
            ctx.fillStyle = chosenColor;
            ctx.beginPath();
            ctx.arc(kx, ky, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(kx, ky, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Exercise-Specific ACL Clinical Status & Overlay
            let statusText = '';
            let statusColor = chosenColor;

            if (exercise.id.includes('quad')) {
              // Quad Sets: Terminal Extension Lock Focus (180°)
              if (activeAngle !== null) {
                if (activeAngle >= 172) {
                  statusText = 'LOCKED · 180° EXTENSION';
                  statusColor = '#10b981';
                } else {
                  statusText = `EXT DEFICIT: -${(180 - activeAngle).toFixed(0)}°`;
                  statusColor = '#f59e0b';
                }
              }
            } else if (exercise.id.includes('raise')) {
              // Straight Leg Raise: 0° Knee Lag Focus
              const kneeAng = landmarks[chosenHip] && landmarks[chosenKnee] && landmarks[chosenAnkle]
                ? angleAt(landmarks[chosenHip], landmarks[chosenKnee], landmarks[chosenAnkle])
                : null;
              if (kneeAng !== null && kneeAng < 168) {
                statusText = `⚠️ KNEE LAG: ${(180 - kneeAng).toFixed(0)}°`;
                statusColor = '#f43f5e';
              } else {
                statusText = '✓ LOCKED (0° LAG)';
                statusColor = '#10b981';
              }
            } else if (exercise.id.includes('heel')) {
              // Heel Slides: Flexion ROM Arc
              if (activeAngle !== null) {
                statusText = `FLEXION: ${activeAngle}° / 110°`;
                statusColor = activeAngle >= 100 ? '#10b981' : chosenColor;

                // Draw Flexion Arc around knee
                if (hipPt && anklePt) {
                  const a1 = Math.atan2(hipPt.y - ky, hipPt.x - kx);
                  const a2 = Math.atan2(anklePt.y - ky, anklePt.x - kx);
                  ctx.save();
                  ctx.strokeStyle = chosenColor;
                  ctx.lineWidth = 3;
                  ctx.beginPath();
                  ctx.arc(kx, ky, 34, a1, a2);
                  ctx.stroke();
                  ctx.restore();
                }
              }
            } else if (exercise.id.includes('patella')) {
              // Patellar Mobilizations: Glide Zone
              statusText = 'PATELLA GLIDE ZONE';
              statusColor = chosenColor;
            } else if (exercise.id.includes('mini') || (exercise.id.includes('squat') && !exercise.id.includes('split') && !exercise.id.includes('bulgarian'))) {
              // Mini Squats: Closed-Chain 0° to 45° Target (145° ±5°: acceptable 140° to 150°)
              if (activeAngle !== null) {
                if (Math.abs(activeAngle - 145) <= 5) {
                  statusText = '✓ 145° TARGET LOCK (±5°)';
                  statusColor = '#10b981';
                } else if (activeAngle < 140) {
                  statusText = `⚠️ TOO DEEP: ${activeAngle}° (<140°)`;
                  statusColor = '#f43f5e';
                } else {
                  statusText = `SQUAT: AIM 140°–150° (CUR: ${activeAngle}°)`;
                  statusColor = chosenColor;
                }
              }
            } else if (activeAngle !== null) {
              statusText = `KNEE ANGLE: ${activeAngle}°`;
            }

            // Floating Knee HUD Card (Enlarged for distance readability)
            ctx.save();
            const pillX = Math.min(kx + 28, width - 230);
            const pillY = Math.max(ky - 30, 80);
            const pillW = 210;
            const pillH = statusText ? 56 : 36;

            ctx.fillStyle = 'rgba(8, 12, 22, 0.94)';
            if (typeof ctx.roundRect === 'function') {
              ctx.beginPath();
              ctx.roundRect(pillX, pillY, pillW, pillH, 10);
              ctx.fill();
              ctx.strokeStyle = statusColor;
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.roundRect(pillX, pillY, pillW, pillH, 10);
              ctx.stroke();
            } else {
              ctx.fillRect(pillX, pillY, pillW, pillH);
              ctx.strokeStyle = statusColor;
              ctx.strokeRect(pillX, pillY, pillW, pillH);
            }

            ctx.fillStyle = '#ffffff';
            ctx.font = '800 13px Inter, sans-serif';
            ctx.fillText(`${isLeft ? 'L' : 'R'} KNEE JOINT`, pillX + 12, pillY + 20);

            if (activeAngle !== null) {
              ctx.fillStyle = statusColor;
              ctx.font = '900 18px monospace';
              ctx.fillText(`${activeAngle}°`, pillX + pillW - 48, pillY + 21);
            }

            if (statusText) {
              ctx.fillStyle = statusColor;
              ctx.font = '700 12px Inter, sans-serif';
              ctx.fillText(statusText, pillX + 12, pillY + 44);
            }
            ctx.restore();
          }
        };

        let isDetecting = false;

        // 60 FPS Render & Tracking loop
        const detectLoop = (now: number) => {
          if (stopped) return;
          const video = videoRef.current;
          if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            // Draw on canvas every frame (smooth 60 FPS)
            drawPose(smoothedLandmarksRef.current || undefined, currentAngleRef.current, now);

            // Run detection non-blocking
            if (!isDetecting && now - lastInference >= 65) {
              isDetecting = true;
              lastInference = now;
              try {
                const result = landmarker.detectForVideo(video, now);
                const rawLandmarks = result.landmarks[0];

                if (rawLandmarks && rawLandmarks.length >= 33) {
                  // Exponential Moving Average (EMA) smoothing to eliminate line jitter
                  if (!smoothedLandmarksRef.current || smoothedLandmarksRef.current.length !== rawLandmarks.length) {
                    smoothedLandmarksRef.current = rawLandmarks.map((p) => ({ ...p }));
                  } else {
                    for (let i = 0; i < rawLandmarks.length; i++) {
                      const cur = rawLandmarks[i];
                      const prev = smoothedLandmarksRef.current[i];
                      prev.x = prev.x * 0.25 + cur.x * 0.75;
                      prev.y = prev.y * 0.25 + cur.y * 0.75;
                      prev.z = (prev.z ?? 0) * 0.25 + (cur.z ?? 0) * 0.75;
                      prev.visibility = cur.visibility ?? 1;
                    }
                  }

                  // Compute joint angle for selected operative leg
                  const isLeft = selectedLegRef.current === 'left';
                  let angle: number | null = null;
                  let measure = exercise.id.includes('raise') ? 'estimated hip angle' :
                    (exercise.id.includes('mini') || exercise.name.toLowerCase().includes('mini squat')) ? 'squat knee depth' : 'estimated knee angle';

                  if (exercise.id.includes('raise')) {
                    const hipCandidates = isLeft ? [11, 23, 25] : [12, 24, 26];
                    const p1 = smoothedLandmarksRef.current[hipCandidates[0]];
                    const p2 = smoothedLandmarksRef.current[hipCandidates[1]];
                    const p3 = smoothedLandmarksRef.current[hipCandidates[2]];
                    if (p1 && p2 && p3) {
                      angle = angleAt(p1, p2, p3);
                    }
                  } else if (!exercise.id.includes('patella')) {
                    const kneeCandidates = isLeft ? [23, 25, 27] : [24, 26, 28];
                    const p1 = smoothedLandmarksRef.current[kneeCandidates[0]];
                    const p2 = smoothedLandmarksRef.current[kneeCandidates[1]];
                    const p3 = smoothedLandmarksRef.current[kneeCandidates[2]];
                    if (p1 && p2 && p3) {
                      angle = angleAt(p1, p2, p3);
                    }
                  }

                  currentAngleRef.current = angle;

                  if (recordingRef.current && now - lastTelemetryAtRef.current >= 500) {
                    lastTelemetryAtRef.current = now;
                    telemetryRef.current.push({ t: Math.round((now - recordingStartedAtRef.current) / 100) / 10, angle, measure });
                  }

                  if (now - lastUiUpdate >= 250) {
                    lastUiUpdate = now;
                    setPoseState({
                      status: 'tracking',
                      angle: exercise.id.includes('patella') ? null : angle,
                      measure,
                      message: 'Live on-device 2D kinematic tracking.'
                    });
                  }
                } else {
                  if (now - lastUiUpdate >= 500) {
                    lastUiUpdate = now;
                    setPoseState({
                      status: 'searching',
                      angle: null,
                      measure: 'joint angle',
                      message: 'Looking for full body pose in view.'
                    });
                  }
                }
              } catch (err) {
                console.warn('Inference error:', err);
              } finally {
                isDetecting = false;
              }
            }
          }
          frame = window.requestAnimationFrame(detectLoop);
        };
        frame = window.requestAnimationFrame(detectLoop);
      } catch (error) {
        if (!stopped) {
          setPoseState({
            status: 'error',
            angle: null,
            measure: 'joint angle',
            message: error instanceof Error ? `Pose model unavailable: ${error.message}` : 'Pose model unavailable. Use alignment checklist.',
          });
        }
      }
    };
    void runPoseTracking();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      poseLandmarkerRef.current?.close();
      poseLandmarkerRef.current = null;
      const canvas = poseCanvasRef.current;
      const context = canvas?.getContext('2d');
      if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [exercise, modal, stream]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rawClips = await loadAllVideoClips();
        if (!active) return;
        const mapped: VideoClipEntry[] = rawClips.map((c) => ({
          ...c,
          url: URL.createObjectURL(c.blob),
        }));
        setClips(mapped);
        if (mapped.length > 0) {
          setSelectedClipId(mapped[0].id);
        }
      } catch { /* IndexedDB local video playback fallback */ }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => { stream?.getTracks().forEach((track) => track.stop()); }, [stream]);
  useEffect(() => { clipsRef.current = clips; }, [clips]);
  useEffect(() => () => { clipsRef.current.forEach((clip) => URL.revokeObjectURL(clip.url)); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2800); return () => window.clearTimeout(timer); }, [toast]);

  const saveCheckin = () => {
    const newEntry: Entry = { pain, swelling, sleep, date: `${dayStamp()} · saved just now` };
    updateCurrentPatient((p) => ({
      ...p,
      checkins: [newEntry, ...p.checkins]
    }));
    setSaved(true);
    setToast(pain >= 5 || swelling === 'Moderate' || swelling === 'Severe'
      ? 'Check-in saved. Your physiotherapist can review these symptoms.'
      : 'Check-in saved. Your physiotherapist can see the update.');
    window.setTimeout(() => setSaved(false), 2500);
  };

  const launchGuided = (item: Exercise) => { 
    setExercise(item); 
    setStep(item.cues.length - 1); 
    setSeconds(0); 
    setRunning(false); 
    setModal('guided'); 
    lastCheerSecRef.current = -1;
    setGuidedMood('idle');
    const msg = `Come on, do it! Let's start ${item.name}!`;
    setGuidedSpeech(msg);
    speakRoo(msg, soundEnabled);
  };
  
  const completeSession = () => {
    const newSession: Session = { 
      id: `${Date.now()}`, 
      exercise: exercise.name, 
      date: new Date().toISOString(), 
      time: `${exercise.seconds}s`, 
      completed: true 
    };
    updateCurrentPatient((p) => ({
      ...p,
      sessions: [newSession, ...p.sessions],
      repitchPoints: p.repitchPoints + 15
    }));
    closeModal();
    setToast('Session saved successfully.');

  };

  const startCamera = async (item: Exercise) => {
    const requestId = ++cameraRequestRef.current;
    setExercise(item); setCameraError(''); setModal('camera'); setRecording(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported in this browser.');
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (requestId !== cameraRequestRef.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      setStream(nextStream);
    } catch (error) {
      if (requestId === cameraRequestRef.current) setCameraError(error instanceof Error ? error.message : 'Camera permission was unavailable.');
    }
  };

  const closeModal = () => {
    cameraRequestRef.current += 1;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recordingRef.current = false;
    stream?.getTracks().forEach((track) => track.stop()); 
    setStream(null); 
    setRunning(false); 
    setRecording(false); 
    setModal(null); 
    setCameraError('');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const recordVideo = () => {
    if (!stream || !window.MediaRecorder) { setCameraError('Local video recording is unavailable in this browser.'); return; }
    try {
      let recordingStream: MediaStream = stream;
      const canvas = poseCanvasRef.current;
      if (canvas && typeof (canvas as unknown as { captureStream?: (fps?: number) => MediaStream }).captureStream === 'function') {
        try {
          const canvasStream = (canvas as unknown as { captureStream: (fps?: number) => MediaStream }).captureStream(30);
          if (stream.getAudioTracks().length > 0) {
            canvasStream.addTrack(stream.getAudioTracks()[0]);
          }
          recordingStream = canvasStream;
        } catch (err) {
          console.warn('Canvas captureStream fallback to raw stream:', err);
          recordingStream = stream;
        }
      }

      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      const supportedType = mimeTypes.find((t) => window.MediaRecorder.isTypeSupported(t)) || '';
      const recorder = supportedType
        ? new MediaRecorder(recordingStream, { mimeType: supportedType })
        : new MediaRecorder(recordingStream);

      recorderRef.current = recorder;
      chunksRef.current = [];
      savedAt.current = new Date().toISOString();
      recordingStartedAtRef.current = performance.now();
      lastTelemetryAtRef.current = 0;
      telemetryRef.current = [];
      recordingRef.current = true;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        recordingRef.current = false;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const clipId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const at = savedAt.current;
        const exerciseName = `${exercise.name} (${selectedLegRef.current.toUpperCase()} Leg)`;
        const duration = Math.max(1, Math.round((performance.now() - recordingStartedAtRef.current) / 1000));
        const telemetry = [...telemetryRef.current];

        const newEntry: VideoClipEntry = {
          id: clipId,
          patientId: patient.id,
          at,
          exercise: exerciseName,
          duration,
          url: URL.createObjectURL(blob),
          blob,
          telemetry,
        };

        setClips((prev) => [newEntry, ...prev]);
        setSelectedClipId(clipId);
        setVideoPlaybackTime(0);

        void saveVideoClip({
          id: clipId,
          patientId: patient.id,
          at,
          exercise: exerciseName,
          duration,
          blob,
          telemetry,
        })
          .then(() => {
            setToast(`Saved "${exerciseName}". Mark the set complete to review it.`);
          })
          .catch(() => setCameraError('Clip storage error.'));

        setRecording(false);
      };
      recorder.start(100);
      setSeconds(0);
      setRunning(true);
      setRecording(true);
    } catch {
      setCameraError('Could not start recording.');
    }
  };

  const stopRecording = () => { recordingRef.current = false; recorderRef.current?.stop(); setRunning(false); };

  const downloadClip = (clip: VideoClipEntry) => {
    const a = document.createElement('a');
    a.href = clip.url;
    const cleanName = clip.exercise.toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `${cleanName}-${new Date(clip.at).toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setToast(`Downloading video clip for "${clip.exercise}".`);
  };

  const deleteClip = async (clipId: string) => {
    const target = clips.find((c) => c.id === clipId);
    if (!target) return;
    const confirmDelete = window.confirm(`Delete recorded video clip for "${target.exercise}"?`);
    if (!confirmDelete) return;

    await deleteVideoClipFromDb(clipId);
    URL.revokeObjectURL(target.url);
    const updated = clips.filter((c) => c.id !== clipId);
    setClips(updated);
    if (selectedClipId === clipId) {
      setSelectedClipId(updated[0]?.id || null);
    }
    setToast('Video clip removed from playlist.');
  };

  useEffect(() => {
    if (recording && seconds >= 30) {
      stopRecording();
      setToast('30-second limit reached. Clip saved.');
    }
  }, [recording, seconds]);

  // Physio exercise editor actions
  const openAddExercise = () => {
    setFormName('');
    setFormTarget('10s hold · 180° extension');
    setFormWarning('Stop if you experience sharp anterior knee pain.');
    setFormSeconds(10);
    setFormCategory('Strength');
    setFormCues('Lie on back with leg supported.\nEngage quadriceps firmly.\nHold comfortably for 10 seconds.');
    setExerciseModal({ open: true, mode: 'add', targetEx: null });
  };

  const openEditExercise = (ex: Exercise) => {
    setFormName(ex.name);
    setFormTarget(ex.target);
    setFormWarning(ex.warning);
    setFormSeconds(ex.seconds);
    setFormCategory(ex.category || 'Activation');
    setFormCues(ex.cues.join('\n'));
    setExerciseModal({ open: true, mode: 'edit', targetEx: ex });
  };

  const saveExerciseForm = () => {
    if (!formName.trim()) return;
    const cuesList = formCues.split('\n').map((c) => c.trim()).filter(Boolean);
    if (exerciseModal.mode === 'add') {
      const newEx: Exercise = {
        id: `custom-${Date.now()}`,
        name: formName.trim(),
        target: formTarget.trim() || '10s hold',
        warning: formWarning.trim() || 'Stop if pain occurs.',
        icon: 'activity',
        seconds: Number(formSeconds) || 10,
        cues: cuesList.length ? cuesList : ['Perform with control.'],
        category: formCategory,
        active: true
      };
      updateCurrentPatient((p) => ({
        ...p,
        prescribedExercises: [...p.prescribedExercises, newEx]
      }));
      setToast(`Added "${newEx.name}" to ${patient.name}'s routine.`);
    } else if (exerciseModal.mode === 'edit' && exerciseModal.targetEx) {
      const updatedExId = exerciseModal.targetEx.id;
      updateCurrentPatient((p) => ({
        ...p,
        prescribedExercises: p.prescribedExercises.map((item) => {
          if (item.id === updatedExId) {
            return {
              ...item,
              name: formName.trim(),
              target: formTarget.trim(),
              warning: formWarning.trim(),
              seconds: Number(formSeconds) || 10,
              category: formCategory,
              cues: cuesList.length ? cuesList : item.cues
            };
          }
          return item;
        })
      }));
      setToast(`Updated "${formName.trim()}".`);
    }
    setExerciseModal({ open: false, mode: 'add', targetEx: null });
  };

  const deleteExercise = (exId: string) => {
    updateCurrentPatient((p) => ({
      ...p,
      prescribedExercises: p.prescribedExercises.filter((e) => e.id !== exId)
    }));
    setToast('Exercise removed from prescription.');
  };

  const updatePatientPhase = (newPhase: 1 | 2 | 3 | 4) => {
    const phaseDefaultEx = 
      newPhase === 1 ? INITIAL_PATIENTS[0].prescribedExercises :
      newPhase === 2 ? INITIAL_PATIENTS[1].prescribedExercises :
      newPhase === 3 ? INITIAL_PATIENTS[2].prescribedExercises :
      INITIAL_PATIENTS[3].prescribedExercises;

    updateCurrentPatient((p) => ({
      ...p,
      currentPhase: newPhase,
      prescribedExercises: phaseDefaultEx
    }));
    setToast(`Cleared ${patient.name} for Phase ${newPhase}! Loaded Phase ${newPhase} evidence protocol.`);
  };

  const handleCreatePatient = () => {
    if (!newPatientName.trim()) {
      setToast('Please enter athlete name.');
      return;
    }
    const name = newPatientName.trim();
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PT';
    const id = `pt-${Date.now()}`;
    const phaseDefaultEx = 
      newPatientPhase === 1 ? INITIAL_PATIENTS[0].prescribedExercises :
      newPatientPhase === 2 ? INITIAL_PATIENTS[1].prescribedExercises :
      newPatientPhase === 3 ? INITIAL_PATIENTS[2].prescribedExercises :
      INITIAL_PATIENTS[3].prescribedExercises;

    const newPt: Patient = {
      id,
      name,
      avatar: initials,
      sport: newPatientSport.trim() || 'Multi-sport Athlete',
      age: Number(newPatientAge) || 22,
      graft: newPatientGraft,
      surgeryDate: newPatientSurgeryDate || dayStamp(),
      affectedLeg: newPatientLeg,
      legHighlightColor: newPatientLeg === 'left' ? '#10b981' : '#00f2fe',
      currentPhase: newPatientPhase,
      currentDay: 1,
      totalDays: 240,
      streakDays: 0,
      adherenceRate: 100,
      repitchPoints: 100,
      clinicianNotes: newPatientNotes.trim() || 'Patient initiated on postoperative rehab protocol.',
      patientNotes: '',
      checkins: [
        { pain: 2, swelling: 'Mild', sleep: 'Good', date: `${dayStamp()} · Intake` }
      ],
      sessions: [],
      prescribedExercises: phaseDefaultEx
    };

    setPatients((prev) => [...prev, newPt]);
    setSelectedPatientId(newPt.id);
    setAddPatientModal(false);
    setNewPatientName('');
    setNewPatientSport('');
    setToast(`Registered ${newPt.name} to patient roster.`);
  };

  const handleDeletePatient = (patientIdToDelete: string) => {
    if (patients.length <= 1) {
      setToast('Cannot delete the only patient on your roster. At least 1 patient required.');
      return;
    }
    const target = patients.find((p) => p.id === patientIdToDelete);
    if (!target) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete patient record for "${target.name}"? This cannot be undone.`);
    if (!confirmDelete) return;

    const remaining = patients.filter((p) => p.id !== patientIdToDelete);
    setPatients(remaining);
    if (selectedPatientId === patientIdToDelete) {
      setSelectedPatientId(remaining[0].id);
    }
    if (profileModal.open && profileModal.patient?.id === patientIdToDelete) {
      setProfileModal({ open: false, patient: null });
    }
    setToast(`Deleted ${target.name} from clinical roster.`);
  };

  const switchToPatientPortal = (patientIdToSwitch: string) => {
    setSelectedPatientId(patientIdToSwitch);
    setRole('patient');
    setProfileModal({ open: false, patient: null });
    setToast(`Switched view to ${patients.find(p => p.id === patientIdToSwitch)?.name || 'athlete'}'s portal.`);
  };

  const exportReport = () => {
    const reportLatest = patient.checkins[0];
    const reportFlags = patient.checkins.filter((item) => item.pain >= 5 || item.swelling === 'Moderate' || item.swelling === 'Severe');
    const summary = `Patient ${patient.name} (${patient.sport}) is on day ${patient.currentDay} of ${patient.totalDays} (Phase ${patient.currentPhase}). ${patient.checkins.length} check-ins recorded; ${patient.sessions.length} guided sessions completed. Latest pain: ${reportLatest?.pain ?? 'N/A'}/10, ${reportLatest?.swelling ?? 'No'} swelling. Clinician note: ${patient.clinicianNotes}`;
    const rows = [
      ['RePitch ACL Recovery Clinical Report', dayStamp()],
      ['Patient Name', patient.name],
      ['Sport / Position', patient.sport],
      ['Surgical Graft', patient.graft],
      ['Surgery Date', patient.surgeryDate],
      ['Current Phase', `Phase ${patient.currentPhase} (Day ${patient.currentDay} of ${patient.totalDays})`],
      ['Adherence Rate', `${patient.adherenceRate}%`],
      ['Physiotherapist Note', patient.clinicianNotes],
      ['Patient Message', patient.patientNotes || 'None'],
      ['Clinical Summary', summary],
      [],
      ['Recent Check-in Logs'],
      ['Date', 'Pain (1-10)', 'Effusion / Swelling', 'Sleep'],
      ...patient.checkins.map((item) => [item.date, String(item.pain), item.swelling, item.sleep]),
      [],
      ['Active Prescribed Exercises'],
      ['Exercise Name', 'Target Specs', 'Hold (sec)', 'Category'],
      ...patient.prescribedExercises.map((e) => [e.name, e.target, String(e.seconds), e.category || 'General']),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.href = url; link.download = `${patient.name.toLowerCase().replace(' ', '-')}-acl-recovery-report.csv`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const latest = patient.checkins[0];
  const flags = patient.checkins.filter((entry) => entry.pain >= 5 || entry.swelling === 'Severe' || entry.swelling === 'Moderate');
  const remainingSeconds = modal === 'guided' && step === exercise.cues.length - 1 ? Math.max(0, exercise.seconds - seconds) : seconds;
  const formattedTimer = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="app-shell">
      {/* Topbar Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brandmark">
            <Activity size={22} strokeWidth={2.5}/>
          </div>
          <div className="brand-text-wrap">
            <span className="brand-name">RePitch</span>
            <span className="brand-tag">ACL Recovery</span>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Role switcher */}
          <div className="view-toggle" role="group" aria-label="Choose portal view">
            <button 
              className={role === 'patient' ? 'active' : ''} 
              onClick={() => setRole('patient')} 
              data-testid="button-view-patient"
            >
              <HeartPulse size={15}/> Patient
            </button>
            <button 
              className={role === 'clinician' ? 'active' : ''} 
              onClick={() => setRole('clinician')} 
              data-testid="button-view-clinician"
            >
              <Stethoscope size={15}/> Physiotherapist
            </button>
          </div>

          {/* Theme switcher */}
          <div className="theme-toggle-bar" role="group" aria-label="Select color theme">
            <button
              className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Light theme"
              aria-label="Light mode"
            >
              <Sun size={14}/>
            </button>
            <button
              className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
              onClick={() => setTheme('system')}
              title="System theme"
              aria-label="System mode"
            >
              <Laptop size={14}/>
            </button>
            <button
              className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              title="Dark theme"
              aria-label="Dark mode"
            >
              <Moon size={14}/>
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="page">
        {role === 'patient' ? (
          <>
            {/* Patient Subnavigation Tabs */}
            <div className="nav-tab-bar" role="tablist">
              <button 
                role="tab"
                aria-selected={patientTab === 'routine'}
                className={`nav-tab-btn ${patientTab === 'routine' ? 'active' : ''}`}
                onClick={() => setPatientTab('routine')}
              >
                <Dumbbell size={16}/> Today
              </button>
              <button 
                role="tab"
                aria-selected={patientTab === 'masterplan'}
                className={`nav-tab-btn ${patientTab === 'masterplan' ? 'active' : ''}`}
                onClick={() => setPatientTab('masterplan')}
              >
                <Calendar size={16}/> Recovery roadmap
              </button>
            </div>

            {patientTab === 'routine' ? (
              <PatientView 
                patient={patient}
                pain={pain} setPain={setPain}
                swelling={swelling} setSwelling={setSwelling}
                sleep={sleep} setSleep={setSleep}
                saveCheckin={saveCheckin} saved={saved}
                launchGuided={launchGuided} startCamera={startCamera}
                openDemo={(ex) => setDemoModal({ open: true, ex })}
            updatePatientNotes={(notes) => updateCurrentPatient((p) => ({ ...p, patientNotes: notes }))}
                clips={clips.filter((c) => !c.patientId || c.patientId === patient.id)}
                selectedClipId={selectedClipId}
                setSelectedClipId={setSelectedClipId}
                downloadClip={downloadClip}
                deleteClip={deleteClip}
              />
            ) : (
              <MasterplanView patient={patient} />
            )}
          </>
        ) : (
          <ClinicianView 
            patients={patients}
            selectedPatientId={selectedPatientId}
            setSelectedPatientId={setSelectedPatientId}
            patient={patient}
            latest={latest}
            flags={flags}
            exportReport={exportReport}
            clips={clips.filter((c) => !c.patientId || c.patientId === patient.id)}
            selectedClipId={selectedClipId}
            setSelectedClipId={setSelectedClipId}
            downloadClip={downloadClip}
            deleteClip={deleteClip}
            openAddExercise={openAddExercise}
            openEditExercise={openEditExercise}
            deleteExercise={deleteExercise}
            openDemo={(ex) => setDemoModal({ open: true, ex })}
            updatePatientNotes={(notes) => updateCurrentPatient((p) => ({ ...p, clinicianNotes: notes }))}
            updatePatientPhase={updatePatientPhase}
            openAddPatient={() => setAddPatientModal(true)}
            deletePatient={handleDeletePatient}
            openProfile={(p) => setProfileModal({ open: true, patient: p })}
            switchToPatientPortal={switchToPatientPortal}
          />
        )}

        <div className="footer-note">
          <ShieldAlert size={14} style={{ color: 'var(--accent-amber)' }}/>
          <span>RePitch · Your recovery plan and progress live here.</span>
        </div>
      </main>

      {/* Guided and Camera Modals */}
      {modal && (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          {modal === 'guided' ? (
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="guided-title">
              <div className="modal-head">
                <div>
                  <div className="eyebrow"><Sparkles size={12}/> CLINICAL PROTOCOL · GUIDED REPETITION</div>
                  <h2 id="guided-title">{exercise.name}</h2>
                  <div className="muted small">{exercise.target}</div>
                </div>
                <button className="icon-button" onClick={closeModal} aria-label="Close guided set">
                  <X size={18}/>
                </button>
              </div>

              {step < exercise.cues.length ? (
                <>
                  <div className="step-box">
                    <div className="eyebrow">STEP {step + 1} OF {exercise.cues.length}</div>
                    <p>{exercise.cues[step]}</p>
                  </div>
                  {step === exercise.cues.length - 1 ? (
                    <>
                      <div className="timer-display">{formattedTimer}</div>
                      <p className="muted small" style={{ textAlign: 'center' }}>
                        Hold comfortably for {exercise.seconds} seconds. Pause if anything feels wrong.
                      </p>

                      {/* If stopped early / paused before reaching target time, show retry question card */}
                      {!running && seconds > 0 && seconds < exercise.seconds && (
                        <div style={{
                          margin: '14px 0 6px',
                          padding: '10px 14px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px dashed rgba(239, 68, 68, 0.35)',
                          borderRadius: 14,
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                            Set paused at {seconds}s of {exercise.seconds}s
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            Take a moment, then restart when you are ready.
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                        {/* Try Again Button: available when set was started or paused */}
                        {seconds > 0 && (
                          <button
                            type="button"
                            className="btn btn-quiet"
                            onClick={() => {
                              setRunning(false);
                              setSeconds(0);
                              lastCheerSecRef.current = -1;
                              setGuidedMood('cheering');
                              const retryText = ROO_LINES.retryConfirm;
                              setGuidedSpeech(retryText);
                              speakRoo(retryText, soundEnabled);
                              setTimeout(() => setGuidedMood('idle'), 2500);
                            }}
                          >
                            <RotateCcw size={15}/> Restart Set
                          </button>
                        )}

                        <button
                          className="btn btn-quiet"
                          disabled={seconds >= exercise.seconds}
                          onClick={() => {
                            const willRun = !running;
                            setRunning(willRun);
                            if (willRun && seconds === 0) {
                              setGuidedMood('cheering');
                              const startMsg = ROO_LINES.start;
                              setGuidedSpeech(startMsg);
                              speakRoo(startMsg, soundEnabled);
                            }
                          }}
                        >
                          <Clock3 size={15}/>{running ? 'Pause Timer' : seconds > 0 ? 'Resume Timer' : 'Start Set Timer'}
                        </button>

                        <button
                          className="btn btn-primary"
                          disabled={seconds < exercise.seconds}
                          onClick={() => {
                            setStep((value) => value + 1);
                            setRunning(false);
                            setSeconds(0);
                            setGuidedMood('cheering');
                            const finishMsg = ROO_LINES.completed;
                            speakRoo(finishMsg, soundEnabled, true);
                          }}
                        >
                          Complete Set<ChevronRight size={15}/>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
                      <button className="btn btn-primary" onClick={() => setStep((value) => value + 1)}>
                        Next Step<ChevronRight size={15}/>
                      </button>
                    </div>
                  )}
                  <p className="muted small" style={{ textAlign: 'center', marginTop: 18 }}>Move slowly and stay within the range your physiotherapist prescribed.</p>
                </>
              ) : (
                <div className="empty" style={{ border: 0, padding: '28px 20px', textAlign: 'center' }}>
                  <CheckCircle2 size={42} style={{ color: 'var(--accent-emerald)' }}/>
                  <h3 style={{ fontSize: 24, margin: '14px 0 6px', fontWeight: 800 }}>Set complete</h3>
                  <p className="muted" style={{ margin: '0 0 20px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
                    Nice work. Save this set to add it to your activity log.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                    <button
                      className="btn btn-quiet"
                      onClick={() => {
                        setStep(exercise.cues.length - 1);
                        setSeconds(0);
                        setRunning(false);
                        lastCheerSecRef.current = -1;
                        setGuidedMood('idle');
                        const startMsg = ROO_LINES.start;
                        setGuidedSpeech(startMsg);
                        speakRoo(startMsg, soundEnabled);
                      }}
                    >
                      <RotateCcw size={15}/> Repeat Exercise Set
                    </button>
                    <button className="btn btn-primary" onClick={completeSession}>
                      <Check size={16}/> Confirm & Save Completion
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="modal modal-camera" style={{ maxWidth: 1340, width: '96vw' }} role="dialog" aria-modal="true" aria-labelledby="camera-title">
              <div className="modal-head">
                <div>
                  <div className="eyebrow"><Zap size={12}/> LIVE AI WORKOUT</div>
                  <h2 id="camera-title">{exercise.name}</h2>
                  <div className="muted small">Live form feedback runs on your device. Your video is not uploaded.</div>
                </div>
                <button className="icon-button" onClick={closeModal} aria-label="Close camera">
                  <X size={18}/>
                </button>
              </div>

              {/* Target Leg, Knee Highlight Color, and Character Demo Toggle Toolbar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: 'var(--bg-card-subtle)', borderRadius: 12, marginBottom: 14, border: '1px solid var(--border-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="field-title" style={{ margin: 0, fontSize: 12 }}>Target Leg:</span>
                  <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 8, border: '1px solid var(--border-card)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeg('left');
                        updateCurrentPatient((p) => ({ ...p, affectedLeg: 'left' }));
                      }}
                      className="btn"
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        background: selectedLeg === 'left' ? legColor : 'transparent',
                        color: selectedLeg === 'left' ? '#000000' : 'var(--text-secondary)',
                        border: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Left Leg {patient.affectedLeg === 'left' ? '(Operative)' : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeg('right');
                        updateCurrentPatient((p) => ({ ...p, affectedLeg: 'right' }));
                      }}
                      className="btn"
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        background: selectedLeg === 'right' ? legColor : 'transparent',
                        color: selectedLeg === 'right' ? '#000000' : 'var(--text-secondary)',
                        border: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Right Leg {patient.affectedLeg === 'right' ? '(Operative)' : ''}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Knee Color */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="field-title" style={{ margin: 0, fontSize: 12 }}>Color:</span>
                    {[
                      { hex: '#10b981', name: 'Clinical Emerald' },
                      { hex: '#00f2fe', name: 'Cyber Cyan' },
                      { hex: '#f59e0b', name: 'High-Vis Gold' },
                      { hex: '#f43f5e', name: 'Coral Pink' },
                      { hex: '#a855f7', name: 'Neon Violet' }
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.name}
                        onClick={() => {
                          setLegColor(c.hex);
                          updateCurrentPatient((p) => ({ ...p, legHighlightColor: c.hex }));
                        }}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: c.hex,
                          border: legColor === c.hex ? '2px solid #ffffff' : '2px solid transparent',
                          boxShadow: legColor === c.hex ? `0 0 10px ${c.hex}` : 'none',
                          cursor: 'pointer',
                          transform: legColor === c.hex ? 'scale(1.2)' : 'scale(1)',
                          transition: 'all 0.15s ease'
                        }}
                      />
                    ))}
                  </div>

                  {/* Character Guide Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowDemoInCamera((prev) => !prev)}
                    className="btn btn-quiet"
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8,
                      background: showDemoInCamera ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                      color: showDemoInCamera ? '#00f2fe' : 'var(--text-secondary)',
                      border: '1px solid rgba(0, 242, 254, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Sparkles size={13} color="#00f2fe"/>
                    {showDemoInCamera ? 'Demo Guide (Top-Right): ON' : 'Show Demo Guide'}
                  </button>
                </div>
              </div>

              <div 
                className="camera-stage-wrapper"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  width: '100%'
                }}
              >
                {stream ? (
                  <>
                    <div className="camera-stage">
                      <video ref={videoRef} className="camera-view" autoPlay muted playsInline style={{ opacity: 0 }} />
                      <div className="camera-overlay">
                        <canvas ref={poseCanvasRef} className="pose-canvas" style={{ transform: 'none' }} aria-hidden="true"/>
                        <div className="alignment-frame" style={{ borderColor: legColor, boxShadow: `0 0 35px ${legColor}33` }}/>
                      </div>

                      {/* Confetti Celebration Overlay */}
                      <ConfettiCanvas active={showConfetti} durationMs={4500} />

                      {/* Celebration Banner Overlay */}
                      {celebrationBanner && (
                        <div className="hold-celebration-banner">
                          <Trophy size={20} color="#fde047" />
                          <span>{celebrationBanner}</span>
                        </div>
                      )}

                      {/* Top Left: Tracking Info Badge */}
                      <div style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        background: 'rgba(10, 15, 25, 0.88)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 8,
                        padding: '6px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        zIndex: 15
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#ffffff', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                          {exercise.name}
                        </span>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: legColor, textTransform: 'uppercase' }}>
                          TARGET: {selectedLeg.toUpperCase()} LEG {patient.affectedLeg === selectedLeg ? '(OPERATIVE)' : ''}
                        </span>
                      </div>

                      {/* Distance-Readable Hero Angle HUD & 5-Second Hold Meter */}
                      {(() => {
                        const isLocked = targetAngle !== null && poseState.angle !== null && Math.abs(poseState.angle - targetAngle) <= 5;
                        const isTooDeep = targetAngle !== null && poseState.angle !== null && poseState.angle < targetAngle - 5;
                        const isTooShallow = targetAngle !== null && poseState.angle !== null && poseState.angle > targetAngle + 5;
                        const delta = targetAngle !== null && poseState.angle !== null ? Math.abs(poseState.angle - targetAngle) : null;
                        const activeHudColor = isLocked ? '#10b981' : isTooDeep ? '#f43f5e' : legColor;

                        return (
                          <div 
                            className="distance-angle-hud"
                            style={{
                              borderColor: activeHudColor,
                              boxShadow: isLocked 
                                ? '0 0 32px rgba(0,0,0,0.85), 0 0 28px rgba(16,185,129,0.5)' 
                                : `0 0 24px rgba(0,0,0,0.8), 0 0 16px ${activeHudColor}33`
                            }}
                          >
                            {/* HUD Top Header: Kinematic Info & Status Pill */}
                            <div className="distance-hud-header">
                              <div className="distance-hud-title">
                                <Activity size={16} color={activeHudColor} />
                                <span>{poseState.measure || 'Knee Kinematics'}</span>
                              </div>
                              <div 
                                className="distance-hud-status-badge"
                                style={{
                                  background: isLocked ? 'rgba(16,185,129,0.22)' : isTooDeep ? 'rgba(244,63,94,0.22)' : 'rgba(255,255,255,0.08)',
                                  color: isLocked ? '#34d399' : isTooDeep ? '#fb7185' : '#cbd5e1',
                                  border: `1px solid ${isLocked ? '#10b981' : isTooDeep ? '#f43f5e' : 'rgba(255,255,255,0.15)'}`
                                }}
                              >
                                {isLocked ? (
                                  <>
                                    <Sparkles size={12} color="#34d399" />
                                    <span>✓ ON TARGET (±5°)</span>
                                  </>
                                ) : isTooDeep ? (
                                  <span>⚠️ TOO DEEP ({poseState.angle}° &lt; {targetAngle !== null ? targetAngle - 5 : 140}°)</span>
                                ) : isTooShallow ? (
                                  <span>SQUAT DEEPER (AIM {targetAngle !== null ? `${targetAngle - 5}°–${targetAngle + 5}°` : '140°–150°'})</span>
                                ) : (
                                  <span>STAND IN VIEW</span>
                                )}
                              </div>
                            </div>

                            {/* HUD Middle Row: Giant Live Angle + Target Zone */}
                            <div className="distance-hud-main">
                              <div className="distance-hud-live">
                                <span className="distance-hud-digits" style={{ color: activeHudColor }}>
                                  {poseState.angle !== null ? poseState.angle : '—'}
                                </span>
                                <span className="distance-hud-unit">°</span>
                              </div>

                              <div className="distance-hud-target-block">
                                <span className="distance-hud-target-label">Target Angle</span>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                  <span className="distance-hud-target-val">{targetAngle !== null ? `${targetAngle}°` : '180°'}</span>
                                  {delta !== null && (
                                    <span style={{ fontSize: 13, fontWeight: 800, color: isLocked ? '#10b981' : '#f59e0b' }}>
                                      (Δ {delta}°)
                                    </span>
                                  )}
                                </div>
                                <span className="distance-hud-range-pill">
                                  ±5° ZONE: {targetAngle !== null ? `${targetAngle - 5}° – ${targetAngle + 5}°` : '140°–150°'}
                                </span>
                              </div>
                            </div>

                            {/* HUD Bottom: 5-Second Continuous Hold Progress Meter */}
                            <div className="distance-hud-hold-section">
                              <div className="distance-hud-hold-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: holdProgress.completed ? '#10b981' : '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  <Clock3 size={13} color={holdProgress.completed ? '#10b981' : '#38bdf8'} />
                                  <span>5s Target Hold</span>
                                </div>
                                <span style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: 13, color: holdProgress.completed ? '#10b981' : '#ffffff' }}>
                                  {holdProgress.seconds.toFixed(1)}s / 5.0s
                                </span>
                              </div>

                              <div className="distance-hud-hold-bar">
                                <div 
                                  className="distance-hud-hold-fill"
                                  style={{
                                    width: `${(holdProgress.seconds / 5) * 100}%`,
                                    background: holdProgress.completed ? '#10b981' : isLocked ? 'linear-gradient(90deg, #10b981, #00f2fe)' : 'rgba(255,255,255,0.2)'
                                  }}
                                />
                              </div>

                              <div className="distance-hud-hold-cue">
                                {holdProgress.completed ? (
                                  <span style={{ color: '#34d399', fontWeight: 800 }}>🎉 5-Second Target Hold Achieved! Repetition Validated!</span>
                                ) : holdProgress.isHolding ? (
                                  <span style={{ color: '#38bdf8', fontWeight: 800 }}>🔥 Holding steady... {(5 - holdProgress.seconds).toFixed(1)}s to celebration</span>
                                ) : (
                                  <span>Hold at {targetAngle !== null ? targetAngle : 145}° (±5°) for 5s to trigger celebration fanfare</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Top Right: Biomechanical Exercise Demo Overlay */}
                      {showDemoInCamera && (
                        <div className="camera-corner-demo">
                          <ExerciseCharacterDemo
                            exerciseId={exercise.id}
                            exerciseName={exercise.name}
                            target={exercise.target}
                            warning={exercise.warning}
                            cues={exercise.cues}
                            compact={true}
                            highlightColor={legColor}
                            onClose={() => setShowDemoInCamera(false)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Compact Bottom Bar: Status Indicator & Action Buttons */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                      padding: '10px 14px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`pose-dot ${poseState.status}`} style={{ width: 8, height: 8 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {poseState.status === 'loading' ? 'Loading model...' :
                           poseState.status === 'error' ? 'Pose unavailable' :
                           poseState.status === 'searching' ? 'Searching for joint landmarks...' :
                           '100% On-Device Pose Tracking Active'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          className={`btn ${recording ? 'btn-danger' : 'btn-primary'}`}
                          style={{ padding: '6px 14px', fontSize: 12 }}
                          onClick={recording ? stopRecording : recordVideo}
                        >
                          {recording ? <><Video size={14}/> Stop & save recording</> : <><Video size={14}/> Record set</>}
                        </button>
                        <button className="btn btn-quiet" style={{ padding: '6px 14px', fontSize: 12 }} onClick={completeSession} disabled={recording} title={recording ? 'Stop and save the recording before marking the set complete.' : undefined}>
                          <Check size={14}/> Mark set complete
                        </button>
                        <button 
                          className="btn btn-quiet" 
                          style={{ padding: '6px 14px', fontSize: 12 }} 
                          onClick={closeModal}
                        >
                          <X size={14}/> End workout
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty" style={{ minHeight: 460, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Camera size={40} style={{ color: 'var(--accent-cyan)', margin: '0 auto 12px' }}/>
                    <p>{cameraError || 'Request camera access to see live joint tracking.'}</p>
                    {!cameraError && (
                      <button className="btn btn-primary" onClick={() => void startCamera(exercise)} style={{ margin: '8px auto 0' }}>
                        <Camera size={15}/> Enable camera
                      </button>
                    )}
                  </div>
                )}

                {cameraError && (
                  <div className="flag">
                    <CircleHelp size={16}/>
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Physio Modal to Add or Edit Exercise */}
      {exerciseModal.open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setExerciseModal({ open: false, mode: 'add', targetEx: null }); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="ex-modal-title">
            <div className="modal-head">
              <div>
                <div className="eyebrow"><Edit3 size={13}/> CLINICIAN PRESCRIPTION TOOL</div>
                <h2 id="ex-modal-title">
                  {exerciseModal.mode === 'add' ? 'Prescribe New Exercise' : 'Edit Prescribed Exercise'}
                </h2>
                <div className="muted small">Patient: {patient.name}</div>
              </div>
              <button className="icon-button" onClick={() => setExerciseModal({ open: false, mode: 'add', targetEx: null })}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-title">Exercise Name</label>
                <input 
                  className="form-input" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  placeholder="e.g. Quad Sets with Terminal Lock"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-title">Target Goal / Angle</label>
                  <input 
                    className="form-input" 
                    value={formTarget} 
                    onChange={(e) => setFormTarget(e.target.value)} 
                    placeholder="e.g. 5s hold · 180° extension"
                  />
                </div>
                <div>
                  <label className="field-title">Duration / Hold (Seconds)</label>
                  <input 
                    type="number"
                    min="1"
                    max="180"
                    className="form-input" 
                    value={formSeconds} 
                    onChange={(e) => setFormSeconds(Number(e.target.value))} 
                  />
                </div>
              </div>

              <div>
                <label className="field-title">Category</label>
                <select 
                  className="form-input" 
                  value={formCategory} 
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="Activation">Activation</option>
                  <option value="Mobility">Mobility</option>
                  <option value="Strength">Strength</option>
                  <option value="Plyometrics">Plyometrics</option>
                  <option value="Agility">Agility</option>
                </select>
              </div>

              <div>
                <label className="field-title">Clinical Warning / Stop Criteria</label>
                <input 
                  className="form-input" 
                  value={formWarning} 
                  onChange={(e) => setFormWarning(e.target.value)} 
                  placeholder="e.g. Stop if sharp anterior patellar ache occurs."
                />
              </div>

              <div>
                <label className="field-title">Step-by-step Cues (one per line)</label>
                <textarea 
                  rows={3} 
                  className="form-input" 
                  value={formCues} 
                  onChange={(e) => setFormCues(e.target.value)} 
                  placeholder="Step 1...&#10;Step 2...&#10;Step 3..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button 
                  className="btn btn-quiet" 
                  onClick={() => setExerciseModal({ open: false, mode: 'add', targetEx: null })}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={saveExerciseForm}
                >
                  <Check size={16}/> {exerciseModal.mode === 'add' ? 'Prescribe Exercise to Routine' : 'Save Exercise Protocol'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Exercise Character Demo Modal */}
      {demoModal.open && demoModal.ex && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDemoModal({ open: false, ex: null }); }}>
          <section className="modal" style={{ maxWidth: 740, width: '95%' }} role="dialog" aria-modal="true" aria-labelledby="demo-modal-title">
            <div className="modal-head">
              <div>
                <div className="eyebrow" style={{ color: 'var(--accent-cyan)' }}>
                  <Sparkles size={13}/> INTERACTIVE EXERCISE DEMONSTRATION
                </div>
                <h2 id="demo-modal-title">{demoModal.ex.name}</h2>
                <div className="muted small">Watch Roo's animated bio-mechanical avatar demonstrate correct posture, cadence, and knee angles.</div>
              </div>
              <button className="icon-button" onClick={() => setDemoModal({ open: false, ex: null })}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <ExerciseCharacterDemo
                exerciseId={demoModal.ex.id}
                exerciseName={demoModal.ex.name}
                target={demoModal.ex.target}
                warning={demoModal.ex.warning}
                cues={demoModal.ex.cues}
                compact={false}
                highlightColor={legColor}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-quiet" onClick={() => setDemoModal({ open: false, ex: null })}>
                Close Demo
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const ex = demoModal.ex!;
                  setDemoModal({ open: false, ex: null });
                  launchGuided(ex);
                }}
              >
                <Play size={14}/> Start Guided Set
              </button>
              <button
                className="btn btn-quiet"
                onClick={() => {
                  const ex = demoModal.ex!;
                  setDemoModal({ open: false, ex: null });
                  void startCamera(ex);
                }}
              >
                <Camera size={14}/> Start live AI workout
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Patient Profile Full Dossier Modal */}
      {profileModal.open && profileModal.patient && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setProfileModal({ open: false, patient: null }); }}>
          <section className="modal" style={{ maxWidth: 840, width: '95%', maxHeight: '92dvh' }} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="patient-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                  {profileModal.patient.avatar}
                </div>
                <div>
                  <div className="eyebrow" style={{ color: 'var(--accent-indigo)' }}>
                    <User size={13}/> PATIENT CLINICAL DOSSIER
                  </div>
                  <h2 id="profile-modal-title" style={{ fontSize: 24, margin: '2px 0 0' }}>{profileModal.patient.name}</h2>
                  <div className="muted small">{profileModal.patient.sport} · Age {profileModal.patient.age}</div>
                </div>
              </div>
              <button className="icon-button" onClick={() => setProfileModal({ open: false, patient: null })}>
                <X size={18}/>
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '14px 0' }}>
              <div className="panel" style={{ padding: '12px 16px', background: 'var(--bg-card-subtle)' }}>
                <div className="muted small">Current Phase</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 2 }}>
                  Phase {profileModal.patient.currentPhase}
                </div>
                <div className="muted small">Day {profileModal.patient.currentDay} of {profileModal.patient.totalDays}</div>
              </div>
              <div className="panel" style={{ padding: '12px 16px', background: 'var(--bg-card-subtle)' }}>
                <div className="muted small">Surgical Graft</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                  {profileModal.patient.graft}
                </div>
                <div className="muted small">Surgery: {profileModal.patient.surgeryDate}</div>
              </div>
              <div className="panel" style={{ padding: '12px 16px', background: 'var(--bg-card-subtle)' }}>
                <div className="muted small">Operative Leg</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: profileModal.patient.legHighlightColor || '#00f2fe', marginTop: 2 }}>
                  {profileModal.patient.affectedLeg?.toUpperCase() || 'RIGHT'} LEG
                </div>
                <div className="muted small">Adherence: {profileModal.patient.adherenceRate}%</div>
              </div>
              <div className="panel" style={{ padding: '12px 16px', background: 'var(--bg-card-subtle)' }}>
                <div className="muted small">RePitch Points</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-emerald)', marginTop: 2 }}>
                  {profileModal.patient.repitchPoints} pts
                </div>
                <div className="muted small">{profileModal.patient.streakDays}-day streak</div>
              </div>
            </div>

            {/* Phase Progression Stepper Inside Profile */}
            <div className="panel" style={{ padding: '16px 20px', margin: '14px 0', background: 'rgba(0,0,0,0.2)' }}>
              <div className="field-title" style={{ marginBottom: 10 }}>
                <span>Rehabilitation Phase Clearance</span>
                <span className="mono muted">Evidence-Based Milestones</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                {[
                  { phase: 1, title: 'Phase 1: Protection', weeks: 'W1–4', goal: '180° Lock, Effusion < 2+' },
                  { phase: 2, title: 'Phase 2: Neuromuscular', weeks: 'W5–12', goal: 'Full Flexion, Quad Strength' },
                  { phase: 3, title: 'Phase 3: Hypertrophy & Run', weeks: 'W13–20', goal: 'Jogging, LSI > 80%' },
                  { phase: 4, title: 'Phase 4: Agility & RTS', weeks: 'W21+', goal: 'Hop Tests > 90%, Reactive Cutting' }
                ].map((item) => {
                  const isCurrent = profileModal.patient!.currentPhase === item.phase;
                  const isPast = profileModal.patient!.currentPhase > item.phase;
                  return (
                    <div 
                      key={item.phase}
                      onClick={() => {
                        updatePatientPhase(item.phase as 1 | 2 | 3 | 4);
                        setProfileModal(prev => prev.patient ? ({ ...prev, patient: { ...prev.patient, currentPhase: item.phase as 1 | 2 | 3 | 4 } }) : prev);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: isCurrent ? 'rgba(0, 242, 254, 0.12)' : isPast ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card-subtle)',
                        border: isCurrent ? '1.5px solid var(--accent-cyan)' : isPast ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-light)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={`Click to set ${profileModal.patient!.name} to Phase ${item.phase}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? 'var(--accent-cyan)' : isPast ? '#10b981' : '#94a3b8' }}>
                          Phase {item.phase}
                        </span>
                        {isPast ? <CheckCircle2 size={13} color="#10b981"/> : isCurrent ? <Sparkles size={13} color="var(--accent-cyan)"/> : null}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 3 }}>{item.title.split(': ')[1]}</div>
                      <div className="muted small" style={{ fontSize: 10, marginTop: 2 }}>{item.weeks} · {item.goal}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Check-ins & Session Logs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, margin: '14px 0' }}>
              <div className="panel" style={{ padding: '14px 16px' }}>
                <div className="field-title" style={{ marginBottom: 8 }}>
                  <span>Recent Check-In Logs</span>
                  <span className="mono muted">{profileModal.patient.checkins.length} recorded</span>
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {profileModal.patient.checkins.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-card-subtle)', borderRadius: 8, fontSize: 12 }}>
                      <span className="muted">{c.date}</span>
                      <span>Pain: <strong>{c.pain}/10</strong> · {c.swelling}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel" style={{ padding: '14px 16px' }}>
                <div className="field-title" style={{ marginBottom: 8 }}>
                  <span>Completed Guided Sessions</span>
                  <span className="mono muted">{profileModal.patient.sessions.length} logged</span>
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {profileModal.patient.sessions.length ? (
                    profileModal.patient.sessions.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-card-subtle)', borderRadius: 8, fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{s.exercise}</span>
                        <span className="mono muted">{s.time}</span>
                      </div>
                    ))
                  ) : (
                    <div className="muted small" style={{ padding: 12, textAlign: 'center' }}>No sessions logged yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Clinician Notes */}
            <div className="step-box" style={{ margin: '14px 0' }}>
              <div className="eyebrow" style={{ color: 'var(--accent-indigo)' }}>PHYSIOTHERAPIST CLINICAL DIRECTIVE</div>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>"{profileModal.patient.clinicianNotes}"</p>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, flexWrap: 'wrap', gap: 10 }}>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  handleDeletePatient(profileModal.patient!.id);
                }}
              >
                <Trash2 size={14}/> Discharge Patient Profile
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-quiet" onClick={() => setProfileModal({ open: false, patient: null })}>
                  Close Dossier
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    switchToPatientPortal(profileModal.patient!.id);
                  }}
                >
                  <ExternalLink size={14}/> Open Patient Experience
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Register New Patient Modal */}
      {addPatientModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setAddPatientModal(false); }}>
          <section className="modal" style={{ maxWidth: 640, width: '95%' }} role="dialog" aria-modal="true" aria-labelledby="add-pt-title">
            <div className="modal-head">
              <div>
                <div className="eyebrow" style={{ color: 'var(--accent-emerald)' }}>
                  <Users size={13}/> CLINICAL INTAKE TOOL
                </div>
                <h2 id="add-pt-title">Register New Patient</h2>
                <div className="muted small">Initialize a personalized patient profile with targeted ACL kinematic protocols and recovery tracking.</div>
              </div>
              <button className="icon-button" onClick={() => setAddPatientModal(false)}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-title">Patient / Athlete Full Name *</label>
                <input 
                  className="form-input" 
                  value={newPatientName} 
                  onChange={(e) => setNewPatientName(e.target.value)} 
                  placeholder="e.g. Liam Davies"
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-title">Sport / Activity Level</label>
                  <input 
                    className="form-input" 
                    value={newPatientSport} 
                    onChange={(e) => setNewPatientSport(e.target.value)} 
                    placeholder="e.g. Soccer (Central Midfielder)"
                  />
                </div>
                <div>
                  <label className="field-title">Age</label>
                  <input 
                    type="number"
                    min="12"
                    max="75"
                    className="form-input" 
                    value={newPatientAge} 
                    onChange={(e) => setNewPatientAge(Number(e.target.value))} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-title">Surgical Graft Type</label>
                  <select 
                    className="form-input"
                    value={newPatientGraft}
                    onChange={(e) => setNewPatientGraft(e.target.value)}
                  >
                    <option value="Bone-Patellar Tendon-Bone (BPTB)">Bone-Patellar Tendon-Bone (BPTB)</option>
                    <option value="Hamstring Tendon Autograft">Hamstring Tendon Autograft</option>
                    <option value="Quadriceps Tendon Autograft">Quadriceps Tendon Autograft</option>
                    <option value="Allograft (Donor Tendon)">Allograft (Donor Tendon)</option>
                    <option value="Conservative (Non-Surgical)">Conservative (Non-Surgical)</option>
                  </select>
                </div>
                <div>
                  <label className="field-title">Surgery / Injury Date</label>
                  <input 
                    className="form-input" 
                    value={newPatientSurgeryDate} 
                    onChange={(e) => setNewPatientSurgeryDate(e.target.value)} 
                    placeholder="e.g. Oct 14, 2026"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-title">Operative Leg</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setNewPatientLeg('left')}
                      style={{
                        flex: 1,
                        background: newPatientLeg === 'left' ? 'var(--accent-emerald)' : 'var(--bg-card-subtle)',
                        color: newPatientLeg === 'left' ? '#000000' : 'var(--text-secondary)',
                        fontWeight: 700,
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      Left Leg
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setNewPatientLeg('right')}
                      style={{
                        flex: 1,
                        background: newPatientLeg === 'right' ? 'var(--accent-emerald)' : 'var(--bg-card-subtle)',
                        color: newPatientLeg === 'right' ? '#000000' : 'var(--text-secondary)',
                        fontWeight: 700,
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      Right Leg
                    </button>
                  </div>
                </div>

                <div>
                  <label className="field-title">Initial Recovery Phase</label>
                  <select 
                    className="form-input"
                    value={newPatientPhase}
                    onChange={(e) => setNewPatientPhase(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  >
                    <option value={1}>Phase 1: Acute Protection (Weeks 1–4)</option>
                    <option value={2}>Phase 2: Neuromuscular Control (Weeks 5–12)</option>
                    <option value={3}>Phase 3: Hypertrophy & Jogging (Weeks 13–20)</option>
                    <option value={4}>Phase 4: Sport Agility & RTS (Weeks 21+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-title">Initial Physiotherapy Directives</label>
                <textarea 
                  rows={2} 
                  className="form-input" 
                  value={newPatientNotes} 
                  onChange={(e) => setNewPatientNotes(e.target.value)} 
                  placeholder="Clinical guidelines, weight-bearing limits, or graft considerations."
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button className="btn btn-quiet" onClick={() => setAddPatientModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreatePatient}>
                  <Check size={16}/> Register Patient & Initialize Protocol
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Floating Modern Toast */}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} color="var(--accent-emerald)"/>
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}

function PatientView(props: {
  patient: Patient;
  pain: number; setPain: (n: number) => void; 
  swelling: Swelling; setSwelling: (s: Swelling) => void; 
  sleep: string; setSleep: (s: string) => void;
  saveCheckin: () => void; saved: boolean; 
  launchGuided: (e: Exercise) => void; startCamera: (e: Exercise) => void;
  openDemo: (e: Exercise) => void;
  updatePatientNotes: (notes: string) => void;
  clips: VideoClipEntry[];
  selectedClipId: string | null;
  setSelectedClipId: (id: string) => void;
  downloadClip: (clip: VideoClipEntry) => void;
  deleteClip: (clipId: string) => void;
}) {
  const { 
    patient, pain, setPain, swelling, setSwelling, sleep, setSleep, 
    saveCheckin, saved, launchGuided, startCamera, openDemo, updatePatientNotes,
    clips, selectedClipId, setSelectedClipId, downloadClip, deleteClip
  } = props;
  const [patientNote, setPatientNote] = useState(patient.patientNotes || '');
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => setPatientNote(patient.patientNotes || ''), [patient.id, patient.patientNotes]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const painColor = pain <= 3 ? 'var(--accent-emerald)' : pain <= 6 ? 'var(--accent-amber)' : 'var(--accent-rose)';
  const painLabel = pain === 0 ? 'No pain' : pain <= 2 ? 'Mild' : pain <= 4 ? 'Noticeable' : pain <= 6 ? 'Moderate' : 'High';
  const routineMinutes = Math.max(8, patient.prescribedExercises.length * 3);
  const recoveryPercent = Math.min(100, Math.round((patient.currentDay / patient.totalDays) * 100));
  const nextExercise = patient.prescribedExercises[0];
  const liveWorkout = patient.prescribedExercises.find((item) => `${item.id} ${item.name}`.toLowerCase().includes('mini') && `${item.id} ${item.name}`.toLowerCase().includes('squat'));
  const displayedRoutine = [...patient.prescribedExercises].sort((a, b) => {
    const aIsLiveWorkout = a.id === liveWorkout?.id ? 0 : 1;
    const bIsLiveWorkout = b.id === liveWorkout?.id ? 0 : 1;
    return aIsLiveWorkout - bIsLiveWorkout;
  });
  const startToday = () => {
    if (liveWorkout) {
      void startCamera(liveWorkout);
    } else if (nextExercise) {
      launchGuided(nextExercise);
    }
  };

  return (
    <>
      {/* Hero Welcome with Recovery Day and Rehab Streak in Top Right */}
      <div className="hero-row">
        <div>
          <div className="eyebrow">
            <Calendar size={13}/>
            PHASE {patient.currentPhase} REHABILITATION · {patient.graft}
          </div>
          <h1>{greeting}, {patient.name.split(' ')[0]}.</h1>
          <div className="muted">{patient.sport} · Your plan is ready when you are.</div>
        </div>

        {/* Top-Right Stats: Recovery Day & Rehab Streak */}
        <div className="hero-stats-group">
          <div className="panel hero-stat">
            <div className="stat-header">
              <span className="stat-label">Recovery day</span>
              <div className="stat-icon" style={{ color: 'var(--accent-cyan)', background: 'var(--accent-cyan-light)' }}>
                <Activity size={17}/>
              </div>
            </div>
            <div>
              <div className="stat-value" style={{ margin: '8px 0 3px', fontSize: 24, lineHeight: 1.1 }}>
                {patient.currentDay}<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}> / {patient.totalDays}</span>
              </div>
              <div className="stat-detail">
                <span className="tag tag-cyan" style={{ fontSize: 9.5, padding: '2px 7px' }}>Phase {patient.currentPhase}</span>
                <span>Week {Math.ceil(patient.currentDay / 7)}</span>
              </div>
            </div>
          </div>

          <div className="panel hero-stat">
            <div className="stat-header">
              <span className="stat-label">Current streak</span>
              <div className="stat-icon" style={{ color: 'var(--accent-amber)', background: 'var(--accent-amber-light)' }}>
                <Flame size={17}/>
              </div>
            </div>
            <div>
              <div className="stat-value" style={{ margin: '8px 0 3px', fontSize: 24, lineHeight: 1.1 }}>
                {patient.streakDays} <span style={{ fontSize: 13, fontWeight: 600 }}>Days</span>
              </div>
              <div className="stat-detail">
                <span>Days you’ve checked in</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinician's Direct Note to Patient */}
      {patient.clinicianNotes && (
        <div className="panel" style={{ padding: '16px 20px', marginBottom: 22, background: 'var(--accent-indigo-light)', borderColor: 'var(--accent-indigo)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Stethoscope size={20} color="var(--accent-indigo)" style={{ flexShrink: 0, marginTop: 2 }}/>
            <div>
            <div className="eyebrow" style={{ color: 'var(--accent-indigo)' }}>A NOTE FROM YOUR PHYSIOTHERAPIST</div>
              <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontSize: 13.5, lineHeight: 1.5, fontWeight: 500 }}>
                "{patient.clinicianNotes}"
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="today-hero" aria-labelledby="today-plan-heading">
        <div className="today-hero-copy">
          <div className="today-hero-kicker"><Sparkles size={14}/> TODAY'S REHAB PLAN</div>
          <h2 id="today-plan-heading">Build confidence, one controlled set at a time.</h2>
          <p>{liveWorkout ? 'Start with live AI feedback for your Mini Squat form, then continue with the rest of your plan.' : `${patient.prescribedExercises.length} movements · about ${routineMinutes} minutes · tailored for Phase ${patient.currentPhase}.`}</p>
          {(liveWorkout || nextExercise) && (
            <button className="btn btn-primary today-cta" onClick={startToday}>
              <Camera size={16}/> Start today’s routine
            </button>
          )}
          <span className="today-hero-note"><ShieldAlert size={13}/> Stop and tell your physiotherapist if pain is sharp, new, or worsening.</span>
        </div>
        <div className="today-hero-metrics" aria-label="Today’s plan summary">
          <div className="recovery-orbit" style={{ '--progress': `${recoveryPercent}%` } as React.CSSProperties}>
            <div className="recovery-orbit-inner"><strong>{recoveryPercent}%</strong><span>pathway</span></div>
          </div>
          <div className="today-stat-list">
            <div><span>Live workout</span><strong>{liveWorkout?.name ?? nextExercise?.name ?? 'Your routine'}</strong></div>
            <div><span>Today’s focus</span><strong>Form & control</strong></div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="content-grid">
        <div>
          {/* Active Prescribed Exercises */}
          <section className="exercise-section">
            <div className="section-head">
              <div>
                <h2>Your routine</h2>
                <p>Follow the order your physiotherapist set. Each card includes a guided option and a form demo.</p>
              </div>
              <span className="tag">
                <CheckCircle2 size={13}/> {patient.sessions.length} completed
              </span>
            </div>
            <div className="exercise-grid">
              {displayedRoutine.map((item) => (
                <article className="panel exercise" key={item.id}>
                  <div className="exercise-thumb">
                    <Art kind={item.icon}/>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3>{item.name}</h3>
                      {item.category && <span className="tag" style={{ fontSize: 9.5, padding: '2px 7px' }}>{item.category}</span>}
                    </div>
                    <div className="target">{item.target}</div>
                    <div className="warning">
                      <ShieldAlert size={13} style={{ flexShrink: 0, marginTop: 1 }}/>
                      <span>{item.warning}</span>
                    </div>
                    <div className="exercise-actions">
                      <button className="btn btn-primary" onClick={() => void startCamera(item)}>
                        <Camera size={13}/> Start live AI workout
                      </button>
                      <button className="btn btn-quiet" onClick={() => launchGuided(item)}>
                        <Play size={13}/> Guided steps
                      </button>
                      <button className="btn btn-quiet" onClick={() => openDemo(item)} title="Watch animated biomechanical demonstration">
                        <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }}/> Watch demo
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Daily Check-in Form */}
          <section className="panel checkin">
            <div className="section-head">
              <div>
                <h2>How does your knee feel today?</h2>
                <p>Think about your usual pain at rest, before exercise. This helps your physiotherapist spot changes early.</p>
              </div>
              <span className="tag tag-cyan">TODAY</span>
            </div>

            {/* Pain Slider */}
            <div className="field-title">
              <span>Pain at rest</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="small muted">{painLabel}</span>
                <span className="mono" style={{ color: painColor, fontWeight: 800, fontSize: 15 }}>
                  {pain} / 10
                </span>
              </div>
            </div>
            <div className="range-container">
              <input 
                id="pain-range" 
                data-testid="input-pain" 
                aria-label="Pain from 0 to 10"
                className="range" 
                type="range" 
                min="0"
                max="10" 
                value={pain} 
                onChange={(e) => setPain(Number(e.target.value))}
              />
            </div>
            <div className="muted small" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span>0 · no pain</span>
              <span>5 · moderate</span>
              <span>10 · severe</span>
            </div>

            <div className="checkin-guidance" role="note">
              <CircleHelp size={15}/>
              <span>We’ll flag this for review if pain is 5 or higher, or swelling is moderate or severe.</span>
            </div>

            {/* Swelling Choice */}
            <div className="field-title">
              <span>Swelling</span>
            </div>
            <div className="choice-row">
              {(['None', 'Mild', 'Moderate', 'Severe'] as Swelling[]).map((item) => (
                <button 
                  key={item} 
                  onClick={() => setSwelling(item)} 
                  className={`choice ${swelling === item ? 'selected' : ''}`} 
                  data-testid={`button-swelling-${item.toLowerCase()}`}
                >
                  {swelling === item && <Check size={14} style={{ color: 'var(--accent-cyan)' }}/>}
                  {item}
                </button>
              ))}
            </div>

            {/* Sleep Choice */}
            <div className="field-title">
              <span>Last night’s sleep</span>
            </div>
            <div className="sleep-choice">
              {[
                { value: 'Restful', label: 'Restful' },
                { value: 'Good', label: 'Okay' },
                { value: 'Fair', label: 'Interrupted' },
                { value: 'Rough', label: 'Poor' },
              ].map((item) => (
                <button 
                  key={item.value}
                  className={`choice ${sleep === item.value ? 'selected' : ''}`}
                  onClick={() => setSleep(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Save Row */}
            <div className="save-row">
              <span className="muted small">Shared securely with your care team.</span>
              <button className="btn btn-primary" onClick={saveCheckin} data-testid="button-save-checkin">
                <Check size={15}/>{saved ? 'Check-in saved' : 'Save check-in'}
              </button>
            </div>
          </section>

          <section className="panel patient-note-card">
            <div className="section-head">
              <div>
                <h2>Message your physiotherapist</h2>
                <p>Share a question, a change in symptoms, or anything you want discussed at your next review.</p>
              </div>
              <span className="tag tag-indigo">PRIVATE</span>
            </div>
            <label className="sr-only" htmlFor="patient-note">Message for your physiotherapist</label>
            <textarea
              id="patient-note"
              className="form-input"
              rows={4}
              value={patientNote}
              onChange={(event) => { setPatientNote(event.target.value); setNoteSaved(false); }}
              placeholder="For example: My knee felt stiffer than usual after yesterday’s walk."
            />
            <div className="save-row">
              <span className="muted small">Your physiotherapist can see this in the clinical dashboard.</span>
              <button className="btn btn-primary" onClick={() => { updatePatientNotes(patientNote.trim()); setNoteSaved(true); }}>
                <Check size={15}/>{noteSaved ? 'Message saved' : 'Save message'}
              </button>
            </div>
          </section>
        </div>

        <aside>
          {/* Safety information stays visible without interrupting the daily plan. */}
          <div className="notice clinical-safety-notice">
            <ShieldAlert size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0 }}/>
            <span>Stop exercising and contact your physiotherapist if you notice sharp pain, locking, catching, or a sudden increase in swelling.</span>
          </div>

          <section className="panel history">
            <div className="section-head">
              <div>
                <h2>Recent activity</h2>
                <p>Your completed guided sets</p>
              </div>
              <ArrowRight size={16} color="var(--text-muted)"/>
            </div>
            {patient.sessions.length ? (
              patient.sessions.slice(0, 4).map((session) => (
                <div key={session.id} className="history-item">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{session.exercise}</div>
                    <div className="mono small muted">{dateTime(session.date)}</div>
                  </div>
                  <span className="tag" style={{ fontSize: 10, padding: '3px 8px' }}>
                    {session.time}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: 18, fontSize: 12 }}>
                Your completed guided sets will appear here.
              </div>
            )}
          </section>
        </aside>
      </div>

      <VideoPlaylistExplorer
        clips={clips}
        selectedClipId={selectedClipId}
        setSelectedClipId={setSelectedClipId}
        downloadClip={downloadClip}
        deleteClip={deleteClip}
        title="Your recorded workouts"
        subtitle="After you finish a live AI workout, review the video and your recorded knee-angle data here. You can delete any recording you no longer need."
        userRole="patient"
      />

    </>
  );
}

function MasterplanView({ patient }: { patient: Patient }) {
  const [selectedPhaseNum, setSelectedPhaseNum] = useState<number>(patient.currentPhase);
  const currentPlan = RECOVERY_MASTERPLAN.find((p) => p.phase === selectedPhaseNum) || RECOVERY_MASTERPLAN[0];

  return (
    <div className="masterplan-container">
      {/* Overview Banner */}
      <div className="hero-row">
        <div>
          <div className="eyebrow"><Calendar size={13}/> YOUR RECOVERY ROADMAP</div>
          <h1>Your ACL recovery roadmap</h1>
          <div className="muted">
            A four-phase guide from early recovery to return-to-sport testing. Your physiotherapist decides when it is safe to progress.
          </div>
        </div>
        <div className="hero-badges">
          <span className="tag tag-cyan">
            CURRENT: PHASE {patient.currentPhase} (WEEK {Math.ceil(patient.currentDay / 7)})
          </span>
        </div>
      </div>

      {/* 4 Phase Selector Tabs */}
      <div className="phase-nav-grid">
        {RECOVERY_MASTERPLAN.map((phaseItem) => {
          const isCurrent = patient.currentPhase === phaseItem.phase;
          const isSelected = selectedPhaseNum === phaseItem.phase;
          const isCleared = patient.currentPhase > phaseItem.phase;

          return (
            <div 
              key={phaseItem.phase} 
              className={`phase-card-tab ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedPhaseNum(phaseItem.phase)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="mono small" style={{ fontWeight: 700, color: isCurrent ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    PHASE 0{phaseItem.phase}
                  </span>
                  {isCleared && <span className="tag" style={{ fontSize: 9.5, padding: '2px 7px' }}><Check size={10}/> Cleared</span>}
                  {isCurrent && <span className="tag tag-cyan" style={{ fontSize: 9.5, padding: '2px 7px' }}>Active</span>}
                  {!isCleared && !isCurrent && <span className="tag tag-amber" style={{ fontSize: 9.5, padding: '2px 7px' }}><LockKeyhole size={10}/> Gate</span>}
                </div>
                <h3 style={{ fontSize: 15, margin: '2px 0 4px', fontWeight: 700 }}>{phaseItem.name}</h3>
                <div className="muted small">{phaseItem.timeline} · {phaseItem.durationMonths}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Phase Deep Dive */}
      <section className="panel phase-detail-panel">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--accent-cyan)' }}>
              WHAT TO WORK ON NOW
            </div>
            <h2 style={{ fontSize: 26, margin: '6px 0 4px' }}>{currentPlan.name}</h2>
            <div className="muted" style={{ maxWidth: 800, fontSize: 13.5, lineHeight: 1.5 }}>
              {currentPlan.focus}
            </div>
          </div>
          <div className="hero-badges">
            <span className="tag tag-cyan" style={{ fontSize: 12, padding: '6px 14px' }}>
              {currentPlan.timeline} ({currentPlan.durationMonths})
            </span>
          </div>
        </div>

        {/* Phase Goals & Gate Clearance Checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
          <div className="panel" style={{ padding: 20, background: 'var(--bg-card-subtle)' }}>
            <div className="eyebrow" style={{ color: 'var(--accent-emerald)' }}>
              <Trophy size={13}/> PHASE KEY MILESTONES
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentPlan.goals.map((g, idx) => (
                <div key={idx} className="goal-item">
                  <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: 2 }}/>
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: 20, background: 'var(--bg-card-subtle)' }}>
            <div className="eyebrow" style={{ color: 'var(--accent-amber)' }}>
              <LockKeyhole size={13}/> CLEARANCE GATE CRITERIA
            </div>
            <p className="muted small" style={{ margin: '4px 0 10px' }}>
              Must be verified by your lead physiotherapist prior to unlocking the next phase:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentPlan.gateCriteria.map((c, idx) => (
                <div key={idx} className="goal-item">
                  <ShieldAlert size={16} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 2 }}/>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phase Prescribed Exercises Matrix */}
        <div style={{ marginTop: 32 }}>
          <div className="section-head">
            <div>
              <h2>Common exercises in this phase</h2>
              <p>Your own plan may differ—follow the exercises your physiotherapist prescribed.</p>
            </div>
            <span className="tag tag-indigo">
              {currentPlan.exercises.length} exercises
            </span>
          </div>

          <div className="masterplan-exercises-grid">
            {currentPlan.exercises.map((ex) => (
              <div key={ex.id} className="masterplan-exercise-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 16, margin: 0 }}>{ex.name}</h3>
                    <span className="tag" style={{ fontSize: 10 }}>{ex.category}</span>
                  </div>
                  <div className="mono small" style={{ color: 'var(--accent-cyan)', marginTop: 6, fontWeight: 700 }}>
                    {ex.setsReps} · {ex.target}
                  </div>
                  <p className="muted small" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
                    {ex.description}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
                  <span className="small muted">Frequency: <strong>{ex.frequency}</strong></span>
                  <span className="tag tag-cyan" style={{ fontSize: 9.5 }}>Phase {currentPlan.phase}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ClinicianView(props: {
  patients: Patient[];
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  patient: Patient;
  latest: Entry;
  flags: Entry[];
  exportReport: () => void;
  clips: VideoClipEntry[];
  selectedClipId: string | null;
  setSelectedClipId: (id: string) => void;
  downloadClip: (clip: VideoClipEntry) => void;
  deleteClip: (clipId: string) => void;
  openAddExercise: () => void;
  openEditExercise: (ex: Exercise) => void;
  deleteExercise: (exId: string) => void;
  openDemo: (ex: Exercise) => void;
  updatePatientNotes: (notes: string) => void;
  updatePatientPhase: (newPhase: 1 | 2 | 3 | 4) => void;
  openAddPatient: () => void;
  deletePatient: (id: string) => void;
  openProfile: (p: Patient) => void;
  switchToPatientPortal: (id: string) => void;
}) {
  const { 
    patients, selectedPatientId, setSelectedPatientId, patient, latest, flags, 
    exportReport, clips, selectedClipId, setSelectedClipId, downloadClip, deleteClip,
    openAddExercise, openEditExercise, deleteExercise, openDemo, updatePatientNotes,
    updatePatientPhase, openAddPatient, deletePatient, openProfile, switchToPatientPortal
  } = props;

  const [patientSearch, setPatientSearch] = useState('');
  const [notesEdit, setNotesEdit] = useState(patient.clinicianNotes);
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    setNotesEdit(patient.clinicianNotes);
  }, [patient]);

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sport.toLowerCase().includes(q) ||
      p.graft.toLowerCase().includes(q) ||
      `phase ${p.currentPhase}`.toLowerCase().includes(q) ||
      (p.affectedLeg && `${p.affectedLeg} leg`.toLowerCase().includes(q))
    );
  });

  const summary = `Patient ${patient.name} (${patient.sport}) is on Day ${patient.currentDay} of Phase ${patient.currentPhase}. Total check-ins recorded: ${patient.checkins.length}. Latest pain: ${latest?.pain ?? 'N/A'}/10 with ${latest?.swelling?.toLowerCase() ?? 'no'} joint effusion. Adherence score is ${patient.adherenceRate}%.`;

  return (
    <>
      {/* Clinician Overview Header */}
      <div className="hero-row">
        <div>
          <div className="eyebrow">
            <Stethoscope size={13}/> CLINICAL WORKSPACE · CASELOAD DIRECTORY
          </div>
          <h1>Your patient roster</h1>
          <div className="muted">
            Review recovery, update a plan, and prepare for the next conversation.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={exportReport} data-testid="button-export-report">
            <Download size={15}/> Export data
          </button>
        </div>
      </div>

      {/* Patient Switcher Panel */}
      <div className="panel patient-selector-panel">
        <div className="patient-selector-top">
          <div>
            <div className="eyebrow" style={{ color: 'var(--accent-indigo)', marginBottom: 2 }}>
              <Users size={13}/> PATIENTS
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0', letterSpacing: '-0.01em' }}>
              Select a patient
            </h2>
            <p className="muted small" style={{ margin: '4px 0 0' }}>
              Review their progress, update their plan, or record a note.
            </p>
          </div>
          <div className="patient-caseload-badge">
            <span className="patient-caseload-dot" />
            <span>{filteredPatients.length} of {patients.length} patients</span>
          </div>
        </div>

        {/* Minimalistic Search Bar & Register CTA Row */}
        <div className="patient-search-action-bar">
          <div className="patient-search-wrapper">
            <Search size={15} className="patient-search-icon" />
            <input 
              type="text"
              className="patient-search-input"
              placeholder="Search by name, sport, graft, or phase..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              aria-label="Search patients in caseload"
            />
            {patientSearch && (
              <button
                type="button"
                className="patient-search-clear"
                onClick={() => setPatientSearch('')}
                title="Clear search filter"
                aria-label="Clear search filter"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button 
            type="button"
            className="register-patient-cta" 
            onClick={openAddPatient} 
            title="Register a new athlete or patient into clinical caseload"
          >
            <Plus size={15} strokeWidth={2.4}/> Add patient
          </button>
        </div>

        {/* Filtered Patient Chips */}
        {filteredPatients.length > 0 ? (
          <div className="patient-chips">
            {filteredPatients.map((p) => {
              const isSelected = p.id === selectedPatientId;
              return (
                <div 
                  key={p.id}
                  className={`patient-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedPatientId(p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="patient-avatar">{p.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                    <div className="muted small" style={{ fontSize: 11 }}>Phase {p.currentPhase} · {p.sport.split(' ')[0]}</div>
                  </div>
                  <button 
                    type="button" 
                    className="icon-button" 
                    style={{ width: 26, height: 26, marginLeft: 4, borderRadius: 6, opacity: 0.8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openProfile(p);
                    }}
                    title={`View ${p.name}'s Clinical Profile Dossier`}
                  >
                    <User size={12}/>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="patient-search-empty">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Search size={16} />
              <span style={{ fontSize: 13 }}>No patients found matching "<strong>{patientSearch}</strong>"</span>
            </div>
            <button 
              type="button"
              className="btn btn-quiet" 
              style={{ padding: '4px 12px', fontSize: 11.5 }}
              onClick={() => setPatientSearch('')}
            >
              Clear Search Filter
            </button>
          </div>
        )}
      </div>

      {/* Selected Patient Banner */}
      <div className="panel" style={{ padding: '22px 26px', marginBottom: 24, background: 'linear-gradient(135deg, var(--bg-card), var(--bg-card-subtle))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="patient-avatar" style={{ width: 54, height: 54, fontSize: 20 }}>
              {patient.avatar}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 26, margin: 0 }}>{patient.name}</h2>
                <span className="tag tag-cyan" style={{ fontSize: 11 }}>Phase {patient.currentPhase} · Active</span>
              </div>
              <div className="muted small" style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>Age: <strong>{patient.age} yrs</strong></span>
                <span>Sport: <strong>{patient.sport}</strong></span>
                <span>Graft: <strong>{patient.graft}</strong></span>
                <span>Operative Limb: <strong style={{ color: patient.legHighlightColor || 'var(--accent-cyan)' }}>{patient.affectedLeg?.toUpperCase() || 'RIGHT'} LEG</strong></span>
                <span>Surgery Date: <strong>{patient.surgeryDate}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-quiet" onClick={() => openProfile(patient)}>
              <User size={14}/> Clinical Dossier
            </button>
            <button className="btn btn-quiet" onClick={() => switchToPatientPortal(patient.id)}>
              <ExternalLink size={14}/> View Patient Experience
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => deletePatient(patient.id)}
              title="Discharge athlete from active caseload"
            >
              <Trash2 size={14}/> Discharge
            </button>
          </div>
        </div>

        {/* CLINICIAN PHASE PROGRESSION & CLEARANCE SELECTOR */}
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div className="eyebrow" style={{ color: 'var(--accent-emerald)', margin: 0 }}>
              <ShieldAlert size={12}/> REHABILITATION PHASE CLEARANCE & PROGRESSION
            </div>
            <span className="small muted">Evidence-based progression criteria · Click to clear phase transition</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
            {[
              {
                phase: 1,
                title: 'Phase 1: Protection & Mobility',
                weeks: 'Weeks 1–4',
                criteria: 'Terminal lock 180°, effusion < 2+',
                exercises: 'Quad Sets, SLR, Heel Slides, Patellar Mob'
              },
              {
                phase: 2,
                title: 'Phase 2: Neuromuscular Control',
                weeks: 'Weeks 5–12',
                criteria: 'Full flexion 120°+, quad LSI > 70%',
                exercises: 'Wall Sits, Step-Ups, Cycling'
              },
              {
                phase: 3,
                title: 'Phase 3: Strength & Running',
                weeks: 'Weeks 13–20',
                criteria: 'LSI > 80%, pain-free jog, box stick landing',
                exercises: 'Bulgarian Split Squats, Box Jumps, Jogging'
              },
              {
                phase: 4,
                title: 'Phase 4: Sport Agility & RTS',
                weeks: 'Weeks 21–28+',
                criteria: 'Hop tests > 90% LSI, reactive agility clearance',
                exercises: '45° Cutting, Skater Bounds, Deceleration'
              }
            ].map((pItem) => {
              const isActive = patient.currentPhase === pItem.phase;
              const isPast = patient.currentPhase > pItem.phase;
              return (
                <div 
                  key={pItem.phase}
                  onClick={() => updatePatientPhase(pItem.phase as 1 | 2 | 3 | 4)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: isActive ? 'rgba(0, 242, 254, 0.12)' : isPast ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card-subtle)',
                    border: isActive ? '2px solid var(--accent-cyan)' : isPast ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-light)',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 16px rgba(0, 242, 254, 0.2)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                  title={`Click to set ${patient.name} to Phase ${pItem.phase}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: isActive ? 'var(--accent-cyan)' : isPast ? '#10b981' : '#94a3b8' }}>
                      PHASE {pItem.phase} {isActive ? '• ACTIVE' : isPast ? '• COMPLETED' : ''}
                    </span>
                    {isActive ? (
                      <span className="tag" style={{ background: 'var(--accent-cyan)', color: '#000000', fontSize: 9.5, fontWeight: 800, padding: '1px 6px' }}>CURRENT</span>
                    ) : isPast ? (
                      <CheckCircle2 size={13} color="#10b981"/>
                    ) : (
                      <span className="muted small" style={{ fontSize: 10 }}>Click to set</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{pItem.title.split(': ')[1]}</div>
                  <div className="muted small" style={{ fontSize: 10.5, marginTop: 2 }}>{pItem.weeks} · {pItem.criteria}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent-cyan)', marginTop: 4 }}>
                    Exercises: {pItem.exercises}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clinician-to-patient note */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="eyebrow" style={{ color: 'var(--accent-indigo)' }}>
              <Edit3 size={12}/> YOUR NOTE FOR {patient.name.toUpperCase()}
            </span>
            {!editingNotes ? (
              <button className="btn btn-quiet" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEditingNotes(true)}>
                <Edit3 size={12}/> Edit note
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                style={{ padding: '4px 10px', fontSize: 11 }} 
                onClick={() => {
                  updatePatientNotes(notesEdit);
                  setEditingNotes(false);
                }}
              >
                <Check size={12}/> Save note
              </button>
            )}
          </div>
          {editingNotes ? (
            <textarea 
              rows={2} 
              className="form-input" 
              value={notesEdit} 
              onChange={(e) => setNotesEdit(e.target.value)}
              placeholder="Write a clear, supportive update for this patient..."
            />
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              "{patient.clinicianNotes}"
            </p>
          )}
        </div>
      </div>

      <section className="panel clinician-message-card">
        <div className="section-head">
          <div>
            <h2>Patient message</h2>
            <p>What {patient.name.split(' ')[0]} wants you to know before the next review.</p>
          </div>
          <span className="tag tag-indigo">PATIENT → PHYSIO</span>
        </div>
        {patient.patientNotes ? (
          <p className="patient-message-copy">“{patient.patientNotes}”</p>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>No patient message yet.</p>
        )}
      </section>

      {/* Alter Exercises & Protocol Management */}
      <section className="panel" style={{ padding: 24, marginBottom: 24 }}>
        <div className="exercise-mgmt-head">
          <div>
            <div className="eyebrow" style={{ color: 'var(--accent-cyan)' }}>
              <Dumbbell size={13}/> REHABILITATION PROTOCOL MANAGEMENT
            </div>
            <h2 style={{ fontSize: 20, margin: '4px 0 0' }}>
              Prescribed Protocol for {patient.name}
            </h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              Customize joint kinematic targets, hold durations, and safety cues for this athlete.
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAddExercise}>
            <Plus size={15}/> Add Prescribed Exercise
          </button>
        </div>

        <div>
          {patient.prescribedExercises.map((ex) => (
            <div key={ex.id} className="mgmt-exercise-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="exercise-thumb" style={{ minHeight: 46, width: 46, height: 46, borderRadius: 10 }}>
                  <Art kind={ex.icon}/>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 14.5 }}>{ex.name}</strong>
                    {ex.category && <span className="tag" style={{ fontSize: 9.5, padding: '2px 6px' }}>{ex.category}</span>}
                  </div>
                  <div className="mono small" style={{ color: 'var(--accent-cyan)', marginTop: 2 }}>
                    Target: {ex.target} · {ex.seconds}s continuous hold
                  </div>
                  <div className="muted small" style={{ marginTop: 2 }}>
                    Safety Cue: {ex.warning}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-quiet" style={{ padding: '6px 12px', fontSize: 11.5 }} onClick={() => openDemo(ex)} title="Preview biomechanical character demo">
                  <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }}/> Preview Demo
                </button>
                <button className="btn btn-quiet" style={{ padding: '6px 12px', fontSize: 11.5 }} onClick={() => openEditExercise(ex)}>
                  <Edit3 size={13}/> Edit Protocol
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '6px 10px', fontSize: 11.5 }} 
                  onClick={() => deleteExercise(ex.id)}
                  title="Remove exercise from prescription"
                >
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CLINICAL REPORT DASHBOARD (MATCHING REFERENCE UI) */}
      <PhysioClinicalReport 
        patient={patient}
        latest={latest}
        flags={flags}
        exportReport={exportReport}
      />

      <VideoPlaylistExplorer
        clips={clips}
        selectedClipId={selectedClipId}
        setSelectedClipId={setSelectedClipId}
        downloadClip={downloadClip}
        deleteClip={deleteClip}
        title="Recorded live workouts"
        subtitle="Select any workout to review the video alongside its recorded knee-angle data."
        userRole="clinician"
      />

    </>
  );
}

export interface RawVideoClipRecord {
  id: string;
  patientId: string;
  at: string;
  exercise: string;
  duration: number;
  blob: Blob;
  telemetry: TelemetryPoint[];
}

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open('repitch-clips-playlist-v1', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('clips_stack')) {
        db.createObjectStore('clips_stack', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVideoClip(record: RawVideoClipRecord): Promise<void> {
  const db = await openVideoDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('clips_stack', 'readwrite');
    tx.objectStore('clips_stack').put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadAllVideoClips(): Promise<RawVideoClipRecord[]> {
  try {
    const db = await openVideoDb();
    return new Promise<RawVideoClipRecord[]>((resolve, reject) => {
      const tx = db.transaction('clips_stack', 'readonly');
      const store = tx.objectStore('clips_stack');
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result || []) as RawVideoClipRecord[];
        results.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

async function deleteVideoClipFromDb(id: string): Promise<void> {
  try {
    const db = await openVideoDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('clips_stack', 'readwrite');
      tx.objectStore('clips_stack').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export default App;

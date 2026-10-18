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
  FileText, 
  Flame, 
  HeartPulse, 
  Laptop,
  LockKeyhole, 
  Moon, 
  Play, 
  Plus,
  RotateCcw,
  ShieldAlert, 
  Sparkles, 
  Stethoscope, 
  Sun,
  Trash2,
  Trophy,
  User,
  Users,
  Video, 
  X,
  Zap
} from 'lucide-react';
import { useTheme } from './lib/theme';
import { RECOVERY_MASTERPLAN, type PhasePlan } from './data/recoveryMasterplan';
import { INITIAL_PATIENTS, type Patient, type Exercise, type Swelling, type Entry, type Session } from './data/defaultPatients';

type Role = 'patient' | 'clinician';
type TelemetryPoint = { t: number; angle: number | null; measure: string };
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

const dayStamp = () => new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const dateTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const angleAt = (a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark) => {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!denominator) return null;
  return Math.round(Math.acos(Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / denominator))) * (180 / Math.PI));
};

function Roo() {
  return (
    <svg viewBox="0 0 160 150" aria-label="Roo the kangaroo companion" role="img">
      <ellipse cx="85" cy="139" rx="51" ry="7" fill="currentColor" opacity="0.18"/>
      <path d="M53 105c-9 9-24 15-39 13-5-1-8-5-5-8 3-4 13-6 22-12l19-17" fill="#10b981" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M69 82c-13 5-22 17-21 34 1 14 16 20 42 20 22 0 39-10 39-26 0-15-15-29-31-32z" fill="#059669" stroke="#6ee7b7" strokeWidth="2.5"/>
      <path d="M66 83c-3-14-7-39-2-57 2-8 8-9 12-2l13 36m10 20c6-14 11-36 11-56 0-10 7-12 12-4 9 14 8 43 1 62" fill="#047857" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M70 40c2-13 8-22 12-19 5 4 2 24 1 35m28-1c3-13 7-23 11-20 5 4 2 21 0 31" fill="#065f46"/>
      <ellipse cx="84" cy="69" rx="25" ry="23" fill="#10b981" stroke="#a7f3d0" strokeWidth="2.5"/>
      <ellipse cx="105" cy="78" rx="17" ry="13" fill="#6ee7b7"/>
      <circle cx="91" cy="66" r="2.8" fill="#064e3b"/>
      <ellipse cx="117" cy="77" rx="4" ry="3" fill="#064e3b"/>
      <path d="M68 99c18-10 36-7 46 0l-2 26c-12 10-30 11-44 0z" fill="#d1fae5" opacity="0.9"/>
      <path d="M78 108c12-5 23-5 32 0" fill="none" stroke="#059669" strokeWidth="2"/>
      <path d="M59 128c-9 8-19 9-25 7m91-2c11 8 20 8 27 4" fill="none" stroke="#6ee7b7" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
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
  const [patients, setPatients] = useState<Patient[]>(() => readJson(STORAGE.patients, INITIAL_PATIENTS));
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => readJson(STORAGE.selectedPatientId, INITIAL_PATIENTS[0].id));
  
  // Patient tab switcher: 'routine' vs 'masterplan'
  const [patientTab, setPatientTab] = useState<'routine' | 'masterplan'>('routine');

  // Currently selected patient
  const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const [pain, setPain] = useState(2);
  const [swelling, setSwelling] = useState<Swelling>('Mild');
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
  const [videoUrl, setVideoUrl] = useState('');
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [videoPlaybackTime, setVideoPlaybackTime] = useState(0);

  // Physio modal to edit/create exercise
  const [exerciseModal, setExerciseModal] = useState<{ open: boolean; mode: 'add' | 'edit'; targetEx: Exercise | null }>({ open: false, mode: 'add', targetEx: null });
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formWarning, setFormWarning] = useState('');
  const [formSeconds, setFormSeconds] = useState(5);
  const [formCategory, setFormCategory] = useState('Activation');
  const [formCues, setFormCues] = useState('');

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

  // Keep active exercise in sync when patient changes
  useEffect(() => {
    if (patient.prescribedExercises.length > 0 && !patient.prescribedExercises.some((e) => e.id === exercise.id)) {
      setExercise(patient.prescribedExercises[0]);
    }
  }, [patient]);

  const updateCurrentPatient = (updater: (prev: Patient) => Patient) => {
    setPatients((prevList) => prevList.map((p) => p.id === patient.id ? updater(p) : p));
  };

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((s) => running ? modal === 'guided' ? Math.min(s + 1, exercise.seconds) : s + 1 : s), 1000);
    return () => window.clearInterval(timer);
  }, [running, exercise.seconds, modal]);

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
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.55,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
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

        const drawPose = (landmarks: NormalizedLandmark[] | undefined) => {
          const canvas = poseCanvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video || !video.videoWidth || !video.videoHeight) return;
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          const context = canvas.getContext('2d');
          if (!context) return;
          context.clearRect(0, 0, width, height);
          if (!landmarks) return;
          const connections = PoseLandmarker.POSE_CONNECTIONS;
          context.lineWidth = Math.max(2.5, width / 160);
          context.strokeStyle = '#00f2fe';
          context.fillStyle = '#d8ffff';
          for (const { start: from, end: to } of connections) {
            const a = landmarks[from];
            const b = landmarks[to];
            if (!a || !b || (a.visibility ?? 0) < 0.4 || (b.visibility ?? 0) < 0.4) continue;
            context.beginPath();
            context.moveTo(a.x * width, a.y * height);
            context.lineTo(b.x * width, b.y * height);
            context.stroke();
          }
          for (const point of landmarks) {
            if ((point.visibility ?? 0) < 0.5) continue;
            context.beginPath();
            context.arc(point.x * width, point.y * height, Math.max(2.5, width / 140), 0, Math.PI * 2);
            context.fill();
          }
        };

        const detect = (now: number) => {
          if (stopped) return;
          const video = videoRef.current;
          if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && now - lastInference >= 100) {
            lastInference = now;
            const result = landmarker.detectForVideo(video, now);
            const landmarks = result.landmarks[0];
            drawPose(landmarks);

            let angle: number | null = null;
            let measure = exercise.id.includes('raise') ? 'estimated hip angle' : 'estimated knee angle';
            if (landmarks) {
              const candidates = exercise.id.includes('raise')
                ? [[11, 23, 25], [12, 24, 26]]
                : [[23, 25, 27], [24, 26, 28]];
              const side = candidates
                .map(([a, b, c]) => ({ points: [landmarks[a], landmarks[b], landmarks[c]], confidence: Math.min(landmarks[a]?.visibility ?? 0, landmarks[b]?.visibility ?? 0, landmarks[c]?.visibility ?? 0) }))
                .filter((candidate) => candidate.confidence >= 0.45)
                .sort((a, b) => b.confidence - a.confidence)[0];
              if (side) angle = angleAt(side.points[0], side.points[1], side.points[2]);
            }
            if (exercise.id.includes('patella')) angle = null;
            const message = !landmarks
              ? 'No pose detected. Adjust lighting or include your leg in frame.'
              : angle === null
                ? 'Pose found; ensure full working knee is visible.'
                : 'Live on-device 2D kinematic estimate.';
            if (recordingRef.current && now - lastTelemetryAtRef.current >= 500) {
              lastTelemetryAtRef.current = now;
              telemetryRef.current.push({ t: Math.round((now - recordingStartedAtRef.current) / 100) / 10, angle, measure });
            }
            if (now - lastUiUpdate >= 250) {
              lastUiUpdate = now;
              setPoseState({ status: landmarks ? 'tracking' : 'searching', angle: exercise.id.includes('patella') ? null : angle, measure, message });
            }
          }
          frame = window.requestAnimationFrame(detect);
        };
        frame = window.requestAnimationFrame(detect);
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
    const load = async () => {
      try {
        const db = await openVideoDb();
        const request = db.transaction('clips', 'readonly').objectStore('clips').get('latest');
        request.onsuccess = () => {
          if (request.result?.blob) {
            setVideoUrl(URL.createObjectURL(request.result.blob));
            setVideoMeta(request.result.meta);
            setVideoPlaybackTime(0);
          }
        };
      } catch { /* local video playback is optional */ }
    };
    void load();
  }, []);

  useEffect(() => () => { stream?.getTracks().forEach((track) => track.stop()); }, [stream]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2800); return () => window.clearTimeout(timer); }, [toast]);

  const saveCheckin = () => {
    const newEntry: Entry = { pain, swelling, sleep, date: `${dayStamp()} · saved just now` };
    updateCurrentPatient((p) => ({
      ...p,
      checkins: [newEntry, ...p.checkins]
    }));
    setSaved(true);
    setToast('Daily check-in saved to patient profile.');
    window.setTimeout(() => setSaved(false), 2500);
  };

  const launchGuided = (item: Exercise) => { setExercise(item); setStep(0); setSeconds(0); setRunning(false); setModal('guided'); };
  
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
    setModal(null); 
    setRunning(false); 
    setToast('Session saved! +15 RePitch XP gained.');
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
    stream?.getTracks().forEach((track) => track.stop()); setStream(null); setRunning(false); setRecording(false); setModal(null); setCameraError('');
  };

  const recordVideo = () => {
    if (!stream || !window.MediaRecorder) { setCameraError('Local video recording is unavailable in this browser.'); return; }
    try {
      const recorder = new MediaRecorder(stream); recorderRef.current = recorder; chunksRef.current = [];
      savedAt.current = new Date().toISOString();
      recordingStartedAtRef.current = performance.now();
      lastTelemetryAtRef.current = 0;
      telemetryRef.current = [];
      recordingRef.current = true;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        recordingRef.current = false;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const meta: VideoMeta = { at: savedAt.current, exercise: exercise.name, duration: Math.max(1, Math.round((performance.now() - recordingStartedAtRef.current) / 1000)), telemetry: [...telemetryRef.current] };
        setVideoUrl(URL.createObjectURL(blob)); setVideoMeta(meta); setVideoPlaybackTime(0);
        void saveVideo(blob, meta).then(() => setToast('Clip stored locally on this device.')).catch(() => setCameraError('Clip storage error.'));
        setRecording(false);
      };
      recorder.start(); setSeconds(0); setRunning(true); setRecording(true);
    } catch { setCameraError('Could not start recording.'); }
  };

  const stopRecording = () => { recordingRef.current = false; recorderRef.current?.stop(); setRunning(false); };

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

  const exportReport = () => {
    const reportLatest = patient.checkins[0];
    const reportFlags = patient.checkins.filter((item) => item.pain >= 5 || item.swelling === 'Moderate' || item.swelling === 'Severe');
    const summary = `Patient ${patient.name} (${patient.sport}) is on day ${patient.currentDay} of ${patient.totalDays} (Phase ${patient.currentPhase}). ${patient.checkins.length} check-ins recorded; ${patient.sessions.length} guided sessions completed. Latest pain: ${reportLatest?.pain ?? 'N/A'}/10, ${reportLatest?.swelling ?? 'No'} effusion. Clinician Notes: ${patient.clinicianNotes}`;
    const rows = [
      ['RePitch ACL Recovery Clinical Report', dayStamp()],
      ['Patient Name', patient.name],
      ['Sport / Position', patient.sport],
      ['Surgical Graft', patient.graft],
      ['Surgery Date', patient.surgeryDate],
      ['Current Phase', `Phase ${patient.currentPhase} (Day ${patient.currentDay} of ${patient.totalDays})`],
      ['Adherence Rate', `${patient.adherenceRate}%`],
      ['Clinician Notes', patient.clinicianNotes],
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
  const targetAngle = exercise.id.includes('quad') ? 180 : exercise.id.includes('raise') ? 135 : exercise.id.includes('heel') ? 110 : null;
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
            <span className="brand-tag">ACL Rehabilitation System</span>
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
              <HeartPulse size={15}/> Patient / Athlete
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
                <Dumbbell size={16}/> Today’s Active Routine
              </button>
              <button 
                role="tab"
                aria-selected={patientTab === 'masterplan'}
                className={`nav-tab-btn ${patientTab === 'masterplan' ? 'active' : ''}`}
                onClick={() => setPatientTab('masterplan')}
              >
                <Calendar size={16}/> 6–9 Month Recovery Masterplan
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
                videoUrl={videoUrl} videoMeta={videoMeta}
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
            videoUrl={videoUrl}
            videoMeta={videoMeta}
            videoPlaybackTime={videoPlaybackTime}
            setVideoPlaybackTime={setVideoPlaybackTime}
            openAddExercise={openAddExercise}
            openEditExercise={openEditExercise}
            deleteExercise={deleteExercise}
            updatePatientNotes={(notes) => updateCurrentPatient((p) => ({ ...p, clinicianNotes: notes }))}
          />
        )}

        <div className="footer-note">
          <ShieldAlert size={14} style={{ color: 'var(--accent-amber)' }}/>
          <span>RePitch Clinical Portal · Evidence-based 6–9 month return-to-sport criteria · Local storage</span>
        </div>
      </main>

      {/* Guided and Camera Modals */}
      {modal && (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          {modal === 'guided' ? (
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="guided-title">
              <div className="modal-head">
                <div>
                  <div className="eyebrow"><Sparkles size={12}/> ONE SET · ONE REP PROTOCOL</div>
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
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 22 }}>
                        <button className="btn btn-quiet" disabled={seconds >= exercise.seconds} onClick={() => setRunning(!running)}>
                          <Clock3 size={15}/>{running ? 'Pause timer' : 'Start timer'}
                        </button>
                        <button className="btn btn-primary" disabled={seconds < exercise.seconds} onClick={() => { setStep((value) => value + 1); setRunning(false); setSeconds(0); }}>
                          Finish set<ChevronRight size={15}/>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
                      <button className="btn btn-primary" onClick={() => setStep((value) => value + 1)}>
                        Next step<ChevronRight size={15}/>
                      </button>
                    </div>
                  )}
                  <p className="muted small" style={{ textAlign: 'center', marginTop: 18 }}>
                    Exactly one set of one rep. Prescribed by your physiotherapist.
                  </p>
                </>
              ) : (
                <div className="empty" style={{ border: 0, padding: '36px 20px' }}>
                  <CheckCircle2 size={52} color="var(--accent-emerald)" style={{ margin: '0 auto 14px' }}/>
                  <h3 style={{ fontSize: 22, margin: '0 0 6px' }}>Set Complete!</h3>
                  <p className="muted" style={{ margin: '0 0 20px' }}>
                    Great work. Your rep has been logged to your recovery progress.
                  </p>
                  <button className="btn btn-primary" onClick={completeSession}>
                    <Check size={16}/> Save completion
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="camera-title">
              <div className="modal-head">
                <div>
                  <div className="eyebrow"><Zap size={12}/> AI COMPUTER VISION ASSIST</div>
                  <h2 id="camera-title">{exercise.name}</h2>
                  <div className="muted small">100% On-device pose estimation. Video frames are never uploaded.</div>
                </div>
                <button className="icon-button" onClick={closeModal} aria-label="Close camera">
                  <X size={18}/>
                </button>
              </div>

              {stream ? (
                <div className="camera-stage">
                  <video ref={videoRef} className="camera-view" autoPlay muted playsInline/>
                  <div className="camera-overlay">
                    <canvas ref={poseCanvasRef} className="pose-canvas" aria-hidden="true"/>
                    <div className="alignment-frame"/>
                  </div>
                </div>
              ) : (
                <div className="empty">
                  <Camera size={34} style={{ color: 'var(--accent-cyan)', margin: '0 auto 12px' }}/>
                  <p>{cameraError || 'Request camera access to see live joint tracking.'}</p>
                  {!cameraError && (
                    <button className="btn btn-primary" onClick={() => void startCamera(exercise)}>
                      <Camera size={15}/> Enable camera
                    </button>
                  )}
                </div>
              )}

              {stream && (
                <div className={`pose-readout ${poseState.status === 'error' ? 'pose-error' : ''}`} role="status">
                  <div>
                    <span className={`pose-dot ${poseState.status}`}/>
                    <strong>
                      {poseState.status === 'loading' ? 'Loading pose model' : poseState.status === 'error' ? 'Pose estimate unavailable' : poseState.status === 'searching' ? 'Looking for pose' : 'On-device pose estimate'}
                    </strong>
                  </div>
                  <p>{poseState.message}</p>
                  {poseState.angle !== null && (
                    <span className="mono pose-angle">
                      {poseState.angle}° <small>{poseState.measure}</small>
                    </span>
                  )}
                  {targetAngle !== null && (
                    <p className="pose-reference">
                      Plan reference: <strong>{targetAngle}°</strong>. {poseState.angle === null ? 'Compare from a clear lateral view.' : `Current estimate differs by ${Math.abs(poseState.angle - targetAngle)}°.`}
                    </p>
                  )}
                </div>
              )}

              {cameraError && (
                <div className="flag" style={{ marginTop: 14 }}>
                  <CircleHelp size={16}/>
                  <span>{cameraError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                {stream && (
                  <button className={`btn ${recording ? 'btn-danger' : 'btn-primary'}`} onClick={recording ? stopRecording : recordVideo}>
                    {recording ? (
                      <>
                        <span className="tag" style={{ background: '#51232a', color: '#ffb3b3' }}>REC {formattedTimer}</span>
                        Stop and save clip
                      </>
                    ) : (
                      <>
                        <Video size={16}/> Record local clip · max 30s
                      </>
                    )}
                  </button>
                )}
                <button className="btn" onClick={() => { closeModal(); launchGuided(exercise); }}>
                  <Play size={15}/> Use guided set
                </button>
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
                  {exerciseModal.mode === 'add' ? 'Prescribe New Exercise' : 'Alter Prescribed Exercise'}
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
                  <Check size={16}/> {exerciseModal.mode === 'add' ? 'Add to Patient Routine' : 'Save Alterations'}
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
  videoUrl: string; videoMeta: VideoMeta | null;
}) {
  const { patient, pain, setPain, swelling, setSwelling, sleep, setSleep, saveCheckin, saved, launchGuided, startCamera, videoUrl, videoMeta } = props;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const painColor = pain <= 3 ? 'var(--accent-emerald)' : pain <= 6 ? 'var(--accent-amber)' : 'var(--accent-rose)';
  const painLabel = pain <= 2 ? 'Minimal / Low' : pain <= 4 ? 'Mild discomfort' : pain <= 6 ? 'Moderate ache' : 'Elevated pain';

  return (
    <>
      {/* Hero Welcome */}
      <div className="hero-row">
        <div>
          <div className="eyebrow">
            <Calendar size={13}/>
            PHASE {patient.currentPhase} REHABILITATION · DAY {patient.currentDay} OF {patient.totalDays}
          </div>
          <h1>{greeting}, {patient.name.split(' ')[0]}.</h1>
          <div className="muted">
            {patient.sport} · {patient.graft}
          </div>
        </div>
        <div className="hero-badges">
          <span className="tag tag-cyan">
            <Activity size={12}/> {patient.adherenceRate}% ADHERENCE
          </span>
          <span className="tag">
            <HeartPulse size={12}/> PHASE {patient.currentPhase} ACTIVE
          </span>
        </div>
      </div>

      {/* Clinician's Direct Note to Patient */}
      {patient.clinicianNotes && (
        <div className="panel" style={{ padding: '16px 20px', marginBottom: 22, background: 'var(--accent-indigo-light)', borderColor: 'var(--accent-indigo)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Stethoscope size={20} color="var(--accent-indigo)" style={{ flexShrink: 0, marginTop: 2 }}/>
            <div>
              <div className="eyebrow" style={{ color: 'var(--accent-indigo)' }}>PHYSIOTHERAPIST NOTE FOR YOU</div>
              <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontSize: 13.5, lineHeight: 1.5, fontWeight: 500 }}>
                "{patient.clinicianNotes}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modern 4 KPI Cards */}
      <div className="stats">
        <div className="panel stat">
          <div className="stat-header">
            <span className="stat-label">Recovery Day</span>
            <div className="stat-icon"><Activity size={18}/></div>
          </div>
          <div>
            <div className="stat-value">
              {patient.currentDay}<span className="muted small"> / {patient.totalDays}</span>
            </div>
            <div className="stat-detail">
              <span className="tag tag-cyan" style={{ fontSize: 10, padding: '2px 7px' }}>Phase {patient.currentPhase}</span>
              <span>Week {Math.ceil(patient.currentDay / 7)}</span>
            </div>
          </div>
        </div>

        <div className="panel stat">
          <div className="stat-header">
            <span className="stat-label">Rehab Streak</span>
            <div className="stat-icon" style={{ color: 'var(--accent-amber)', background: 'var(--accent-amber-light)' }}>
              <Flame size={18}/>
            </div>
          </div>
          <div>
            <div className="stat-value">
              {patient.streakDays} <span style={{ fontSize: 16, fontWeight: 600 }}>Days</span>
            </div>
            <div className="stat-detail">
              <span>🔥 Consecutive check-ins</span>
            </div>
          </div>
        </div>

        <div className="panel stat">
          <div className="stat-header">
            <span className="stat-label">RePitch XP</span>
            <div className="stat-icon" style={{ color: 'var(--accent-emerald)', background: 'var(--accent-emerald-light)' }}>
              <Trophy size={18}/>
            </div>
          </div>
          <div>
            <div className="stat-value">{patient.repitchPoints} <span className="small muted">XP</span></div>
            <div className="stat-detail">
              <Award size={13} color="var(--accent-emerald)"/>
              <span>Level {Math.floor(patient.repitchPoints / 250) + 1} Rebounder</span>
            </div>
          </div>
        </div>

        <div className="panel stat">
          <div className="stat-header">
            <span className="stat-label">Adherence</span>
            <div className="stat-icon" style={{ color: 'var(--accent-indigo)', background: 'var(--accent-indigo-light)' }}>
              <CheckCircle2 size={18}/>
            </div>
          </div>
          <div>
            <div className="stat-value">{patient.adherenceRate}%</div>
            <div className="stat-detail">
              <span>{patient.sessions.length} sets completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="content-grid">
        <div>
          {/* Daily Check-in Form */}
          <section className="panel checkin">
            <div className="section-head">
              <div>
                <h2>Daily Symptom Check-in</h2>
                <p>Tracking your pain and effusion helps your physiotherapist calibrate your exercise load.</p>
              </div>
              <span className="tag tag-cyan">TODAY</span>
            </div>

            {/* Pain Slider */}
            <div className="field-title">
              <span>Reported Pain Level</span>
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
                aria-label="Pain from 1 to 10" 
                className="range" 
                type="range" 
                min="1" 
                max="10" 
                value={pain} 
                onChange={(e) => setPain(Number(e.target.value))}
              />
            </div>
            <div className="muted small" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span>1 · No pain</span>
              <span>5 · Noticeable</span>
              <span>10 · Severe</span>
            </div>

            {/* Swelling Choice */}
            <div className="field-title">
              <span>Joint Effusion / Swelling</span>
            </div>
            <div className="choice-row">
              {(['Mild', 'Moderate', 'Severe'] as Swelling[]).map((item) => (
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
              <span>Rest & Sleep Quality</span>
            </div>
            <div className="sleep-choice">
              {['Restful', 'Good', 'Fair', 'Rough'].map((item) => (
                <button 
                  key={item} 
                  className={`choice ${sleep === item ? 'selected' : ''}`} 
                  onClick={() => setSleep(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Save Row */}
            <div className="save-row">
              <span className="muted small">🔒 Stored locally in your athlete profile.</span>
              <button className="btn btn-primary" onClick={saveCheckin} data-testid="button-save-checkin">
                <Check size={15}/>{saved ? 'Saved Successfully' : 'Save Today’s Check-in'}
              </button>
            </div>
          </section>

          {/* Active Prescribed Exercises */}
          <section className="exercise-section">
            <div className="section-head">
              <div>
                <h2>Prescribed Daily Routine ({patient.prescribedExercises.length} Exercises)</h2>
                <p>Prescribed specifically for your recovery phase by your physiotherapist.</p>
              </div>
              <span className="tag">
                <CheckCircle2 size={13}/> {patient.sessions.length} logged
              </span>
            </div>
            <div className="exercise-grid">
              {patient.prescribedExercises.map((item) => (
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
                      <button className="btn btn-primary" onClick={() => launchGuided(item)}>
                        <Play size={13}/> Start Guided Set
                      </button>
                      <button className="btn btn-quiet" onClick={() => void startCamera(item)}>
                        <Camera size={13}/> AI Camera
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside>
          {/* Recovery Companion Roo Card */}
          <section className="panel roo-card">
            <div>
              <div className="eyebrow" style={{ color: 'var(--accent-emerald)' }}>
                <Sparkles size={13}/> RECOVERY COMPANION
              </div>
              <h2>Roo is with you.</h2>
              <p>
                {pain >= 6 || swelling === 'Severe'
                  ? 'Your joint requires extra rest today. Consult your physiotherapist before adding loading.'
                  : `Solid effort today, ${patient.name.split(' ')[0]}! Stay diligent with your terminal extension locks.`}
              </p>
              <div className="points">
                <Sparkles size={13}/>
                <span>Every steady repetition counts</span>
              </div>
            </div>
            <div className="roo-art">
              <Roo/>
            </div>
          </section>

          {/* Clinical safety disclaimer */}
          <div className="notice" style={{ marginTop: 16 }}>
            <ShieldAlert size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0 }}/>
            <span>Stop immediately if any movement causes catching or sharp joint line pain.</span>
          </div>

          {/* Recent progress list */}
          <section className="panel history">
            <div className="section-head">
              <div>
                <h2>Recent Sets</h2>
                <p>Saved on this device</p>
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
                Completed guided sets will appear here.
              </div>
            )}
          </section>

          {/* Video Player */}
          {videoUrl && (
            <section className="panel video-box">
              <div className="section-head">
                <div>
                  <h2>Recorded Camera Clip</h2>
                  <p>Local clip · {videoMeta?.exercise || 'Exercise'}</p>
                </div>
                <Video size={18} color="var(--accent-cyan)"/>
              </div>
              <video controls src={videoUrl} style={{ width: '100%', borderRadius: 12 }}/>
              <div className="muted small" style={{ marginTop: 8 }}>
                {videoMeta?.at ? dateTime(videoMeta.at) : 'Saved locally'} · {videoMeta?.duration ?? 0}s · not uploaded
              </div>
            </section>
          )}
        </aside>
      </div>
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
          <div className="eyebrow"><Calendar size={13}/> COMPLETE RETURN-TO-SPORT ROADMAP</div>
          <h1>6–9 Month ACL Recovery Protocol</h1>
          <div className="muted">
            Evidence-based 4-phase clinical pathway from acute post-op recovery to full athletic cutting and clearance.
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
              PHASE {currentPlan.phase} OBJECTIVES & CRITERIA
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
              <h2>Phase {currentPlan.phase} Core Clinical Exercises</h2>
              <p>Gold-standard protocols prescribed for {currentPlan.name}.</p>
            </div>
            <span className="tag tag-indigo">
              {currentPlan.exercises.length} Clinical Exercises
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
  videoUrl: string;
  videoMeta: VideoMeta | null;
  videoPlaybackTime: number;
  setVideoPlaybackTime: (time: number) => void;
  openAddExercise: () => void;
  openEditExercise: (ex: Exercise) => void;
  deleteExercise: (exId: string) => void;
  updatePatientNotes: (notes: string) => void;
}) {
  const { 
    patients, selectedPatientId, setSelectedPatientId, patient, latest, flags, 
    exportReport, videoUrl, videoMeta, videoPlaybackTime, setVideoPlaybackTime,
    openAddExercise, openEditExercise, deleteExercise, updatePatientNotes
  } = props;

  const [notesEdit, setNotesEdit] = useState(patient.clinicianNotes);
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    setNotesEdit(patient.clinicianNotes);
  }, [patient]);

  const summary = `Patient ${patient.name} (${patient.sport}) is on Day ${patient.currentDay} of Phase ${patient.currentPhase}. Total check-ins recorded: ${patient.checkins.length}. Latest pain: ${latest?.pain ?? 'N/A'}/10 with ${latest?.swelling?.toLowerCase() ?? 'no'} joint effusion. Adherence score is ${patient.adherenceRate}%.`;
  const angleSamples = videoMeta?.telemetry?.filter((sample) => sample.angle !== null) ?? [];
  const currentSample = angleSamples.reduce<TelemetryPoint | null>((closest, sample) => !closest || Math.abs(sample.t - videoPlaybackTime) < Math.abs(closest.t - videoPlaybackTime) ? sample : closest, null);

  return (
    <>
      {/* Clinician Overview Header */}
      <div className="hero-row">
        <div>
          <div className="eyebrow">
            <Stethoscope size={13}/> CLINICIAN WORKSPACE · ACTIVE PATIENT MANAGEMENT
          </div>
          <h1>Physiotherapist Clinical Dashboard</h1>
          <div className="muted">
            Manage multi-athlete recovery journeys, alter prescribed exercises, and inspect on-device telemetry.
          </div>
        </div>
        <button className="btn btn-primary" onClick={exportReport} data-testid="button-export-report">
          <Download size={15}/> Export Patient CSV Report
        </button>
      </div>

      {/* Patient Switcher Panel */}
      <div className="panel patient-selector-panel">
        <div>
          <div className="eyebrow" style={{ color: 'var(--accent-indigo)' }}>
            <Users size={13}/> SELECT ACTIVE PATIENT ({patients.length} ATHLETES IN CARE)
          </div>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Click on any patient below to switch records, review progress, and alter their exercise protocol.
          </p>
        </div>

        <div className="patient-chips">
          {patients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            return (
              <div 
                key={p.id}
                className={`patient-chip ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedPatientId(p.id)}
              >
                <div className="patient-avatar">{p.avatar}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                  <div className="muted small" style={{ fontSize: 11 }}>Phase {p.currentPhase} · Day {p.currentDay}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Patient Banner */}
      <div className="panel" style={{ padding: '22px 26px', marginBottom: 24, background: 'linear-gradient(135deg, var(--bg-card), var(--bg-card-subtle))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 26, margin: 0 }}>{patient.name}</h2>
              <span className="tag tag-cyan">Phase {patient.currentPhase} Active</span>
            </div>
            <div className="muted small" style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Age: <strong>{patient.age}</strong></span>
              <span>Sport: <strong>{patient.sport}</strong></span>
              <span>Graft: <strong>{patient.graft}</strong></span>
              <span>Surgery Date: <strong>{patient.surgeryDate}</strong></span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="mono" style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-cyan)' }}>
              {patient.adherenceRate}%
            </span>
            <div className="muted small">Rehab Adherence Score</div>
          </div>
        </div>

        {/* Clinician Notes Box */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="eyebrow" style={{ color: 'var(--accent-indigo)' }}>
              <Edit3 size={12}/> CLINICIAN PRESCRIPTION NOTES (VISIBLE TO PATIENT)
            </span>
            {!editingNotes ? (
              <button className="btn btn-quiet" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEditingNotes(true)}>
                <Edit3 size={12}/> Edit Note
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
                <Check size={12}/> Save Note
              </button>
            )}
          </div>
          {editingNotes ? (
            <textarea 
              rows={2} 
              className="form-input" 
              value={notesEdit} 
              onChange={(e) => setNotesEdit(e.target.value)}
            />
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              "{patient.clinicianNotes}"
            </p>
          )}
        </div>
      </div>

      {/* Alter Exercises & Protocol Management */}
      <section className="panel" style={{ padding: 24, marginBottom: 24 }}>
        <div className="exercise-mgmt-head">
          <div>
            <div className="eyebrow" style={{ color: 'var(--accent-cyan)' }}>
              <Dumbbell size={13}/> ALTER & PRESCRIBE PATIENT EXERCISES
            </div>
            <h2 style={{ fontSize: 20, margin: '4px 0 0' }}>
              Active Exercise Routine for {patient.name}
            </h2>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              Add new exercises, modify joint angle targets, hold duration, or safety cues.
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAddExercise}>
            <Plus size={15}/> Prescribe New Exercise
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
                    Target: {ex.target} · {ex.seconds}s duration
                  </div>
                  <div className="muted small" style={{ marginTop: 2 }}>
                    Warning: {ex.warning}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-quiet" style={{ padding: '6px 12px', fontSize: 11.5 }} onClick={() => openEditExercise(ex)}>
                  <Edit3 size={13}/> Alter / Edit
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '6px 10px', fontSize: 11.5 }} 
                  onClick={() => deleteExercise(ex.id)}
                  title="Remove exercise"
                >
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grid: Automated Summary & Check-ins */}
      <div className="clinician-grid">
        <section className="panel report">
          <div className="section-head">
            <div>
              <h2>Automated Clinical Summary</h2>
              <p>Generated from patient input · {dayStamp()}</p>
            </div>
            <FileText size={18} color="var(--accent-cyan)"/>
          </div>
          <div className="step-box">
            <div className="eyebrow">RECOVERY SYNTHESIS</div>
            <p>{summary}</p>
          </div>

          <div className="field-title" style={{ marginTop: 20 }}>
            <span>Clinical Review Flags</span>
            <span className="mono muted">{flags.length} flagged</span>
          </div>

          {flags.length ? (
            flags.slice(0, 4).map((item, i) => (
              <div className="flag" key={`${item.date}-${i}`}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }}/>
                <span>
                  <strong>{item.date}:</strong> Reported pain {item.pain}/10 with {item.swelling.toLowerCase()} joint effusion.
                </span>
              </div>
            ))
          ) : (
            <div className="notice">
              <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ flexShrink: 0 }}/>
              <span>No pain (&ge;5) or effusion flags in recent patient logs.</span>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={exportReport}>
              <Download size={14}/> Download Patient CSV Summary
            </button>
          </div>
        </section>

        {/* Check-ins & Session Tables */}
        <section className="panel report">
          <div className="section-head">
            <div>
              <h2>Patient Log History</h2>
              <p>Recent check-in entries for {patient.name}</p>
            </div>
            <HeartPulse size={18} color="var(--accent-cyan)"/>
          </div>
          {patient.checkins.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pain</th>
                    <th>Effusion</th>
                    <th>Sleep</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.checkins.slice(0, 8).map((entry, i) => (
                    <tr key={`${entry.date}-${i}`}>
                      <td style={{ fontWeight: 500 }}>{entry.date}</td>
                      <td>
                        <span className="mono" style={{ color: entry.pain >= 5 ? 'var(--accent-rose)' : 'inherit', fontWeight: 600 }}>
                          {entry.pain} / 10
                        </span>
                      </td>
                      <td>
                        <span className={`tag ${entry.swelling === 'Severe' ? 'tag-amber' : ''}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                          {entry.swelling}
                        </span>
                      </td>
                      <td>{entry.sleep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No check-ins recorded yet.</div>
          )}

          <div className="field-title" style={{ marginTop: 24 }}>
            <span>Completed Guided Sets</span>
            <span className="mono muted">{patient.sessions.length} sessions</span>
          </div>

          {patient.sessions.length ? (
            patient.sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="history-item">
                <span className="small" style={{ fontWeight: 600 }}>{session.exercise}</span>
                <span className="mono small muted">{dateTime(session.date)}</span>
              </div>
            ))
          ) : (
            <div className="empty">No guided sets completed in this demo yet.</div>
          )}
        </section>
      </div>

      {/* Video & Telemetry Explorer */}
      <section className="panel video-box" style={{ marginTop: 24 }}>
        <div className="section-head">
          <div>
            <h2>Session Video & Joint Telemetry</h2>
            <p>On-device recorded clip with synchronized 2D joint angle estimates.</p>
          </div>
          <Video size={18} color="var(--accent-cyan)"/>
        </div>

        {videoUrl && videoMeta ? (
          <div className="clinician-grid">
            <video 
              controls 
              src={videoUrl} 
              onTimeUpdate={(event) => setVideoPlaybackTime(event.currentTarget.currentTime)} 
              style={{ width: '100%', borderRadius: 14, maxHeight: 340, background: '#000000' }}
            />
            <div>
              <div className="eyebrow">TELEMETRY ANALYSIS</div>
              <h3 style={{ fontSize: 18, margin: '6px 0 2px' }}>{videoMeta.exercise}</h3>
              <p className="muted small">{dateTime(videoMeta.at)}</p>
              <div className="notice" style={{ margin: '12px 0' }}>
                <Clock3 size={14} style={{ flexShrink: 0 }}/>
                <span>Clip Duration: {videoMeta.duration}s · Playback Time: {videoPlaybackTime.toFixed(1)}s</span>
              </div>

              {angleSamples.length ? (
                <>
                  <div className="pose-readout" style={{ marginTop: 14 }}>
                    <strong>Nearest Angle Estimate</strong>
                    <span className="mono pose-angle">
                      {currentSample?.angle ?? '—'}° 
                      <small>{currentSample?.measure} · {currentSample?.t.toFixed(1)}s</small>
                    </span>
                  </div>
                  <div className="telemetry-list">
                    <div className="field-title" style={{ margin: '14px 0 6px' }}>
                      <span>Angle Samples Timeline</span>
                      <span className="mono muted">{angleSamples.length} points</span>
                    </div>
                    {angleSamples.map((sample, index) => (
                      <div 
                        className={`telemetry-row ${sample === currentSample ? 'active' : ''}`} 
                        key={`${sample.t}-${index}`}
                      >
                        <span className="mono muted">{sample.t.toFixed(1)}s</span>
                        <span style={{ fontWeight: 600 }}>
                          {sample.angle}° <small className="muted">{sample.measure}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="notice" style={{ marginTop: 14 }}>
                  No joint angle samples available.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty">
            <Video size={32} style={{ color: 'var(--accent-cyan)', margin: '0 auto 12px' }}/>
            <p>No recorded session clip is stored on this device.</p>
            <span className="small muted">Patients can capture a local 30-second guided clip from the camera flow.</span>
          </div>
        )}
      </section>
    </>
  );
}

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open('repitch-local-media', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('clips');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveVideo(blob: Blob, meta: { at: string; exercise: string; duration: number }) {
  const db = await openVideoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('clips', 'readwrite');
    tx.objectStore('clips').put({ blob, meta }, 'latest');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export default App;

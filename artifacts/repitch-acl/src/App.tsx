import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { Activity, ArrowRight, Award, Camera, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Download, Dumbbell, FileText, Flame, HeartPulse, LockKeyhole, Moon, Play, ShieldAlert, Sparkles, Stethoscope, Video, X } from 'lucide-react';

type Role = 'patient' | 'clinician';
type Swelling = 'Mild' | 'Moderate' | 'Severe';
type Entry = { pain: number; swelling: Swelling; sleep: string; date: string };
type Session = { id: string; exercise: string; date: string; time: string; completed: boolean };
type TelemetryPoint = { t: number; angle: number | null; measure: string };
type VideoMeta = { at: string; exercise: string; duration: number; telemetry?: TelemetryPoint[] };
type Exercise = { id: string; name: string; target: string; warning: string; icon: 'activity' | 'leg' | 'bend' | 'hand'; seconds: number; cues: string[] };
const EXERCISES: Exercise[] = [
  { id: 'quad', name: 'Quad Sets with Isometric Lock', target: '5s hold · 180° knee extension', warning: 'Stop if you feel sharp or increasing pain.', icon: 'activity', seconds: 5, cues: ['Lie comfortably with your leg supported.', 'Gently tighten the muscle above your knee.', 'Hold the comfortable contraction for 5 seconds.'] },
  { id: 'raise', name: 'Straight Leg Raise', target: '45° elevation · 135° hip target', warning: 'Keep the knee straight; stop if it begins to bend.', icon: 'leg', seconds: 5, cues: ['Lie on your back with the working leg straight.', 'Brace your thigh, then lift to a comfortable height.', 'Pause briefly, then lower with control.'] },
  { id: 'heel', name: 'Heel Slides', target: '110° flexion target', warning: 'Move slowly and stay within your clinician-approved range.', icon: 'bend', seconds: 5, cues: ['Lie on your back with your heel resting on the floor.', 'Slide your heel toward you at a comfortable pace.', 'Pause at your comfortable end range, then return.'] },
  { id: 'patella', name: 'Patellar Mobilizations', target: '60 seconds', warning: 'Use only the direction and pressure shown by your clinician.', icon: 'hand', seconds: 60, cues: ['Sit with your leg relaxed and supported.', 'Use gentle, small movements around the kneecap.', 'Stop if the area becomes uncomfortable.'] },
];
const STORAGE = { checkins: 'repitch.checkins.v1', sessions: 'repitch.sessions.v1', role: 'repitch.role.v1' };
const readJson = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
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
  return <svg viewBox="0 0 160 150" aria-label="Roo the kangaroo companion" role="img">
    <ellipse cx="85" cy="139" rx="51" ry="7" fill="#05171a" opacity=".45"/><path d="M53 105c-9 9-24 15-39 13-5-1-8-5-5-8 3-4 13-6 22-12l19-17" fill="#78d8b6" stroke="#b6ffdf" strokeWidth="3" strokeLinecap="round"/>
    <path d="M69 82c-13 5-22 17-21 34 1 14 16 20 42 20 22 0 39-10 39-26 0-15-15-29-31-32z" fill="#68cfa9" stroke="#c1ffe3" strokeWidth="3"/>
    <path d="M66 83c-3-14-7-39-2-57 2-8 8-9 12-2l13 36m10 20c6-14 11-36 11-56 0-10 7-12 12-4 9 14 8 43 1 62" fill="#66cda6" stroke="#c1ffe3" strokeWidth="3" strokeLinecap="round"/>
    <path d="M70 40c2-13 8-22 12-19 5 4 2 24 1 35m28-1c3-13 7-23 11-20 5 4 2 21 0 31" fill="#367f6d"/>
    <ellipse cx="84" cy="69" rx="25" ry="23" fill="#83dfbc" stroke="#c1ffe3" strokeWidth="3"/><ellipse cx="105" cy="78" rx="17" ry="13" fill="#a8efd0"/>
    <circle cx="91" cy="66" r="2.7" fill="#102521"/><ellipse cx="117" cy="77" rx="4" ry="3" fill="#19312b"/>
    <path d="M68 99c18-10 36-7 46 0l-2 26c-12 10-30 11-44 0z" fill="#e6f5d2" opacity=".8"/><path d="M78 108c12-5 23-5 32 0" fill="none" stroke="#8fdfbc" strokeWidth="2"/>
    <path d="M59 128c-9 8-19 9-25 7m91-2c11 8 20 8 27 4" fill="none" stroke="#d4ffea" strokeWidth="5" strokeLinecap="round"/>
  </svg>;
}

function Art({ kind }: { kind: Exercise['icon'] }) {
  if (kind === 'hand') return <Activity size={29} strokeWidth={1.5}/>;
  if (kind === 'bend') return <svg width="50" height="43" viewBox="0 0 50 43" fill="none"><path d="M7 32h16l8-13 13-8M23 32l8-8 11 3" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="31" cy="19" r="3" fill="currentColor"/></svg>;
  if (kind === 'leg') return <svg width="50" height="43" viewBox="0 0 50 43" fill="none"><path d="M19 5v18l19 10M19 22l-9 12m9-12 10 4" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="19" cy="22" r="3" fill="currentColor"/></svg>;
  return <Dumbbell size={29} strokeWidth={1.5}/>;
}

function App() {
  const [role, setRole] = useState<Role>(() => readJson(STORAGE.role, 'patient' as Role));
  const [checkins, setCheckins] = useState<Entry[]>(() => readJson(STORAGE.checkins, [
    { pain: 2, swelling: 'Mild', sleep: 'Good', date: 'Yesterday · demo' },
    { pain: 3, swelling: 'Mild', sleep: 'Fair', date: '2 days ago · demo' },
  ]));
  const [sessions, setSessions] = useState<Session[]>(() => readJson(STORAGE.sessions, []));
  const [pain, setPain] = useState(2);
  const [swelling, setSwelling] = useState<Swelling>('Mild');
  const [sleep, setSleep] = useState('Good');
  const [saved, setSaved] = useState(false);
  const [modal, setModal] = useState<'guided' | 'camera' | null>(null);
  const [exercise, setExercise] = useState<Exercise>(EXERCISES[0]);
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
  useEffect(() => { localStorage.setItem(STORAGE.checkins, JSON.stringify(checkins)); }, [checkins]);
  useEffect(() => { localStorage.setItem(STORAGE.sessions, JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem(STORAGE.role, JSON.stringify(role)); }, [role]);
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
        setPoseState({ status: 'searching', angle: null, measure: 'joint angle', message: 'Position your full working leg in the camera view.' });

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
          context.lineWidth = Math.max(2, width / 180);
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
            context.arc(point.x * width, point.y * height, Math.max(2, width / 150), 0, Math.PI * 2);
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
            let measure = exercise.id === 'raise' ? 'estimated hip angle' : 'estimated knee angle';
            if (landmarks) {
              const candidates = exercise.id === 'raise'
                ? [[11, 23, 25], [12, 24, 26]]
                : [[23, 25, 27], [24, 26, 28]];
              const side = candidates
                .map(([a, b, c]) => ({ points: [landmarks[a], landmarks[b], landmarks[c]], confidence: Math.min(landmarks[a]?.visibility ?? 0, landmarks[b]?.visibility ?? 0, landmarks[c]?.visibility ?? 0) }))
                .filter((candidate) => candidate.confidence >= 0.45)
                .sort((a, b) => b.confidence - a.confidence)[0];
              if (side) angle = angleAt(side.points[0], side.points[1], side.points[2]);
            }
            if (exercise.id === 'patella') angle = null;
            const message = !landmarks
              ? 'No pose detected. Adjust lighting or include your full body in frame.'
              : angle === null
                ? 'Pose found; make the working leg landmarks more visible to estimate an angle.'
                : exercise.id === 'patella'
                  ? 'Pose landmarks visible. This exercise has no camera angle target.'
                  : 'Approximate 2D estimate only. Camera position and perspective affect the reading.';
            if (recordingRef.current && now - lastTelemetryAtRef.current >= 500) {
              lastTelemetryAtRef.current = now;
              telemetryRef.current.push({ t: Math.round((now - recordingStartedAtRef.current) / 100) / 10, angle, measure });
            }
            if (now - lastUiUpdate >= 250) {
              lastUiUpdate = now;
              setPoseState({ status: landmarks ? 'tracking' : 'searching', angle: exercise.id === 'patella' ? null : angle, measure, message });
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
            message: error instanceof Error ? `On-device pose model unavailable: ${error.message}` : 'On-device pose model unavailable. Use the alignment checklist instead.',
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
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer); }, [toast]);

  const saveCheckin = () => {
    setCheckins((items) => [{ pain, swelling, sleep, date: `${dayStamp()} · saved just now` }, ...items]);
    setSaved(true);
    setToast('Daily check-in saved on this device.');
    window.setTimeout(() => setSaved(false), 2500);
  };
  const launchGuided = (item: Exercise) => { setExercise(item); setStep(0); setSeconds(0); setRunning(false); setModal('guided'); };
  const completeSession = () => {
    setSessions((items) => [{ id: `${Date.now()}`, exercise: exercise.name, date: new Date().toISOString(), time: `${exercise.seconds}s`, completed: true }, ...items]);
    setModal(null); setRunning(false); setToast('Session complete. Progress saved locally.');
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
      if (requestId === cameraRequestRef.current) setCameraError(error instanceof Error ? error.message : 'Camera permission was unavailable. You can still use the alignment checklist.');
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
        void saveVideo(blob, meta).then(() => setToast('Clip stored locally on this device.')).catch(() => setCameraError('The clip could not be saved to local browser storage.'));
        setRecording(false);
      };
      recorder.start(); setSeconds(0); setRunning(true); setRecording(true);
    } catch { setCameraError('Could not start recording. Check your browser camera settings.'); }
  };
  const stopRecording = () => { recordingRef.current = false; recorderRef.current?.stop(); setRunning(false); };
  useEffect(() => {
    if (recording && seconds >= 30) {
      stopRecording();
      setToast('30-second limit reached. Your clip is saved locally.');
    }
  }, [recording, seconds]);
  const exportReport = () => {
    const reportLatest = checkins[0];
    const reportFlags = checkins.filter((item) => item.pain >= 5 || item.swelling === 'Moderate' || item.swelling === 'Severe');
    const summary = `Demo patient Alex is on day 12 of the Acute Recovery & Extension Lock phase. ${checkins.length} check-ins recorded locally; ${sessions.length} guided sessions completed. Latest reported pain is ${reportLatest?.pain ?? 'not recorded'} / 10 with ${reportLatest?.swelling?.toLowerCase() ?? 'no'} swelling and ${reportLatest?.sleep?.toLowerCase() ?? 'no'} sleep quality.`;
    const rows = [
      ['RePitch ACL recovery report', dayStamp()],
      ['Data status', 'Demo data and local browser entries only; not a connected medical record.'],
      ['Automated summary', summary],
      ['Items to review', reportFlags.length ? reportFlags.map((item) => `${item.date}: reported pain ${item.pain}/10, ${item.swelling.toLowerCase()} swelling`).join(' | ') : 'No current pain or swelling flags in stored records.'],
      [],
      ['Patient-reported check-ins'],
      ['Date', 'Pain 1-10', 'Swelling', 'Sleep'],
      ...checkins.map((item) => [item.date, String(item.pain), item.swelling, item.sleep]),
      [],
      ['Completed guided sessions'],
      ['Session', 'Timestamp', 'Duration'],
      ...sessions.map((item) => [item.exercise, dateTime(item.date), item.time]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.href = url; link.download = 'repitch-demo-recovery-report.csv'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const latest = checkins[0];
  const flags = checkins.filter((entry) => entry.pain >= 5 || entry.swelling === 'Severe' || entry.swelling === 'Moderate');
  const targetAngle = exercise.id === 'quad' ? 180 : exercise.id === 'raise' ? 135 : exercise.id === 'heel' ? 110 : null;
  const remainingSeconds = modal === 'guided' && step === exercise.cues.length - 1 ? Math.max(0, exercise.seconds - seconds) : seconds;
  const formattedTimer = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brandmark"><Activity size={20}/></div><div>RePitch<small>ACL recovery portal</small></div></div>
      <div className="view-toggle" role="group" aria-label="Choose portal view">
        <button className={role === 'patient' ? 'active' : ''} onClick={() => setRole('patient')} data-testid="button-view-patient"><HeartPulse size={14}/> Patient / Player</button>
        <button className={role === 'clinician' ? 'active' : ''} onClick={() => setRole('clinician')} data-testid="button-view-clinician"><Stethoscope size={14}/> Physiotherapist</button>
      </div>
    </header>
    <main className="page">
      {role === 'patient' ? <PatientView {...{ pain, setPain, swelling, setSwelling, sleep, setSleep, saveCheckin, saved, sessions, launchGuided, startCamera, videoUrl, videoMeta, checkins }} /> :
        <ClinicianView {...{ checkins, sessions, latest, flags, exportReport, videoUrl, videoMeta, videoPlaybackTime, setVideoPlaybackTime }} />}
      <div className="footer-note"><ShieldAlert size={12} style={{ verticalAlign: 'middle', marginRight: 5 }}/>Demo data stays on this device. RePitch does not diagnose; follow your clinician-approved plan.</div>
    </main>
    {modal && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      {modal === 'guided' ? <section className="modal" role="dialog" aria-modal="true" aria-labelledby="guided-title">
        <div className="modal-head"><div><div className="eyebrow">ONE SET · ONE REP</div><h2 id="guided-title">{exercise.name}</h2><div className="muted small">{exercise.target}</div></div><button className="icon-button" onClick={closeModal} aria-label="Close guided set"><X size={17}/></button></div>
        {step < exercise.cues.length ? <>
          <div className="step-box"><div className="eyebrow">STEP {step + 1} OF {exercise.cues.length}</div><p>{exercise.cues[step]}</p></div>
          {step === exercise.cues.length - 1 ? <>
            <div className="timer-display">{formattedTimer}</div>
            <p className="muted small" style={{ textAlign: 'center' }}>Hold comfortably for {exercise.seconds} seconds. Pause if anything feels wrong.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 9, marginTop: 19 }}>
              <button className="btn btn-quiet" disabled={seconds >= exercise.seconds} onClick={() => setRunning(!running)}><Clock3 size={14}/>{running ? 'Pause timer' : 'Start timer'}</button>
              <button className="btn btn-primary" disabled={seconds < exercise.seconds} onClick={() => { setStep((value) => value + 1); setRunning(false); setSeconds(0); }}>Finish set<ChevronRight size={14}/></button>
            </div>
          </> : <div style={{ display: 'flex', justifyContent: 'center', marginTop: 19 }}>
            <button className="btn btn-primary" onClick={() => setStep((value) => value + 1)}>Next step<ChevronRight size={14}/></button>
          </div>}
          <p className="muted small" style={{ textAlign: 'center', marginTop: 17 }}>Exactly one set of one rep. This guide does not add to your prescribed plan.</p>
        </> : <div className="empty" style={{ border: 0 }}><CheckCircle2 size={44} color="#10b981"/><h3>Set complete</h3><p>Your single guided rep is complete. Log it to your local progress history.</p><button className="btn btn-primary" onClick={completeSession}><Check size={15}/>Save completion</button></div>}
      </section> : <section className="modal" role="dialog" aria-modal="true" aria-labelledby="camera-title">
        <div className="modal-head"><div><div className="eyebrow">CAMERA-ASSISTED ALIGNMENT</div><h2 id="camera-title">{exercise.name}</h2><div className="muted small">Camera content stays in your browser; nothing is uploaded.</div></div><button className="icon-button" onClick={closeModal} aria-label="Close camera"><X size={17}/></button></div>
        {stream ? <div className="camera-stage"><video ref={videoRef} className="camera-view" autoPlay muted playsInline/><div className="camera-overlay"><canvas ref={poseCanvasRef} className="pose-canvas" aria-hidden="true"/><div className="alignment-frame"/></div></div> : <div className="empty"><Camera size={29}/><p>{cameraError || 'Request camera access to see a live preview.'}</p>{!cameraError && <button className="btn btn-primary" onClick={() => void startCamera(exercise)}><Camera size={15}/>Enable camera</button>}</div>}
        {stream && <div className={`pose-readout ${poseState.status === 'error' ? 'pose-error' : ''}`} role="status">
          <div><span className={`pose-dot ${poseState.status}`}/><strong>{poseState.status === 'loading' ? 'Loading pose model' : poseState.status === 'error' ? 'Pose estimate unavailable' : poseState.status === 'searching' ? 'Looking for pose' : 'On-device pose estimate'}</strong></div>
          <p>{poseState.message}</p>
          {poseState.angle !== null && <span className="mono pose-angle">{poseState.angle}° <small>{poseState.measure}</small></span>}
          {targetAngle !== null && <p className="pose-reference">Plan reference: {targetAngle}°. {poseState.angle === null ? 'Compare only from a stable side view.' : `Current estimate differs by ${Math.abs(poseState.angle - targetAngle)}°; this is not a quality score.`}</p>}
        </div>}
        {cameraError && <div className="flag" style={{ marginTop: 12 }}><CircleHelp size={16}/><span>{cameraError}</span></div>}
        {cameraError && !stream && <button className="btn" style={{ marginTop: 12 }} onClick={() => void startCamera(exercise)}><Camera size={14}/>Try camera again</button>}
        <div className="step-box" style={{ marginTop: 13 }}><div className="eyebrow">CAMERA-ASSISTED ALIGNMENT</div><p>Frame the full working leg from the side. The on-device model estimates 2D landmarks and a joint angle; camera position, clothing, lighting, and perspective can affect it. This is not a clinical assessment. Model files download from a public Google-hosted source on first use; camera frames stay in this browser and are not uploaded.</p></div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {stream && <button className={`btn ${recording ? 'btn-danger' : 'btn-primary'}`} onClick={recording ? stopRecording : recordVideo}>{recording ? <><span className="tag" style={{ background: '#51232a', color: '#ffb3b3' }}>REC {formattedTimer}</span> Stop and save clip</> : <><Video size={15}/>Record local clip · max 30s</>}</button>}
          <button className="btn" onClick={() => { closeModal(); launchGuided(exercise); }}><Play size={15}/>Use guided set</button>
        </div>
      </section>}
    </div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function PatientView(props: {
  pain: number; setPain: (n: number) => void; swelling: Swelling; setSwelling: (s: Swelling) => void; sleep: string; setSleep: (s: string) => void;
  saveCheckin: () => void; saved: boolean; sessions: Session[]; launchGuided: (e: Exercise) => void; startCamera: (e: Exercise) => void;
  videoUrl: string; videoMeta: VideoMeta | null; checkins: Entry[];
}) {
  const { pain, setPain, swelling, setSwelling, sleep, setSleep, saveCheckin, saved, sessions, launchGuided, startCamera, videoUrl, videoMeta, checkins } = props;
  return <>
    <div className="hero-row"><div><div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase()} · YOUR RECOVERY, YOUR PACE</div><h1>Good morning, Alex.</h1><div className="muted">One steady step at a time. Your clinician-approved plan is ready.</div></div><div className="tag"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShieldAlert size={12}/> DEMO PATIENT · LOCAL ONLY</span></div></div>
    <div className="stats">
      <div className="panel stat"><div className="stat-icon"><Activity size={16}/></div><div className="stat-label">Recovery day</div><div className="stat-value">12<span className="muted" style={{ fontSize: 14 }}> / 84</span></div><div className="stat-detail">Phase 1 · Acute recovery</div></div>
      <div className="panel stat"><div className="stat-icon" style={{ color: '#10b981', background: '#10b98114' }}><Flame size={16}/></div><div className="stat-label">Current streak</div><div className="stat-value">4 <span style={{ fontSize: 14 }}>days</span></div><div className="stat-detail">Showing up matters</div></div>
      <div className="panel stat"><div className="stat-icon" style={{ color: '#ffb300', background: '#ffb30014' }}><Award size={16}/></div><div className="stat-label">RePitch points</div><div className="stat-value">350</div><div className="stat-detail">A little progress, every day</div></div>
    </div>
    <div className="content-grid">
      <div>
        <section className="panel checkin">
          <div className="section-head"><div><h2>Daily check-in</h2><p>A quick note helps you and your care team notice patterns.</p></div><span className="eyebrow">TODAY</span></div>
          <label className="field-title" htmlFor="pain-range"><span>Pain today</span><span className="mono" style={{ color: pain >= 6 ? '#ef7777' : '#00f2fe' }}>{pain} / 10</span></label>
          <input id="pain-range" data-testid="input-pain" aria-label="Pain from 1 to 10" className="range" type="range" min="1" max="10" value={pain} onChange={(e) => setPain(Number(e.target.value))}/>
          <div className="muted small" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Low</span><span>High</span></div>
          <div className="field-title"><span>Swelling</span></div><div className="choice-row">{(['Mild', 'Moderate', 'Severe'] as Swelling[]).map((item) => <button key={item} onClick={() => setSwelling(item)} className={`choice ${swelling === item ? 'selected' : ''}`} data-testid={`button-swelling-${item.toLowerCase()}`}>{item}</button>)}</div>
          <div className="field-title"><span>Sleep quality</span></div><div className="sleep-choice">{['Restful', 'Good', 'Fair', 'Rough'].map((item) => <button key={item} className={`choice ${sleep === item ? 'selected' : ''}`} onClick={() => setSleep(item)}>{item}</button>)}</div>
          <div className="save-row"><span className="muted small">Your check-in is stored only on this device.</span><button className="btn btn-primary" onClick={saveCheckin} data-testid="button-save-checkin"><Check size={14}/>{saved ? 'Saved' : 'Save check-in'}</button></div>
        </section>
        <section className="panel roadmap">
          <div className="section-head"><div><h2>Your recovery roadmap</h2><p>A long journey is easier when you can see the next stop.</p></div><span className="mono small muted">01 / 04</span></div>
          <div className="route">
            {[['Phase 1', 'Acute Recovery & Extension Lock', 'Current phase · day 12'], ['Phase 2', 'Neuromuscular Control & Hypertrophy', 'Locked · clinician-led'], ['Phase 3', 'Dynamic Loading & Agility', 'Locked · clinician-led'], ['Phase 4', 'Return to Sport & Cutting', 'Locked · clinician-led']].map(([phase, name, desc], index) => <div key={phase} className={`phase ${index === 0 ? 'active' : ''}`}><div className="phase-dot">{index === 0 ? <Check size={13}/> : <LockKeyhole size={11}/>}</div><p className="eyebrow phase-kicker">{phase}</p><h3>{name}</h3><p>{desc}</p></div>)}
          </div>
        </section>
        <section className="exercise-section">
          <div className="section-head"><div><h2>Today’s Phase 1 routine</h2><p>Follow the plan provided by your physiotherapist.</p></div><span className="tag">{sessions.length} completed</span></div>
          <div className="exercise-grid">{EXERCISES.map((item) => <article className="panel exercise" key={item.id}>
            <div className="exercise-thumb"><Art kind={item.icon}/></div><div><h3>{item.name}</h3><div className="target">{item.target}</div><div className="warning"><ShieldAlert size={11} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{item.warning}</div>
              <div className="exercise-actions"><button className="btn btn-primary" onClick={() => launchGuided(item)}><Play size={12}/>Start Guided Set</button><button className="btn btn-quiet" onClick={() => void startCamera(item)}><Camera size={12}/>Open AI Camera</button></div>
            </div>
          </article>)}</div>
        </section>
      </div>
      <aside>
        <section className="panel roo-card"><div><div className="eyebrow" style={{ color: '#10b981' }}>YOUR RECOVERY COMPANION</div><h2>Roo is in your corner.</h2><p>{pain >= 6 || swelling === 'Severe' ? 'Listen to what your body is telling you today. Check in with your physiotherapist before pushing on.' : 'You don’t have to do it all at once. A calm, comfortable rep is a win.'}</p><div className="points"><Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 5 }}/>Your steady effort adds up</div></div><div className="roo-art"><Roo/></div></section>
        <div className="notice" style={{ marginTop: 13 }}><ShieldAlert size={14} style={{ color: '#ffb300', verticalAlign: 'middle', marginRight: 7 }}/>Stop if an exercise causes sharp pain. This non-diagnostic guide is not a substitute for your clinician’s approved plan.</div>
        <section className="panel history">
          <div className="section-head"><div><h2>Recent progress</h2><p>Saved on this device</p></div><ArrowRight size={16} color="#8996a5"/></div>
          {sessions.length ? sessions.slice(0, 3).map((session) => <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #29343f' }}><span className="small">{session.exercise}</span><span className="mono small muted">{dateTime(session.date)}</span></div>) : <div className="empty" style={{ padding: 16, fontSize: 12 }}>Your completed guided sets will appear here.</div>}
        </section>
        {videoUrl && <section className="panel video-box"><div className="section-head"><div><h2>Session video</h2><p>Local clip · {videoMeta?.exercise || 'exercise session'}</p></div><Video size={17} color="#00f2fe"/></div><video controls src={videoUrl} style={{ width: '100%', borderRadius: 11 }}/><div className="muted small" style={{ marginTop: 8 }}>{videoMeta?.at ? dateTime(videoMeta.at) : 'Saved locally'} · {videoMeta?.duration ?? 0}s · not uploaded</div></section>}
        {checkins.length > 0 && <div className="muted small" style={{ padding: '13px 4px' }}><Moon size={13} style={{ verticalAlign: 'middle', marginRight: 5 }}/>Last logged: pain {checkins[0].pain}/10 · {checkins[0].swelling} swelling</div>}
      </aside>
    </div>
  </>;
}

function ClinicianView(props: { checkins: Entry[]; sessions: Session[]; latest: Entry; flags: Entry[]; exportReport: () => void; videoUrl: string; videoMeta: VideoMeta | null; videoPlaybackTime: number; setVideoPlaybackTime: (time: number) => void }) {
  const { checkins, sessions, latest, flags, exportReport, videoUrl, videoMeta, videoPlaybackTime, setVideoPlaybackTime } = props;
  const summary = `Demo patient Alex is on day 12 of the Acute Recovery & Extension Lock phase. ${checkins.length} check-in${checkins.length === 1 ? '' : 's'} recorded locally; ${sessions.length} guided session${sessions.length === 1 ? '' : 's'} completed. Latest reported pain is ${latest?.pain ?? 'not recorded'} / 10 with ${latest?.swelling?.toLowerCase() ?? 'no'} swelling and ${latest?.sleep?.toLowerCase() ?? 'no'} sleep quality.`;
  const angleSamples = videoMeta?.telemetry?.filter((sample) => sample.angle !== null) ?? [];
  const currentSample = angleSamples.reduce<TelemetryPoint | null>((closest, sample) => !closest || Math.abs(sample.t - videoPlaybackTime) < Math.abs(closest.t - videoPlaybackTime) ? sample : closest, null);
  return <>
    <div className="hero-row"><div><div className="eyebrow">CLINICIAN WORKSPACE · LOCAL DEMO</div><h1>Recovery overview</h1><div className="muted">A compact view of patient-reported check-ins and recorded guided sessions.</div></div><button className="btn btn-primary" onClick={exportReport} data-testid="button-export-report"><Download size={15}/>Export report</button></div>
    <div className="tag" style={{ display: 'inline-flex', marginBottom: 20 }}><ShieldAlert size={12}/> DEMO RECORD · NOT A CONNECTED MEDICAL RECORD</div>
    <div className="stats">
      <div className="panel stat"><div className="stat-icon"><Activity size={16}/></div><div className="stat-label">Patient</div><div className="stat-value" style={{ fontSize: 25 }}>Alex Rivera</div><div className="stat-detail">ACL recovery · Day 12 · Phase 1</div></div>
      <div className="panel stat"><div className="stat-icon" style={{ color: '#10b981', background: '#10b98114' }}><HeartPulse size={16}/></div><div className="stat-label">Latest pain report</div><div className="stat-value">{latest?.pain ?? '—'}<span className="muted" style={{ fontSize: 14 }}> / 10</span></div><div className="stat-detail">{latest?.date ?? 'No check-in yet'}</div></div>
      <div className="panel stat"><div className="stat-icon" style={{ color: '#ffb300', background: '#ffb30014' }}><Dumbbell size={16}/></div><div className="stat-label">Guided sessions</div><div className="stat-value">{sessions.length}</div><div className="stat-detail">Stored locally on patient device</div></div>
    </div>
    <div className="clinician-grid">
      <section className="panel report"><div className="section-head"><div><h2>Automated recovery report</h2><p>Generated from demo records · {dayStamp()}</p></div><FileText size={17} color="#00f2fe"/></div>
        <div className="step-box"><div className="eyebrow">SUMMARY</div><p>{summary}</p><p className="muted small">Next session overview: Phase 1 routine includes Quad Sets with Isometric Lock, Straight Leg Raise, Heel Slides, and Patellar Mobilizations. No changes to clinical protocols are suggested by this portal.</p></div>
        <div className="field-title"><span>Items to review</span><span className="mono muted">{flags.length} flagged</span></div>
        {flags.length ? flags.slice(0, 4).map((item, i) => <div className="flag" key={`${item.date}-${i}`}><ShieldAlert size={15}/><span>{item.date}: reported pain {item.pain}/10, {item.swelling.toLowerCase()} swelling. Review with patient as appropriate.</span></div>) : <div className="notice"><CheckCircle2 size={14} color="#10b981" style={{ verticalAlign: 'middle', marginRight: 6 }}/>No current pain or swelling flags in the stored sample records.</div>}
        <div style={{ marginTop: 17 }}><button className="btn btn-primary" onClick={exportReport}><Download size={14}/>Download CSV report</button></div>
      </section>
      <section className="panel report"><div className="section-head"><div><h2>Recovery history</h2><p>Patient-reported · sample and local entries</p></div><HeartPulse size={17} color="#00f2fe"/></div>
        {checkins.length ? <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Date</th><th>Pain</th><th>Swelling</th><th>Sleep</th></tr></thead><tbody>{checkins.slice(0, 8).map((entry, i) => <tr key={`${entry.date}-${i}`}><td>{entry.date}</td><td>{entry.pain}/10</td><td>{entry.swelling}</td><td>{entry.sleep}</td></tr>)}</tbody></table></div> : <div className="empty">No check-ins recorded yet.</div>}
        <div className="field-title" style={{ marginTop: 24 }}><span>Completed sessions</span><span className="mono muted">{sessions.length}</span></div>
        {sessions.length ? sessions.slice(0, 6).map((session) => <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #29343f' }}><span className="small">{session.exercise}</span><span className="mono small muted">{dateTime(session.date)}</span></div>) : <div className="empty">No guided sets completed in this local demo yet.</div>}
      </section>
    </div>
    <section className="panel video-box"><div className="section-head"><div><h2>Session video & telemetry</h2><p>Short patient-recorded clips stay on this browser only.</p></div><Video size={17} color="#00f2fe"/></div>
      {videoUrl && videoMeta ? <div className="clinician-grid"><video controls src={videoUrl} onTimeUpdate={(event) => setVideoPlaybackTime(event.currentTarget.currentTime)} style={{ width: '100%', borderRadius: 12, maxHeight: 340, background: '#090c10' }}/><div><div className="eyebrow">LOCAL SESSION TELEMETRY</div><h3>{videoMeta.exercise}</h3><p className="muted small">{dateTime(videoMeta.at)}</p><div className="notice"><Clock3 size={13} style={{ verticalAlign: 'middle', marginRight: 6 }}/>Clip duration: {videoMeta.duration} seconds · Playback {videoPlaybackTime.toFixed(1)}s</div><p className="muted small" style={{ lineHeight: 1.6 }}>Approximate on-device 2D pose estimates are recorded at intervals. They are not a clinical measurement.</p>
        {angleSamples.length ? <><div className="pose-readout" style={{ marginTop: 12 }}><strong>Nearest playback estimate</strong><span className="mono pose-angle">{currentSample?.angle}° <small>{currentSample?.measure} · {currentSample?.t.toFixed(1)}s</small></span><p>Estimate nearest to the current video position.</p></div><div className="telemetry-list"><div className="field-title" style={{ margin: '12px 0 5px' }}><span>Recorded angle estimates</span><span className="mono muted">{angleSamples.length} samples</span></div>{angleSamples.map((sample, index) => <div className={`telemetry-row ${sample === currentSample ? 'active' : ''}`} key={`${sample.t}-${index}`}><span className="mono muted">{sample.t.toFixed(1)}s</span><span>{sample.angle}° <small className="muted">{sample.measure}</small></span></div>)}</div></> : <div className="notice" style={{ marginTop: 12 }}>No usable joint angle samples were available for this clip.</div>}
      </div></div> : <div className="empty"><Video size={28}/><p>No recorded clip is stored on this device.</p><span className="small">A patient can record a brief clip from the camera-assisted alignment flow.</span></div>}
    </section>
  </>;
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

export type MasterplanExercise = {
  id: string;
  name: string;
  setsReps: string;
  target: string;
  frequency: string;
  category: 'Mobility' | 'Activation' | 'Strength' | 'Plyometrics' | 'Agility';
  description: string;
};

export type PhasePlan = {
  phase: number;
  name: string;
  timeline: string;
  durationMonths: string;
  badge: string;
  focus: string;
  goals: string[];
  gateCriteria: string[];
  exercises: MasterplanExercise[];
};

export const RECOVERY_MASTERPLAN: PhasePlan[] = [
  {
    phase: 1,
    name: 'Acute Recovery & Extension Lock',
    timeline: 'Weeks 1–4',
    durationMonths: 'Month 1',
    badge: 'Phase 1 · Acute',
    focus: 'Joint effusion control, voluntary quadriceps activation, full terminal knee extension (0°), and early gait normalization.',
    goals: [
      'Attain full active knee extension (0° matching non-injured limb)',
      'Achieve 90° knee flexion by end of Week 4',
      'Eliminate extensor lag during straight leg raise',
      'Wean off axillary/elbow crutches with normalized gait mechanics',
      'Minimize resting joint effusion to trace or mild'
    ],
    gateCriteria: [
      'Full passive knee extension equal to contralateral limb (0°)',
      'Active straight leg raise without knee sagging (no extensor lag)',
      'Knee flexion >= 90° in supine position',
      'Minimal resting joint effusion (Trace/Mild score)'
    ],
    exercises: [
      {
        id: 'p1-quad',
        name: 'Quad Sets with Isometric Lock',
        setsReps: '3 sets of 10 reps',
        target: '5s hold · 180° knee extension',
        frequency: '3x daily',
        category: 'Activation',
        description: 'Towel roll under ankle. Actively fire the vastus medialis obliquus (VMO) and press the back of the knee firmly down.'
      },
      {
        id: 'p1-slr',
        name: 'Straight Leg Raise with Locked Knee',
        setsReps: '3 sets of 10 reps',
        target: '45° elevation · 135° hip angle',
        frequency: '2-3x daily',
        category: 'Strength',
        description: 'Lock knee at 0° extension before elevating thigh. Maintain steady pelvic brace without lumbar arching.'
      },
      {
        id: 'p1-patella',
        name: 'Multi-Directional Patellar Glides',
        setsReps: '3 bouts of 60 seconds',
        target: 'Gentle superior, inferior & medial glides',
        frequency: '3x daily',
        category: 'Mobility',
        description: 'Relax quadriceps completely with leg supported. Gently mobilize kneecap to prevent arthrofibrosis.'
      },
      {
        id: 'p1-heel',
        name: 'Assisted Heel Slides',
        setsReps: '3 sets of 10 reps',
        target: 'Comfortable flexion (aiming for 90°)',
        frequency: '2x daily',
        category: 'Mobility',
        description: 'Slide heel toward buttocks along a smooth surface using a towel or strap for gentle end-range assistance.'
      },
      {
        id: 'p1-prone',
        name: 'Prone Terminal Knee Hangs',
        setsReps: '3 bouts of 3–5 minutes',
        target: 'Gravity-assisted extension to 0°',
        frequency: '2x daily',
        category: 'Mobility',
        description: 'Lie prone with lower legs hanging over edge of table. Allow gravity to restore terminal passive extension.'
      }
    ]
  },
  {
    phase: 2,
    name: 'Neuromuscular Control & Hypertrophy',
    timeline: 'Weeks 5–12',
    durationMonths: 'Months 2–3',
    badge: 'Phase 2 · Loading',
    focus: 'Restoring full painless flexion (>125°), closed kinetic chain lower-extremity hypertrophy, pelvic stability, and cycling.',
    goals: [
      'Full active flexion matching contralateral side (>125°–135°)',
      'Symmetrical double-leg squat mechanics to 70° depth',
      'Single-leg balance stability > 30 seconds on firm surface',
      'Continuous stationary cycling for 20+ minutes at moderate cadence',
      'Normal heel-to-toe gait without limp on level ground'
    ],
    gateCriteria: [
      'Limb Symmetry Index (LSI) > 70% on quad & hamstring strength dynamometer',
      'Full pain-free range of motion (0° extension to 125°+ flexion)',
      'Zero resting effusion and no joint flare-up post-exercise',
      'Controlled single-leg squat to 45° with no valgus knee collapse'
    ],
    exercises: [
      {
        id: 'p2-wallsit',
        name: 'Wall Sits with Isometric Quad Engagement',
        setsReps: '3 sets of 30–45s hold',
        target: '60° knee flexion angle',
        frequency: 'Daily',
        category: 'Strength',
        description: 'Back flat against wall. Distribute weight through heels while keeping knees stacked vertically over toes.'
      },
      {
        id: 'p2-stepup',
        name: 'Step-Ups & Eccentric Step-Downs',
        setsReps: '3 sets of 12 reps per leg',
        target: '6–8 inch step box',
        frequency: 'Every other day',
        category: 'Strength',
        description: 'Drive through the lead heel. Emphasize a 3-second slow descent without letting the knee collapse inward.'
      },
      {
        id: 'p2-minisquat',
        name: 'Mini Squats with Hip Loop Resistance',
        setsReps: '3 sets of 15 reps',
        target: '0–60° knee flexion arc',
        frequency: 'Daily',
        category: 'Strength',
        description: 'Band above knees. Push outward against the band to activate gluteus medius and prevent knee valgus.'
      },
      {
        id: 'p2-rdl',
        name: 'Single-Leg Romanian Deadlift (Light Load)',
        setsReps: '3 sets of 10 reps per leg',
        target: 'Hinge to 45° torso angle',
        frequency: '3x weekly',
        category: 'Strength',
        description: 'Hinge at the hip with a slight bend in the stance knee. Engages hamstrings and posterior chain proprioception.'
      },
      {
        id: 'p2-bike',
        name: 'Stationary Cycling (Cadence Training)',
        setsReps: '15–20 minutes continuous',
        target: '75–85 RPM moderate resistance',
        frequency: '4x weekly',
        category: 'Mobility',
        description: 'Ensure seat height allows near-complete extension at bottom of stroke without pelvic rocking.'
      },
      {
        id: 'p2-balance',
        name: 'Airex Pad / Balance Board Single-Leg Stance',
        setsReps: '4 sets of 30 seconds each leg',
        target: 'Stable posture with micro-adjustments',
        frequency: 'Daily',
        category: 'Activation',
        description: 'Stand tall on unstable surface. Stabilize ankle, knee, and hip joints without touching down.'
      }
    ]
  },
  {
    phase: 3,
    name: 'Dynamic Strength & Intro to Plyometrics',
    timeline: 'Weeks 13–24',
    durationMonths: 'Months 4–6',
    badge: 'Phase 3 · Plyometrics',
    focus: 'Maximal strength rebuilding, unilateral loading, introduction of walk/jog intervals, and soundless landing mechanics.',
    goals: [
      'Quad and hamstring Limb Symmetry Index (LSI) >= 80%',
      'Successful completion of straight-line jogging interval protocol',
      'Symmetrical deceleration and landing mechanics without dynamic knee valgus',
      'Y-Balance test composite score within 95% of uninjured limb',
      'Triple single-leg hop test symmetry >= 80%'
    ],
    gateCriteria: [
      'Quadriceps Limb Symmetry Index (LSI) >= 85%',
      'Pain-free 20-minute continuous jog without post-run swelling flare',
      'Double-leg to single-leg landing assessment passed by clinician',
      'ACL Return to Sport After Injury (ACL-RSI) score >= 65'
    ],
    exercises: [
      {
        id: 'p3-bulgarian',
        name: 'Bulgarian Split Squats (Rear Foot Elevated)',
        setsReps: '3 sets of 8–10 reps per leg',
        target: 'Full 90° working depth',
        frequency: '3x weekly',
        category: 'Strength',
        description: 'Rear foot elevated on bench. Emphasizes unilateral quadriceps and glute strength with upright torso.'
      },
      {
        id: 'p3-trapbar',
        name: 'Trap Bar Deadlifts / Romanian Deadlifts',
        setsReps: '3 sets of 8 reps',
        target: 'Progressive moderate loading (0.8–1.0x BW)',
        frequency: '2-3x weekly',
        category: 'Strength',
        description: 'Builds explosive hip extension and posterior chain resilience to protect the reconstructed graft.'
      },
      {
        id: 'p3-pogo',
        name: 'Ankle Pogo Hops & Double-Leg Box Jumps',
        setsReps: '3 sets of 10 pogo hops / 3x6 box jumps',
        target: '12–18 inch box with soft silent landing',
        frequency: '2x weekly',
        category: 'Plyometrics',
        description: 'Focus on minimum ground contact time for pogos, and deep shock absorption landing for box jumps.'
      },
      {
        id: 'p3-jog',
        name: 'Straight-Line Jogging Interval Protocol',
        setsReps: '10–12 intervals (1 min jog / 1 min walk)',
        target: 'Smooth forward gait on track or turf',
        frequency: '2-3x weekly',
        category: 'Plyometrics',
        description: 'Strictly linear running on level grass or track. No sharp turns or sudden braking.'
      },
      {
        id: 'p3-land',
        name: 'Single-Leg Drop Landings from 6" Box',
        setsReps: '3 sets of 6 reps per leg',
        target: 'Stick landing for 2 seconds',
        frequency: '2x weekly',
        category: 'Plyometrics',
        description: 'Step off box and land on surgical leg with knee bent 30°, chest over toes, and knee aligned over second toe.'
      }
    ]
  },
  {
    phase: 4,
    name: 'Agility, Cutting & Return to Sport (RTS)',
    timeline: 'Weeks 25–36+',
    durationMonths: 'Months 7–9+',
    badge: 'Phase 4 · Return to Sport',
    focus: 'Multi-directional agility, high-velocity cutting drills, sport-specific reactive training, and clearance testing.',
    goals: [
      'Quadriceps and Hamstring Limb Symmetry Index (LSI) >= 90% across all tests',
      'Hop test battery (Single hop, Triple hop, Crossover hop, 6m timed hop) all LSI >= 90%',
      'Symmetrical T-Test and Pro Agility (5-10-5) shuttle run times',
      'ACL Psychological Readiness Score (ACL-RSI) >= 75/100',
      'Full contact sport clearance granted by orthopedic surgeon and lead physiotherapist'
    ],
    gateCriteria: [
      'LSI >= 90% across entire functional hop testing battery',
      'Isokinetic quad strength deficit < 10% compared to contralateral limb',
      'Demonstrated high-speed reactive agility without cognitive hesitation',
      'Orthopedic surgeon formal sign-off for full competitive gameplay'
    ],
    exercises: [
      {
        id: 'p4-cut45',
        name: '45° & 90° Deceleration Cutting Drills',
        setsReps: '4 sets of 4 cuts per side',
        target: 'Plant and cut with explosive push-off',
        frequency: '2-3x weekly',
        category: 'Agility',
        description: 'Approach cone at 75-90% speed, plant outside foot with wide base of support, and cut sharply in new direction.'
      },
      {
        id: 'p4-bounds',
        name: 'Lateral Skater Bounds with Single-Leg Stick',
        setsReps: '3 sets of 6 bounds per leg',
        target: 'Max horizontal distance with 2s hold',
        frequency: '2x weekly',
        category: 'Plyometrics',
        description: 'Explode sideways off one leg and land softly on opposite leg, stabilizing knee before bounding back.'
      },
      {
        id: 'p4-ttest',
        name: 'T-Test & Pro Agility Shuttle Drills',
        setsReps: '4 timed trials with 90s rest',
        target: 'Sprint, lateral shuffle & backpedal',
        frequency: '2x weekly',
        category: 'Agility',
        description: 'Combines multi-directional footwork, deceleration, and hip turning essential for competitive sport.'
      },
      {
        id: 'p4-triplehop',
        name: 'Triple Hop for Distance Battery Trials',
        setsReps: '3 recorded attempts per leg',
        target: 'LSI >= 90% comparison',
        frequency: 'Once weekly testing',
        category: 'Plyometrics',
        description: 'Three consecutive maximal hops forward on the same leg, sticking the final landing for 2 seconds.'
      },
      {
        id: 'p4-sportspec',
        name: 'Sport-Specific Ball & Reaction Drills',
        setsReps: '15–20 minutes simulated drill work',
        target: 'Soccer pass & cut / Basketball drive',
        frequency: '3x weekly',
        category: 'Agility',
        description: 'Incorporate unpredictable visual cues, teammate passes, or ball control while executing change of direction.'
      }
    ]
  }
];

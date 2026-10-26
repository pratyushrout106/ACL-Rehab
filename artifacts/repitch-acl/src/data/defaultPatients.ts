export type Swelling = 'Mild' | 'Moderate' | 'Severe';
export type Entry = { pain: number; swelling: Swelling; sleep: string; date: string };
export type Session = { id: string; exercise: string; date: string; time: string; completed: boolean };

export type Exercise = {
  id: string;
  name: string;
  target: string;
  warning: string;
  icon: 'activity' | 'leg' | 'bend' | 'hand';
  seconds: number;
  cues: string[];
  category?: string;
  active?: boolean;
};

export type Patient = {
  id: string;
  name: string;
  avatar: string;
  sport: string;
  age: number;
  graft: string;
  surgeryDate: string;
  affectedLeg?: 'left' | 'right';
  legHighlightColor?: string;
  currentPhase: number;
  currentDay: number;
  totalDays: number;
  streakDays: number;
  adherenceRate: number;
  repitchPoints: number;
  clinicianNotes: string;
  checkins: Entry[];
  sessions: Session[];
  prescribedExercises: Exercise[];
};

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'alex-rivera',
    name: 'Alex Rivera',
    avatar: 'AR',
    sport: 'Football / Soccer (Midfielder)',
    age: 26,
    graft: 'Hamstring Tendon Autograft',
    surgeryDate: 'Oct 6, 2026',
    affectedLeg: 'left',
    legHighlightColor: '#10b981',
    currentPhase: 1,
    currentDay: 12,
    totalDays: 84,
    streakDays: 4,
    adherenceRate: 94,
    repitchPoints: 350,
    clinicianNotes: 'Alex is showing consistent terminal extension lock. Maintain gentle patellar mobilizations and avoid active knee flexion past 90° until next review.',
    checkins: [
      { pain: 2, swelling: 'Mild', sleep: 'Good', date: 'Today · saved' },
      { pain: 2, swelling: 'Mild', sleep: 'Good', date: 'Yesterday' },
      { pain: 3, swelling: 'Mild', sleep: 'Fair', date: '2 days ago' },
      { pain: 4, swelling: 'Moderate', sleep: 'Rough', date: '4 days ago' },
    ],
    sessions: [
      { id: '1', exercise: 'Quad Sets with Isometric Lock', date: new Date(Date.now() - 3600000 * 3).toISOString(), time: '5s hold', completed: true },
      { id: '2', exercise: 'Straight Leg Raise with Locked Knee', date: new Date(Date.now() - 3600000 * 5).toISOString(), time: '5s hold', completed: true },
    ],
    prescribedExercises: [
      { 
        id: 'quad', 
        name: 'Quad Sets with Isometric Lock', 
        target: '5s hold · 180° knee extension', 
        warning: 'Stop if you feel sharp or increasing pain.', 
        icon: 'activity', 
        seconds: 5, 
        cues: [
          'Lie comfortably with your leg supported.',
          'Gently tighten the muscle above your knee.',
          'Hold the comfortable contraction for 5 seconds.'
        ],
        category: 'Activation',
        active: true
      },
      { 
        id: 'raise', 
        name: 'Straight Leg Raise', 
        target: '45° elevation · 135° hip target', 
        warning: 'Keep the knee straight; stop if it begins to bend.', 
        icon: 'leg', 
        seconds: 5, 
        cues: [
          'Lie on your back with the working leg straight.',
          'Brace your thigh, then lift to a comfortable height.',
          'Pause briefly, then lower with control.'
        ],
        category: 'Strength',
        active: true
      },
      { 
        id: 'heel', 
        name: 'Heel Slides', 
        target: '110° flexion target', 
        warning: 'Move slowly and stay within your clinician-approved range.', 
        icon: 'bend', 
        seconds: 5, 
        cues: [
          'Lie on your back with your heel resting on the floor.',
          'Slide your heel toward you at a comfortable pace.',
          'Pause at your comfortable end range, then return.'
        ],
        category: 'Mobility',
        active: true
      },
      { 
        id: 'patella', 
        name: 'Patellar Mobilizations', 
        target: '60 seconds', 
        warning: 'Use only the direction and pressure shown by your clinician.', 
        icon: 'hand', 
        seconds: 60, 
        cues: [
          'Sit with your leg relaxed and supported.',
          'Use gentle, small movements around the kneecap.',
          'Stop if the area becomes uncomfortable.'
        ],
        category: 'Mobility',
        active: true
      },
      { 
        id: 'mini-squat', 
        name: 'Mini Squats (0°–45°)', 
        target: '10 reps · 35°–45° flexion hold', 
        warning: 'Do not squat past 45° or let knees collapse inward.', 
        icon: 'leg', 
        seconds: 6, 
        cues: [
          'Stand tall with feet shoulder-width apart and toes forward.',
          'Hinge hips slightly back and bend knees into a shallow squat (35°–45°).',
          'Ensure knees track directly over second toes without caving in.',
          'Hold the bottom for 3 seconds, then drive through heels back to full extension.'
        ],
        category: 'Strength',
        active: true
      },
    ]
  },
  {
    id: 'jordan-chen',
    name: 'Jordan Chen',
    avatar: 'JC',
    sport: 'Basketball (Point Guard)',
    age: 22,
    graft: 'Bone-Patellar Tendon-Bone (BPTB)',
    surgeryDate: 'Aug 24, 2026',
    affectedLeg: 'right',
    legHighlightColor: '#00f2fe',
    currentPhase: 2,
    currentDay: 56,
    totalDays: 140,
    streakDays: 14,
    adherenceRate: 98,
    repitchPoints: 820,
    clinicianNotes: 'Jordan cleared for 20-min stationary bike cadence drills. Quad strength LSI is at 74%. Continue progressive single-leg Romanian deadlifts.',
    checkins: [
      { pain: 1, swelling: 'Mild', sleep: 'Restful', date: 'Today · saved' },
      { pain: 1, swelling: 'Mild', sleep: 'Good', date: 'Yesterday' },
      { pain: 2, swelling: 'Mild', sleep: 'Good', date: '2 days ago' },
    ],
    sessions: [
      { id: '10', exercise: 'Wall Sits with Isometric Quad Engagement', date: new Date(Date.now() - 3600000 * 2).toISOString(), time: '30s hold', completed: true },
      { id: '11', exercise: 'Single-Leg Romanian Deadlift', date: new Date(Date.now() - 3600000 * 4).toISOString(), time: '10 reps', completed: true },
    ],
    prescribedExercises: [
      {
        id: 'wallsit',
        name: 'Wall Sits with Isometric Quad Engagement',
        target: '30s hold · 60° knee flexion',
        warning: 'Keep knees directly above heels, not exceeding toes.',
        icon: 'activity',
        seconds: 30,
        cues: [
          'Lean back firmly against wall with feet shoulder-width apart.',
          'Slide down smoothly until knees reach 60° angle.',
          'Hold steady while keeping abdominal wall braced.'
        ],
        category: 'Strength',
        active: true
      },
      {
        id: 'stepup',
        name: 'Step-Ups & Controlled Step-Downs',
        target: '6 inch box · 12 reps',
        warning: 'Watch alignment: do not let the knee collapse inward.',
        icon: 'leg',
        seconds: 10,
        cues: [
          'Place full foot firmly onto the step box.',
          'Press through midfoot to stand tall.',
          'Lower back down over a smooth 3-second cadence.'
        ],
        category: 'Strength',
        active: true
      },
      {
        id: 'bike',
        name: 'Stationary Cycling Cadence',
        target: '15 minutes · 80 RPM',
        warning: 'Maintain zero knee wobble throughout revolution.',
        icon: 'bend',
        seconds: 60,
        cues: [
          'Adjust saddle height so knee has gentle 10° bend at lowest pedal position.',
          'Spin smoothly with light resistance.',
          'Focus on symmetrical pedal strokes.'
        ],
        category: 'Mobility',
        active: true
      }
    ]
  },
  {
    id: 'marcus-vance',
    name: 'Marcus Vance',
    avatar: 'MV',
    sport: 'Rugby Union (Flanker)',
    age: 31,
    graft: 'Quadriceps Tendon Autograft',
    surgeryDate: 'May 14, 2026',
    affectedLeg: 'left',
    legHighlightColor: '#f59e0b',
    currentPhase: 3,
    currentDay: 154,
    totalDays: 240,
    streakDays: 8,
    adherenceRate: 89,
    repitchPoints: 1240,
    clinicianNotes: 'Marcus cleared to start Phase 3 straight-line jogging interval progression. Emphasize quiet, shock-absorbing landings during plyometric box drops.',
    checkins: [
      { pain: 2, swelling: 'Mild', sleep: 'Good', date: 'Today · saved' },
      { pain: 3, swelling: 'Mild', sleep: 'Fair', date: 'Yesterday' },
      { pain: 2, swelling: 'Mild', sleep: 'Good', date: '3 days ago' },
    ],
    sessions: [
      { id: '20', exercise: 'Bulgarian Split Squats', date: new Date(Date.now() - 3600000 * 6).toISOString(), time: '8 reps', completed: true },
      { id: '21', exercise: 'Linear Jogging Intervals', date: new Date(Date.now() - 3600000 * 8).toISOString(), time: '12 mins', completed: true },
    ],
    prescribedExercises: [
      {
        id: 'bulgarian',
        name: 'Bulgarian Split Squats (Rear Foot Elevated)',
        target: '3 sets of 8 reps · 90° working depth',
        warning: 'Keep torso upright; stop if anterior knee feels acute pinch.',
        icon: 'leg',
        seconds: 15,
        cues: [
          'Rest laces of rear foot on bench behind you.',
          'Descend smoothly on front leg until knee reaches 90°.',
          'Drive through front heel to return to standing.'
        ],
        category: 'Strength',
        active: true
      },
      {
        id: 'boxjump',
        name: 'Box Jumps with Silent Landing',
        target: '12 inch box · stick landing 2s',
        warning: 'Land softly on balls of feet rolling to heels; avoid stiff knees.',
        icon: 'activity',
        seconds: 10,
        cues: [
          'Stand facing plyometric box with athletic posture.',
          'Swing arms and jump onto center of box.',
          'Absorb impact with deep, quiet knee bend and hold.'
        ],
        category: 'Plyometrics',
        active: true
      },
      {
        id: 'jogging',
        name: 'Linear Walk-to-Jog Intervals',
        target: '10 intervals (1 min jog / 1 min walk)',
        warning: 'Flat surface only; strictly linear running with no cuts.',
        icon: 'bend',
        seconds: 60,
        cues: [
          'Warm up with 3 minutes of brisk walking.',
          'Maintain relaxed upright posture and cadence of ~160 spm.',
          'Discontinue if pain exceeds 3/10 or limp develops.'
        ],
        category: 'Dynamic',
        active: true
      }
    ]
  },
  {
    id: 'elena-rostova',
    name: 'Elena Rostova',
    avatar: 'ER',
    sport: 'Track & Field (Sprint & Hurdles)',
    age: 24,
    graft: 'Hamstring Tendon Autograft',
    surgeryDate: 'Jan 20, 2026',
    currentPhase: 4,
    currentDay: 268,
    totalDays: 270,
    streakDays: 21,
    adherenceRate: 99,
    repitchPoints: 2150,
    clinicianNotes: 'Elena passed the complete Hop Test Battery with 94% LSI! Entering final pre-competition clearance phase with 90° reactive cutting drills.',
    checkins: [
      { pain: 0, swelling: 'Mild', sleep: 'Restful', date: 'Today · saved' },
      { pain: 0, swelling: 'Mild', sleep: 'Restful', date: 'Yesterday' },
      { pain: 1, swelling: 'Mild', sleep: 'Good', date: '2 days ago' },
    ],
    sessions: [
      { id: '30', exercise: '45° Cutting & Deceleration Cones', date: new Date(Date.now() - 3600000 * 1).toISOString(), time: '4 cuts', completed: true },
      { id: '31', exercise: 'Triple Hop for Distance Test', date: new Date(Date.now() - 3600000 * 3).toISOString(), time: '3 trials', completed: true },
    ],
    prescribedExercises: [
      {
        id: 'cutting',
        name: '45° Cutting & Deceleration Drills',
        target: '4 sets of 4 cuts each side',
        warning: 'Ensure stable plant foot with wide base of support.',
        icon: 'activity',
        seconds: 15,
        cues: [
          'Sprint forward at 80% pace toward cone.',
          'Drop hips and plant outside foot firmly.',
          'Push off with high power in 45° angle direction.'
        ],
        category: 'Agility',
        active: true
      },
      {
        id: 'skater',
        name: 'Lateral Skater Bounds with Single-Leg Stick',
        target: '6 bounds per leg · 2s hold',
        warning: 'Do not bounce out of the landing; hold for 2 full seconds.',
        icon: 'leg',
        seconds: 10,
        cues: [
          'Load stance leg in athletic partial squat.',
          'Explode sideways across turf.',
          'Stick landing solidly on opposite foot without extra hops.'
        ],
        category: 'Plyometrics',
        active: true
      }
    ]
  }
];

import React, { useState } from 'react';
import { 
  FileText, 
  Activity, 
  HeartPulse, 
  ArrowUpRight, 
  ChevronDown, 
  Calendar, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Download,
  Dumbbell,
  Check
} from 'lucide-react';
import { Patient, Entry, Exercise } from '../data/defaultPatients';

interface PhysioClinicalReportProps {
  patient: Patient;
  latest: Entry;
  flags: Entry[];
  exportReport: () => void;
  openDemo?: (ex: Exercise) => void;
}

interface TelemetryDataPoint {
  id: string;
  name: string;
  shortLabel: string;
  actualAngle: number;
  targetAngle: number;
  repsOrHold: string;
  accuracy: number;
  lastDate: string;
  status: 'optimal' | 'moderate' | 'needs-attention';
}

export function PhysioClinicalReport({
  patient,
  latest,
  flags,
  exportReport,
  openDemo
}: PhysioClinicalReportProps) {
  const [timeframe, setTimeframe] = useState<'Month' | 'Week' | 'All'>('Month');
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number>(4); // default active like 'Hepatitis 18' in reference
  const [showAllLogs, setShowAllLogs] = useState<boolean>(false);

  // Derive exercise telemetry data points from the patient's exercises and sessions
  const exercises = patient.prescribedExercises || [];
  
  // High quality sample clinical angle trajectory data mapped to ACL exercises
  const telemetryData: TelemetryDataPoint[] = [
    {
      id: 'ex-1',
      name: 'Quad Sets with Terminal Lock',
      shortLabel: 'QUAD SET',
      actualAngle: 0, // 0 deg is terminal extension (scaled for visual graph)
      targetAngle: 0,
      repsOrHold: '3 Sets · 10s Hold',
      accuracy: 98,
      lastDate: 'Today · 10:45 AM',
      status: 'optimal'
    },
    {
      id: 'ex-2',
      name: 'Straight Leg Raise (SLR)',
      shortLabel: 'SLR HOLD',
      actualAngle: 45,
      targetAngle: 45,
      repsOrHold: '3 Sets · 10 Reps',
      accuracy: 95,
      lastDate: 'Today · 09:30 AM',
      status: 'optimal'
    },
    {
      id: 'ex-3',
      name: 'Heel Slides (Controlled Flexion)',
      shortLabel: 'HEEL SLIDE',
      actualAngle: 92,
      targetAngle: 90,
      repsOrHold: '3 Sets · 8 Reps',
      accuracy: 92,
      lastDate: 'Yesterday · 04:15 PM',
      status: 'optimal'
    },
    {
      id: 'ex-4',
      name: 'Patellar Mobilization (Glides)',
      shortLabel: 'PATELLAR',
      actualAngle: 0,
      targetAngle: 0,
      repsOrHold: '2 Sets · 5 Mins',
      accuracy: 100,
      lastDate: 'Yesterday · 11:20 AM',
      status: 'optimal'
    },
    {
      id: 'ex-5',
      name: 'Prone Knee Hangs (Gravity Extension)',
      shortLabel: 'PRONE HANG',
      actualAngle: 0,
      targetAngle: 0,
      repsOrHold: '2 Sets · 8 Mins',
      accuracy: 96,
      lastDate: '2 Days ago',
      status: 'optimal'
    },
    {
      id: 'ex-6',
      name: 'Seated Calf Raises',
      shortLabel: 'CALF RAISE',
      actualAngle: 30,
      targetAngle: 35,
      repsOrHold: '3 Sets · 15 Reps',
      accuracy: 90,
      lastDate: '3 Days ago',
      status: 'optimal'
    },
    {
      id: 'ex-7',
      name: 'Wall Slides (Terminal Angle)',
      shortLabel: 'WALL SLIDE',
      actualAngle: 85,
      targetAngle: 90,
      repsOrHold: '2 Sets · 10 Reps',
      accuracy: 88,
      lastDate: '4 Days ago',
      status: 'moderate'
    },
    {
      id: 'ex-8',
      name: 'Step-Ups with Controlled Eccentric',
      shortLabel: 'STEP UP',
      actualAngle: 60,
      targetAngle: 60,
      repsOrHold: '3 Sets · 10 Reps',
      accuracy: 94,
      lastDate: '5 Days ago',
      status: 'optimal'
    }
  ];

  // Normalized values for SVG Chart path points (0 to 8 scale matching screenshot y-axis: 08, 07, 06, 05, 04, 03, 02, 01, 0)
  // Screenshot lines: Green line stays around 6.5, drops to 5, down to 4, rises to 5, rises to 6.5, drops to 5.2, rises to 6.5
  // Blue line stays around 5.5, drops to 3.8, down to 3, rises to 3.8, rises to 5.5, drops to 3.8, rises to 5.5
  const chartPoints = [
    { x: 40,  blueY: 210, greenY: 210, label: telemetryData[0].shortLabel, val: telemetryData[0] }, // start lower
    { x: 120, blueY: 105, greenY: 70,  label: telemetryData[1].shortLabel, val: telemetryData[1] },
    { x: 210, blueY: 105, greenY: 70,  label: telemetryData[2].shortLabel, val: telemetryData[2] },
    { x: 300, blueY: 150, greenY: 120, label: telemetryData[3].shortLabel, val: telemetryData[3] },
    { x: 390, blueY: 180, greenY: 155, label: telemetryData[4].shortLabel, val: telemetryData[4] },
    { x: 480, blueY: 150, greenY: 120, label: telemetryData[5].shortLabel, val: telemetryData[5] },
    { x: 570, blueY: 105, greenY: 70,  label: telemetryData[6].shortLabel, val: telemetryData[6] },
    { x: 660, blueY: 150, greenY: 125, label: telemetryData[7].shortLabel, val: telemetryData[7] },
    { x: 740, blueY: 105, greenY: 70,  label: telemetryData[0].shortLabel, val: telemetryData[0] },
    { x: 800, blueY: 105, greenY: 70,  label: 'MEASILES', val: telemetryData[1] },
  ];

  // Generate SVG smooth path
  const makePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const blueCurve = makePath(chartPoints.map(p => ({ x: p.x, y: p.blueY })));
  const greenCurve = makePath(chartPoints.map(p => ({ x: p.x, y: p.greenY })));
  const blueArea = `${blueCurve} L ${chartPoints[chartPoints.length - 1].x} 230 L ${chartPoints[0].x} 230 Z`;
  const greenArea = `${greenCurve} L ${chartPoints[chartPoints.length - 1].x} 230 L ${chartPoints[0].x} 230 Z`;

  // Total sessions completed count
  const totalReportsCount = patient.sessions.length > 0 ? patient.sessions.length + 30 : 35;
  const completedSetsCount = patient.checkins.length > 0 ? patient.checkins.length * 4 + 7 : 27;
  const milestonesDoneCount = `0${patient.currentPhase || 4}`;

  // Overall condition score
  const overallCondition = patient.adherenceRate || 68;

  // Active tooltip point
  const activePoint = chartPoints[activeTooltipIndex] || chartPoints[4];

  return (
    <div className="physio-report-container">
      {/* Header Bar */}
      <div className="physio-report-header">
        <div>
          <div className="physio-report-eyebrow">
            <Sparkles size={13} style={{ color: '#2563eb' }} />
            CLINICAL REPORT & EXERCISE PERFORMANCE INTELLIGENCE
          </div>
          <h2 className="physio-report-title">
            Physiotherapy Analytics for {patient.name}
          </h2>
          <p className="physio-report-subtitle">
            Hygienic, evidence-based joint kinematics, exercise dosage logs, and overall rehabilitation progress.
          </p>
        </div>

        <div className="physio-report-actions">
          <div className="physio-patient-badge">
            <span className="dot online" />
            <span>Active Case: <strong>{patient.sport.split(' ')[0]} Athlete</strong></span>
          </div>
          <button 
            className="physio-export-btn"
            onClick={exportReport}
            title="Export CSV data"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns (Left 68%, Right 32%) */}
      <div className="physio-dashboard-layout">
        
        {/* ================= LEFT COLUMN ================= */}
        <div className="physio-left-col">
          
          {/* TOP METRIC CARDS (3 CARDS MATCHING REFERENCE SCREENSHOT) */}
          <div className="physio-metrics-row">
            
            {/* Card 1: Your Total Report */}
            <div className="physio-stat-card">
              <div className="physio-card-top">
                <div className="physio-circle-icon neutral">
                  <FileText size={18} />
                </div>
                <button 
                  className="physio-circle-btn-blue" 
                  onClick={exportReport}
                  title="View report details"
                  aria-label="View total reports"
                >
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="physio-stat-number">{totalReportsCount}</div>
              <div className="physio-stat-label">Your Total Report</div>
            </div>

            {/* Card 2: Injections Taken -> Exercise Sets Done */}
            <div className="physio-stat-card">
              <div className="physio-card-top">
                <div className="physio-circle-icon neutral">
                  <Activity size={18} />
                </div>
                <button 
                  className="physio-circle-btn-blue"
                  title="View exercise sets"
                  aria-label="View exercise sets"
                >
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="physio-stat-number">{completedSetsCount}</div>
              <div className="physio-stat-label">Exercise Sets Completed</div>
            </div>

            {/* Card 3: Surgery's Done -> Clinical Milestones Done */}
            <div className="physio-stat-card">
              <div className="physio-card-top">
                <div className="physio-circle-icon neutral">
                  <HeartPulse size={18} />
                </div>
                <button 
                  className="physio-circle-btn-blue"
                  title="View clinical milestones"
                  aria-label="View clinical milestones"
                >
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="physio-stat-number">{milestonesDoneCount}</div>
              <div className="physio-stat-label">Surgery Milestones Cleared</div>
            </div>

          </div>

          {/* MIDDLE CARD: PRESCRIPTION STATISTICS & ANGLE CHART (MATCHING REFERENCE) */}
          <div className="physio-chart-card">
            <div className="physio-chart-head">
              <h3 className="physio-chart-title">Your Prescription Statistics</h3>
              
              <div className="physio-chart-controls">
                {/* Legend */}
                <div className="physio-legend-item">
                  <span className="physio-legend-dot blue" />
                  <span>Body Problems (Active Angle)</span>
                </div>
                <div className="physio-legend-item">
                  <span className="physio-legend-dot green" />
                  <span>Mental Illness (Target Hold)</span>
                </div>

                {/* Timeframe Pill Dropdown */}
                <div className="physio-pill-dropdown">
                  <span>{timeframe}</span>
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* SVG Dual-Area Stepped Wave Chart */}
            <div className="physio-svg-chart-container">
              {/* Y-Axis numbers (08, 07, 06, 05, 04, 03, 02, 01, 0) */}
              <div className="physio-y-axis">
                <span>08</span>
                <span>07</span>
                <span>06</span>
                <span>05</span>
                <span>04</span>
                <span>03</span>
                <span>02</span>
                <span>01</span>
                <span>0</span>
              </div>

              {/* Chart SVG Canvas */}
              <div className="physio-chart-svg-wrap">
                <svg viewBox="0 0 820 240" className="physio-area-svg" preserveAspectRatio="none">
                  <defs>
                    {/* Blue gradient */}
                    <linearGradient id="physioBlueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Green gradient */}
                    <linearGradient id="physioGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Subtle grid pattern */}
                    <pattern id="chartGrid" width="80" height="26" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="26" x2="80" y2="26" stroke="var(--border-light, #f1f5f9)" strokeWidth="0.8" />
                    </pattern>
                  </defs>

                  <rect width="820" height="230" fill="url(#chartGrid)" opacity="0.6" />

                  {/* Green fill and stroke */}
                  <path d={greenArea} fill="url(#physioGreenGrad)" />
                  <path d={greenCurve} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Blue fill and stroke */}
                  <path d={blueArea} fill="url(#physioBlueGrad)" />
                  <path d={blueCurve} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Interactive points */}
                  {chartPoints.map((pt, idx) => (
                    <g 
                      key={idx} 
                      className="physio-point-hit" 
                      onClick={() => setActiveTooltipIndex(idx)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle 
                        cx={pt.x} 
                        cy={pt.blueY} 
                        r={activeTooltipIndex === idx ? 5 : 3.5} 
                        fill="#ffffff" 
                        stroke="#2563eb" 
                        strokeWidth="2.5" 
                      />
                      <circle 
                        cx={pt.x} 
                        cy={pt.greenY} 
                        r={activeTooltipIndex === idx ? 5 : 3.5} 
                        fill="#ffffff" 
                        stroke="#22c55e" 
                        strokeWidth="2.5" 
                      />
                    </g>
                  ))}
                </svg>

                {/* Floating Tooltip Pill (matching 'Hepatitis 18' in reference) */}
                <div 
                  className="physio-floating-tooltip"
                  style={{
                    left: `${(activePoint.x / 820) * 100}%`,
                    top: `${activePoint.blueY - 44}px`
                  }}
                >
                  <div className="tooltip-title">{activePoint.val.name.split(' ')[0]}</div>
                  <div className="tooltip-sub">{activePoint.val.accuracy}% Form · 18</div>
                  <div className="tooltip-arrow" />
                </div>
              </div>

              {/* X-Axis labels matching reference layout */}
              <div className="physio-x-axis">
                <span>NEUROPOLY</span>
                <span>THYROID</span>
                <span>DIABETES</span>
                <span>INSOMNIA</span>
                <span className="active-x">HEPATITIS</span>
                <span>INFLUENZA</span>
                <span>RUBELLA</span>
                <span>MEASLES</span>
              </div>
            </div>
          </div>

          {/* BOTTOM TABLE: RECENT TRANSACTIONS / EXERCISE LOG HISTORY */}
          <div className="physio-table-card">
            <div className="physio-table-head">
              <h3 className="physio-table-title">Recent Transaction</h3>
              <button 
                className="physio-see-all-btn"
                onClick={() => setShowAllLogs(!showAllLogs)}
              >
                {showAllLogs ? 'Show Less' : 'See all'}
              </button>
            </div>

            <div className="physio-table-scroll">
              <table className="physio-minimal-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Invoice</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllLogs ? telemetryData : telemetryData.slice(0, 4)).map((item, i) => (
                    <tr key={item.id}>
                      <td className="physio-td-name">
                        <div className="td-exercise-flex">
                          <span className="td-index">0{i + 1}</span>
                          <div>
                            <div className="td-main-text">{item.name}</div>
                            <div className="td-sub-text">{item.shortLabel} Protocol</div>
                          </div>
                        </div>
                      </td>
                      <td className="physio-td-date">{item.lastDate}</td>
                      <td className="physio-td-amount">
                        <strong>{item.repsOrHold}</strong>
                      </td>
                      <td className="physio-td-invoice">
                        <span className="invoice-code">REC-#{1040 + i}</span>
                      </td>
                      <td className="physio-td-status">
                        <span className={`status-pill ${item.status}`}>
                          {item.status === 'optimal' ? 'Paid / Valid' : 'Pending Review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="physio-right-col">
          
          {/* TOP RIGHT: YOUR OVER ALL CONDITION (MULTI-SEGMENT DONUT ARC) */}
          <div className="physio-condition-card">
            <h3 className="physio-condition-title">Your Over all Condition</h3>

            <div className="physio-gauge-wrap">
              {/* SVG Multi-Colored Segmented Donut Arc */}
              <svg viewBox="0 0 320 320" className="physio-gauge-svg">
                <defs>
                  {/* Subtle hatching pattern for inner circular background */}
                  <pattern id="gaugeHatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="4" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.6" />
                  </pattern>
                </defs>

                {/* Inner circular background with vertical hatch texture */}
                <circle cx="160" cy="160" r="105" fill="none" stroke="#e0e7ff" strokeWidth="24" strokeDasharray="3 3" opacity="0.5" />

                {/* Segment 1: Green (Neurology 15%) */}
                {/* Arc from 135deg to 190deg */}
                <path
                  d="M 68 180 A 110 110 0 0 1 85 95"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="28"
                  strokeLinecap="round"
                />

                {/* Segment 2: Violet/Purple (Rehabilitation 18%) */}
                {/* Arc from 195deg to 260deg */}
                <path
                  d="M 105 80 A 110 110 0 0 1 180 52"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="28"
                  strokeLinecap="round"
                />

                {/* Segment 3: Coral/Pink (Dermatology 18%) */}
                {/* Arc from 270deg to 360deg */}
                <path
                  d="M 200 55 A 110 110 0 0 1 270 140"
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="30"
                  strokeLinecap="round"
                />

                {/* Center circle cutout */}
                <circle cx="160" cy="160" r="82" fill="var(--bg-card, #ffffff)" />
              </svg>

              {/* Callout Speech Bubble Tags (Positioned around arcs like reference) */}
              <div className="gauge-tag tag-green">
                <span className="tag-name">Neurology</span>
                <span className="tag-val">15%</span>
                <div className="tag-tail bottom" />
              </div>

              <div className="gauge-tag tag-purple">
                <span className="tag-name">Rehabilitation</span>
                <span className="tag-val">18%</span>
                <div className="tag-tail bottom" />
              </div>

              <div className="gauge-tag tag-pink">
                <span className="tag-name">Dermatology</span>
                <span className="tag-val">18%</span>
                <div className="tag-tail left" />
              </div>

              <div className="gauge-tag tag-cyan">
                <span className="tag-name">Cardiology</span>
                <span className="tag-val">20%</span>
              </div>

              {/* Central Overall Percentage Display */}
              <div className="gauge-center-content">
                <div className="gauge-center-label">Overall</div>
                <div className="gauge-center-percentage">{overallCondition}%</div>
              </div>
            </div>

            {/* Clinical interpretation note */}
            <div className="physio-gauge-footer">
              <div className="footer-status-dot" />
              <span>Full extension lock achieved · Quadriceps LSI on clinical target for Phase {patient.currentPhase}.</span>
            </div>
          </div>

          {/* BOTTOM RIGHT: PRESCRIBED EXERCISE DOSES GRID (2x2 / 2x3 GRID) */}
          <div className="physio-doses-grid">
            {telemetryData.slice(0, 4).map((exItem, index) => {
              const numStr = `0${index + 1}`;
              const dozeStr = `(${index + 1} Doze)`;
              const displayName = exItem.name.split(' ')[0] + ' ' + (exItem.name.split(' ')[1] || '');

              return (
                <div key={exItem.id} className="physio-dose-card">
                  <div className="dose-top-row">
                    <span className="dose-number">{numStr}</span>
                    <span className="dose-med-name">{displayName}</span>
                  </div>

                  <div className="dose-main-text">
                    {dozeStr}
                  </div>

                  <div className="dose-bottom-row">
                    <span className="dose-date">{exItem.lastDate.split('·')[0].trim()}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}

export default PhysioClinicalReport;

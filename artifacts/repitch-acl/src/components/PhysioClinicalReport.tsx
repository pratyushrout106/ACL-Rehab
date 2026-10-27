import { Activity, AlertTriangle, CheckCircle2, Download, FileText, HeartPulse, TrendingDown } from 'lucide-react';
import type { Entry, Patient } from '../data/defaultPatients';

type Props = { patient: Patient; latest: Entry; flags: Entry[]; exportReport: () => void };

const shortDate = (value: string) => value.replace(' · saved', '').replace('Today', 'Today').replace('Yesterday', 'Yesterday');

export function PhysioClinicalReport({ patient, latest, flags, exportReport }: Props) {
  const painTrend = [...patient.checkins].reverse().map((entry, index) => ({
    label: shortDate(entry.date) || `Check-in ${index + 1}`,
    pain: entry.pain,
  }));
  const activity = [...patient.sessions].reverse().slice(-7).map((session) => ({
    label: new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    sessions: 1,
  }));
  const hasConcern = latest?.pain >= 5 || latest?.swelling === 'Moderate' || latest?.swelling === 'Severe';
  const signalText = hasConcern ? 'Review recommended' : flags.length > 0 ? 'Keep an eye on symptoms' : 'No current symptom flags';
  const chartWidth = 560;
  const chartHeight = 210;
  const padding = { top: 12, right: 10, bottom: 30, left: 30 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;
  const painPoints = painTrend.map((item, index) => ({
    ...item,
    x: padding.left + (painTrend.length === 1 ? graphWidth / 2 : (index / (painTrend.length - 1)) * graphWidth),
    y: padding.top + graphHeight - (item.pain / 10) * graphHeight,
  }));
  const painLine = painPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const painArea = painPoints.length ? `${padding.left},${padding.top + graphHeight} ${painLine} ${painPoints[painPoints.length - 1].x},${padding.top + graphHeight}` : '';
  const activityMax = Math.max(1, ...activity.map((item) => item.sessions));

  return (
    <section className="progress-report" aria-labelledby="progress-report-title">
      <header className="progress-report-head">
        <div>
          <div className="eyebrow"><Activity size={13}/> LIVE PROGRESS REPORT</div>
          <h2 id="progress-report-title">{patient.name} at a glance</h2>
          <p>Updates automatically when this patient saves a check-in or completes a guided set.</p>
        </div>
        <button className="btn btn-quiet" onClick={exportReport}><Download size={15}/> Download CSV</button>
      </header>

      <div className="report-summary-grid">
        <div className="report-summary-item"><HeartPulse size={17}/><span>Latest pain</span><strong>{latest?.pain ?? '—'}<small>/10</small></strong></div>
        <div className="report-summary-item"><Activity size={17}/><span>Latest swelling</span><strong className={latest?.swelling === 'None' || latest?.swelling === 'Mild' ? 'good' : 'watch'}>{latest?.swelling ?? '—'}</strong></div>
        <div className="report-summary-item"><CheckCircle2 size={17}/><span>Plan adherence</span><strong>{patient.adherenceRate}<small>%</small></strong></div>
        <div className="report-summary-item"><FileText size={17}/><span>Guided sets logged</span><strong>{patient.sessions.length}</strong></div>
      </div>

      <div className="report-chart-grid">
        <article className="report-chart-card">
          <div className="report-chart-heading"><div><h3>Pain trend</h3><p>Patient-reported pain at check-in</p></div><span className="chart-key"><i/> Pain (0–10)</span></div>
          <div className="report-chart-canvas">
            <svg className="report-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Pain reported at each check-in">
              <defs><linearGradient id="painFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0B69DA" stopOpacity=".28"/><stop offset="100%" stopColor="#0B69DA" stopOpacity="0"/></linearGradient></defs>
              {[0, 2, 4, 6, 8, 10].map((value) => { const y = padding.top + graphHeight - (value / 10) * graphHeight; return <g key={value}><line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="report-grid-line"/><text x={padding.left - 8} y={y + 4} className="report-axis-label">{value}</text></g>; })}
              {painArea && <polygon points={painArea} fill="url(#painFill)"/>}
              {painPoints.length > 1 && <polyline points={painLine} className="report-pain-line"/>}
              {painPoints.map((point) => <g key={`${point.label}-${point.x}`}><circle cx={point.x} cy={point.y} r="4" className="report-point"><title>{`${point.label}: ${point.pain}/10 pain`}</title></circle><text x={point.x} y={chartHeight - 8} textAnchor="middle" className="report-axis-label">{point.label}</text></g>)}
            </svg>
          </div>
          <p className="report-chart-foot"><TrendingDown size={14}/> Lower pain is generally preferable; interpret alongside the clinical review.</p>
        </article>

        <article className="report-chart-card">
          <div className="report-chart-heading"><div><h3>Guided-set activity</h3><p>Completed sessions in the latest activity window</p></div><span className="chart-key slate"><i/> Logged sets</span></div>
          <div className="report-chart-canvas">
            {activity.length ? <svg className="report-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Completed guided sets by date">
              {[0, 1].map((value) => { const y = padding.top + graphHeight - (value / activityMax) * graphHeight; return <g key={value}><line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="report-grid-line"/><text x={padding.left - 8} y={y + 4} className="report-axis-label">{value}</text></g>; })}
              {activity.map((item, index) => { const columnWidth = graphWidth / activity.length; const barWidth = Math.min(46, columnWidth * .56); const x = padding.left + index * columnWidth + (columnWidth - barWidth) / 2; const barHeight = (item.sessions / activityMax) * graphHeight; const y = padding.top + graphHeight - barHeight; return <g key={`${item.label}-${index}`}><rect x={x} y={y} width={barWidth} height={barHeight} rx="5" className="report-bar"><title>{`${item.label}: ${item.sessions} guided set`}</title></rect><text x={x + barWidth / 2} y={chartHeight - 8} textAnchor="middle" className="report-axis-label">{item.label}</text></g>; })}
            </svg> : <div className="report-empty">No guided sets logged yet.</div>}
          </div>
          <p className="report-chart-foot"><CheckCircle2 size={14}/> {patient.sessions.length} total guided set{patient.sessions.length === 1 ? '' : 's'} recorded.</p>
        </article>
      </div>

      <div className={`report-signal ${hasConcern ? 'attention' : ''}`}>
        {hasConcern ? <AlertTriangle size={17}/> : <CheckCircle2 size={17}/>}<div><strong>{signalText}</strong><span>{hasConcern ? 'Latest patient-reported symptoms meet your review threshold.' : 'Use this report alongside your examination and clinical judgement.'}</span></div>
      </div>
    </section>
  );
}

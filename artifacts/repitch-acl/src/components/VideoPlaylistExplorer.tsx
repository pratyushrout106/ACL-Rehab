import React, { useState } from 'react';
import { 
  Clock3, 
  Download, 
  Film, 
  Play, 
  Trash2, 
  Video, 
  Layers, 
  Activity,
  CheckCircle2
} from 'lucide-react';

export interface TelemetryPoint {
  t: number;
  angle: number | null;
  measure: string;
}

export interface VideoClipEntry {
  id: string;
  patientId: string;
  at: string;
  exercise: string;
  duration: number;
  url: string;
  blob: Blob;
  telemetry: TelemetryPoint[];
}

export interface VideoPlaylistExplorerProps {
  clips: VideoClipEntry[];
  selectedClipId: string | null;
  setSelectedClipId: (id: string) => void;
  downloadClip: (clip: VideoClipEntry) => void;
  deleteClip: (clipId: string) => void;
  title?: string;
  subtitle?: string;
  userRole?: 'patient' | 'clinician';
}

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

export function VideoPlaylistExplorer({
  clips,
  selectedClipId,
  setSelectedClipId,
  downloadClip,
  deleteClip,
  title,
  subtitle,
  userRole = 'patient',
}: VideoPlaylistExplorerProps) {
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [exerciseFilter, setExerciseFilter] = useState<string>('all');
  const exerciseOptions = Array.from(new Set(clips.map((clip) => clip.exercise)));
  const visibleClips = exerciseFilter === 'all'
    ? clips
    : clips.filter((clip) => clip.exercise === exerciseFilter);

  // Active clip is either the selected one or the newest available in the selected workout.
  const activeClip = visibleClips.find((c) => c.id === selectedClipId) || visibleClips[0] || null;

  // Filter valid telemetry angle samples
  const angleSamples = activeClip?.telemetry?.filter((s) => s.angle !== null) ?? [];
  const currentSample = angleSamples.length
    ? angleSamples.reduce<TelemetryPoint | null>(
        (closest, sample) =>
          !closest || Math.abs(sample.t - playbackTime) < Math.abs(closest.t - playbackTime)
            ? sample
            : closest,
        null
      )
    : null;

  return (
    <section className="panel video-box" style={{ marginTop: 24, padding: '24px' }}>
      {/* Section Header */}
      <div className="section-head" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div 
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 10, 
              background: 'var(--accent-cyan-light)', 
              color: 'var(--accent-cyan)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Film size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{title || 'Recorded Biomechanical Telemetry & Video Archive'}</h2>
            <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              {subtitle || 'Review recorded exercise kinematics, analyze synchronized joint angle graphs, and export clinical clips.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {exerciseOptions.length > 1 && (
            <label className="clip-filter">
              <span className="sr-only">Filter recordings by exercise</span>
              <select value={exerciseFilter} onChange={(event) => { setExerciseFilter(event.target.value); setPlaybackTime(0); }}>
                <option value="all">All workouts</option>
                {exerciseOptions.map((exercise) => <option key={exercise} value={exercise}>{exercise}</option>)}
              </select>
            </label>
          )}
          <span className="tag tag-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <Layers size={13} /> {visibleClips.length} {visibleClips.length === 1 ? 'Recorded Set' : 'Recorded Sets'}
          </span>
        </div>
      </div>

      {visibleClips.length === 0 ? (
        <div 
          className="empty" 
          style={{ 
            padding: '42px 20px', 
            textAlign: 'center', 
            background: 'var(--bg-card-subtle)', 
            borderRadius: 14, 
            border: '1px dashed var(--border-light)' 
          }}
        >
          <Video size={42} style={{ color: 'var(--accent-cyan)', margin: '0 auto 12px', opacity: 0.7 }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>No Recorded Sessions in Archive</h3>
          <p style={{ margin: '0 auto', maxWidth: 480, color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.5 }}>
            {userRole === 'patient'
              ? 'When you record an exercise using the AI Camera Tracker, your kinematic form and joint angles are logged here. Each session is archived automatically for longitudinal clinical comparison.'
              : 'This patient has not recorded any exercise sessions yet. Once they launch the AI Camera Tracker and complete an exercise set, synchronized kinematic recordings will appear here for clinical biomechanical review.'}
          </p>
        </div>
      ) : (
        <div className="video-playlist-container">
          {/* Left Column: Active Video Player & Telemetry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activeClip && (
              <>
                <div 
                  style={{ 
                    position: 'relative', 
                    borderRadius: 14, 
                    overflow: 'hidden', 
                    background: '#05080e', 
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
                  }}
                >
                  <video
                    key={activeClip.id}
                    controls
                    src={activeClip.url}
                    onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)}
                    style={{ 
                      width: '100%', 
                      maxHeight: 380, 
                      display: 'block', 
                      background: '#000000', 
                      objectFit: 'contain' 
                    }}
                  />
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: 12, 
                      left: 12, 
                      background: 'rgba(5, 8, 14, 0.78)', 
                      backdropFilter: 'blur(8px)', 
                      padding: '5px 12px', 
                      borderRadius: 8, 
                      fontSize: 12.5, 
                      color: 'var(--text-primary)', 
                      fontWeight: 600, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 7,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <Play size={12} color="var(--accent-cyan)" fill="var(--accent-cyan)" />
                    <span>{activeClip.exercise}</span>
                  </div>
                </div>

                {/* Primary Action Buttons: Save & Delete */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    gap: 12, 
                    flexWrap: 'wrap',
                    padding: '4px 2px'
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => downloadClip(activeClip)}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 7, 
                        fontSize: 13, 
                        fontWeight: 600,
                        padding: '8px 16px' 
                      }}
                      title="Save video file (.webm) to your computer"
                    >
                      <Download size={15} /> Export Video (.webm)
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => deleteClip(activeClip.id)}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 7, 
                        fontSize: 13, 
                        color: 'var(--accent-rose)', 
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        padding: '8px 16px' 
                      }}
                      title="Delete this clip from device storage"
                    >
                      <Trash2 size={15} /> Delete Session
                    </button>
                  </div>

                  <div className="muted small mono" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock3 size={13} />
                    <span>Recorded: {formatDateTime(activeClip.at)} · {activeClip.duration}s</span>
                  </div>
                </div>

                {/* Telemetry Readout Box */}
                <div 
                  style={{ 
                    background: 'var(--bg-card-subtle)', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: 14, 
                    padding: 16 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div className="eyebrow" style={{ margin: 0 }}>JOINT KINEMATICS & ANGLE TIMELINE</div>
                    <div className="tag" style={{ fontSize: 11, padding: '3px 9px' }}>
                      Playback: {playbackTime.toFixed(1)}s / {activeClip.duration}s
                    </div>
                  </div>

                  {angleSamples.length > 0 ? (
                    <div>
                      <div className="pose-readout" style={{ margin: '4px 0 12px' }}>
                        <strong>Instantaneous Joint Angle</strong>
                        <span className="mono pose-angle">
                          {currentSample?.angle != null ? `${currentSample.angle}°` : '—'}
                          <small style={{ marginLeft: 8 }}>{currentSample?.measure || 'Knee Flexion'}</small>
                        </span>
                      </div>

                      <div className="telemetry-list" style={{ maxHeight: 130, overflowY: 'auto' }}>
                        <div className="field-title" style={{ margin: '4px 0 8px' }}>
                          <span>Continuous Angle Timeline</span>
                          <span className="mono muted">{angleSamples.length} points</span>
                        </div>
                        {angleSamples.map((sample, idx) => (
                          <div 
                            key={`${sample.t}-${idx}`} 
                            className={`telemetry-row ${sample === currentSample ? 'active' : ''}`}
                          >
                            <span className="mono muted">{sample.t.toFixed(1)}s</span>
                            <span style={{ fontWeight: 600 }}>
                              {sample.angle}° <small className="muted">{sample.measure}</small>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="notice" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                      No joint kinematic telemetry recorded for this clip.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Stacked Playlist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
              <div>
                <div className="eyebrow" style={{ margin: 0 }}>SESSION ARCHIVE</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {clips.length} {clips.length === 1 ? 'Session Available' : 'Sessions Available'}
                </div>
              </div>
              <span className="tag" style={{ fontSize: 10.5, textTransform: 'uppercase' }}>
                Newest First
              </span>
            </div>

            <div className="video-playlist">
              {visibleClips.map((clip, index) => {
                const isSelected = activeClip && clip.id === activeClip.id;
                return (
                  <div
                    key={clip.id}
                    className={`video-playlist-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedClipId(clip.id);
                      setPlaybackTime(0);
                    }}
                    title={`Click to view ${clip.exercise}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, flex: 1 }}>
                      <div 
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: isSelected ? 'var(--accent-cyan)' : 'var(--bg-card)',
                          color: isSelected ? '#000000' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 12,
                          flexShrink: 0
                        }}
                      >
                        #{visibleClips.length - index}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div 
                          style={{ 
                            fontWeight: 600, 
                            fontSize: 13, 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)'
                          }}
                        >
                          {clip.exercise}
                        </div>
                        <div 
                          className="mono small muted" 
                          style={{ 
                            fontSize: 11, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            flexWrap: 'wrap', 
                            marginTop: 3 
                          }}
                        >
                          <span>{formatDateTime(clip.at)}</span>
                          <span>·</span>
                          <span>{clip.duration}s</span>
                          {clip.telemetry?.length ? (
                            <>
                              <span>·</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>{clip.telemetry.length} pts</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons on Each Playlist Card */}
                    <div 
                      className="clip-actions" 
                      style={{ display: 'flex', gap: 6, flexShrink: 0 }} 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn"
                        title={`Save / Download "${clip.exercise}"`}
                        onClick={() => downloadClip(clip)}
                        style={{ padding: '6px 8px', fontSize: 11 }}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-del"
                        title={`Delete "${clip.exercise}"`}
                        onClick={() => deleteClip(clip.id)}
                        style={{ 
                          padding: '6px 8px', 
                          fontSize: 11, 
                          color: 'var(--accent-rose)', 
                          borderColor: 'rgba(239, 68, 68, 0.3)' 
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

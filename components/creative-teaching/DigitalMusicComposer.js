'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  NATURAL_NOTES,
  SHARP_NOTES,
  NOTE_COLORS,
  SHARP_NOTE_COLORS,
  DURATIONS,
  DURATION_LABELS,
  PRESETS,
  getSalamanderUrls,
} from '@/lib/music/notes'

function noteColor(note) {
  const ni = NATURAL_NOTES.indexOf(note)
  if (ni >= 0) return NOTE_COLORS[ni]
  const si = SHARP_NOTES.indexOf(note)
  if (si >= 0) return SHARP_NOTE_COLORS[si]
  return '#FF3B00'
}

function noteRollHeight(note) {
  const ni = NATURAL_NOTES.indexOf(note)
  if (ni >= 0) return 20 + (ni / NATURAL_NOTES.length) * 60
  const si = SHARP_NOTES.indexOf(note)
  if (si >= 0) return 40 + (si / SHARP_NOTES.length) * 40
  return 30
}

export default function DigitalMusicComposer() {
  const [Tone, setTone] = useState(null)
  const [sequence, setSequence] = useState([])
  const [selectedNote, setSelectedNote] = useState('C4')
  const [selectedDuration, setSelectedDuration] = useState('4n')
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [currentStep, setCurrentStep] = useState(-1)
  const [instrument, setInstrument] = useState('synth')
  const [instrumentLoading, setInstrumentLoading] = useState(false)
  const [instrumentError, setInstrumentError] = useState(null)
  const synthRef = useRef(null)
  const partRef = useRef(null)
  const stopTimerRef = useRef(null)

  const createSynth = useCallback((T, type) => {
    if (type === 'marimba') {
      return new T.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.5 },
      }).toDestination()
    }
    return new T.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
    }).toDestination()
  }, [])

  const safeTriggerAttackRelease = useCallback(
    async (note, duration, time) => {
      if (!Tone || !synthRef.current || instrumentLoading) return false
      try {
        await Tone.start()
        if (typeof time === 'number') {
          synthRef.current.triggerAttackRelease(note, duration, time)
        } else {
          synthRef.current.triggerAttackRelease(note, duration)
        }
        return true
      } catch (err) {
        console.warn('[music] playback skipped:', err?.message || err)
        return false
      }
    },
    [Tone, instrumentLoading]
  )

  useEffect(() => {
    let mounted = true
    import('tone').then((T) => {
      if (!mounted) return
      setTone(T)
      synthRef.current = createSynth(T, 'synth')
    })
    return () => {
      mounted = false
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      if (synthRef.current) synthRef.current.dispose()
      if (partRef.current) partRef.current.dispose()
    }
  }, [createSynth])

  const stop = useCallback(() => {
    if (!Tone) return
    Tone.getTransport().stop()
    if (partRef.current) {
      partRef.current.stop()
      partRef.current.dispose()
      partRef.current = null
    }
    setPlaying(false)
    setCurrentStep(-1)
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = null
  }, [Tone])

  const changeInstrument = useCallback(
    async (type) => {
      if (!Tone) return
      stop()
      setInstrumentError(null)
      if (synthRef.current) synthRef.current.dispose()

      if (type === 'piano') {
        setInstrument(type)
        setInstrumentLoading(true)
        try {
          const sampler = new Tone.Sampler({
            urls: getSalamanderUrls(),
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
          }).toDestination()
          synthRef.current = sampler
          await sampler.loaded
        } catch (err) {
          console.warn('[music] piano samples failed to load:', err?.message || err)
          setInstrumentError('Piano samples could not load — using synth instead.')
          synthRef.current = createSynth(Tone, 'synth')
          setInstrument('synth')
        } finally {
          setInstrumentLoading(false)
        }
        return
      }

      setInstrument(type)
      synthRef.current = createSynth(Tone, type)
    },
    [Tone, createSynth, stop]
  )

  const addNote = () => {
    setSequence((prev) => [
      ...prev,
      { note: selectedNote, duration: selectedDuration, id: Date.now() },
    ])
  }

  const removeNote = (id) => {
    setSequence((prev) => prev.filter((n) => n.id !== id))
  }

  const previewNote = async (note) => {
    await safeTriggerAttackRelease(note, '8n')
  }

  const play = async () => {
    if (!Tone || !synthRef.current || sequence.length === 0 || instrumentLoading) return
    await Tone.start()
    if (partRef.current) {
      partRef.current.stop()
      partRef.current.dispose()
      partRef.current = null
    }

    Tone.getTransport().bpm.value = bpm
    Tone.getTransport().stop()
    Tone.getTransport().position = 0

    let time = 0
    const events = sequence.map((item, i) => {
      const event = { time, note: item.note, duration: item.duration, index: i }
      time += Tone.Time(item.duration).toSeconds()
      return event
    })

    partRef.current = new Tone.Part((t, val) => {
      try {
        synthRef.current?.triggerAttackRelease(val.note, val.duration, t)
      } catch (err) {
        console.warn('[music] playback skipped:', err?.message || err)
      }
      setCurrentStep(val.index)
    }, events)

    partRef.current.start(0)
    Tone.getTransport().start()
    setPlaying(true)

    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = setTimeout(
      () => {
        Tone.getTransport().stop()
        setPlaying(false)
        setCurrentStep(-1)
        stopTimerRef.current = null
      },
      time * 1000 + 500
    )
  }

  const applyPreset = (preset) => {
    setSequence(preset.sequence.map((n, i) => ({ ...n, id: Date.now() + i })))
  }

  const exportAsText = async () => {
    const text = sequence.map((n) => `${n.note} (${DURATION_LABELS[n.duration]})`).join(' → ')
    await navigator.clipboard.writeText(text)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#EFECE5',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: '#FFFFFF',
          borderBottom: '1px solid #111111',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: '#111111', fontWeight: 700, fontSize: 16 }}>
          Digital Music Composer
        </span>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#666666', fontSize: 12 }}>Instrument:</span>
          <select
            value={instrument}
            onChange={(e) => changeInstrument(e.target.value)}
            style={{
              background: '#F5F2EB',
              border: '1px solid #111111',
              borderRadius: 8,
              color: '#111111',
              padding: '6px 10px',
              fontSize: 13,
            }}
            disabled={!Tone || instrumentLoading}
          >
            <option value="synth">Synth</option>
            <option value="piano">
              Piano{instrumentLoading && instrument === 'piano' ? ' (loading…)' : ''}
            </option>
            <option value="marimba">Marimba</option>
          </select>
          {instrumentError ? (
            <span style={{ color: '#b45309', fontSize: 11, maxWidth: 180 }}>{instrumentError}</span>
          ) : null}

          <span style={{ color: '#666666', fontSize: 12 }}>BPM:</span>
          <input
            type="range"
            min="60"
            max="200"
            value={bpm}
            step="5"
            onChange={(e) => setBpm(Number(e.target.value))}
            style={{ width: 90 }}
          />
          <span style={{ color: '#666666', fontSize: 13, minWidth: 30 }}>{bpm}</span>

          <button
            onClick={playing ? stop : play}
            disabled={sequence.length === 0 || !Tone || instrumentLoading}
            style={{
              padding: '7px 20px',
              background: playing ? '#ef4444' : '#22c55e',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {playing ? 'Stop' : 'Play'}
          </button>
          <button
            onClick={() => setSequence([])}
            style={{
              padding: '7px 14px',
              background: '#3b0a0a',
              border: '1px solid #7f1d1d',
              borderRadius: 8,
              color: '#fca5a5',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div
        style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr', overflow: 'hidden' }}
      >
        <div style={{ borderRight: '1px solid #111111', overflowY: 'auto', padding: '1.25rem' }}>
          <p style={labelStyle}>Presets</p>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 6,
                padding: '8px 12px',
                background: '#F5F2EB',
                border: '1px solid #111111',
                borderRadius: 8,
                color: '#666666',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
              }}
            >
              {p.name}
            </button>
          ))}

          <p style={{ ...labelStyle, marginTop: 16 }}>Natural notes (C3–C6)</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 4,
              marginBottom: 8,
              maxHeight: 160,
              overflowY: 'auto',
            }}
          >
            {NATURAL_NOTES.map((note) => {
              const color = noteColor(note)
              return (
                <button
                  key={note}
                  onClick={() => {
                    setSelectedNote(note)
                    previewNote(note)
                  }}
                  style={{
                    padding: '6px 2px',
                    borderRadius: 6,
                    border: `1px solid ${selectedNote === note ? color : '#111111'}`,
                    background: selectedNote === note ? `${color}22` : 'transparent',
                    color,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {note}
                </button>
              )
            })}
          </div>
          <p style={labelStyle}>Sharps (middle octave)</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 4,
              marginBottom: 12,
            }}
          >
            {SHARP_NOTES.map((note) => {
              const color = noteColor(note)
              return (
                <button
                  key={note}
                  onClick={() => {
                    setSelectedNote(note)
                    previewNote(note)
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 6,
                    border: `1px solid ${selectedNote === note ? color : '#111111'}`,
                    background: selectedNote === note ? `${color}22` : 'transparent',
                    color,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {note}
                </button>
              )
            })}
          </div>

          <p style={labelStyle}>Note Length</p>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDuration(d)}
                style={{
                  flex: 1,
                  padding: '6px 2px',
                  borderRadius: 6,
                  fontSize: 11,
                  border: `1px solid ${selectedDuration === d ? '#FF3B00' : '#111111'}`,
                  background: selectedDuration === d ? '#FF3B00' : 'transparent',
                  color: selectedDuration === d ? '#fff' : '#666666',
                  cursor: 'pointer',
                }}
              >
                {DURATION_LABELS[d]}
              </button>
            ))}
          </div>

          <button
            onClick={addNote}
            style={{
              width: '100%',
              padding: '11px',
              background: '#FF3B00',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            + Add Note
          </button>

          {sequence.length > 0 ? (
            <button
              onClick={exportAsText}
              style={{
                width: '100%',
                padding: '8px',
                background: '#F5F2EB',
                border: '1px solid #111111',
                borderRadius: 8,
                color: '#666666',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Copy Sequence
            </button>
          ) : null}
        </div>

        <div style={{ overflowY: 'auto', padding: '1.25rem' }}>
          {sequence.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
              <p style={{ color: '#111111', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
                Your composition is empty
              </p>
              <p style={{ color: '#666666', fontSize: 14 }}>
                Select a note and duration, then click "Add Note"
                <br />
                or pick a preset to get started
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: '#666666', fontSize: 13 }}>
                  {sequence.length} notes in composition
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sequence.map((item, i) => {
                  const color = noteColor(item.note)
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: currentStep === i ? color : `${color}22`,
                        border: `2px solid ${currentStep === i ? color : `${color}44`}`,
                        transition: 'all 0.1s ease',
                        cursor: 'default',
                        transform: currentStep === i ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      <div
                        style={{
                          color: currentStep === i ? '#EFECE5' : color,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {item.note}
                      </div>
                      <div
                        style={{ color: currentStep === i ? '#EFECE5' : '#666666', fontSize: 10 }}
                      >
                        {DURATION_LABELS[item.duration]}
                      </div>
                      <button
                        onClick={() => removeNote(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: currentStep === i ? '#EFECE5' : '#666666',
                          cursor: 'pointer',
                          fontSize: 10,
                          padding: 0,
                          marginTop: 2,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>

              <div
                style={{
                  marginTop: '1.5rem',
                  background: '#FFFFFF',
                  borderRadius: 12,
                  padding: '1rem',
                  border: '1px solid #111111',
                }}
              >
                <p
                  style={{
                    color: '#666666',
                    fontSize: 11,
                    fontWeight: 600,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Piano Roll Preview
                </p>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80 }}>
                  {sequence.map((item, i) => {
                    const height = noteRollHeight(item.note)
                    const color = noteColor(item.note)
                    const widthMap = { '16n': 12, '8n': 20, '4n': 32, '2n': 52, '1n': 80 }
                    return (
                      <div
                        key={item.id}
                        style={{
                          width: widthMap[item.duration],
                          height,
                          background: currentStep === i ? color : `${color}88`,
                          borderRadius: '3px 3px 0 0',
                          flexShrink: 0,
                          transition: 'background 0.1s',
                          border: currentStep === i ? `1px solid ${color}` : 'none',
                        }}
                        title={`${item.note} (${DURATION_LABELS[item.duration]})`}
                      />
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  color: '#666666',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 6px',
}

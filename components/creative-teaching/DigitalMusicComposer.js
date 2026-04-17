'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5']
const NOTE_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#10b981',
  '#f43f5e',
]
const DURATIONS = ['16n', '8n', '4n', '2n', '1n']
const DURATION_LABELS = { '16n': '1/16', '8n': '1/8', '4n': '1/4', '2n': '1/2', '1n': 'Whole' }

const PRESETS = [
  {
    name: 'Twinkle',
    sequence: [
      { note: 'C4', duration: '4n' },
      { note: 'C4', duration: '4n' },
      { note: 'G4', duration: '4n' },
      { note: 'G4', duration: '4n' },
      { note: 'A4', duration: '4n' },
      { note: 'A4', duration: '4n' },
      { note: 'G4', duration: '2n' },
      { note: 'F4', duration: '4n' },
      { note: 'F4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'D4', duration: '4n' },
      { note: 'D4', duration: '4n' },
      { note: 'C4', duration: '2n' },
    ],
  },
  { name: 'Scale Up', sequence: NOTES.slice(0, 7).map((n) => ({ note: n, duration: '4n' })) },
  {
    name: 'Ode to Joy',
    sequence: [
      { note: 'E4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'F4', duration: '4n' },
      { note: 'G4', duration: '4n' },
      { note: 'G4', duration: '4n' },
      { note: 'F4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'D4', duration: '4n' },
      { note: 'C4', duration: '4n' },
      { note: 'C4', duration: '4n' },
      { note: 'D4', duration: '4n' },
      { note: 'E4', duration: '4n' },
      { note: 'E4', duration: '2n' },
      { note: 'D4', duration: '4n' },
      { note: 'D4', duration: '2n' },
    ],
  },
]

export default function DigitalMusicComposer() {
  const [Tone, setTone] = useState(null)
  const [sequence, setSequence] = useState([])
  const [selectedNote, setSelectedNote] = useState('C4')
  const [selectedDuration, setSelectedDuration] = useState('4n')
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [currentStep, setCurrentStep] = useState(-1)
  const [instrument, setInstrument] = useState('synth')
  const synthRef = useRef(null)
  const partRef = useRef(null)
  const stopTimerRef = useRef(null)

  useEffect(() => {
    let mounted = true
    import('tone').then((T) => {
      if (!mounted) return
      setTone(T)
      synthRef.current = new T.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
      }).toDestination()
    })
    return () => {
      mounted = false
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      if (synthRef.current) synthRef.current.dispose()
      if (partRef.current) partRef.current.dispose()
    }
  }, [])

  const changeInstrument = useCallback(
    async (type) => {
      if (!Tone) return
      setInstrument(type)
      if (synthRef.current) synthRef.current.dispose()
      if (type === 'piano') {
        synthRef.current = new Tone.Sampler({
          urls: { C4: 'C4.mp3' },
          baseUrl: 'https://tonejs.github.io/audio/salamander/',
        }).toDestination()
      } else if (type === 'marimba') {
        synthRef.current = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.5 },
        }).toDestination()
      } else {
        synthRef.current = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
        }).toDestination()
      }
    },
    [Tone]
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
    if (!Tone || !synthRef.current) return
    await Tone.start()
    synthRef.current.triggerAttackRelease(note, '8n')
  }

  const stop = () => {
    if (!Tone) return
    Tone.getTransport().stop()
    if (partRef.current) partRef.current.stop()
    setPlaying(false)
    setCurrentStep(-1)
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = null
  }

  const play = async () => {
    if (!Tone || !synthRef.current || sequence.length === 0) return
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
      synthRef.current.triggerAttackRelease(val.note, val.duration, t)
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
        background: '#170d28',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: '#2d1f4e',
          borderBottom: '1px solid #3b2a66',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: '#ede9fe', fontWeight: 700, fontSize: 16 }}>
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
          <span style={{ color: '#6d28d9', fontSize: 12 }}>Instrument:</span>
          <select
            value={instrument}
            onChange={(e) => changeInstrument(e.target.value)}
            style={{
              background: '#261843',
              border: '1px solid #3b2a66',
              borderRadius: 8,
              color: '#ede9fe',
              padding: '6px 10px',
              fontSize: 13,
            }}
            disabled={!Tone}
          >
            <option value="synth">Synth</option>
            <option value="piano">Piano</option>
            <option value="marimba">Marimba</option>
          </select>

          <span style={{ color: '#6d28d9', fontSize: 12 }}>BPM:</span>
          <input
            type="range"
            min="60"
            max="200"
            value={bpm}
            step="5"
            onChange={(e) => setBpm(Number(e.target.value))}
            style={{ width: 90 }}
          />
          <span style={{ color: '#a78bfa', fontSize: 13, minWidth: 30 }}>{bpm}</span>

          <button
            onClick={playing ? stop : play}
            disabled={sequence.length === 0 || !Tone}
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
        <div style={{ borderRight: '1px solid #3b2a66', overflowY: 'auto', padding: '1.25rem' }}>
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
                background: '#261843',
                border: '1px solid #3b2a66',
                borderRadius: 8,
                color: '#a78bfa',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
              }}
            >
              {p.name}
            </button>
          ))}

          <p style={{ ...labelStyle, marginTop: 16 }}>Select Note</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 4,
              marginBottom: 12,
            }}
          >
            {NOTES.map((note, i) => (
              <button
                key={note}
                onClick={() => {
                  setSelectedNote(note)
                  previewNote(note)
                }}
                style={{
                  padding: '8px 4px',
                  borderRadius: 6,
                  border: `1px solid ${selectedNote === note ? NOTE_COLORS[i] : '#3b2a66'}`,
                  background: selectedNote === note ? `${NOTE_COLORS[i]}22` : 'transparent',
                  color: NOTE_COLORS[i],
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {note}
              </button>
            ))}
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
                  border: `1px solid ${selectedDuration === d ? '#7c3aed' : '#3b2a66'}`,
                  background: selectedDuration === d ? '#7c3aed' : 'transparent',
                  color: selectedDuration === d ? '#fff' : '#a78bfa',
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
              background: '#7c3aed',
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
                background: '#261843',
                border: '1px solid #3b2a66',
                borderRadius: 8,
                color: '#a78bfa',
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
              <p style={{ color: '#ede9fe', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
                Your composition is empty
              </p>
              <p style={{ color: '#6d28d9', fontSize: 14 }}>
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
                <span style={{ color: '#a78bfa', fontSize: 13 }}>
                  {sequence.length} notes in composition
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sequence.map((item, i) => {
                  const noteIndex = NOTES.indexOf(item.note)
                  const color = NOTE_COLORS[noteIndex] || '#7c3aed'
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
                          color: currentStep === i ? '#170d28' : color,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {item.note}
                      </div>
                      <div
                        style={{ color: currentStep === i ? '#170d28' : '#6d28d9', fontSize: 10 }}
                      >
                        {DURATION_LABELS[item.duration]}
                      </div>
                      <button
                        onClick={() => removeNote(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: currentStep === i ? '#170d28' : '#6d28d9',
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
                  background: '#2d1f4e',
                  borderRadius: 12,
                  padding: '1rem',
                  border: '1px solid #3b2a66',
                }}
              >
                <p
                  style={{
                    color: '#6d28d9',
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
                    const noteIndex = NOTES.indexOf(item.note)
                    const height = 20 + (noteIndex / NOTES.length) * 60
                    const color = NOTE_COLORS[noteIndex] || '#7c3aed'
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
  color: '#a78bfa',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 6px',
}

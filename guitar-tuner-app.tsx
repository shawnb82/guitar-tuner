import React, { useState, useEffect, useRef } from 'react';
import { Music, Zap } from 'lucide-react';

// Add type declaration for Safari's webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const GuitarTuner = () => {
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [note, setNote] = useState('');
  const [cents, setCents] = useState(0);
  const [detectedString, setDetectedString] = useState(null);
  const [confidence, setConfidence] = useState(0);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);

  // All possible tuning notes across all instruments
  const allTuningNotes = {
    'F#1': { freq: 46.25, instruments: ['8-String Guitar'] },
    'B0': { freq: 30.87, instruments: ['5-String Bass'] },
    'B1': { freq: 61.74, instruments: ['7-String Guitar', '8-String Guitar'] },
    'E1': { freq: 41.20, instruments: ['4-String Bass', '5-String Bass'] },
    'A1': { freq: 55.00, instruments: ['4-String Bass', '5-String Bass'] },
    'D2': { freq: 73.42, instruments: ['4-String Bass', '5-String Bass', '6-String Guitar', '7-String Guitar', '8-String Guitar', '12-String Guitar', 'Drop D'] },
    'E2': { freq: 82.41, instruments: ['6-String Guitar', '7-String Guitar', '8-String Guitar', '12-String Guitar'] },
    'G2': { freq: 98.00, instruments: ['4-String Bass', '5-String Bass', 'Open G'] },
    'A2': { freq: 110.00, instruments: ['6-String Guitar', '7-String Guitar', '8-String Guitar', '12-String Guitar', 'DADGAD'] },
    'D3': { freq: 146.83, instruments: ['6-String Guitar', '7-String Guitar', '8-String Guitar', '12-String Guitar', 'DADGAD', 'Open G'] },
    'G3': { freq: 196.00, instruments: ['6-String Guitar', '7-String Guitar', '8-String Guitar', '12-String Guitar'] },
    'A3': { freq: 220.00, instruments: ['DADGAD'] },
    'B3': { freq: 246.94, instruments: ['6-String Guitar', '7-String Guitar', '8-String Guitar', '12-String Guitar'] },
    'C4': { freq: 261.63, instruments: ['Ukulele'] },
    'D4': { freq: 293.66, instruments: ['Open G', 'DADGAD', '12-String Guitar'] },
    'E4': { freq: 329.63, instruments: ['6-String Guitar', '7-String Guitar', '8-String Guitar', '12-String Guitar', 'Ukulele'] },
    'G4': { freq: 392.00, instruments: ['Ukulele'] },
    'A4': { freq: 440.00, instruments: ['Ukulele'] }
  };

  const autoCorrelate = (buffer, sampleRate) => {
    let size = buffer.length;
    let maxSamples = Math.floor(size / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;
    
    for (let i = 0; i < size; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / size);
    
    if (rms < 0.01) return -1;
    
    let lastCorrelation = 1;
    for (let offset = 1; offset < maxSamples; offset++) {
      let correlation = 0;
      for (let i = 0; i < maxSamples; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      correlation = 1 - (correlation / maxSamples);
      
      if (correlation > 0.9 && correlation > lastCorrelation) {
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      }
      lastCorrelation = correlation;
    }
    
    if (bestCorrelation > 0.01) {
      return sampleRate / bestOffset;
    }
    return -1;
  };

  const frequencyToNote = (frequency) => {
    const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);
    
    if (frequency < 20) return { note: '', cents: 0, octave: 0 };
    
    const halfSteps = 12 * Math.log2(frequency / C0);
    const noteIndex = Math.round(halfSteps) % 12;
    const octave = Math.floor(Math.round(halfSteps) / 12);
    const cents = Math.floor((halfSteps - Math.round(halfSteps)) * 100);
    
    return {
      note: noteStrings[noteIndex],
      cents: cents,
      octave: octave,
      fullNote: noteStrings[noteIndex] + octave
    };
  };

  const findClosestTuningNote = (detectedNote) => {
    if (!detectedNote) return null;
    
    const target = allTuningNotes[detectedNote];
    if (target) {
      return {
        note: detectedNote,
        frequency: target.freq,
        instruments: target.instruments
      };
    }
    return null;
  };

  const updatePitch = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    const freq = autoCorrelate(buffer, audioContextRef.current.sampleRate);
    
    if (freq > 0) {
      const noteInfo = frequencyToNote(freq);
      const closestTuning = findClosestTuningNote(noteInfo.fullNote);
      
      setFrequency(freq);
      setNote(noteInfo.fullNote);
      
      if (closestTuning) {
        const actualCents = 1200 * Math.log2(freq / closestTuning.frequency);
        setCents(Math.round(actualCents));
        setDetectedString(closestTuning);
        setConfidence(1);
      } else {
        setCents(noteInfo.cents);
        setDetectedString(null);
        setConfidence(0);
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(updatePitch);
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);
      
      setIsListening(true);
      updatePitch();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to use the tuner');
    }
  };

  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setFrequency(0);
    setNote('');
    setCents(0);
    setDetectedString(null);
    setConfidence(0);
  };

  useEffect(() => {
    return () => {
      if (isListening) stopListening();
    };
  }, []);

  const isInTune = Math.abs(cents) < 5 && detectedString;
  const needleRotation = Math.max(-50, Math.min(50, cents * 0.8));

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="flex items-center justify-center gap-3">
          <div className="relative">
            <Music className="w-10 h-10 text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text" style={{ filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.5))' }} />
            <div className="absolute inset-0 blur-xl bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-50"></div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Tuner Pro
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          
          {/* Auto-Detected Info */}
          {detectedString && (
            <div className="backdrop-blur-xl bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-blue-900/30 rounded-3xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-sm font-semibold text-purple-300">AUTO-DETECTED</span>
              </div>
              <div className="text-lg text-white/90 leading-relaxed">
                {detectedString.instruments.slice(0, 3).join(', ')}
                {detectedString.instruments.length > 3 && ` +${detectedString.instruments.length - 3} more`}
              </div>
            </div>
          )}

          {/* Tuner Display */}
          <div className={`relative backdrop-blur-xl rounded-3xl p-8 border-2 transition-all duration-300 shadow-2xl ${
            isInTune 
              ? 'border-green-400 bg-gradient-to-br from-green-900/40 to-emerald-900/40 shadow-green-500/50' 
              : 'border-white/20 bg-gradient-to-br from-gray-900/60 to-gray-800/60'
          }`}>
            
            {/* Glow effect when in tune */}
            {isInTune && (
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-400/20 to-emerald-400/20 blur-xl animate-pulse"></div>
            )}

            <div className="relative z-10">
              {/* Current Note */}
              <div className="text-center mb-8">
                <div className={`text-8xl font-black mb-2 transition-all duration-300 ${
                  isInTune 
                    ? 'text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]' 
                    : 'text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text'
                }`}>
                  {note || '--'}
                </div>
                <div className="text-gray-400 text-base font-medium">
                  {frequency > 0 ? `${frequency.toFixed(2)} Hz` : 'Play a note'}
                </div>
              </div>

              {/* Tuning Gauge */}
              <div className="relative h-40 mb-6">
                <svg viewBox="0 0 240 120" className="w-full h-full drop-shadow-2xl">
                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                    <linearGradient id="needleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={isInTune ? "#10b981" : "#f59e0b"} />
                      <stop offset="100%" stopColor={isInTune ? "#059669" : "#ef4444"} />
                    </linearGradient>
                  </defs>
                  
                  {/* Background arc with gradient */}
                  <path
                    d="M 20 100 A 100 100 0 0 1 220 100"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    opacity="0.3"
                  />
                  
                  {/* Tick marks */}
                  {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((tick) => {
                    const angle = tick * 1.8 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const x1 = 120 + 85 * Math.cos(rad);
                    const y1 = 100 + 85 * Math.sin(rad);
                    const x2 = 120 + (tick === 0 ? 70 : 75) * Math.cos(rad);
                    const y2 = 100 + (tick === 0 ? 70 : 75) * Math.sin(rad);
                    
                    return (
                      <line
                        key={tick}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={tick === 0 ? "#10b981" : "rgba(255,255,255,0.3)"}
                        strokeWidth={tick === 0 ? "4" : "2"}
                        strokeLinecap="round"
                      />
                    );
                  })}
                  
                  {/* Needle with glow */}
                  <g transform={`rotate(${needleRotation} 120 100)`}>
                    <line
                      x1="120"
                      y1="100"
                      x2="120"
                      y2="30"
                      stroke="url(#needleGradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      filter={isInTune ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))" : "drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))"}
                    />
                    <circle cx="120" cy="100" r="8" fill="url(#needleGradient)" 
                      filter={isInTune ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))" : "drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))"}
                    />
                  </g>
                </svg>
              </div>

              {/* Cents Display */}
              <div className="text-center">
                <div className={`text-5xl font-black mb-2 transition-all duration-300 ${
                  isInTune 
                    ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' 
                    : cents > 0 
                      ? 'text-red-400' 
                      : 'text-yellow-400'
                }`}>
                  {cents > 0 ? '+' : ''}{cents}
                  <span className="text-2xl ml-1 opacity-70">¢</span>
                </div>
                
                {isInTune && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-400 font-bold text-xl animate-pulse">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                    IN TUNE
                  </div>
                )}
                
                {!isInTune && detectedString && (
                  <div className="text-sm text-gray-400 mt-2">
                    {cents > 0 ? '↑ Tune up' : cents < 0 ? '↓ Tune down' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Start/Stop Button */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative w-full py-6 rounded-2xl font-bold text-xl transition-all overflow-hidden group ${
              isListening
                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/50'
                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 shadow-lg shadow-purple-500/50'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <span className="relative z-10">
              {isListening ? '⏹ Stop Tuning' : '▶ Start Tuning'}
            </span>
          </button>

          {!isListening && (
            <p className="text-center text-gray-400 text-sm animate-pulse">
              Tap to start • Works with all instruments
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuitarTuner;
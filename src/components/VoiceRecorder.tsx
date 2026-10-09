import React, { useState, useEffect, useRef } from 'react';

interface VoiceRecorderProps {
  onAppendText: (text: string) => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAppendText,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [duration, setDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check speech recognition support
    const hasSpeech =
      typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setIsSupported(hasSpeech);

    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  };

  const startVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setVolumeLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (_err) {
      // AudioContext / visualizer is optional; speech recognition can still work
      console.warn('Microphone visualizer unavailable:', _err);
    }
  };

  const handleStartRecording = async () => {
    setErrorMessage(null);
    setInterimText('');
    setAccumulatedText('');
    setDuration(0);

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      // Use user's locale or en-IN / en-US
      recognition.lang = navigator.language || 'en-IN';

      let localAccumulated = '';

      recognition.onstart = () => {
        setIsRecording(true);
        // Start duration timer
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || '';
          if (item.isFinal) {
            localAccumulated += (localAccumulated ? ' ' : '') + transcript.trim();
            setAccumulatedText(localAccumulated);
          } else {
            currentInterim += transcript;
          }
        }
        setInterimText(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permission.');
        } else if (event.error === 'no-speech') {
          // Expected when silent
        } else if (event.error === 'network') {
          setErrorMessage('Network connection required for voice transcription.');
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Recognition completed or timed out
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recognition.start();

      // Start audio waveform visualizer
      startVisualizer();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize microphone');
      setIsRecording(false);
    }
  };

  const handleStopAndAppend = () => {
    const finalResult = (
      (accumulatedText ? accumulatedText + ' ' : '') + interimText
    ).trim();

    stopRecordingCleanup();
    setIsRecording(false);
    setVolumeLevel(0);

    if (finalResult) {
      onAppendText(finalResult);
    }

    setInterimText('');
    setAccumulatedText('');
    setDuration(0);
  };

  const handleCancel = () => {
    stopRecordingCleanup();
    setIsRecording(false);
    setVolumeLevel(0);
    setInterimText('');
    setAccumulatedText('');
    setDuration(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Voice Trigger Bar */}
      {!isRecording ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={disabled || !isSupported}
            onClick={handleStartRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-[12px] font-semibold transition-all border border-primary/20 hover:border-primary/40 active:scale-98 cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Click to dictate your problem using your microphone"
          >
            <span className="material-symbols-outlined text-[17px] text-primary">mic</span>
            <span>Record with Voice</span>
          </button>

          <span className="text-[11px] text-secondary">
            {isSupported
              ? 'Voice-to-text dictation supported'
              : 'Voice dictation unavailable in this browser'}
          </span>
        </div>
      ) : (
        /* Active Recording Panel */
        <div className="p-3.5 rounded-xl bg-linear-to-r from-rose-500/10 via-amber-500/10 to-blue-500/10 border border-rose-500/30 shadow-sm flex flex-col gap-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="text-[12px] font-bold text-rose-700 dark:text-rose-300">
                Recording... Speak clearly
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-container text-on-surface font-semibold">
                {formatTime(duration)}
              </span>
            </div>

            {/* Audio Volume Wave Bars */}
            <div className="flex items-center gap-1 h-5 px-2">
              {[0.4, 0.8, 1.2, 0.9, 0.6].map((multiplier, idx) => {
                const heightPct = Math.max(
                  20,
                  Math.min(100, volumeLevel * multiplier * 1.5)
                );
                return (
                  <span
                    key={idx}
                    className="w-1 bg-rose-600 dark:bg-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Live Transcript Preview */}
          <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container text-[13px] text-on-surface min-h-[46px] max-h-[100px] overflow-y-auto leading-relaxed">
            {accumulatedText || interimText ? (
              <p>
                <span>{accumulatedText}</span>{' '}
                <span className="text-secondary italic">{interimText}</span>
              </p>
            ) : (
              <p className="text-secondary italic text-[12px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] animate-spin text-primary">
                  hearing
                </span>
                <span>Listening for your voice... Say what happened on campus</span>
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleCancel}
              className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px] font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStopAndAppend}
              className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">done</span>
              <span>Insert into Description</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2 rounded-lg bg-error-container text-on-error-container text-[12px] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-error">error</span>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

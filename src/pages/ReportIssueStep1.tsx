import React, { useState, useEffect, useRef } from 'react';
import { PhotoUploader, UploadedFileState } from '../components/PhotoUploader';
import { api } from '../services/api';
import { AiAnalysisResponse } from '../types';

interface ReportIssueStep1Props {
  initialCategory?: string;
  onAnalysisComplete: (
    analysis: AiAnalysisResponse,
    description: string,
    location: string,
    photos: UploadedFileState[]
  ) => void;
  onCancel: () => void;
}

export const ReportIssueStep1: React.FC<ReportIssueStep1Props> = ({
  initialCategory,
  onAnalysisComplete,
  onCancel,
}) => {
  const [description, setDescription] = useState(
    initialCategory ? `${initialCategory} issue: ` : ''
  );
  const [blockWing, setBlockWing] = useState('');
  const [floorRoom, setFloorRoom] = useState('');
  const [landmark, setLandmark] = useState('');
  const [photos, setPhotos] = useState<UploadedFileState[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Voice dictation is supported in Chrome, Edge, and Safari browsers.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleUsePresetLocation = (preset: string) => {
    setBlockWing(preset);
  };

  const charLength = description.trim().length;
  const isThresholdMet = charLength >= 20;

  // Build combined structured location string
  const assembledLocation = [blockWing, floorRoom, landmark ? `(Landmark: ${landmark})` : '']
    .filter(Boolean)
    .join(', ');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (charLength < 20) {
      setErrorMsg('Please describe the problem in at least 20 characters so the AI can categorize and route it accurately.');
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);

    try {
      const locationToSubmit = assembledLocation || 'Campus premises';
      const analysis = await api.analyzeGrievance(description, locationToSubmit);
      onAnalysisComplete(analysis, description, locationToSubmit, photos);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI analysis is temporarily unavailable.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const campusBlocks = [
    'Hostel B (Boys)',
    'Hostel A (Boys)',
    'Girls Hostel D',
    'Main Academic Building',
    'Computer Lab Block',
    'Civil & Mechanical Workshop',
    'Central Library',
    'College Canteen & Mess',
    'Sports Ground / Parking',
  ];

  return (
    <div className="flex flex-col w-full pb-20 space-y-4 animate-fade-in max-w-2xl mx-auto">
      {/* 3-Step Workflow Progress Bar matching Screenshot 4 */}
      <div className="w-full bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container">
        <div className="flex items-center justify-between text-[11px] sm:text-[12px] font-bold text-secondary mb-2">
          <div className="flex items-center gap-1.5 text-primary font-bold">
            <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center">
              1
            </span>
            <span>Describe</span>
          </div>
          <span className="text-surface-container-high">— — —</span>
          <div className="flex items-center gap-1.5 text-secondary opacity-60">
            <span className="w-5 h-5 rounded-full bg-surface-container text-secondary text-[10px] flex items-center justify-center">
              2
            </span>
            <span>AI Review</span>
          </div>
          <span className="text-surface-container-high">— — —</span>
          <div className="flex items-center gap-1.5 text-secondary opacity-60">
            <span className="w-5 h-5 rounded-full bg-surface-container text-secondary text-[10px] flex items-center justify-center">
              3
            </span>
            <span>File</span>
          </div>
        </div>

        <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full w-1/3 rounded-full transition-all duration-300"></div>
        </div>
      </div>

      {/* Intro Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-on-surface">
            Tell us what happened
          </h2>
          <p className="text-[13px] text-secondary leading-relaxed">
            Write what happened in your own words — in English, Hindi, or Marathi. You can also use the mic.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] font-semibold text-secondary hover:text-on-surface cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-[13px] flex items-start gap-2 shadow-sm animate-fade-in">
          <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleAnalyze} className="flex flex-col space-y-4">
        {/* Structured Campus Location Fields matching Screenshot 4 */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container space-y-3.5">
          <span className="text-[12px] font-bold uppercase tracking-wider text-secondary block flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-primary">location_on</span>
            <span>Campus Location Details</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Campus Block / Wing */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-on-surface" htmlFor="blockWing">
                Building / Block <span className="text-error">*</span>
              </label>
              <select
                id="blockWing"
                value={blockWing}
                onChange={(e) => setBlockWing(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container"
              >
                <option value="">Select campus building / block</option>
                {campusBlocks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Floor / Room */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-on-surface" htmlFor="floorRoom">
                Floor / Room / Lab No.
              </label>
              <input
                id="floorRoom"
                type="text"
                value={floorRoom}
                onChange={(e) => setFloorRoom(e.target.value)}
                placeholder="e.g. 2nd Floor, Room 204 or East Wing"
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
          </div>

          {/* Landmark */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-on-surface" htmlFor="landmarkInput">
              Landmark <span className="text-secondary font-normal text-[11px]">(Helps technicians locate quickly)</span>
            </label>
            <input
              id="landmarkInput"
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near Staircase 2, beside fire extinguisher or water cooler"
              className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-secondary">Quick presets:</span>
            {['Hostel B', 'Computer Lab Block', 'Central Library'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleUsePresetLocation(preset)}
                className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium border border-surface-container-high transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Helpful Tips Callout matching Screenshot 4 */}
        <div className="p-4 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/20 text-indigo-950 dark:text-indigo-200 text-[12px] space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
            <span className="material-symbols-outlined text-[17px]">tips_and_updates</span>
            <span>Please include, so our campus teams can act fast:</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1 text-[11px] opacity-90">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>What exactly is damaged, broken, or unsafe</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Exact area, room, or landmark</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Any immediate hazard or class interruption</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Attach an evidence photo below</span>
            </li>
          </ul>
        </div>

        {/* Issue Description Box with Speech to Text */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-on-surface" htmlFor="issueDescription">
              Describe your grievance <span className="text-error">*</span>
            </label>
            <span
              className={`text-[11px] font-medium ${
                isThresholdMet ? 'text-emerald-600 font-bold' : 'text-secondary'
              }`}
            >
              {charLength} / 20 min
            </span>
          </div>

          <div className="relative w-full">
            <textarea
              id="issueDescription"
              rows={5}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. The tube lights in Hostel B 2nd floor corridor have completely failed. Hallway is pitch black and creates a slipping/trip hazard for students studying late at night..."
              className="w-full min-h-[140px] p-4 rounded-xl bg-surface-container-low text-on-surface text-[14px] placeholder:text-outline border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-xs transition-all leading-relaxed"
              required
            />
          </div>

          {/* Voice Input Mic Button matching Screenshot 4 */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95 cursor-pointer border ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">
                {isListening ? 'mic_off' : 'mic'}
              </span>
              <span>
                {isListening
                  ? 'Listening... Click to stop'
                  : 'or speak — Tell us so we can act on it'}
              </span>
            </button>

            <span className="text-[11px] text-secondary">
              {isThresholdMet
                ? '✓ Ready for AI categorization & SLA routing'
                : 'Minimum 20 characters required'}
            </span>
          </div>
        </div>

        {/* Complaint Photo Upload (Student-only, max 3) */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container">
          <PhotoUploader files={photos} onFilesChange={setPhotos} maxFiles={3} />
        </div>

        {/* Primary Action CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isAnalyzing}
            className="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-[15px] flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span>AI analyzing severity & routing department...</span>
              </>
            ) : (
              <>
                <span>Continue to AI Diagnostic</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

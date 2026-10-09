import React, { useState } from 'react';
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
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<UploadedFileState[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const charLength = description.trim().length;
  const isThresholdMet = charLength >= 20;

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (charLength < 20) {
      setErrorMsg('Please describe the problem in at least 20 characters so the AI can categorize it.');
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);

    try {
      const analysis = await api.analyzeGrievance(description, location);
      onAnalysisComplete(analysis, description, location, photos);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI analysis is temporarily unavailable.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-20 space-y-4 animate-fade-in max-w-2xl mx-auto">
      {/* Step & Progress Indicator */}
      <div className="w-full bg-surface-container-low rounded-xl p-4 flex flex-col gap-1.5 shadow-sm border border-surface-container">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-primary tracking-wide uppercase">
            Step 1 of 2
          </span>
          <span className="text-[12px] text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
            <span>Drafting Ticket</span>
          </span>
        </div>
        <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary-container h-full w-1/2 rounded-full transition-all duration-300"></div>
        </div>
        <p className="text-[13px] font-medium text-on-surface pt-0.5">
          Describe the Problem
        </p>
      </div>

      {/* Intro Header */}
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-[20px] font-bold text-on-surface">What happened?</h2>
        <p className="text-[13px] text-secondary leading-relaxed">
          Describe your problem in your own words. The AI will analyze your description and route it to the responsible department.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-[13px] flex items-start gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleAnalyze} className="flex flex-col space-y-4">
        {/* Issue Description Box */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-semibold text-on-surface" htmlFor="issueDescription">
              Issue Description <span className="text-error">*</span>
            </label>
            <span
              className={`text-[11px] font-medium ${
                isThresholdMet ? 'text-tertiary font-semibold' : 'text-secondary'
              }`}
            >
              {charLength} / 20 min
            </span>
          </div>

          <div className="relative w-full">
            <textarea
              id="issueDescription"
              rows={6}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your problem in your own words... (e.g., The lights in the Hostel B second-floor corridor have stopped working and the hallway is completely dark)."
              className="w-full min-h-[150px] p-4 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] placeholder:text-outline border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
              required
            />
            <div className="absolute bottom-3 right-3 pointer-events-none text-outline-variant">
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-1">
            <span
              className={`material-symbols-outlined text-[15px] ${
                isThresholdMet ? 'text-tertiary' : 'text-outline'
              }`}
            >
              {isThresholdMet ? 'check_circle' : 'info'}
            </span>
            <span className="text-[11px] text-secondary">
              {isThresholdMet
                ? 'Threshold reached! Ready for AI routing.'
                : 'Minimum 20 characters for accurate routing'}
            </span>
          </div>
        </div>

        {/* Location Field (Optional free-text field, no landmark selector) */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="text-[13px] font-semibold text-on-surface" htmlFor="locationInput">
            Location on Campus <span className="text-secondary font-normal text-[11px]">(Optional free-text)</span>
          </label>
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-secondary pointer-events-none">
              location_on
            </span>
            <input
              id="locationInput"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Hostel B, 2nd floor east wing or Mech Workshop"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] placeholder:text-outline border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
            />
          </div>
          <span className="text-[11px] text-secondary px-1">
            If left empty, the AI will try to extract the location from your description.
          </span>
        </div>

        {/* Complaint Photo Upload (Student-only, max 3) */}
        <div className="pt-1">
          <PhotoUploader files={photos} onFilesChange={setPhotos} maxFiles={3} />
        </div>

        {/* Primary Action CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isAnalyzing}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span>Understanding your issue...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                <span>Analyze with AI</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

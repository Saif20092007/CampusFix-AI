import React, { useState, useEffect } from 'react';
import { AiAnalysisResponse, Category, Grievance, PriorityLevel } from '../types';
import { UploadedFileState } from '../components/PhotoUploader';
import { PriorityChip } from '../components/PriorityChip';
import { api } from '../services/api';

interface ReportIssueStep2Props {
  analysis: AiAnalysisResponse;
  originalDescription: string;
  originalLocation: string;
  photos: UploadedFileState[];
  initialPriority?: PriorityLevel;
  onSubmissionSuccess: (grievance: Grievance) => void;
  onBackToEdit: () => void;
}

export const ReportIssueStep2: React.FC<ReportIssueStep2Props> = ({
  analysis,
  originalDescription,
  originalLocation,
  photos,
  initialPriority,
  onSubmissionSuccess,
  onBackToEdit,
}) => {
  const [summary, setSummary] = useState(analysis.summary);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(analysis.category_id);
  const [location, setLocation] = useState(analysis.location || originalLocation || 'Hostel B');
  const [priority, setPriority] = useState<PriorityLevel>(initialPriority || analysis.priority || 'Medium');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      setErrorMsg('Please enter a summary title for your grievance.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const created = await api.createGrievance({
        description: originalDescription,
        summary: summary.trim(),
        category_id: selectedCategoryId,
        location: location.trim(),
        analysis_id: analysis.analysis_id,
        attachment_ids: photos.map(p => p.attachment_id),
        priority,
      });

      onSubmissionSuccess(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit grievance');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-20 space-y-4 animate-fade-in max-w-2xl mx-auto">
      {/* Top Notice Banner */}
      <div className="rounded-xl bg-secondary-container p-4 flex items-start gap-3 shadow-sm border border-secondary-container">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 text-on-primary">
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-semibold text-on-secondary-fixed uppercase tracking-wider">
            Review Your Complaint
          </span>
          <p className="text-[13px] text-on-secondary-container mt-0.5">
            AI-generated suggestions. Please review before submitting.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-error">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Review Card */}
      <div className="rounded-xl bg-surface-container-lowest p-5 space-y-5 shadow-sm border border-surface-container">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
            <span className="text-[16px] font-semibold text-on-surface">Ticket Draft Review</span>
          </div>
          <span className="text-[11px] text-secondary bg-surface-container-high px-2 py-0.5 rounded-full font-medium">
            Step 2 of 2
          </span>
        </div>

        {/* Editable Fields */}
        <div className="space-y-3.5">
          {/* Summary Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-on-surface-variant flex items-center gap-1.5" htmlFor="summary-field">
              <span className="material-symbols-outlined text-[15px] text-secondary">subject</span>
              Summary
            </label>
            <input
              id="summary-field"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-on-surface-variant flex items-center gap-1.5" htmlFor="category-field">
              <span className="material-symbols-outlined text-[15px] text-secondary">category</span>
              Category
            </label>
            <div className="relative">
              <select
                id="category-field"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                className="w-full h-12 px-4 pr-10 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm appearance-none cursor-pointer transition-all"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-[20px]">
                arrow_drop_down
              </span>
            </div>
          </div>

          {/* Location Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-on-surface-variant flex items-center gap-1.5" htmlFor="location-field">
              <span className="material-symbols-outlined text-[15px] text-secondary">pin_drop</span>
              Location
            </label>
            <input
              id="location-field"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm transition-all"
            />
          </div>

          {/* Priority Level Tag Selector */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[12px] font-semibold text-on-surface-variant flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-secondary">label_important</span>
                Priority Tag
              </span>
              <span className="text-[11px] text-secondary font-normal">Tap to adjust priority</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { level: 'Low' as PriorityLevel, label: 'Low', icon: 'low_priority', borderClass: 'border-slate-400 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
                { level: 'Medium' as PriorityLevel, label: 'Medium', icon: 'swap_vert', borderClass: 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200' },
                { level: 'High' as PriorityLevel, label: 'High', icon: 'bolt', borderClass: 'border-orange-400 bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200' },
                { level: 'Critical' as PriorityLevel, label: 'Critical', icon: 'crisis_alert', borderClass: 'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200' },
              ].map((p) => {
                const isSelected = priority === p.level;
                return (
                  <button
                    key={p.level}
                    type="button"
                    onClick={() => setPriority(p.level)}
                    className={`py-2 px-1 rounded-xl text-center border font-semibold text-[12px] transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? `${p.borderClass} ring-2 ring-primary/40 shadow-xs font-bold`
                        : 'border-surface-container bg-surface-container-lowest text-secondary hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Uploaded Complaint Photo Previews */}
        {photos.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[12px] font-semibold text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-secondary">photo_camera</span>
              Attached Evidence ({photos.length})
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {photos.map((p, idx) => (
                <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-surface-container-high shadow-sm shrink-0">
                  <img src={p.previewUrl} alt={p.file_name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Inferred Metadata (Read-Only) */}
        <div className="rounded-xl bg-surface-container-low p-4 space-y-3.5 border border-surface-container">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-secondary">psychology</span>
              AI Inferred Metadata
            </span>
            <span className="text-[11px] text-tertiary-container bg-tertiary-fixed px-2 py-0.5 rounded-full font-semibold">
              {analysis.confidence ? `${analysis.confidence}% Match` : 'Confidence 98%'}
            </span>
          </div>

          {/* Tagged Priority */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-secondary">Tagged Ticket Priority</span>
            <PriorityChip priority={priority} size="md" />
          </div>

          {/* Responsible Department */}
          <div className="space-y-1">
            <span className="text-[13px] text-secondary">Responsible Department</span>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-lowest shadow-sm border border-surface-container">
              <span className="material-symbols-outlined text-primary text-[18px]">domain</span>
              <span className="text-[13px] font-medium text-on-surface truncate">
                {selectedCategory?.department_name || analysis.department_name || 'Electrical Maintenance'}
              </span>
            </div>
          </div>

          {/* Extracted Keywords */}
          {analysis.keywords && analysis.keywords.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[13px] text-secondary">Extracted Keywords</span>
              <div className="flex flex-wrap gap-1.5">
                {analysis.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-[11px] font-medium"
                  >
                    #{kw.replace(/\s+/g, '-')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-semibold text-[15px] flex items-center justify-center gap-2 active:opacity-90 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span>Submitting Grievance...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Confirm & Submit</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToEdit}
            className="w-full h-12 rounded-xl bg-surface-container text-on-surface font-medium text-[14px] flex items-center justify-center gap-2 active:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">arrow_back</span>
            <span>Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};

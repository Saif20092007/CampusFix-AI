import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Grievance } from '../types';
import { StatusChip } from '../components/StatusChip';
import { PriorityChip } from '../components/PriorityChip';
import { SlaBadge } from '../components/SlaBadge';
import { PhotoModal } from '../components/PhotoModal';
import { QuickReplySection } from '../components/QuickReplySection';

interface OfficerTicketDetailProps {
  publicId: string;
  onBack: () => void;
}

export const OfficerTicketDetail: React.FC<OfficerTicketDetailProps> = ({
  publicId,
  onBack,
}) => {
  const { user } = useAuth();
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [isSubmittingEscalate, setIsSubmittingEscalate] = useState(false);

  // Internal remarks
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Photo viewer
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getGrievance(publicId);
      setGrievance(data);
    } catch (err: any) {
      setError(err.message || 'Complaint record not found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [publicId]);

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteInput.trim() || !grievance) return;
    setIsSubmittingNote(true);
    try {
      await api.addRemark(grievance.public_id, 'INTERNAL_REMARK', internalNoteInput.trim());
      setInternalNoteInput('');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to save internal note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleStartWork = async () => {
    if (!grievance) return;
    try {
      await api.updateStatus(
        grievance.public_id,
        'IN_PROGRESS',
        'Department officer initiated inspection and field work.'
      );
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievance || !resolutionNote.trim()) return;
    setIsSubmittingResolve(true);
    try {
      await api.updateStatus(grievance.public_id, 'RESOLVED', resolutionNote.trim());
      setShowResolveModal(false);
      setResolutionNote('');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Resolution submission failed');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const handleConfirmEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievance || !escalateReason.trim()) return;
    setIsSubmittingEscalate(true);
    try {
      await api.escalateGrievance(grievance.public_id, escalateReason.trim());
      setShowEscalateModal(false);
      setEscalateReason('');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Escalation failed');
    } finally {
      setIsSubmittingEscalate(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
        <span className="material-symbols-outlined text-[32px] animate-spin text-primary">progress_activity</span>
        <span className="text-[14px] text-secondary">Loading department grievance details...</span>
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="p-6 rounded-xl bg-error-container text-on-error-container text-center flex flex-col items-center gap-3 my-4">
        <span className="material-symbols-outlined text-[32px] text-error">error</span>
        <p className="text-[14px] font-semibold">{error || 'Complaint record not found.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-4 rounded-xl bg-surface-container text-on-surface text-[13px] font-medium cursor-pointer"
        >
          Return to Queue
        </button>
      </div>
    );
  }

  const isEscalated = grievance.status === 'ESCALATED';
  const isResolved = grievance.status === 'RESOLVED';
  const timeline = grievance.timeline || [];
  const internalNotes = timeline.filter(t => t.kind === 'INTERNAL_REMARK');

  return (
    <div className="flex flex-col w-full pb-20 space-y-5 animate-fade-in">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-secondary text-[12px] flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>{user?.department_name || 'Department'} Queue</span>
          </button>
          <span className="text-secondary">/</span>
          <span className="text-on-surface font-semibold font-mono bg-surface-container-high px-1.5 py-0.5 rounded">
            {grievance.display_no}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface-container text-secondary flex items-center gap-1 border border-surface-container">
            <span>Officer View: <strong>{user?.name}</strong></span>
          </span>
        </div>
      </div>

      {/* READ-ONLY BANNER WHEN ESCALATED */}
      {isEscalated && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error-container flex items-start gap-3 shadow-sm">
          <span className="material-symbols-outlined text-[24px] text-error shrink-0 mt-0.5">
            lock
          </span>
          <div className="flex flex-col">
            <h4 className="font-bold text-[15px] text-error">
              Read-Only: Escalated to Grievance Cell
            </h4>
            <p className="text-[13px] text-on-error-container mt-0.5 leading-relaxed">
              This grievance has been escalated to the central Grievance Cell. Department officers can view history, internal remarks, and student photos, but status changes and resolutions are restricted to the Grievance Cell.
            </p>
          </div>
        </div>
      )}

      {/* Resolved Banner */}
      {isResolved && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-start gap-3 shadow-sm">
          <span className="material-symbols-outlined text-[24px] text-emerald-700 shrink-0 mt-0.5">
            check_circle
          </span>
          <div className="flex flex-col">
            <h4 className="font-bold text-[15px] text-emerald-800">
              Grievance Resolved (Final)
            </h4>
            <p className="text-[13px] text-emerald-700 mt-0.5 leading-relaxed">
              This complaint has been formally resolved and the student has been notified. Resolved status is final.
            </p>
            {grievance.resolution_note && (
              <div className="mt-2 p-2.5 rounded-lg bg-white/70 border border-emerald-200 text-[13px]">
                <span className="font-semibold block text-emerald-900">Public Resolution Note:</span>
                <span>{grievance.resolution_note}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: 12 Cols (8 Left, 4 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Main Grievance Details Card */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[22px] font-bold text-on-surface font-mono">
                    {grievance.display_no}
                  </span>
                  <span className="text-[11px] text-secondary font-medium">
                    Lodged {new Date(grievance.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="text-[11px] text-secondary font-medium">
                    Category: <strong>{grievance.category_name}</strong>
                  </span>
                </div>
                <h1 className="text-[18px] font-semibold text-on-surface mt-1 leading-snug">
                  {grievance.summary}
                </h1>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <PriorityChip priority={grievance.priority} size="sm" />
                <StatusChip status={grievance.status} size="sm" />
              </div>
            </div>

            {/* Location & Department Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-lg bg-surface-container-low text-secondary text-[13px] border border-surface-container">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-primary text-[17px]">location_on</span>
                <span className="font-semibold text-on-surface">Location:</span>
                <span className="truncate">{grievance.location}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-primary text-[17px]">domain</span>
                <span className="font-semibold text-on-surface">Assigned Unit:</span>
                <span className="truncate">{grievance.department_name}</span>
              </div>
            </div>

            {/* Student Lodgement Box (No Roll Number) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary">
                Student Lodgement Details
              </span>
              <div className="p-4 rounded-xl bg-surface-container flex flex-col gap-2.5 border border-surface-container-high">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[12px]">
                    {(grievance.student?.first_name || grievance.student_name || 'Saif Sayyad')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-[13px] text-on-surface">
                      {grievance.student?.first_name || grievance.student_name || 'Student'}
                    </span>
                    <span className="text-[11px] text-secondary">
                      {grievance.student?.year ? `${grievance.student?.year} ` : ''}
                      {grievance.student?.academic_department || 'Engineering'}
                    </span>
                  </div>
                </div>

                <p className="text-[13px] text-on-surface mt-1 leading-relaxed italic bg-surface-container-lowest/60 p-3 rounded-lg border border-surface-container">
                  "{grievance.description}"
                </p>
              </div>
            </div>

            {/* STUDENT PHOTO VIEWER (Staff can view, cannot upload, no completion proof photo) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">photo_library</span>
                  <h3 className="text-[14px] font-semibold text-on-surface">Student Photo Viewer</h3>
                </div>
                <span className="text-[11px] text-secondary">
                  {grievance.attachments && grievance.attachments.length > 0
                    ? `${grievance.attachments.length} student photo(s) attached`
                    : 'No photos attached by student'}
                </span>
              </div>

              {grievance.attachments && grievance.attachments.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {grievance.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setViewPhotoUrl(att.download_url)}
                      className="group relative rounded-xl overflow-hidden aspect-video bg-surface-container cursor-pointer border border-surface-container-high hover:border-primary transition-all shadow-sm"
                    >
                      <img
                        src={att.download_url}
                        alt={att.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1">
                        <span className="material-symbols-outlined text-[15px]">zoom_in</span>
                        <span>View Photo</span>
                      </div>
                      <div className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm truncate max-w-[90%]">
                        Student Upload
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container text-center text-secondary text-[12px]">
                  <span>No student photos uploaded for this grievance.</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Reply for Staff */}
          <QuickReplySection
            publicId={grievance.public_id}
            onReplySent={fetchDetail}
            disabled={grievance.status === 'RESOLVED'}
          />

          {/* Grievance Progression Audit Timeline */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                <h3 className="text-[15px] font-semibold text-on-surface">Grievance Progression Timeline</h3>
              </div>
              <span className="text-[11px] text-secondary">Official Workflow Audit</span>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
              {timeline.map((item, idx) => (
                <div key={item.id || idx} className="relative flex items-start gap-3">
                  <div
                    className={`absolute -left-6 top-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${
                      item.kind === 'INTERNAL_REMARK'
                        ? 'bg-secondary'
                        : item.status === 'ESCALATED'
                        ? 'bg-error'
                        : item.status === 'RESOLVED'
                        ? 'bg-emerald-600'
                        : 'bg-primary'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-on-surface">
                        {item.kind === 'INTERNAL_REMARK'
                          ? 'Internal Staff Remark'
                          : item.kind === 'PUBLIC_UPDATE'
                          ? 'Public Update'
                          : item.status || 'Workflow Action'}
                      </span>
                      <span className="text-[11px] text-secondary">
                        {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[13px] text-secondary mt-0.5 leading-snug">
                      {item.note}
                    </p>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">
                      By {item.actor_name} ({item.actor_role})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Actions & SLA Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Institutional SLA Window Card */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                Turnaround SLA Window
              </span>
              <SlaBadge sla={grievance.sla} variant="pill" />
            </div>

            <div className="flex flex-col mt-1">
              <span className="text-[26px] font-bold text-primary font-mono leading-none">
                {grievance.sla.status === 'OVERDUE' ? 'OVERDUE' : grievance.sla.label}
              </span>
              <span className="text-[11px] text-secondary mt-1">
                Deadline: {new Date(grievance.due_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })} IST
              </span>
            </div>

            <div className="w-full bg-surface-container rounded-full h-2 mt-1 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  grievance.sla.status === 'OVERDUE' ? 'bg-error' : 'bg-primary'
                }`}
                style={{ width: grievance.sla.status === 'OVERDUE' ? '100%' : '35%' }}
              ></div>
            </div>
          </div>

          {/* Department Dispatch & Action Controls */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-2.5">
            <h3 className="text-[15px] font-semibold text-on-surface mb-1">
              Department Action Controls
            </h3>

            {/* If Escalated: actions are locked */}
            {isEscalated ? (
              <div className="p-3 rounded-lg bg-surface-container text-secondary text-[12px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-error">lock</span>
                <span>Actions locked while ticket is escalated to Grievance Cell.</span>
              </div>
            ) : isResolved ? (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-[12px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-700">task_alt</span>
                <span>This grievance is resolved. Status is final.</span>
              </div>
            ) : (
              <>
                {/* Start Work (If Assigned) */}
                {grievance.status === 'ASSIGNED' && (
                  <button
                    type="button"
                    onClick={handleStartWork}
                    className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">build</span>
                    <span>Start Work on Ticket</span>
                  </button>
                )}

                {/* Resolve Dialog Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setResolutionNote('');
                    setShowResolveModal(true);
                  }}
                  className="w-full h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Resolve Grievance...</span>
                </button>

                {/* Escalate Dialog Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setEscalateReason('');
                    setShowEscalateModal(true);
                  }}
                  className="w-full h-11 rounded-xl bg-error-container hover:bg-error/20 text-on-error-container font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer mt-1"
                >
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span>Escalate to Grievance Cell...</span>
                </button>
              </>
            )}
          </div>

          {/* Internal Staff Remarks (Confidential) */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-on-surface">Internal Staff Remarks</span>
              <span className="text-[11px] text-secondary flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[13px]">lock</span> Private
              </span>
            </div>

            <div className="space-y-2 mt-1 max-h-48 overflow-y-auto pr-1">
              {internalNotes.length === 0 ? (
                <p className="text-[12px] text-secondary italic">No confidential remarks logged.</p>
              ) : (
                internalNotes.map((note) => (
                  <div key={note.id} className="p-2.5 rounded bg-surface-container-low flex flex-col border border-surface-container">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-on-surface">{note.actor_name}</span>
                      <span className="text-[10px] text-secondary">
                        {new Date(note.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[12px] text-secondary mt-0.5 leading-snug">
                      {note.note}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddInternalNote} className="mt-1 flex items-center gap-1.5">
              <input
                type="text"
                value={internalNoteInput}
                onChange={(e) => setInternalNoteInput(e.target.value)}
                placeholder="Log internal note..."
                className="flex-1 h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] border border-surface-container-high focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmittingNote || !internalNoteInput.trim()}
                className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* RESOLVE DIALOG (Public Resolution Note) */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3.5 border border-surface-container animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">check_circle</span>
                <h3 className="text-[16px] font-bold text-on-surface">Resolve Grievance</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-secondary">
              Provide a clear public resolution note explaining the work performed. This will be published directly to the student on their grievance progression timeline.
            </p>

            <form onSubmit={handleConfirmResolve} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-on-surface" htmlFor="resolutionNote">
                  Public Resolution Note <span className="text-error">*</span>
                </label>
                <textarea
                  id="resolutionNote"
                  required
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Repaired broken circuit breaker in DB-2E. Tested all light fittings in corridor. Power restored."
                  className="w-full rounded-xl bg-surface-container-low p-3 text-on-surface text-[13px] border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 h-10 rounded-xl bg-surface-container text-on-surface text-[13px] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolve || !resolutionNote.trim()}
                  className="flex-1 h-10 rounded-xl bg-primary-container text-on-primary text-[13px] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingResolve ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ESCALATE DIALOG (Required Reason) */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3.5 border border-surface-container animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[22px]">warning</span>
                <h3 className="text-[16px] font-bold text-error">Escalate to Grievance Cell</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEscalateModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-secondary">
              A reason is strictly required to escalate this grievance to the central Grievance Cell. The cell will review this note upon escalation.
            </p>

            <form onSubmit={handleConfirmEscalate} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-on-surface" htmlFor="escalateReason">
                  Reason for Escalation <span className="text-error">*</span>
                </label>
                <textarea
                  id="escalateReason"
                  required
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="e.g. Replacement transformer parts out of stock at central stores; electrical hazard poses risk to students."
                  className="w-full rounded-xl bg-surface-container-low p-3 text-on-surface text-[13px] border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="flex-1 h-10 rounded-xl bg-surface-container text-on-surface text-[13px] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEscalate || !escalateReason.trim()}
                  className="flex-1 h-10 rounded-xl bg-error text-white text-[13px] font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEscalate ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo inspection modal */}
      {viewPhotoUrl && (
        <PhotoModal
          isOpen={true}
          onClose={() => setViewPhotoUrl(null)}
          imageUrl={viewPhotoUrl}
          title={`Ticket ${grievance.display_no} - Student Evidence Photo`}
        />
      )}
    </div>
  );
};

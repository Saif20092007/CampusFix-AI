import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Grievance, Department } from '../types';
import { StatusChip } from '../components/StatusChip';
import { PriorityChip } from '../components/PriorityChip';
import { SlaBadge } from '../components/SlaBadge';
import { PhotoModal } from '../components/PhotoModal';

interface GrievanceCellTicketDetailProps {
  publicId: string;
  onBack: () => void;
}

export const GrievanceCellTicketDetail: React.FC<GrievanceCellTicketDetailProps> = ({
  publicId,
  onBack,
}) => {
  const { user } = useAuth();
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState<number>(1);
  const [targetTechName, setTargetTechName] = useState('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const [isMovingBack, setIsMovingBack] = useState(false);

  // Internal Notes
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Photo viewer modal
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getGrievance(publicId);
      setGrievance(data);
      if (data.department_id) setTargetDeptId(data.department_id);
    } catch (err: any) {
      setError(err.message || 'Grievance record not found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    api.getDepartments().then(setDepartments).catch(console.error);
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
      alert(err.message || 'Failed to save note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievance) return;
    setIsSubmittingReassign(true);
    try {
      await api.reassignGrievance(grievance.public_id, targetDeptId, targetTechName.trim() || undefined);
      setShowReassignModal(false);
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Reassignment failed');
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  const handleMoveBackToInProgress = async () => {
    if (!grievance) return;
    setIsMovingBack(true);
    try {
      await api.updateStatus(
        grievance.public_id,
        'IN_PROGRESS',
        'Grievance Cell reviewed escalation and moved ticket back to In Progress for department action.'
      );
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setIsMovingBack(false);
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
      alert(err.message || 'Resolution failed');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
        <span className="material-symbols-outlined text-[32px] animate-spin text-primary">progress_activity</span>
        <span className="text-[14px] text-secondary">Loading Grievance Cell record...</span>
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="p-6 rounded-xl bg-error-container text-on-error-container text-center flex flex-col items-center gap-3 my-4">
        <span className="material-symbols-outlined text-[32px] text-error">error</span>
        <p className="text-[14px] font-semibold">{error || 'Grievance not found.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-4 rounded-xl bg-surface-container text-on-surface text-[13px] font-medium cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isEscalated = grievance.status === 'ESCALATED';
  const isResolved = grievance.status === 'RESOLVED';
  const timeline = grievance.timeline || [];
  const escalationEvent = timeline.find((t) => t.status === 'ESCALATED');
  const internalNotes = timeline.filter((t) => t.kind === 'INTERNAL_REMARK');

  return (
    <div className="flex flex-col w-full pb-20 space-y-5 animate-fade-in">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-secondary text-[12px] flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Grievance Cell Console</span>
          </button>
          <span className="text-secondary">/</span>
          <span className="text-on-surface font-semibold font-mono bg-surface-container-high px-1.5 py-0.5 rounded">
            {grievance.display_no}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface-container text-secondary border border-surface-container">
            College Grievance Cell Review
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
          </button>
        </div>
      </div>

      {/* ESCALATED BY <DEPARTMENT> BANNER AND REASON */}
      {isEscalated && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error-container flex flex-col gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px] text-error">emergency_home</span>
            <h4 className="font-bold text-[16px] text-error">
              Escalated by {grievance.department_name}
            </h4>
          </div>

          <div className="p-3 rounded-lg bg-white/70 border border-error/30 text-on-surface">
            <span className="text-[11px] font-semibold text-error uppercase tracking-wider block">
              Reason for Escalation:
            </span>
            <p className="text-[13px] text-on-surface mt-0.5 leading-relaxed font-medium">
              "{escalationEvent?.note || 'Urgent facility escalation submitted by department officer.'}"
            </p>
            <span className="text-[11px] text-secondary mt-1 block">
              Submitted by: {escalationEvent?.actor_name || 'Department Officer'}
              {escalationEvent?.created_at && (
                <> · {new Date(escalationEvent.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Resolved State Banner */}
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
              This grievance has been concluded. Status is final and cannot be reopened.
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

      {/* Split Grid: 12 Cols (8 Left, 4 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Main Grievance Master Card */}
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

            {/* Department & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-lg bg-surface-container-low text-secondary text-[13px] border border-surface-container">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-primary text-[17px]">location_on</span>
                <span className="font-semibold text-on-surface">Location:</span>
                <span className="truncate">{grievance.location}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-primary text-[17px]">domain</span>
                <span className="font-semibold text-on-surface">Handling Department:</span>
                <span className="truncate">{grievance.department_name}</span>
              </div>
            </div>

            {/* Student Lodgement Details (No Roll Number!) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary">
                Student Lodgement Details
              </span>
              <div className="p-4 rounded-xl bg-surface-container flex flex-col gap-2.5 border border-surface-container-high">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[12px]">
                      SP
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[13px] text-on-surface">
                        {grievance.student?.full_name || grievance.student_name || 'Student'}
                      </span>
                      <span className="text-[11px] text-secondary">
                        {grievance.student?.year ? `${grievance.student?.year} ` : ''}
                        {grievance.student?.academic_department || 'Engineering'}
                        {grievance.student?.division ? ` · ${grievance.student?.division}` : ''}
                      </span>
                    </div>
                  </div>

                  {grievance.student?.phone && (
                    <div className="flex items-center gap-1.5 text-secondary text-[12px]">
                      <span className="material-symbols-outlined text-[15px]">call</span>
                      <span className="font-mono">{grievance.student.phone}</span>
                    </div>
                  )}
                </div>

                <p className="text-[13px] text-on-surface mt-1 leading-relaxed italic bg-surface-container-lowest/60 p-3 rounded-lg border border-surface-container">
                  "{grievance.description}"
                </p>
              </div>
            </div>

            {/* STUDENT PHOTO VIEWER (Staff can view, cannot upload, no technician proof) */}
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
                  <span>No student photos attached for this grievance.</span>
                </div>
              )}
            </div>
          </div>

          {/* Grievance Action History Audit Log */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
                <h3 className="text-[15px] font-semibold text-on-surface">Action Audit History</h3>
              </div>
              <span className="text-[11px] text-secondary">Audit Trail</span>
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

        {/* Right Column (4 cols): Grievance Cell Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Institutional SLA Clock */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                Turnaround SLA Clock
              </span>
              <SlaBadge sla={grievance.sla} variant="pill" />
            </div>

            <div className="flex flex-col mt-1">
              <span className="text-[26px] font-bold text-primary font-mono leading-none">
                {grievance.sla.status === 'OVERDUE' ? 'OVERDUE' : grievance.sla.label}
              </span>
              <span className="text-[11px] text-secondary mt-1">
                Target: {new Date(grievance.due_at).toLocaleDateString('en-IN', {
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

          {/* Grievance Cell Action Panel */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-2.5">
            <h3 className="text-[15px] font-semibold text-on-surface mb-1">
              Grievance Cell Actions
            </h3>

            {isResolved ? (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-[12px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-700">task_alt</span>
                <span>Grievance is resolved. Status is final.</span>
              </div>
            ) : (
              <>
                {/* Reassign Dialog Trigger */}
                <button
                  type="button"
                  onClick={() => setShowReassignModal(true)}
                  className="w-full h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                  <span>Reassign Department...</span>
                </button>

                {/* Move Back to In Progress (replaces 're-opens' label) */}
                {isEscalated && (
                  <button
                    type="button"
                    disabled={isMovingBack}
                    onClick={handleMoveBackToInProgress}
                    className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    <span>{isMovingBack ? 'Updating...' : 'Moves back to In Progress'}</span>
                  </button>
                )}

                {/* Resolve Grievance Dialog Trigger */}
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
              </>
            )}
          </div>

          {/* Internal Staff Notes */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-on-surface">Internal Staff Notes</span>
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
                placeholder="Log internal remark..."
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

      {/* REASSIGN DIALOG */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3.5 border border-surface-container animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">swap_horiz</span>
                <h3 className="text-[16px] font-semibold text-on-surface">Reassign Service Department</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-secondary">
              Transfer this grievance to another department queue and re-assign lead field personnel.
            </p>

            <form onSubmit={handleConfirmReassign} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-on-surface" htmlFor="reassignDept">
                  Target Department
                </label>
                <select
                  id="reassignDept"
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-[13px] border border-surface-container"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-on-surface" htmlFor="reassignTech">
                  Assign Lead Technician (Optional)
                </label>
                <input
                  id="reassignTech"
                  type="text"
                  value={targetTechName}
                  onChange={(e) => setTargetTechName(e.target.value)}
                  placeholder="e.g. Santosh Shinde"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-[13px] border border-surface-container"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="flex-1 h-10 rounded-xl bg-surface-container text-on-surface text-[13px] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReassign}
                  className="flex-1 h-10 rounded-xl bg-primary-container text-on-primary text-[13px] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingReassign ? 'Transferring...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Provide an official resolution note describing the final action taken. This will be published to the student on their grievance progression timeline.
            </p>

            <form onSubmit={handleConfirmResolve} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-on-surface" htmlFor="cellResolutionNote">
                  Public Resolution Note <span className="text-error">*</span>
                </label>
                <textarea
                  id="cellResolutionNote"
                  required
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Pump overhauled by hydraulic specialist; system pressure restored across all hostel wings."
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

      {/* Photo modal viewer */}
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

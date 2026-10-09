import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Grievance } from '../types';
import { StatusChip } from '../components/StatusChip';
import { PriorityChip } from '../components/PriorityChip';
import { PhotoModal } from '../components/PhotoModal';

interface StudentGrievanceDetailProps {
  publicId: string;
  onBack: () => void;
}

export const StudentGrievanceDetail: React.FC<StudentGrievanceDetailProps> = ({
  publicId,
  onBack,
}) => {
  const [grievance, setGrievance] = useState<(Grievance & { fromCache?: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [modalType, setModalType] = useState<'comment' | 'escalate' | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getGrievance(publicId);
      setGrievance(data);
    } catch (err: any) {
      setError(err.message || 'Complaint not found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [publicId]);

  const handleModalSubmit = async () => {
    if (!modalInput.trim() || !grievance) return;
    setIsSubmittingAction(true);
    try {
      if (modalType === 'comment') {
        await api.addRemark(grievance.public_id, 'PUBLIC_UPDATE', modalInput);
      } else if (modalType === 'escalate') {
        await api.escalateGrievance(grievance.public_id, modalInput);
      }
      setModalType(null);
      setModalInput('');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
        <span className="material-symbols-outlined text-[32px] animate-spin text-primary">progress_activity</span>
        <span className="text-[14px] text-secondary">Loading ticket records...</span>
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="p-6 rounded-xl bg-error-container text-on-error-container text-center flex flex-col items-center gap-3 my-4">
        <span className="material-symbols-outlined text-[32px] text-error">error</span>
        <p className="text-[14px] font-semibold">{error || 'Complaint not found.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-4 rounded-xl bg-surface-container text-on-surface text-[13px] font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  const timeline = grievance.timeline || [];
  const publicUpdates = timeline.filter(t => t.kind === 'PUBLIC_UPDATE');

  return (
    <div className="flex flex-col w-full pb-24 space-y-4 animate-fade-in">
      {/* Top Header Strip with Live dot and Share/Download */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-surface-container-high text-on-surface-variant px-2.5 py-0.5 rounded-full font-medium tracking-wide font-mono">
            TICKET {grievance.display_no}
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Share ticket"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Ticket link copied to clipboard!');
            }}
            className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
          </button>
          <button
            type="button"
            aria-label="Print or Export"
            onClick={() => window.print()}
            className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
        </div>
      </div>

      {/* Offline cached notification if applicable */}
      {(grievance.fromCache || (typeof navigator !== 'undefined' && !navigator.onLine)) && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[12px] font-medium shadow-xs">
          <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400">offline_pin</span>
          <span>Offline Cached Record — Viewing grievance data saved in your browser's IndexedDB.</span>
        </div>
      )}

      {/* Main Ticket Card */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusChip status={grievance.status} size="sm" />
            <PriorityChip priority={grievance.priority} size="sm" />
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[13px]">electrical_services</span>
              <span>{grievance.category_name}</span>
            </span>
          </div>

          <h2 className="text-[19px] text-on-surface font-semibold tracking-tight leading-snug">
            {grievance.summary}
          </h2>

          <div className="flex items-start gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">location_on</span>
            <p className="text-[13px] leading-snug">{grievance.location}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-1 bg-surface-container-low p-3 rounded-lg border border-surface-container">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[16px]">domain</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-secondary leading-none">Handling Unit</span>
                <span className="text-[13px] font-medium text-on-surface mt-0.5">
                  {grievance.department_name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
              <span>{grievance.sla.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Progression Timeline (Stitch Image 1) */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">alt_route</span>
            <h3 className="text-[16px] font-semibold text-on-surface">Audit Progression</h3>
          </div>
          <span className="text-[11px] text-secondary font-medium">SLA Clock Active</span>
        </div>

        <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-surface-container-high">
          {/* Submitted Step */}
          <div className="relative">
            <div className="absolute -left-[23px] top-0 w-6 h-6 rounded-full bg-emerald-600 text-surface-container-lowest flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[14px] text-white">done</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-[14px] font-semibold text-on-surface">Submitted</h4>
                <span className="text-[11px] text-secondary shrink-0">
                  {new Date(grievance.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[13px] text-secondary mt-1 leading-relaxed">
                {grievance.description}
              </p>
            </div>
          </div>

          {/* Assigned Step */}
          {grievance.status !== 'SUBMITTED' && (
            <div className="relative">
              <div className="absolute -left-[23px] top-0 w-6 h-6 rounded-full bg-emerald-600 text-surface-container-lowest flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[14px] text-white">done</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-[14px] font-semibold text-on-surface">Assigned</h4>
                  <span className="text-[11px] text-secondary shrink-0">Official dispatch</span>
                </div>
                <p className="text-[13px] text-secondary mt-1 leading-relaxed">
                  Routed to {grievance.department_name}.
                  {grievance.assigned_to_name && ` Assigned to lead technician ${grievance.assigned_to_name}.`}
                </p>
                {grievance.assigned_to_name && (
                  <div className="inline-flex items-center gap-2 mt-2 p-1.5 rounded-lg bg-surface-container-low w-fit border border-surface-container">
                    <div className="w-5 h-5 rounded-full bg-primary-fixed-dim text-on-primary-fixed flex items-center justify-center font-bold text-[10px]">
                      {grievance.assigned_to_name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[12px] font-medium text-on-surface">
                      {grievance.assigned_to_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* In Progress Step */}
          {(grievance.status === 'IN_PROGRESS' || grievance.status === 'RESOLVED') && (
            <div className="relative">
              <div className="absolute -left-[23px] top-0 w-6 h-6 rounded-full bg-amber-500 text-surface-container-lowest flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[14px] text-white">autorenew</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-[14px] font-semibold text-on-surface">In Progress</h4>
                  <span className="text-[11px] text-amber-800 font-semibold shrink-0">Field Action</span>
                </div>
                <p className="text-[13px] text-secondary mt-1 leading-relaxed">
                  Technician on-site carrying out diagnostics and component replacement.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-tertiary-container text-[12px] font-medium">
                  <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                  <span>Store Slip #ES-4412 issued</span>
                </div>
              </div>
            </div>
          )}

          {/* Escalated Step (If applicable) */}
          {grievance.status === 'ESCALATED' && (
            <div className="relative">
              <div className="absolute -left-[23px] top-0 w-6 h-6 rounded-full bg-error text-surface-container-lowest flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[14px] text-white">warning</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-[14px] font-semibold text-error">Escalated</h4>
                  <span className="text-[11px] text-error font-semibold shrink-0">Priority Care</span>
                </div>
                <p className="text-[13px] text-secondary mt-1 leading-relaxed">
                  This grievance has been escalated to the Grievance Cell for accelerated administrative resolution.
                </p>
              </div>
            </div>
          )}

          {/* Resolved Step */}
          <div className={`relative ${grievance.status !== 'RESOLVED' ? 'opacity-70' : ''}`}>
            <div
              className={`absolute -left-[23px] top-0 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                grievance.status === 'RESOLVED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-surface-container-highest text-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {grievance.status === 'RESOLVED' ? 'done' : 'hourglass_empty'}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-[14px] font-semibold text-on-surface">Resolved</h4>
                <span className="text-[11px] text-secondary shrink-0">
                  {grievance.resolved_at
                    ? new Date(grievance.resolved_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Est. 24-48h'}
                </span>
              </div>
              <p className="text-[13px] text-secondary mt-1">
                {grievance.resolution_note || 'Pending physical verification and luminance lux check.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Public Resolution Note */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">verified</span>
            <h3 className="text-[16px] font-semibold text-on-surface">Public Resolution Note</h3>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
              grievance.status === 'RESOLVED'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-surface-container-high text-secondary'
            }`}
          >
            {grievance.status === 'RESOLVED' ? 'Resolved' : 'Pending'}
          </span>
        </div>

        {grievance.status === 'RESOLVED' ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[14px]">
              <span className="material-symbols-outlined text-[20px] text-emerald-700">task_alt</span>
              <span>Resolution Completed</span>
            </div>
            <p className="text-[13px] text-emerald-800 leading-relaxed">
              {grievance.resolution_note || 'Maintenance work order completed and verified.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-xl p-4 flex flex-col items-center text-center border border-surface-container">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary mb-2">
              <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
            </div>
            <p className="text-[13px] font-medium text-on-surface max-w-xs leading-relaxed">
              Awaiting departmental resolution remarks upon service completion.
            </p>
          </div>
        )}
      </div>

      {/* Complaint Photo Attachments (If any) */}
      {grievance.attachments && grievance.attachments.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">image</span>
            <h3 className="text-[16px] font-semibold text-on-surface">Lodged Evidence Photos</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {grievance.attachments.map(att => (
              <div
                key={att.id}
                onClick={() => setSelectedPhoto(att.download_url)}
                className="relative rounded-xl overflow-hidden aspect-video bg-surface-container cursor-pointer border border-surface-container-high group"
              >
                <img
                  src={att.download_url}
                  alt={att.file_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[12px] font-medium gap-1">
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>Inspect</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campus Activity Thread (Comments / Follow-ups) */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-on-surface">Campus Activity Thread</span>
          <span className="text-[11px] text-primary font-semibold">1 Student Impacted</span>
        </div>

        <div className="space-y-2.5">
          {/* Initial student complaint comment */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-container-low border border-surface-container">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[12px] shrink-0">
              SS
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-on-surface">{grievance.student_name || 'Saif Sayyad'}</span>
                <span className="text-[11px] text-secondary">
                  {new Date(grievance.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[13px] text-secondary mt-0.5 leading-relaxed">
                {grievance.description}
              </p>
            </div>
          </div>

          {/* Follow-up public updates */}
          {publicUpdates.map(pu => (
            <div key={pu.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-container-low border border-surface-container">
              <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-[11px] shrink-0">
                {pu.actor_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-on-surface">{pu.actor_name}</span>
                  <span className="text-[11px] text-secondary">
                    {new Date(pu.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[13px] text-secondary mt-0.5 leading-relaxed">
                  {pu.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Action Buttons */}
      <div className="grid grid-cols-1 gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => {
            setModalType('comment');
            setModalInput('');
          }}
          className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">add_comment</span>
          <span>Add Follow-up Comment</span>
        </button>

        {grievance.status !== 'ESCALATED' && grievance.status !== 'RESOLVED' && (
          <button
            type="button"
            onClick={() => {
              setModalType('escalate');
              setModalInput('');
            }}
            className="w-full h-12 rounded-xl bg-error-container text-on-error-container font-medium text-[15px] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">crisis_alert</span>
            <span>Escalate Grievance</span>
          </button>
        )}
      </div>

      {/* Follow-up / Escalate Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl flex flex-col gap-3 animate-fade-in border border-surface-container">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-on-surface">
                {modalType === 'escalate' ? 'Escalate to Chief Warden / Estate Office' : 'Add Follow-up Note'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[13px] text-secondary">
              {modalType === 'escalate'
                ? 'Escalations alert higher administrative authorities. Use if an immediate physical hazard exists or SLA is breached.'
                : 'Post an observation visible to campus technicians and the hostel warden.'}
            </p>

            <textarea
              rows={3}
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder={
                modalType === 'escalate'
                  ? 'State why administrative escalation is necessary...'
                  : 'Write your follow-up remark or student observation...'
              }
              className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary-container"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="flex-1 h-12 rounded-xl bg-surface-container text-on-surface font-medium text-[14px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction || !modalInput.trim()}
                onClick={handleModalSubmit}
                className={`flex-1 h-12 rounded-xl font-medium text-[14px] text-white disabled:opacity-50 ${
                  modalType === 'escalate' ? 'bg-error hover:bg-red-700' : 'bg-primary-container hover:bg-primary'
                }`}
              >
                {isSubmittingAction
                  ? 'Submitting...'
                  : modalType === 'escalate'
                  ? 'Confirm Escalation'
                  : 'Post Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo modal viewer */}
      {selectedPhoto && (
        <PhotoModal
          isOpen={true}
          onClose={() => setSelectedPhoto(null)}
          imageUrl={selectedPhoto}
          title={`Ticket ${grievance.display_no} Evidence Photo`}
        />
      )}
    </div>
  );
};

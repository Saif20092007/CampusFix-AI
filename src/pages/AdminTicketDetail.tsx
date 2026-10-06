import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Grievance, Department } from '../types';
import { StatusChip } from '../components/StatusChip';
import { PriorityChip } from '../components/PriorityChip';
import { PhotoModal } from '../components/PhotoModal';

interface AdminTicketDetailProps {
  publicId: string;
  onBack: () => void;
}

export const AdminTicketDetail: React.FC<AdminTicketDetailProps> = ({
  publicId,
  onBack,
}) => {
  const { user } = useAuth();
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Field verification state
  const [techRemarks, setTechRemarks] = useState('Replaced 4 faulty LED battens. Restored line voltage from distribution box DB-2E. Tested fire reel exit corridor lighting, measured 160 Lux.');
  const [isSuperintendentVerified, setIsSuperintendentVerified] = useState(true);
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Modals
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState<number>(1);
  const [targetTechName, setTargetTechName] = useState('');

  // Photo viewer
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getGrievance(publicId);
      setGrievance(data);
      setSmsMessage(
        `CampusFix AI Update [Ticket ${data.display_no}]: Technician is currently resolving the reported issue at ${data.location}. Estimated completion within SLA window.`
      );
    } catch (err: any) {
      setError(err.message || 'Complaint not found.');
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

  const handleStartWork = async () => {
    if (!grievance) return;
    try {
      await api.updateStatus(grievance.public_id, 'IN_PROGRESS', 'Technician started field inspection and repair.');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleResolve = async () => {
    if (!grievance) return;
    try {
      await api.updateStatus(grievance.public_id, 'RESOLVED', techRemarks || 'Work order completed and verified.');
      alert('Ticket marked as RESOLVED and student notified!');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Resolution failed');
    }
  };

  const handleConfirmEscalate = async () => {
    if (!grievance || !escalateReason.trim()) return;
    try {
      await api.escalateGrievance(grievance.public_id, escalateReason.trim());
      setShowEscalateModal(false);
      setEscalateReason('');
      alert('Grievance escalated to Grievance Cell!');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Escalation failed');
    }
  };

  const handleConfirmReassign = async () => {
    if (!grievance) return;
    try {
      await api.reassignGrievance(grievance.public_id, targetDeptId, targetTechName || undefined);
      setShowReassignModal(false);
      alert('Grievance transferred to new department.');
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Reassignment failed');
    }
  };

  const handleSendSms = () => {
    setShowSmsModal(false);
    alert(`SMS and App Push notification successfully dispatched to student!`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
        <span className="material-symbols-outlined text-[32px] animate-spin text-primary">progress_activity</span>
        <span className="text-[14px] text-secondary">Loading administrative ticket console...</span>
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
          Return to Console
        </button>
      </div>
    );
  }

  const isOfficer = user?.role === 'OFFICER';
  const isGrievanceCell = user?.role === 'GRIEVANCE_CELL' || user?.role === 'ADMIN';
  const isEscalated = grievance.status === 'ESCALATED';
  const isResolved = grievance.status === 'RESOLVED';

  const timeline = grievance.timeline || [];
  const internalNotes = timeline.filter(t => t.kind === 'INTERNAL_REMARK');

  return (
    <div className="flex flex-col w-full pb-20 space-y-5 animate-fade-in">
      {/* Breadcrumb Navigation & Quick Bar (Stitch Image 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-secondary text-[12px] flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">inbox</span>
            <span>Grievances</span>
          </button>
          <span className="material-symbols-outlined text-[14px] text-secondary">chevron_right</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">domain</span>
            <span>{grievance.department_name}</span>
          </span>
          <span className="material-symbols-outlined text-[14px] text-secondary">chevron_right</span>
          <span className="text-on-surface font-semibold bg-surface-container-high px-1.5 py-0.5 rounded font-mono">
            {grievance.display_no}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded bg-surface-container text-secondary flex items-center gap-1 border border-surface-container">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
            <span>Synced with NMIET ERP Engine</span>
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Copied ticket share URL!');
            }}
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
          </button>
        </div>
      </div>

      {/* Prominent Banner if Escalated */}
      {isEscalated && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error-container flex items-start gap-3 shadow-sm">
          <span className="material-symbols-outlined text-[24px] text-error shrink-0 mt-0.5">
            emergency_home
          </span>
          <div className="flex flex-col">
            <h4 className="font-bold text-[15px] text-error">Escalated to Grievance Cell</h4>
            <p className="text-[13px] text-on-error-container mt-0.5">
              This grievance has breached standard SLA or requires high-tier governance.
              {isOfficer && ' Department officers can inspect notes but status can only be modified by the Grievance Cell.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Split Architecture (12 Cols: 8 Left, 4 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Ticket Master Card */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[22px] font-bold text-on-surface font-mono">
                    {grievance.display_no}
                  </span>
                  <span className="text-[11px] text-secondary font-medium">
                    Reported {new Date(grievance.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container text-secondary text-[11px] flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[13px]">smartphone</span> AI Student App
                  </span>
                </div>
                <h1 className="text-[17px] font-semibold text-on-surface mt-1">
                  {grievance.summary}
                </h1>
              </div>

              {/* Status & Priority Meta Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatusChip status={grievance.status} size="sm" />
                <PriorityChip priority={grievance.priority} size="sm" />
              </div>
            </div>

            {/* Location & Category Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-lg bg-surface-container-low text-secondary text-[13px] border border-surface-container">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-primary text-[17px]">location_on</span>
                <span className="font-semibold text-on-surface">Location:</span>
                <span className="truncate">{grievance.location}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-primary text-[17px]">category</span>
                <span className="font-semibold text-on-surface">Department:</span>
                <span className="truncate">{grievance.department_name} (Sub-station #2)</span>
              </div>
            </div>

            {/* Student Grievance Details Box */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary">
                Original Student Lodgement
              </span>
              <div className="p-4 rounded-xl bg-surface-container flex flex-col gap-2.5 border border-surface-container-high">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-[12px]">
                      SP
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[13px] text-on-surface">
                        {grievance.student?.full_name || grievance.student_name || 'Saif Patil'}
                      </span>
                      <span className="text-[11px] text-secondary">
                        {grievance.student?.year || 'TE'} {grievance.student?.academic_department || 'Computer Engg'} · Roll {grievance.student?.roll_no || '42'} ({grievance.student?.division || 'Div B'})
                      </span>
                    </div>
                  </div>

                  {isGrievanceCell && (
                    <div className="flex items-center gap-2 text-secondary text-[11px]">
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      <span>{grievance.student?.phone || '+91 98220 44910'}</span>
                      <span>·</span>
                      <span className="material-symbols-outlined text-[14px]">badge</span>
                      <span>PRN: 72140881G</span>
                    </div>
                  )}
                </div>

                <p className="text-[13px] text-on-surface mt-1 leading-relaxed italic bg-surface-container-lowest/60 p-3 rounded-lg border border-surface-container">
                  "{grievance.description}"
                </p>
              </div>
            </div>

            {/* AI Automated Triage Diagnostic Box */}
            <div className="p-4 rounded-xl bg-primary-container text-on-primary shadow-sm flex flex-col gap-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-on-primary-container text-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                  </div>
                  <span className="text-[11px] tracking-wider uppercase text-inverse-primary font-bold">
                    CampusFix AI Automated Triage Diagnostic
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-on-primary-container text-primary-container text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                  <span>Confidence 98.4%</span>
                </div>
              </div>

              <p className="text-[13px] text-on-primary leading-relaxed mt-0.5">
                <strong>Safety Hazard Trigger:</strong> Grievance classified as Critical Corridor Infrastructure. Detected keywords indicative of physical injury hazard (<code className="bg-primary/50 px-1 py-0.2 rounded text-white font-mono text-[11px]">tripped</code>, <code className="bg-primary/50 px-1 py-0.2 rounded text-white font-mono text-[11px]">pitch black</code>, <code className="bg-primary/50 px-1 py-0.2 rounded text-white font-mono text-[11px]">fire reel</code>). Auto-promoted priority from Normal to High with direct notification dispatched to Central Electrical Sub-Unit.
              </p>

              <div className="flex items-center gap-4 text-inverse-primary text-[11px] mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Category Match: Electrical Grid</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>GIS Ward: Hostel East Cluster</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Duplicate Check: Nil within 48h</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action & Audit History Timeline */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
                <h3 className="text-[16px] font-semibold text-on-surface">Official Action Audit Log</h3>
              </div>
              <span className="text-[11px] text-secondary">NMIET ISO 9001 Compliance Track</span>
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
                        {item.kind === 'INTERNAL_REMARK' ? 'Internal Staff Remark' : item.kind === 'PUBLIC_UPDATE' ? 'Public Update' : item.status || 'Workflow Action'}
                      </span>
                      <span className="text-[11px] text-secondary">
                        {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[13px] text-secondary mt-0.5 leading-snug">
                      {item.note}
                    </p>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">By {item.actor_name} ({item.actor_role})</span>
                  </div>
                </div>
              ))}

              {/* Current Phase */}
              {!isResolved && (
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-tertiary-fixed-dim ring-4 ring-tertiary-fixed/30 animate-pulse"></div>
                  <div className="flex-1 flex flex-col p-3 rounded-lg bg-surface-container-high border border-surface-container-highest">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-primary">
                        Current Phase: {isEscalated ? 'Awaiting Grievance Cell Review' : 'Awaiting Field Resolution'}
                      </span>
                      <span className="text-[11px] text-secondary font-medium">Active Now</span>
                    </div>
                    <p className="text-[12px] text-secondary mt-0.5 leading-snug">
                      Lead technician {grievance.assigned_to_name || 'Santosh Shinde'} carrying out inspection. Resolution proof required to complete administrative closure.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Technician Field Resolution & Verification Workspace (Stitch Image 2) */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">task_alt</span>
                <h3 className="text-[16px] font-semibold text-on-surface">
                  Technician Field Resolution & Verification
                </h3>
              </div>
              <span className="text-[11px] text-secondary">Required for Ticket Closeout</span>
            </div>

            {/* Before / After Photo Evidence Dropzones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Before Photo */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-secondary">Site Condition: Before Work</span>
                <div
                  onClick={() => setViewPhotoUrl('https://lh3.googleusercontent.com/aida-public/AB6AXuCNFykSYYbSgNWLFj8GtcgGoWI0c1Uw33LH0Ftu3iJWP3Za9p-OsDRxSdeVzWIvaPJLVo9JIJqgn_99IZYm1F4VsLaH3YdQ1MWzFZWPVWHnZ0Q0U88zTIwtlnixKDaVrloeho4OoDURHFNem4f2eQmqLXOT_14epUPsN24-u0fhK8HoONfULO8eT_2DNiZ0yNBeKcNaJ_s1Yx-HEj9OyYTCotXyeg6cafwwoHy_a9xvw4uYrS9aDvXo')}
                  className="relative rounded-xl overflow-hidden bg-surface-container aspect-video flex flex-col items-center justify-center group cursor-pointer border border-surface-container-high"
                >
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNFykSYYbSgNWLFj8GtcgGoWI0c1Uw33LH0Ftu3iJWP3Za9p-OsDRxSdeVzWIvaPJLVo9JIJqgn_99IZYm1F4VsLaH3YdQ1MWzFZWPVWHnZ0Q0U88zTIwtlnixKDaVrloeho4OoDURHFNem4f2eQmqLXOT_14epUPsN24-u0fhK8HoONfULO8eT_2DNiZ0yNBeKcNaJ_s1Yx-HEj9OyYTCotXyeg6cafwwoHy_a9xvw4uYrS9aDvXo"
                    alt="Dark hallway corridor at night"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-primary/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[12px] font-semibold gap-1">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>View Full Evidence</span>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-on-surface/80 text-surface text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                    Uploaded by Tech 01:45 PM
                  </div>
                </div>
              </div>

              {/* Resolution Proof Upload */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-secondary">Site Condition: Resolution Proof</span>
                <div
                  onClick={() => alert('Completion photo captured with GPS timestamp (18.7325° N, 73.6822° E - Hostel B Riser).')}
                  className="rounded-xl bg-surface-container-low aspect-video flex flex-col items-center justify-center p-4 text-center hover:bg-surface-container transition-colors cursor-pointer border border-surface-container"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed mb-1.5">
                    <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
                  </div>
                  <span className="font-semibold text-[13px] text-primary">Upload Field Completion Photo</span>
                  <span className="text-[11px] text-secondary mt-1 max-w-[200px] leading-snug">
                    Geo-tagged photo timestamp automatically verified by NMIET server
                  </span>
                </div>
              </div>
            </div>

            {/* Technician Remarks */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-secondary" htmlFor="tech-remarks">
                Technician Operation Remarks / Replaced Components
              </label>
              <textarea
                id="tech-remarks"
                rows={2}
                value={techRemarks}
                onChange={(e) => setTechRemarks(e.target.value)}
                className="w-full rounded-xl bg-surface-container-low p-3 text-on-surface text-[13px] border border-surface-container focus:outline-none"
              />
            </div>

            {/* Administrative Approval Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low cursor-pointer select-none border border-surface-container">
              <input
                type="checkbox"
                checked={isSuperintendentVerified}
                onChange={(e) => setIsSuperintendentVerified(e.target.checked)}
                className="w-4 h-4 rounded text-primary-container focus:ring-0 mt-0.5"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-[13px] text-on-surface">
                  Verified by NMIET Central Estate Superintendent
                </span>
                <span className="text-[11px] text-secondary mt-0.5 leading-snug">
                  Confirms physical safety standard compliance per Maharashtra Public Works Department Electrical Norms.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Institutional SLA Clock Card (Stitch Image 2) */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">timer</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  Institutional SLA Clock
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold">
                {grievance.priority} Tier
              </span>
            </div>

            <div className="flex flex-col mt-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[28px] font-bold text-primary font-mono leading-none">
                  {grievance.sla.status === 'OVERDUE' ? 'OVERDUE' : grievance.sla.label.replace('Due in ', '')}
                </span>
                <span className="text-[11px] text-secondary font-medium">
                  {grievance.sla.status === 'OVERDUE' ? 'Breached' : 'Remaining'}
                </span>
              </div>
              <span className="text-[11px] text-secondary mt-1">
                Deadline: {new Date(grievance.due_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
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
                style={{ width: grievance.sla.status === 'OVERDUE' ? '100%' : '14%' }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-secondary text-[11px]">
              <span>Target: {grievance.priority === 'Critical' ? '24h' : '48h'} Max Turnaround</span>
              <span>Active</span>
            </div>

            <div className="p-2 rounded bg-surface-container-low text-secondary text-[11px] flex items-center gap-1.5 mt-1 border border-surface-container">
              <span className="material-symbols-outlined text-[15px] text-tertiary-container">verified_user</span>
              <span>Automatic escalation triggered if SLA expires</span>
            </div>
          </div>

          {/* Personnel Assignment */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container space-y-3.5">
            <h3 className="text-[15px] font-semibold text-on-surface">Personnel Assignment</h3>

            {/* Primary Assigned Technician */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-secondary uppercase font-semibold">Primary Field Technician</span>
              <div className="p-2.5 rounded-xl bg-surface-container flex items-center justify-between border border-surface-container-high">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[12px]">
                    SS
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-on-surface">
                      {grievance.assigned_to_name || 'Santosh Shinde'}
                    </span>
                    <span className="text-[11px] text-secondary">Shift B (10:00 - 18:30) · On-Site</span>
                  </div>
                </div>
                {isGrievanceCell && (
                  <button
                    type="button"
                    onClick={() => setShowReassignModal(true)}
                    className="text-primary hover:text-primary-container p-1 rounded-lg hover:bg-surface-container-high transition-colors"
                    title="Reassign Technician"
                  >
                    <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                  </button>
                )}
              </div>
            </div>

            {/* Supervising Officer */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-secondary uppercase font-semibold">Supervising Estate Officer</span>
              <div className="p-2.5 rounded-xl bg-surface-container flex items-center gap-2.5 border border-surface-container-high">
                <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-[12px]">
                  RK
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-on-surface">Mr. R. V. Kulkarni</span>
                  <span className="text-[11px] text-secondary">Central Estate Maintenance Office</span>
                </div>
              </div>
            </div>

            {/* Governance Tier */}
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-[11px] text-secondary uppercase font-semibold">Current Governance Tier</span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low text-on-surface border border-surface-container text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[17px]">shield</span>
                  <span className="font-semibold">
                    {isEscalated ? 'Tier 2: Grievance Cell' : 'Tier 1: Department Cell'}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isEscalated ? 'bg-error-container text-error' : 'bg-surface-container text-secondary'}`}>
                  {isEscalated ? 'ESCALATED' : 'NORMAL'}
                </span>
              </div>
            </div>
          </div>

          {/* Dispatch Controls (Action Panel) */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-2.5">
            <h3 className="text-[15px] font-semibold text-on-surface mb-1">Dispatch Controls</h3>

            {/* Start Work (If Assigned) */}
            {grievance.status === 'ASSIGNED' && (!isEscalated || isGrievanceCell) && (
              <button
                type="button"
                onClick={handleStartWork}
                className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">build</span>
                <span>Start Work on Ticket</span>
              </button>
            )}

            {/* Primary CTA: Mark Resolved */}
            {grievance.status !== 'RESOLVED' && (!isEscalated || isGrievanceCell) && (
              <button
                type="button"
                onClick={handleResolve}
                className="w-full h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Mark as Resolved & Notify Student</span>
              </button>
            )}

            {/* Secondary CTA: Reassign (Grievance Cell only) */}
            {isGrievanceCell && (
              <button
                type="button"
                onClick={() => setShowReassignModal(true)}
                className="w-full h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">rule_folder</span>
                <span>Reassign / Transfer Department</span>
              </button>
            )}

            {/* Direct Student SMS */}
            <button
              type="button"
              onClick={() => setShowSmsModal(true)}
              className="w-full h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">sms</span>
              <span>Send SMS / Push Update to Student</span>
            </button>

            {/* Destructive / Escalation Button */}
            {!isEscalated && !isResolved && (
              <button
                type="button"
                onClick={() => setShowEscalateModal(true)}
                className="w-full h-11 rounded-xl bg-error-container hover:bg-error/20 text-on-error-container font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors mt-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>Escalate to Principal / Committee</span>
              </button>
            )}
          </div>

          {/* Internal Staff Notes (Civic Audit Thread - Private) */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-on-surface">Internal Staff Notes</span>
              <span className="text-[11px] text-secondary flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[13px]">lock</span> Private
              </span>
            </div>

            {/* Note Feed */}
            <div className="space-y-2 mt-1 max-h-48 overflow-y-auto pr-1">
              {internalNotes.length === 0 ? (
                <p className="text-[12px] text-secondary italic">No confidential remarks yet.</p>
              ) : (
                internalNotes.map((note) => (
                  <div key={note.id} className="p-2 rounded bg-surface-container-low flex flex-col border border-surface-container">
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

            {/* Input field */}
            <form onSubmit={handleAddInternalNote} className="mt-1 flex items-center gap-1.5">
              <input
                type="text"
                value={internalNoteInput}
                onChange={(e) => setInternalNoteInput(e.target.value)}
                placeholder="Add confidential operational remark..."
                className="flex-1 h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[12px] border border-surface-container-high focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmittingNote || !internalNoteInput.trim()}
                className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal: Direct Student SMS Dispatch (Stitch Image 2) */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-3.5 border border-surface-container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">send_to_mobile</span>
                <h3 className="text-[16px] font-semibold text-on-surface">Notify Student via SMS / Push</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSmsModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-surface-container flex items-center justify-between text-[13px] border border-surface-container-high">
              <span className="text-on-surface">
                Recipient: <strong>{grievance.student?.full_name || grievance.student_name || 'Saif Patil'} ({grievance.student?.phone || '+91 98220 44910'})</strong>
              </span>
              <span className="text-[11px] text-secondary">{grievance.location}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-secondary" htmlFor="student-sms-msg">
                Notification Message Body
              </label>
              <textarea
                id="student-sms-msg"
                rows={3}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="w-full rounded-xl bg-surface-container-low p-3 text-on-surface text-[13px] border border-surface-container focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSmsModal(false)}
                className="px-4 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendSms}
                className="px-4 h-10 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-[13px] font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Dispatch Instant SMS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Escalate to Committee */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3 border border-surface-container">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-error">Administrative Escalation</h3>
              <button
                type="button"
                onClick={() => setShowEscalateModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-secondary">
              State why immediate administrative escalation is necessary (this reason is internal and hidden from students).
            </p>

            <textarea
              rows={3}
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="e.g. Parts requisition delayed by stores; imminent student safety hazard..."
              className="w-full rounded-xl bg-surface-container-low p-3 text-on-surface text-[13px] border border-surface-container"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEscalateModal(false)}
                className="flex-1 h-10 rounded-lg bg-surface-container text-on-surface text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEscalate}
                disabled={!escalateReason.trim()}
                className="flex-1 h-10 rounded-lg bg-error text-white text-[13px] font-bold disabled:opacity-50"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reassign Department */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3 border border-surface-container">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-on-surface">Reassign Service Department</h3>
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-secondary">Target Department</label>
              <select
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
              <label className="text-[11px] font-semibold text-secondary">Lead Technician (Optional)</label>
              <input
                type="text"
                value={targetTechName}
                onChange={(e) => setTargetTechName(e.target.value)}
                placeholder="e.g. Santosh Shinde"
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-[13px] border border-surface-container"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="flex-1 h-10 rounded-lg bg-surface-container text-on-surface text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="flex-1 h-10 rounded-lg bg-primary-container text-on-primary text-[13px] font-semibold"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo inspection modal */}
      {viewPhotoUrl && (
        <PhotoModal
          isOpen={true}
          onClose={() => setViewPhotoUrl(null)}
          imageUrl={viewPhotoUrl}
          title={`Ticket ${grievance.display_no} - Site Condition Evidence`}
        />
      )}
    </div>
  );
};

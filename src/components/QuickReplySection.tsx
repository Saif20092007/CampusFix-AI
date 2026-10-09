import React, { useState } from 'react';
import { api } from '../services/api';

export interface QuickReplyTemplate {
  id: string;
  label: string;
  text: string;
  icon: string;
  badge: string;
  categoryColor: string;
}

export const PREDEFINED_QUICK_REPLIES: QuickReplyTemplate[] = [
  {
    id: 'looking_into_this',
    label: 'Looking into this',
    text: 'Our department is actively looking into this issue and reviewing the site requirements for resolution.',
    icon: 'search',
    badge: 'Under Review',
    categoryColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:border-blue-500/60',
  },
  {
    id: 'clarification_needed',
    label: 'Clarification needed',
    text: 'Clarification needed: Please provide more details or visit the department office to expedite resolution.',
    icon: 'help_outline',
    badge: 'Student Info',
    categoryColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:border-amber-500/60',
  },
  {
    id: 'scheduled_maintenance',
    label: 'Scheduled for maintenance',
    text: 'Scheduled for maintenance: Work order has been logged and queued with our maintenance crew.',
    icon: 'event_available',
    badge: 'Scheduled',
    categoryColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:border-purple-500/60',
  },
  {
    id: 'technician_dispatched',
    label: 'Technician dispatched',
    text: 'A technician has been dispatched to the site to inspect and resolve the reported problem.',
    icon: 'engineering',
    badge: 'Field Work',
    categoryColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 hover:border-teal-500/60',
  },
  {
    id: 'parts_ordered',
    label: 'Parts requisitioned',
    text: 'Required replacement parts or materials have been requisitioned. Work will resume upon arrival.',
    icon: 'inventory_2',
    badge: 'Procurement',
    categoryColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:border-indigo-500/60',
  },
];

interface QuickReplySectionProps {
  publicId: string;
  onReplySent: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const QuickReplySection: React.FC<QuickReplySectionProps> = ({
  publicId,
  onReplySent,
  disabled = false,
  className = '',
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [targetKind, setTargetKind] = useState<'PUBLIC_UPDATE' | 'INTERNAL_REMARK'>('PUBLIC_UPDATE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const handleSelectTemplate = (template: QuickReplyTemplate) => {
    setSelectedTemplateId(template.id);
    setMessage(template.text);
    setErrorFeedback(null);
  };

  const handleSendReply = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : message).trim();
    if (!textToSend || !publicId || disabled) return;

    setIsSubmitting(true);
    setErrorFeedback(null);

    try {
      await api.addRemark(publicId, targetKind, textToSend);

      const targetLabel = targetKind === 'PUBLIC_UPDATE' ? 'Student notified & published to timeline!' : 'Internal staff remark logged!';
      setSuccessFeedback(targetLabel);
      setMessage('');
      setSelectedTemplateId(null);

      await onReplySent();

      setTimeout(() => {
        setSuccessFeedback(null);
      }, 4000);
    } catch (err: any) {
      setErrorFeedback(err.message || 'Failed to dispatch reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickOneClickSend = async (template: QuickReplyTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTemplateId(template.id);
    setMessage(template.text);
    await handleSendReply(template.text);
  };

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container flex flex-col gap-3.5 transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">quickreply</span>
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-on-surface">Staff Quick Reply</h3>
            <p className="text-[11px] text-secondary">Predefined responses & direct student communication</p>
          </div>
        </div>

        {/* Mode Selector Toggle */}
        <div className="inline-flex p-0.5 rounded-lg bg-surface-container border border-surface-container-high text-[11px]">
          <button
            type="button"
            onClick={() => setTargetKind('PUBLIC_UPDATE')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              targetKind === 'PUBLIC_UPDATE'
                ? 'bg-surface-container-lowest text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-secondary hover:text-on-surface'
            }`}
            title="Visible to the student; sends a live notification"
          >
            <span className="material-symbols-outlined text-[13px]">visibility</span>
            <span>Public Update</span>
          </button>
          <button
            type="button"
            onClick={() => setTargetKind('INTERNAL_REMARK')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              targetKind === 'INTERNAL_REMARK'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-secondary hover:text-on-surface'
            }`}
            title="Private internal note for department & cell only"
          >
            <span className="material-symbols-outlined text-[13px]">lock</span>
            <span>Staff Only</span>
          </button>
        </div>
      </div>

      {/* Predefined Quick Reply Pills */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
          Predefined Templates (Click to fill, or ⚡ 1-click send)
        </span>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_QUICK_REPLIES.map((tpl) => {
            const isSelected = selectedTemplateId === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all cursor-pointer active:scale-98 select-none ${
                  tpl.categoryColor
                } ${
                  isSelected
                    ? 'ring-2 ring-primary shadow-xs font-bold'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tpl.icon}</span>
                <span>{tpl.label}</span>
                <button
                  type="button"
                  disabled={isSubmitting || disabled}
                  onClick={(e) => handleQuickOneClickSend(tpl, e)}
                  className="ml-1 px-1.5 py-0.5 rounded-md bg-on-surface/10 hover:bg-on-surface/20 text-[10px] font-bold tracking-wide opacity-80 hover:opacity-100 transition-all cursor-pointer disabled:opacity-40"
                  title={`Instantly send '${tpl.label}' now`}
                >
                  ⚡ Send
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback Messages */}
      {successFeedback && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-[12px] font-semibold flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">check_circle</span>
          <span>{successFeedback}</span>
        </div>
      )}

      {errorFeedback && (
        <div className="p-2.5 rounded-xl bg-error-container text-on-error-container text-[12px] flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[16px] text-error">error</span>
          <span>{errorFeedback}</span>
        </div>
      )}

      {/* Reply Composer Form */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            rows={2}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSelectedTemplateId(null);
            }}
            disabled={isSubmitting || disabled}
            placeholder={
              targetKind === 'PUBLIC_UPDATE'
                ? "Type a response or click a quick reply template above (Student will be notified)..."
                : "Type an internal staff remark or click a quick reply template above..."
            }
            className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] placeholder:text-outline border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
          />
          {message && (
            <button
              type="button"
              onClick={() => {
                setMessage('');
                setSelectedTemplateId(null);
              }}
              className="absolute top-2.5 right-2.5 text-secondary hover:text-on-surface text-[12px] cursor-pointer"
              title="Clear text"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-secondary">
            {targetKind === 'PUBLIC_UPDATE' ? (
              <>
                <span className="material-symbols-outlined text-[14px] text-emerald-600">notifications_active</span>
                <span>Visible to student on timeline & triggers device notification</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[14px] text-secondary">shield</span>
                <span>Private to department officers & Grievance Cell</span>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={isSubmitting || disabled || !message.trim()}
            onClick={() => handleSendReply()}
            className="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-semibold text-[13px] flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Send Quick Reply</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

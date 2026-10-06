import React, { useState } from 'react';
import { NotificationItem } from '../types';
import { api } from '../services/api';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onRefresh: () => void;
  onTrackComplaint: (publicId: string) => void;
  onReportClick: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onRefresh,
  onTrackComplaint,
  onReportClick,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showEmptyPreview, setShowEmptyPreview] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        await api.markNotificationRead(notif.id);
        onRefresh();
      } catch (err) {
        console.error(err);
      }
    }
    if (notif.public_id) {
      onTrackComplaint(notif.public_id);
    }
  };

  return (
    <div className="flex flex-col w-full pb-24 space-y-4 animate-fade-in">
      {/* Top Segmented Filter Tabs & Mark As Read */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="inline-flex p-1 bg-surface-container-high rounded-xl">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all min-h-[36px] flex items-center gap-1.5 ${
              filter === 'all'
                ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px]">
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all min-h-[36px] flex items-center gap-1.5 ${
              filter === 'unread'
                ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span>Unread</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                unreadCount > 0 ? 'bg-error-container text-error font-bold' : 'bg-surface-container text-secondary'
              }`}
            >
              {unreadCount}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-secondary hover:text-primary-container active:scale-95 transition-all text-[12px] font-medium"
        >
          <span className="material-symbols-outlined text-[16px]">done_all</span>
          <span>Mark all read</span>
        </button>
      </div>

      {/* Dynamic Notification Feed */}
      {!showEmptyPreview && (
        <div className="flex flex-col space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-secondary text-[13px] bg-surface-container-lowest rounded-xl border border-surface-container">
              No notifications in this tab.
            </div>
          ) : (
            filtered.map((notif) => {
              const isUnread = !notif.read;
              const msgLower = notif.message.toLowerCase();
              const isResolved = msgLower.includes('resolved');
              const isEscalated = msgLower.includes('escalated');
              const isInProgress = msgLower.includes('in progress');

              let iconName = 'notifications';
              let iconBg = 'bg-primary-fixed text-primary';
              if (isResolved) {
                iconName = 'check_circle';
                iconBg = 'bg-[#D1FAE5] text-[#065F46]';
              } else if (isEscalated) {
                iconName = 'warning';
                iconBg = 'bg-error-container text-error';
              } else if (isInProgress) {
                iconName = 'build';
                iconBg = 'bg-secondary-container text-primary-container';
              }

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`relative p-4 rounded-xl shadow-sm transition-all duration-200 active:scale-[0.99] flex gap-3.5 items-start cursor-pointer border ${
                    isUnread
                      ? 'bg-surface-container-lowest border-surface-container-high'
                      : 'bg-surface-container-lowest/80 border-surface-container opacity-90'
                  }`}
                >
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {iconName}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      {notif.display_no && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container text-[11px] font-semibold font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                          <span>{notif.display_no}</span>
                        </div>
                      )}
                      <span className="text-[11px] text-secondary">
                        {new Date(notif.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className={`text-[13px] leading-snug ${isUnread ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
                      {notif.message}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-secondary">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        <span>Hostel B / Campus</span>
                      </span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span className="text-primary font-semibold hover:underline">Track Live →</span>
                    </div>
                  </div>

                  {isUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-error shrink-0 mt-2"></div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Interactive Demo Switcher Banner */}
      <div className="pt-4 flex items-center justify-between border-t border-surface-container">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-secondary">visibility</span>
          <span className="text-[12px] font-semibold text-secondary">
            Empty State Preview (New Student Account):
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowEmptyPreview(!showEmptyPreview)}
          className="text-[11px] font-medium text-primary-container bg-surface-container px-2.5 py-1 rounded-md active:scale-95 transition-all"
        >
          {showEmptyPreview ? 'Show Notification Feed' : 'Toggle Empty View'}
        </button>
      </div>

      {/* Empty State View Card (Stitch Image 9) */}
      {showEmptyPreview && (
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-container flex flex-col items-center text-center transition-all animate-fade-in">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center text-secondary relative z-10 shadow-sm">
              <span className="material-symbols-outlined text-[36px] text-secondary">folder_open</span>
            </div>
            <div className="absolute -inset-2 rounded-full bg-surface-container-high/40 -z-0 animate-pulse"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container text-[12px] font-bold shadow-sm">
              <span className="material-symbols-outlined text-[14px]">chat_bubble_outline</span>
            </div>
          </div>

          <h3 className="text-[18px] font-semibold text-on-surface mb-1">No complaints yet.</h3>
          <p className="text-[13px] text-secondary max-w-[280px] mb-5 leading-relaxed">
            Your reported issues will appear here. If you encounter any maintenance or facility issue on campus, let us know.
          </p>

          <div className="w-full bg-surface-container-low rounded-xl p-3.5 mb-5 text-left flex flex-col space-y-2 border border-surface-container">
            <div className="flex items-center gap-2 text-secondary text-[12px]">
              <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
              <span>Automatic SLA dispatch within 2 hours</span>
            </div>
            <div className="flex items-center gap-2 text-secondary text-[12px]">
              <span className="material-symbols-outlined text-[16px] text-primary-container">near_me</span>
              <span>GPS tag for exact NMIET campus labs & hostels</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onReportClick}
            className="w-full h-12 bg-primary-container text-on-primary rounded-xl font-medium text-[15px] flex items-center justify-center gap-2 active:bg-primary transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Report an Issue</span>
          </button>
        </div>
      )}

      {/* Helpful Institutional Footer */}
      <div className="pt-2 text-center">
        <p className="text-[11px] text-secondary flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[14px]">info</span>
          <span>Auto-synchronized with College Grievance Desk</span>
        </p>
      </div>
    </div>
  );
};

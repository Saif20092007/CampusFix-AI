// Service Worker Notification Service
// Provides triggers for grievance status change alerts when app is in the background

export interface StatusNotificationPayload {
  public_id: string;
  display_no: string;
  summary: string;
  previousStatus: string;
  currentStatus: string;
  location?: string;
}

/**
 * Checks if browser supports Notifications and Service Worker notifications
 */
export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

/**
 * Gets current notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Requests browser permission for notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[SW Notification] Permission request failed:', err);
    return Notification.permission;
  }
}

/**
 * Determines whether the app is currently in the background
 */
export function isAppInBackground(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'hidden' || document.hidden;
}

/**
 * Formats status for student-facing display
 */
export function formatStatusLabel(status: string): string {
  const norm = (status || '').toUpperCase();
  if (norm === 'SUBMITTED' || norm === 'ASSIGNED') return 'Pending';
  if (norm === 'IN_PROGRESS' || norm === 'IN-PROGRESS') return 'In-Progress';
  if (norm === 'RESOLVED') return 'Resolved';
  if (norm === 'ESCALATED') return 'Escalated';
  return status;
}

/**
 * Checks if a status transition is from 'Pending' to 'In-Progress' or 'Resolved'
 */
export function isPendingToTargetTransition(
  previousStatus: string,
  currentStatus: string
): boolean {
  const prevNorm = (previousStatus || '').toUpperCase();
  const currNorm = (currentStatus || '').toUpperCase();

  const isPending =
    prevNorm === 'SUBMITTED' ||
    prevNorm === 'ASSIGNED' ||
    prevNorm === 'PENDING' ||
    prevNorm === 'OPEN';

  const isTarget =
    currNorm === 'IN_PROGRESS' ||
    currNorm === 'IN-PROGRESS' ||
    currNorm === 'RESOLVED';

  return isPending && isTarget;
}

/**
 * Triggers a Service Worker notification for a grievance status transition
 */
export async function triggerServiceWorkerNotification(
  payload: StatusNotificationPayload
): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('[SW Notification] Notifications not supported in this browser.');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.info('[SW Notification] Notification permission not granted.');
    return false;
  }

  const isResolved = (payload.currentStatus || '').toUpperCase() === 'RESOLVED';

  const title = isResolved
    ? `✅ Grievance Resolved: ${payload.display_no}`
    : `🛠️ Grievance In-Progress: ${payload.display_no}`;

  const body = isResolved
    ? `Your grievance regarding "${payload.summary}" has been successfully resolved. Tap to view details.`
    : `Technician has begun working on "${payload.summary}". Tap to track progress.`;

  const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    tag: `grievance-status-${payload.public_id}`,
    data: {
      public_id: payload.public_id,
      display_no: payload.display_no,
      status: payload.currentStatus,
      url: `/?ticket=${payload.public_id}`,
      timestamp: Date.now(),
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  let shown = false;

  // Primary: Use active Service Worker registration
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, notificationOptions);
        shown = true;
      }

      // Also post message to Service Worker controller/active instance
      const swTarget = navigator.serviceWorker.controller || registration.active;
      if (swTarget) {
        swTarget.postMessage({
          type: 'TRIGGER_STATUS_NOTIFICATION',
          payload: {
            title,
            body,
            public_id: payload.public_id,
            display_no: payload.display_no,
            status: payload.currentStatus,
          },
        });
      }
    }
  } catch (err) {
    console.warn('[SW Notification] Failed via serviceWorker.ready:', err);
  }

  // Fallback: standard Window Notification if SW registration did not succeed
  if (!shown) {
    try {
      new Notification(title, notificationOptions);
      shown = true;
    } catch (err) {
      console.warn('[SW Notification] Standard Notification fallback failed:', err);
    }
  }

  return shown;
}

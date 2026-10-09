import { useEffect, useRef, useState, useCallback } from 'react';
import { User, Grievance } from '../types';
import { api } from '../services/api';
import {
  triggerServiceWorkerNotification,
  isPendingToTargetTransition,
  isAppInBackground,
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationSupported,
} from '../services/swNotifications';

interface StatusRecord {
  status: string;
  display_no: string;
  summary: string;
}

export function useBackgroundGrievanceWatcher(
  user: User | null,
  onSelectGrievance?: (publicId: string) => void
) {
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [lastTriggeredTime, setLastTriggeredTime] = useState<number | null>(null);
  const [isTestPending, setIsTestPending] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  const knownStatusesRef = useRef<Record<string, StatusRecord>>({});
  const isInitializedRef = useRef(false);

  // Initialize status cache from sessionStorage
  useEffect(() => {
    if (!user || user.role !== 'STUDENT') {
      knownStatusesRef.current = {};
      isInitializedRef.current = false;
      return;
    }

    try {
      const stored = sessionStorage.getItem(`campusfix_known_statuses_${user.id}`);
      if (stored) {
        knownStatusesRef.current = JSON.parse(stored);
        isInitializedRef.current = true;
      }
    } catch {}
  }, [user]);

  // Listen for Service Worker messages (e.g. clicking notification to open grievance)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_GRIEVANCE_TICKET' && event.data.public_id) {
        if (onSelectGrievance) {
          onSelectGrievance(event.data.public_id);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [onSelectGrievance]);

  // Status check function
  const checkGrievanceStatuses = useCallback(async () => {
    if (!user || user.role !== 'STUDENT') return;

    try {
      const res = await api.getGrievances({ limit: 50 });
      const currentList: Grievance[] = res.items || [];

      // If this is the very first fetch and cache was empty, seed without notifying
      if (!isInitializedRef.current) {
        const initialMap: Record<string, StatusRecord> = {};
        for (const g of currentList) {
          initialMap[g.public_id] = {
            status: g.status,
            display_no: g.display_no,
            summary: g.summary,
          };
        }
        knownStatusesRef.current = initialMap;
        isInitializedRef.current = true;
        try {
          sessionStorage.setItem(
            `campusfix_known_statuses_${user.id}`,
            JSON.stringify(initialMap)
          );
        } catch {}
        return;
      }

      const inBackground = isAppInBackground();
      const updatedMap = { ...knownStatusesRef.current };

      for (const g of currentList) {
        const prev = knownStatusesRef.current[g.public_id];

        if (prev) {
          // Check for transition from 'Pending' (SUBMITTED/ASSIGNED) to 'In-Progress' or 'Resolved'
          if (isPendingToTargetTransition(prev.status, g.status)) {
            // Requirement: Trigger notification while app is in the background
            if (inBackground) {
              console.log(
                `[SW Notification] Status transition detected in background for ${g.display_no}: ${prev.status} -> ${g.status}`
              );
              triggerServiceWorkerNotification({
                public_id: g.public_id,
                display_no: g.display_no,
                summary: g.summary,
                previousStatus: prev.status,
                currentStatus: g.status,
                location: g.location,
              });
              setLastTriggeredTime(Date.now());
            }
          }
        }

        updatedMap[g.public_id] = {
          status: g.status,
          display_no: g.display_no,
          summary: g.summary,
        };
      }

      knownStatusesRef.current = updatedMap;
      try {
        sessionStorage.setItem(
          `campusfix_known_statuses_${user.id}`,
          JSON.stringify(updatedMap)
        );
      } catch {}
    } catch {
      // Ignore background fetch errors
    }
  }, [user]);

  // Periodic polling & visibility change listener
  useEffect(() => {
    if (!user || user.role !== 'STUDENT') return;

    // Initial check
    checkGrievanceStatuses();

    // Check on visibility change (when tab is hidden or shown)
    const handleVisibilityChange = () => {
      checkGrievanceStatuses();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic check interval (runs in background and foreground)
    const interval = setInterval(() => {
      checkGrievanceStatuses();
    }, 12000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [user, checkGrievanceStatuses]);

  // Ask for notification permission
  const enableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    return perm;
  };

  // Test simulation trigger
  const triggerTestBackgroundNotification = useCallback(
    async (targetStatus: 'IN_PROGRESS' | 'RESOLVED' = 'IN_PROGRESS') => {
      let currentPerm = permission;
      if (currentPerm !== 'granted') {
        currentPerm = await enableNotifications();
      }

      if (currentPerm !== 'granted') {
        alert('Please allow notification permissions in your browser to receive background alerts.');
        return;
      }

      setIsTestPending(true);
      let count = 4;
      setTestCountdown(count);

      const countdownTimer = setInterval(() => {
        count -= 1;
        setTestCountdown(count);
        if (count <= 0) {
          clearInterval(countdownTimer);
          setIsTestPending(false);
          setTestCountdown(null);

          // Find first grievance to use as demo ticket, or use sample
          const sample = Object.entries(knownStatusesRef.current)[0];
          const payload = sample
            ? {
                public_id: sample[0],
                display_no: sample[1].display_no,
                summary: sample[1].summary,
                previousStatus: 'SUBMITTED',
                currentStatus: targetStatus,
              }
            : {
                public_id: 'cf-demo-01',
                display_no: 'CF-00101',
                summary: 'Water dispenser leakage in Hostel B 2nd floor',
                previousStatus: 'SUBMITTED',
                currentStatus: targetStatus,
              };

          triggerServiceWorkerNotification(payload);
          setLastTriggeredTime(Date.now());
        }
      }, 1000);
    },
    [permission]
  );

  return {
    permission,
    isSupported: isNotificationSupported(),
    enableNotifications,
    lastTriggeredTime,
    isTestPending,
    testCountdown,
    triggerTestBackgroundNotification,
    checkGrievanceStatuses,
  };
}

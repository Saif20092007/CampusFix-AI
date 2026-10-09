// CampusFix AI - Service Worker Background Notification Handler
// Handles status change notifications and notificationclick navigation

self.addEventListener('message', (event) => {
  if (!event || !event.data) return;

  const { type, payload } = event.data;

  if (type === 'TRIGGER_STATUS_NOTIFICATION' || type === 'SHOW_STATUS_NOTIFICATION') {
    if (!payload) return;

    const {
      title = 'CampusFix AI Grievance Update',
      body = 'Your grievance status has been updated.',
      public_id,
      display_no,
      status,
      category,
    } = payload;

    const notificationOptions = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/icon.svg',
      tag: public_id ? `grievance-${public_id}` : `grievance-${Date.now()}`,
      data: {
        public_id,
        display_no,
        status,
        category,
        url: public_id ? `/?ticket=${public_id}` : '/',
        timestamp: Date.now(),
      },
      vibrate: [200, 100, 200],
      renotify: true,
      actions: [
        { action: 'view', title: 'View Ticket' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    if (self.registration && typeof self.registration.showNotification === 'function') {
      event.waitUntil(
        self.registration.showNotification(title, notificationOptions)
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notificationData = event.notification.data || {};
  const publicId = notificationData.public_id;
  const targetUrl = notificationData.url || (publicId ? `/?ticket=${publicId}` : '/');

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If an app window is already open, focus it and post a message to open the grievance
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (publicId && client.postMessage) {
              client.postMessage({
                type: 'OPEN_GRIEVANCE_TICKET',
                public_id: publicId,
              });
            }
            return;
          }
        }
        // If no window is currently open, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Notification dismissed by student
});

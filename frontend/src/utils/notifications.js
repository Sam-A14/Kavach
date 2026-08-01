// Register service worker and set up push notifications
export const setupNotifications = async () => {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('Notification permission denied');
    return false;
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }
  return true;
};

// Show a notification immediately
export const showNotification = (title, body, severity = 'medium') => {
  if (Notification.permission !== 'granted') return;

  const emoji =
    severity === 'critical' ? '🔴' :
    severity === 'high' ? '🟠' :
    severity === 'medium' ? '🟡' : '🟢';

  // Use service worker notification if available
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(`${emoji} KAVACH — ${title}`, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        requireInteraction: severity === 'critical',
        tag: Date.now().toString()
      });
    });
  } else {
    // Fallback to basic notification
    new Notification(`${emoji} KAVACH — ${title}`, {
      body: body,
      icon: '/favicon.ico',
      requireInteraction: severity === 'critical'
    });
  }
};
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const lastCriticalCount = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    setSupported(true);
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, [supported]);

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return;
    try {
      // Use service worker for notifications if available, fallback to new Notification
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: 'globenews-critical',
            requireInteraction: true,
            ...options,
          });
        });
      } else {
        new Notification(title, {
          icon: '/favicon.svg',
          ...options,
        });
      }
    } catch (e) {
      console.error('Notification error:', e);
    }
  }, [permission]);

  const notifyCritical = useCallback((count: number, latestTitle?: string) => {
    if (count <= 0) {
      lastCriticalCount.current = 0;
      return;
    }
    // Only notify when count increases
    if (count > lastCriticalCount.current) {
      const title = count === 1 ? '🚨 CRITICAL Alert' : `🚨 ${count} CRITICAL Alerts`;
      const body = latestTitle || 'New critical event detected on GlobeNews Live';
      notify(title, {
        body,
        requireInteraction: true,
        data: { url: window.location.href },
      });
    }
    lastCriticalCount.current = count;
  }, [notify]);

  return { supported, permission, requestPermission, notify, notifyCritical };
}

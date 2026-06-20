import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PermissionState);

    navigator.serviceWorker.ready.then((reg) => setSwRegistration(reg));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Push notifications are not supported on this device.');
      return false;
    }
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    if (result === 'granted') {
      toast.success('Notifications enabled! You\'ll get reminders about debts and payments.');
      return true;
    }
    toast.error('Notification permission denied. Enable it in your browser settings.');
    return false;
  }, []);

  /**
   * Show a local notification immediately via the SW
   */
  const showNotification = useCallback(async (title: string, body: string, tag = 'betabook', data: Record<string, string> = {}) => {
    if (Notification.permission !== 'granted') return;

    if (swRegistration) {
      await swRegistration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag,
        data,
        vibrate: [200, 100, 200],
      });
    } else {
      new Notification(title, { body, icon: '/icons/icon-192.png', tag });
    }
  }, [swRegistration]);

  /**
   * Schedule a debt reminder notification (fires after `delayMs`)
   */
  const scheduleDebtReminder = useCallback((customerName: string, amount: number, delayMs = 0) => {
    if (Notification.permission !== 'granted') return;
    setTimeout(() => {
      showNotification(
        '💰 Outstanding Debt Reminder',
        `${customerName} still owes you ₦${amount.toLocaleString()}. Tap to view and send a reminder.`,
        `debt-${customerName.toLowerCase().replace(/\s/g, '-')}`,
        { type: 'debt', customerName, amount: String(amount) }
      );
    }, delayMs);
  }, [showNotification]);

  return { permission, requestPermission, showNotification, scheduleDebtReminder };
}

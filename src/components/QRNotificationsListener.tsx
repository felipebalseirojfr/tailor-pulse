import { useQRScanNotifications } from "@/hooks/useQRScanNotifications";

/**
 * Mount-only component to run QR scan realtime notifications.
 * Isolated from Layout to avoid hook-order issues during rerenders/HMR.
 */
export function QRNotificationsListener() {
  useQRScanNotifications();
  return null;
}

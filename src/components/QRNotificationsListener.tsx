import { useQRScanNotifications } from "@/hooks/useQRScanNotifications";
import { useNavigate } from "react-router-dom";

/**
 * Mount-only component to run QR scan realtime notifications.
 * Isolated from Layout to avoid hook-order issues during rerenders/HMR.
 */
export function QRNotificationsListener() {
  const navigate = useNavigate();
  useQRScanNotifications({
    navigateToPedido: (pedidoId) => navigate(`/pedidos/${pedidoId}`),
  });
  return null;
}

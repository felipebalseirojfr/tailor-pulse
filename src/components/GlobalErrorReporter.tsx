import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Captura erros fora do React (Promise rejection / window error)
 * para evitar que o usuário fique sem feedback quando algo dá ruim.
 */
export function GlobalErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      console.error("[window.onerror]", event.error || event.message);
      toast.error("Erro inesperado", {
        description: String(event.error?.message || event.message || "Erro desconhecido"),
        duration: 8000,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[unhandledrejection]", event.reason);
      toast.error("Falha inesperada", {
        description: String((event.reason as any)?.message || event.reason || "Promise rejeitada"),
        duration: 8000,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

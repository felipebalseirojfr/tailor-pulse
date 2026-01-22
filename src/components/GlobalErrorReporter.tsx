import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Captura erros fora do React (Promise rejection / window error)
 * para evitar que o usuário fique sem feedback quando algo dá ruim.
 */
export function GlobalErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = String(event.error?.message || event.message || "");

      // Ruído comum do browser quando há muitos ResizeObservers (Radix/Charts/etc.).
      // Não é um crash do app e estava gerando spam de toasts e pânico de "tela branca".
      if (message.includes("ResizeObserver loop completed")) {
        // Mantém um log leve só para diagnóstico.
        console.debug("[window.onerror:ResizeObserver]", message);
        return;
      }

      console.error("[window.onerror]", event.error || event.message);
      toast.error("Erro inesperado", {
        description: message || "Erro desconhecido",
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

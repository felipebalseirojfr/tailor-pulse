import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NivelAlerta, calcularNivelAlerta } from "@/hooks/useAlertasAtraso";

interface AlertaAtrasoProps {
  status: string;
  dataTerminoPrevista: string | null;
  mostrarTexto?: boolean;
  size?: "sm" | "md";
}

export function AlertaAtrasoBadge({
  status,
  dataTerminoPrevista,
  mostrarTexto = true,
  size = "sm",
}: AlertaAtrasoProps) {
  const { nivel, diasRestantes } = calcularNivelAlerta(status, dataTerminoPrevista);

  if (nivel === "ok" || nivel === "pendente") return null;

  const config = {
    atrasado: {
      icon: <AlertTriangle className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />,
      label: diasRestantes !== null ? `Atrasado ${Math.abs(diasRestantes)}d` : "Atrasado",
      className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
    },
    risco: {
      icon: <Clock className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />,
      label: diasRestantes === 0 ? "Vence hoje" : diasRestantes === 1 ? "Vence amanhã" : `${diasRestantes}d restantes`,
      className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
    },
  };

  const c = config[nivel as "atrasado" | "risco"];

  return (
    <Badge
      variant="outline"
      className={`gap-1 font-medium ${c.className} ${
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"
      }`}
    >
      {c.icon}
      {mostrarTexto && c.label}
    </Badge>
  );
}

export function AlertaAtrasoIndicador({
  status,
  dataTerminoPrevista,
}: {
  status: string;
  dataTerminoPrevista: string | null;
}) {
  const { nivel } = calcularNivelAlerta(status, dataTerminoPrevista);

  const cores: Record<NivelAlerta, string> = {
    atrasado: "bg-red-500",
    risco: "bg-amber-400",
    ok: "bg-green-500",
    pendente: "bg-gray-300",
  };

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${cores[nivel]}`}
      title={
        nivel === "atrasado" ? "Atrasado" :
        nivel === "risco" ? "Risco de atraso" :
        nivel === "ok" ? "No prazo" : "Sem prazo definido"
      }
    />
  );
}

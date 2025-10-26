import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Phone, Mail, FileText, ChevronRight } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  contato: string | null;
  status_geral: string;
  total_pedidos_ativos: number;
  observacoes_gerais: string | null;
}

interface ClienteCardProps {
  cliente: Cliente;
  onClick: () => void;
}

const statusColors = {
  ativo: "bg-green-500/10 text-green-600 border-green-500/20",
  sem_pedidos: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  pausado: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

const statusLabels = {
  ativo: "Ativo",
  sem_pedidos: "Sem Pedidos",
  pausado: "Pausado",
};

export default function ClienteCard({ cliente, onClick }: ClienteCardProps) {
  return (
    <Card
      className="p-6 hover:shadow-executive-hover transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
              {cliente.nome}
            </h3>
            <p className="text-sm text-muted-foreground">
              {cliente.contato || "Sem contato"}
            </p>
          </div>
        </div>
        <Badge className={statusColors[cliente.status_geral as keyof typeof statusColors] || statusColors.sem_pedidos}>
          {statusLabels[cliente.status_geral as keyof typeof statusLabels] || "Sem Pedidos"}
        </Badge>
      </div>

      <div className="space-y-2 mb-4">
        {cliente.telefone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            {cliente.telefone}
          </div>
        )}
        {cliente.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            {cliente.email}
          </div>
        )}
        {cliente.observacoes_gerais && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mt-0.5" />
            <span className="line-clamp-2">{cliente.observacoes_gerais}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm">
          <span className="text-muted-foreground">Pedidos ativos: </span>
          <span className="font-semibold text-lg">{cliente.total_pedidos_ativos}</span>
        </div>
        <Button variant="ghost" size="sm" className="group-hover:bg-primary/10">
          Ver Pedidos
          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </Card>
  );
}

import { useState, useMemo } from "react";
import { Wallet, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarteiraFilters, FiltrosCarteira } from "@/components/carteira/CarteiraFilters";
import { CarteiraResumoMes } from "@/components/carteira/CarteiraResumoMes";
import { CarteiraTabelaMensal } from "@/components/carteira/CarteiraTabelaMensal";
import { CarteiraListaPedidos } from "@/components/carteira/CarteiraListaPedidos";
import { CapacidadeConfigModal } from "@/components/dashboard/CapacidadeConfigModal";
import { useCarteiraDados } from "@/hooks/useCarteiraDados";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CarteiraPedidos() {
  const [mesSelecionado, setMesSelecionado] = useState<string>(format(new Date(), "yyyy-MM"));
  const [tipoVisao, setTipoVisao] = useState<"entrega" | "faturamento">("entrega");
  const [usarPonderado, setUsarPonderado] = useState(false);
  const [modalCapacidadeOpen, setModalCapacidadeOpen] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosCarteira>({
    status: [],
    cliente: "",
    responsavel: "",
    prioridade: "",
  });

  const { 
    ocupacoesMensais, 
    pedidosFiltrados, 
    clientes,
    loading, 
    refetch 
  } = useCarteiraDados(tipoVisao, filtros, usarPonderado);

  const ocupacaoMesSelecionado = useMemo(() => {
    return ocupacoesMensais.find(o => o.mes === mesSelecionado);
  }, [ocupacoesMensais, mesSelecionado]);

  const pedidosAgrupadosPorMes = useMemo(() => {
    const grupos = new Map<string, typeof pedidosFiltrados>();
    
    pedidosFiltrados.forEach(pedido => {
      const dataPedido = tipoVisao === "entrega" 
        ? pedido.prazo_final 
        : (pedido.data_faturamento_prevista || pedido.mes_faturamento_previsto);
      
      if (!dataPedido) return;
      
      const mes = dataPedido.length === 7 
        ? dataPedido 
        : format(new Date(dataPedido), "yyyy-MM");
      
      if (!grupos.has(mes)) {
        grupos.set(mes, []);
      }
      grupos.get(mes)!.push(pedido);
    });
    
    // Ordenar por mês cronologicamente
    return new Map([...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [pedidosFiltrados, tipoVisao]);

  const formatarMes = (mes: string): string => {
    try {
      const data = parse(mes, "yyyy-MM", new Date());
      return format(data, "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return mes;
    }
  };

  const handleExportCSV = () => {
    // Exportar tabela mensal
    const headers = ["Mês", "Pedidos", "Peças", "Receita", "Capacidade", "Disponível", "Ocupação %"];
    const rows = ocupacoesMensais.map(o => [
      o.mes,
      o.totalPedidos,
      o.totalPecas,
      o.receitaPrevista?.toFixed(2) || "0",
      o.capacidade || "N/A",
      o.disponivel || "N/A",
      o.ocupacao?.toFixed(1) || "N/A"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `carteira-pedidos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            Carteira de Pedidos
          </h1>
          <p className="text-muted-foreground">
            Visão macro de capacidade produtiva e demanda por mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setModalCapacidadeOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Capacidade
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <CarteiraFilters
        tipoVisao={tipoVisao}
        onTipoVisaoChange={setTipoVisao}
        usarPonderado={usarPonderado}
        onUsarPonderadoChange={setUsarPonderado}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        clientes={clientes}
      />

      {/* Resumo do Mês Selecionado */}
      <CarteiraResumoMes
        mes={mesSelecionado}
        mesFormatado={formatarMes(mesSelecionado)}
        ocupacao={ocupacaoMesSelecionado}
        usarPonderado={usarPonderado}
        onEditCapacidade={() => setModalCapacidadeOpen(true)}
      />

      {/* Tabela Macro por Mês */}
      <CarteiraTabelaMensal
        ocupacoes={ocupacoesMensais}
        mesSelecionado={mesSelecionado}
        onMesSelect={setMesSelecionado}
        usarPonderado={usarPonderado}
      />

      {/* Lista de Pedidos por Mês */}
      <div className="space-y-4">
        {Array.from(pedidosAgrupadosPorMes.entries()).map(([mes, pedidos]) => (
          <CarteiraListaPedidos
            key={mes}
            pedidos={pedidos}
            mesFormatado={formatarMes(mes)}
            tipoVisao={tipoVisao}
            defaultOpen={mes === mesSelecionado}
          />
        ))}
      </div>

      {/* Modal de Capacidade */}
      <CapacidadeConfigModal
        open={modalCapacidadeOpen}
        onOpenChange={setModalCapacidadeOpen}
        onSave={refetch}
        ocupacoes={ocupacoesMensais.map(o => ({
          mes: o.mes,
          demanda: o.totalPecas,
          capacidade: o.capacidade,
          ocupacao: o.ocupacao,
          disponivel: o.disponivel,
          nivel: o.nivel
        }))}
      />
    </div>
  );
}

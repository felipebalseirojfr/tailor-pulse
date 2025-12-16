import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, FileText, Loader2, Receipt, CheckCircle2, ClipboardCheck, FileCheck, Truck, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Fechamento {
  id: string;
  pedido_id: string;
  lote_of: string;
  referencia_id: string | null;
  status: string;
  status_nf: string | null;
  numero_nf: string | null;
  updated_at: string;
  pedidos: {
    codigo_pedido: string;
    produto_modelo: string;
    quantidade_total: number;
    grade_tamanhos: any;
    status_geral: string;
    preco_venda: number | null;
    composicao_tecido: string | null;
    clientes: {
      nome: string;
    };
  };
  referencias: {
    codigo_referencia: string;
  } | null;
}

type TabType = "fechamento" | "emissao_nf" | "entrega";

const Fechamentos = () => {
  const navigate = useNavigate();
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("fechamento");
  const [searchPedido, setSearchPedido] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [searchLote, setSearchLote] = useState("");

  // Estados para seleção múltipla
  const [selectedFechamentos, setSelectedFechamentos] = useState<string[]>([]);
  const [showNfModal, setShowNfModal] = useState(false);
  
  // Estados do formulário de NF em lote
  const [nfNumero, setNfNumero] = useState("");
  const [nfData, setNfData] = useState("");
  const [nfValor, setNfValor] = useState("");
  const [nfXmlUrl, setNfXmlUrl] = useState("");
  const [uploadingXml, setUploadingXml] = useState(false);
  const [emitindoNf, setEmitindoNf] = useState(false);

  useEffect(() => {
    fetchFechamentos();
  }, []);

  // Limpar seleção ao mudar de aba
  useEffect(() => {
    setSelectedFechamentos([]);
  }, [activeTab]);

  const fetchFechamentos = async () => {
    try {
      const { data, error } = await supabase
        .from("fechamentos")
        .select(`
          *,
          pedidos!inner(codigo_pedido, produto_modelo, quantidade_total, grade_tamanhos, status_geral, preco_venda, composicao_tecido, clientes!inner(nome)),
          referencias(codigo_referencia)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setFechamentos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar fechamentos:", error);
      toast.error("Erro ao carregar fechamentos");
    } finally {
      setLoading(false);
    }
  };

  // Determinar qual aba o fechamento pertence
  const getTabForFechamento = (f: Fechamento): TabType => {
    if (f.status_nf === "emitida") {
      return "entrega";
    }
    if (f.status === "em_conferencia" || f.status === "fechado") {
      return "emissao_nf";
    }
    return "fechamento";
  };

  // Contadores por aba
  const getTabCounts = () => {
    const counts = { fechamento: 0, emissao_nf: 0, entrega: 0 };
    fechamentos.forEach((f) => {
      const tab = getTabForFechamento(f);
      counts[tab]++;
    });
    return counts;
  };

  const tabCounts = getTabCounts();

  // Filtrar por aba ativa e busca
  const filteredFechamentos = fechamentos.filter((f) => {
    const tab = getTabForFechamento(f);
    if (tab !== activeTab) return false;
    
    const matchPedido = !searchPedido || f.pedidos.codigo_pedido.toLowerCase().includes(searchPedido.toLowerCase());
    const matchCliente = !searchCliente || f.pedidos.clientes.nome.toLowerCase().includes(searchCliente.toLowerCase());
    const matchLote = !searchLote || f.lote_of.toLowerCase().includes(searchLote.toLowerCase());
    
    return matchPedido && matchCliente && matchLote;
  });

  const getStatusConfig = (status: string, statusNf: string | null) => {
    if (statusNf === "emitida") {
      return { 
        color: "text-blue-600", 
        bgColor: "bg-blue-100 border-blue-300", 
        label: "Pronto para Entrega",
        icon: "📦"
      };
    }
    if (status === "em_conferencia" || status === "fechado") {
      return { 
        color: "text-yellow-600", 
        bgColor: "bg-yellow-100 border-yellow-300", 
        label: "Aguardando NF",
        icon: "📄"
      };
    }
    return { 
      color: "text-red-600", 
      bgColor: "bg-red-100 border-red-300", 
      label: "Aguardando Conferência",
      icon: "🔴"
    };
  };

  // Funções de seleção múltipla
  const toggleSelection = (id: string) => {
    setSelectedFechamentos(prev => 
      prev.includes(id) 
        ? prev.filter(fId => fId !== id) 
        : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedFechamentos([]);
  };

  const getSelectedFechamentosData = () => {
    return fechamentos.filter(f => selectedFechamentos.includes(f.id));
  };

  const getTotalPecas = () => {
    return getSelectedFechamentosData().reduce((sum, f) => sum + f.pedidos.quantidade_total, 0);
  };

  const getValorTotalEstimado = () => {
    return getSelectedFechamentosData().reduce((sum, f) => {
      const preco = f.pedidos.preco_venda || 0;
      return sum + (preco * f.pedidos.quantidade_total);
    }, 0);
  };

  // Upload do XML
  const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
      toast.error("Por favor, selecione um arquivo XML");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setUploadingXml(true);
    try {
      const fileName = `nf-lote-${Date.now()}.xml`;
      const filePath = `fechamentos/xml/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("pedidos-arquivos")
        .upload(filePath, file, {
          contentType: 'application/xml'
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("pedidos-arquivos")
        .getPublicUrl(filePath);

      setNfXmlUrl(urlData.publicUrl);
      toast.success("Arquivo XML anexado!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao anexar arquivo XML");
    } finally {
      setUploadingXml(false);
    }
  };

  // Emitir NF em lote
  const handleEmitirNfLote = async () => {
    if (!nfNumero || !nfData || !nfValor || !nfXmlUrl) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setEmitindoNf(true);
    try {
      // Atualizar todos os fechamentos selecionados
      const { error } = await supabase
        .from("fechamentos")
        .update({
          status: "fechado",
          status_nf: "emitida",
          numero_nf: nfNumero,
          data_emissao_nf: nfData,
          valor_total_nf: parseFloat(nfValor),
          link_arquivo_nf: nfXmlUrl,
          updated_at: new Date().toISOString()
        })
        .in("id", selectedFechamentos);

      if (error) throw error;

      toast.success(`NF ${nfNumero} emitida para ${selectedFechamentos.length} referência(s)!`);
      
      // Limpar estados
      setShowNfModal(false);
      setSelectedFechamentos([]);
      setNfNumero("");
      setNfData("");
      setNfValor("");
      setNfXmlUrl("");
      
      // Recarregar dados
      await fetchFechamentos();
    } catch (error) {
      console.error("Erro ao emitir NF em lote:", error);
      toast.error("Erro ao emitir NF");
    } finally {
      setEmitindoNf(false);
    }
  };

  const openNfModal = () => {
    // Pré-preencher valor estimado
    setNfValor(getValorTotalEstimado().toFixed(2));
    setNfData(format(new Date(), "yyyy-MM-dd"));
    setShowNfModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fechamento de Produção</h1>
        <p className="text-muted-foreground">Gerencie o fechamento, emissão de NF e entregas</p>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger 
            value="fechamento" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-red-100 data-[state=active]:text-red-700"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">FECHAMENTO</span>
            {tabCounts.fechamento > 0 && (
              <Badge variant="secondary" className="ml-1 bg-red-200 text-red-700">
                {tabCounts.fechamento}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="emissao_nf" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700"
          >
            <Receipt className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">EMISSÃO DE NF</span>
            {tabCounts.emissao_nf > 0 && (
              <Badge variant="secondary" className="ml-1 bg-yellow-200 text-yellow-700">
                {tabCounts.emissao_nf}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="entrega" 
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
          >
            <Truck className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">ENTREGA</span>
            {tabCounts.entrega > 0 && (
              <Badge variant="secondary" className="ml-1 bg-blue-200 text-blue-700">
                {tabCounts.entrega}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Descrição da aba */}
        <div className="mt-4 p-4 rounded-md bg-muted/50">
          {activeTab === "fechamento" && (
            <p className="text-sm text-muted-foreground">
              <strong>Conferência de quantidades:</strong> Atualize as quantidades produzidas, anexe fotos do caderno e clique em "CONFERIDO" para avançar.
            </p>
          )}
          {activeTab === "emissao_nf" && (
            <p className="text-sm text-muted-foreground">
              <strong>Emissão de Nota Fiscal:</strong> Selecione uma ou mais referências para emitir uma única NF. Use os checkboxes para seleção múltipla.
            </p>
          )}
          {activeTab === "entrega" && (
            <p className="text-sm text-muted-foreground">
              <strong>Pronto para Entrega:</strong> Pedidos com NF emitida aguardando entrega ao cliente.
            </p>
          )}
        </div>

        {/* Filtros */}
        <Card className="mt-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pedido..."
                  value={searchPedido}
                  onChange={(e) => setSearchPedido(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por lote/OF..."
                  value={searchLote}
                  onChange={(e) => setSearchLote(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo das Tabs */}
        <TabsContent value={activeTab} className="mt-4">
          {filteredFechamentos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum item nesta fase</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {activeTab === "fechamento" && "Os pedidos concluídos aparecerão aqui para conferência."}
                  {activeTab === "emissao_nf" && "Os pedidos conferidos aparecerão aqui para emissão de NF."}
                  {activeTab === "entrega" && "Os pedidos com NF emitida aparecerão aqui."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredFechamentos.map((fechamento) => {
                const statusConfig = getStatusConfig(fechamento.status, fechamento.status_nf);
                const isFaturado = fechamento.pedidos.status_geral === "faturado";
                const isSelected = selectedFechamentos.includes(fechamento.id);
                
                return (
                  <Card
                    key={fechamento.id}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border bg-card ${
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          {/* Checkbox para seleção múltipla na aba emissao_nf */}
                          {activeTab === "emissao_nf" && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(fechamento.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1"
                            />
                          )}
                          <span className="text-2xl mt-0.5">{statusConfig.icon}</span>
                          <div 
                            className="flex-1"
                            onClick={() => navigate(`/pcp/fechamentos/${fechamento.id}`)}
                          >
                            <CardTitle className="text-base mb-1 flex items-center gap-2">
                              {fechamento.pedidos.produto_modelo}
                              {isFaturado && (
                                <Badge variant="default" className="bg-blue-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Faturado
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground font-medium">
                              {fechamento.pedidos.clientes.nome}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Lote/OF: {fechamento.lote_of}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`${statusConfig.color} text-xs`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent onClick={() => navigate(`/pcp/fechamentos/${fechamento.id}`)}>
                      <div className="space-y-2 text-sm">
                        <div className="bg-background/50 rounded-lg p-3 space-y-2 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Pedido:</span>
                            <span className="font-semibold">{fechamento.pedidos.codigo_pedido}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Quantidade:</span>
                            <span className="font-semibold">{fechamento.pedidos.quantidade_total} un</span>
                          </div>
                          {fechamento.numero_nf && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">NF:</span>
                              <span className="font-semibold">{fechamento.numero_nf}</span>
                            </div>
                          )}
                          {fechamento.pedidos.preco_venda && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Preço Unit.:</span>
                              <span className="font-semibold">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fechamento.pedidos.preco_venda)}
                              </span>
                            </div>
                          )}
                        </div>
                        {fechamento.referencias && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Ref:</span> {fechamento.referencias.codigo_referencia}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          <span className="font-medium">Atualizado:</span>{" "}
                          {format(new Date(fechamento.updated_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <Button variant="ghost" className="w-full mt-4">
                        {activeTab === "fechamento" && "Conferir"}
                        {activeTab === "emissao_nf" && "Emitir NF"}
                        {activeTab === "entrega" && "Ver Detalhes"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Barra de ações flutuante para seleção múltipla */}
      {selectedFechamentos.length > 0 && activeTab === "emissao_nf" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Card className="shadow-xl border-2 border-primary bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    {selectedFechamentos.length} selecionado(s)
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getTotalPecas()} peças
                  </span>
                  <span className="text-sm font-medium">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(getValorTotalEstimado())}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                  <Button
                    size="sm"
                    onClick={openNfModal}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Emitir NF em Lote
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Emissão de NF em Lote */}
      <Dialog open={showNfModal} onOpenChange={setShowNfModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Emitir NF para {selectedFechamentos.length} Referência(s)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumo das referências */}
            <div className="bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto">
              <p className="text-sm font-medium mb-2">Referências selecionadas:</p>
              <div className="space-y-1">
                {getSelectedFechamentosData().map((f) => (
                  <div key={f.id} className="text-sm flex justify-between">
                    <span>{f.pedidos.produto_modelo} - {f.pedidos.clientes.nome}</span>
                    <span className="text-muted-foreground">{f.pedidos.quantidade_total} un</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                <span>Total:</span>
                <span>{getTotalPecas()} peças</span>
              </div>
            </div>

            {/* Formulário da NF */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nf_numero">
                    Número da NF <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nf_numero"
                    value={nfNumero}
                    onChange={(e) => setNfNumero(e.target.value)}
                    placeholder="000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nf_data">
                    Data de Emissão <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nf_data"
                    type="date"
                    value={nfData}
                    onChange={(e) => setNfData(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nf_valor">
                  Valor Total da NF (R$) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nf_valor"
                  type="number"
                  step="0.01"
                  value={nfValor}
                  onChange={(e) => setNfValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nf_xml">
                  Arquivo XML da NF <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="nf_xml"
                    type="file"
                    accept=".xml"
                    onChange={handleXmlUpload}
                    disabled={uploadingXml}
                    className="flex-1"
                  />
                  {uploadingXml && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {nfXmlUrl && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
                    <FileCheck className="h-4 w-4" />
                    <span>Arquivo XML anexado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNfModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEmitirNfLote} disabled={emitindoNf}>
              {emitindoNf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Emitindo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Emitir NF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fechamentos;

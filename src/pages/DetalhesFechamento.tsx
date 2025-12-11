import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Upload, Save, Send, Loader2, AlertTriangle, Receipt, FileCheck, CheckCircle2, ExternalLink, Truck, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FechamentoItem {
  id: string;
  sku: string;
  modelo: string;
  cor: string;
  tamanho: string;
  saldo_a_fechar: number;
  caixas: number;
  unidades: number;
  total_calculado: number;
}

interface Fechamento {
  id: string;
  pedido_id: string;
  lote_of: string;
  status: string;
  foto_caderno_url: string | null;
  observacoes: string | null;
  numero_nf: string | null;
  data_emissao_nf: string | null;
  valor_total_nf: number | null;
  status_nf: string | null;
  link_arquivo_nf: string | null;
  pedidos: {
    codigo_pedido: string;
    produto_modelo: string;
    grade_tamanhos: any;
    quantidade_total: number;
    preco_venda: number | null;
    composicao_tecido: string | null;
    status_geral: string;
    clientes: {
      nome: string;
    };
  };
  referencias: {
    codigo_referencia: string;
  } | null;
}

type PhaseType = "fechamento" | "emissao_nf" | "entrega";

const DetalhesFechamento = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [itens, setItens] = useState<FechamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  
  // Campos de NF
  const [numeroNf, setNumeroNf] = useState("");
  const [dataEmissaoNf, setDataEmissaoNf] = useState("");
  const [valorTotalNf, setValorTotalNf] = useState("");
  const [linkArquivoNf, setLinkArquivoNf] = useState("");

  useEffect(() => {
    if (id) {
      fetchFechamento();
      fetchItens();
    }
  }, [id]);

  // Auto-save a cada 10 segundos para fase de fechamento
  useEffect(() => {
    const timer = setInterval(() => {
      if (fechamento?.status === "em_aberto") {
        handleSaveRascunho(true);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [itens, observacoes, fechamento]);

  const fetchFechamento = async () => {
    try {
      const { data, error } = await supabase
        .from("fechamentos")
        .select(`
          *,
          pedidos!inner(codigo_pedido, produto_modelo, grade_tamanhos, quantidade_total, preco_venda, composicao_tecido, status_geral, clientes!inner(nome)),
          referencias(codigo_referencia)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setFechamento(data);
      setObservacoes(data.observacoes || "");
      setNumeroNf(data.numero_nf || "");
      setDataEmissaoNf(data.data_emissao_nf || "");
      setValorTotalNf(data.valor_total_nf?.toString() || "");
      setLinkArquivoNf(data.link_arquivo_nf || "");
    } catch (error: any) {
      console.error("Erro ao buscar fechamento:", error);
      toast.error("Erro ao carregar fechamento");
    } finally {
      setLoading(false);
    }
  };

  const fetchItens = async () => {
    try {
      const { data, error } = await supabase
        .from("fechamento_itens")
        .select("*")
        .eq("fechamento_id", id);

      if (error) throw error;
      setItens(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar itens:", error);
      toast.error("Erro ao carregar itens");
    }
  };

  // Determinar fase atual
  const getCurrentPhase = (): PhaseType => {
    if (!fechamento) return "fechamento";
    if (fechamento.status_nf === "emitida") return "entrega";
    if (fechamento.status === "em_conferencia" || fechamento.status === "fechado") return "emissao_nf";
    return "fechamento";
  };

  const currentPhase = getCurrentPhase();

  // Lista completa de tamanhos disponíveis
  const TODOS_TAMANHOS = ["1", "2", "4", "6", "8", "10", "12", "14", "PP", "P", "M", "G", "GG", "XGG", "XGG1", "XGG2", "XGG3"];

  // Verificar se a grade do pedido está vazia ou zerada
  const gradeVaziaOuZerada = () => {
    const grade = fechamento?.pedidos.grade_tamanhos as Record<string, number> | null;
    if (!grade) return true;
    const tamanhos = Object.keys(grade);
    if (tamanhos.length === 0) return true;
    return tamanhos.every(t => (grade[t] || 0) === 0);
  };

  // Agregar itens duplicados por tamanho
  const getItensAgregados = (): Record<string, number> => {
    const agregado: Record<string, number> = {};
    itens.forEach(item => {
      if (item.unidades > 0) {
        agregado[item.tamanho] = (agregado[item.tamanho] || 0) + item.unidades;
      }
    });
    return agregado;
  };

  const handleItemChange = async (tamanho: string, value: string) => {
    const numValue = parseInt(value) || 0;
    
    // Buscar TODOS os itens deste tamanho (pode haver duplicados)
    const itensDoTamanho = itens.filter(i => i.tamanho === tamanho);
    
    if (itensDoTamanho.length > 0) {
      // Atualizar apenas o primeiro item e zerar os outros (consolidar)
      const primeiroItem = itensDoTamanho[0];
      setItens((prev) =>
        prev.map((item) => {
          if (item.tamanho === tamanho) {
            if (item.id === primeiroItem.id) {
              return { ...item, unidades: numValue, caixas: numValue > 0 ? 1 : 0 };
            }
            // Zerar itens duplicados
            return { ...item, unidades: 0, caixas: 0 };
          }
          return item;
        })
      );
    } else if (numValue > 0 && fechamento) {
      // Verificar novamente no banco para evitar duplicados por race condition
      const { data: existente } = await supabase
        .from("fechamento_itens")
        .select("*")
        .eq("fechamento_id", fechamento.id)
        .eq("tamanho", tamanho)
        .maybeSingle();

      if (existente) {
        // Item já existe no banco, atualizar ao invés de criar
        const { error } = await supabase
          .from("fechamento_itens")
          .update({ unidades: numValue, caixas: 1 })
          .eq("id", existente.id);
        
        if (error) {
          console.error("Erro ao atualizar item:", error);
          toast.error("Erro ao atualizar tamanho");
          return;
        }
        setItens(prev => [...prev, { ...existente, unidades: numValue, caixas: 1 } as FechamentoItem]);
      } else {
        // Criar novo item no banco
        try {
          const { data, error } = await supabase
            .from("fechamento_itens")
            .insert({
              fechamento_id: fechamento.id,
              sku: fechamento.pedidos.codigo_pedido || "SEM-SKU",
              modelo: fechamento.pedidos.produto_modelo,
              cor: "Padrão",
              tamanho: tamanho,
              saldo_a_fechar: 0,
              caixas: 1,
              unidades: numValue
            })
            .select()
            .single();

          if (error) throw error;
          
          // Adicionar o novo item ao estado
          setItens(prev => [...prev, data as FechamentoItem]);
        } catch (error) {
          console.error("Erro ao criar item:", error);
          toast.error("Erro ao adicionar tamanho");
        }
      }
    }
  };

  const validateItem = (item: FechamentoItem) => {
    if (item.unidades === 0) return "empty";
    if (item.unidades > item.saldo_a_fechar) return "exceed";
    return "valid";
  };

  const getTotalPlanejado = () => {
    // Se a grade está vazia, usa quantidade_total do pedido
    if (gradeVaziaOuZerada()) {
      return fechamento?.pedidos.quantidade_total || 0;
    }
    return itens.reduce((sum, item) => sum + item.saldo_a_fechar, 0);
  };
  const getTotalFechado = () => itens.reduce((sum, item) => sum + item.unidades, 0);

  const getPercentageDiff = () => {
    const planejado = getTotalPlanejado();
    const fechado = getTotalFechado();
    if (planejado === 0) return "0";
    return ((fechado / planejado) * 100).toFixed(1);
  };

  // Verificar se quantidade contada bate com esperada (para grade vazia)
  const quantidadesBatem = () => {
    const totalFechado = getTotalFechado();
    const totalEsperado = fechamento?.pedidos.quantidade_total || 0;
    return totalFechado === totalEsperado;
  };

  const getValidationStatus = () => {
    // Se a grade está vazia, comparar com quantidade_total do pedido
    if (gradeVaziaOuZerada()) {
      const totalFechado = getTotalFechado();
      const totalEsperado = fechamento?.pedidos.quantidade_total || 0;
      if (totalFechado === 0) return { type: "empty", message: "Preencha ao menos um tamanho" };
      if (totalFechado === totalEsperado) return { type: "valid", message: `✅ Quantidade confere: ${totalFechado}/${totalEsperado}` };
      return { type: "divergent", message: `❌ Divergência: contado ${totalFechado} / esperado ${totalEsperado}` };
    }
    
    // Comportamento original para grade preenchida
    const percentage = parseFloat(getPercentageDiff());
    const hasEmpty = itens.some(item => item.unidades === 0);
    if (hasEmpty) return { type: "empty", message: "Preencha todos os tamanhos" };
    if (percentage > 110) return { type: "exceed", message: "⚠️ Quantidade acima do planejado" };
    if (percentage < 90) return { type: "loss", message: "⚠️ Possível perda na produção" };
    return { type: "valid", message: "✅ Quantidades dentro do esperado" };
  };

  const canSendToConferencia = () => {
    const validation = getValidationStatus();
    return validation.type === "valid" || validation.type === "loss" || validation.type === "exceed" || validation.type === "divergent";
  };

  // Validação para emitir NF
  const canEmitirNf = () => {
    return numeroNf.trim() !== "" && 
           dataEmissaoNf !== "" && 
           valorTotalNf.trim() !== "" && 
           linkArquivoNf.trim() !== "";
  };

  const getPhaseConfig = () => {
    switch (currentPhase) {
      case "fechamento":
        return { 
          color: "text-red-600", 
          bgColor: "bg-red-100 border-red-300", 
          label: "FECHAMENTO",
          icon: "🔴",
          description: "Conferência de quantidades produzidas"
        };
      case "emissao_nf":
        return { 
          color: "text-yellow-600", 
          bgColor: "bg-yellow-100 border-yellow-300", 
          label: "EMISSÃO DE NF",
          icon: "📄",
          description: "Aguardando emissão da Nota Fiscal"
        };
      case "entrega":
        return { 
          color: "text-blue-600", 
          bgColor: "bg-blue-100 border-blue-300", 
          label: "ENTREGA",
          icon: "📦",
          description: "Pronto para entrega ao cliente"
        };
    }
  };

  const phaseConfig = getPhaseConfig();

  const handleSaveRascunho = async (isAutoSave = false) => {
    setSaving(true);
    try {
      const { error: fechError } = await supabase
        .from("fechamentos")
        .update({ 
          observacoes,
          numero_nf: numeroNf || null,
          data_emissao_nf: dataEmissaoNf || null,
          valor_total_nf: valorTotalNf ? parseFloat(valorTotalNf) : null,
          link_arquivo_nf: linkArquivoNf || null
        })
        .eq("id", id);

      if (fechError) throw fechError;

      for (const item of itens) {
        const { error: itemError } = await supabase
          .from("fechamento_itens")
          .update({ unidades: item.unidades })
          .eq("id", item.id);

        if (itemError) throw itemError;
      }

      if (!isAutoSave) {
        toast.success("Dados salvos com sucesso!");
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      if (!isAutoSave) {
        toast.error("Erro ao salvar dados");
      }
    } finally {
      setSaving(false);
    }
  };

  // Fase 1: Conferido - muda de em_aberto para em_conferencia
  const handleConferido = async () => {
    const validation = getValidationStatus();
    
    if (validation.type === "empty") {
      toast.error("Preencha todos os campos antes de marcar como conferido");
      return;
    }

    // Confirmação quando há divergência
    if (validation.type === "divergent") {
      const confirma = window.confirm(
        `ATENÇÃO: ${validation.message}\n\nDeseja prosseguir mesmo com divergência nas quantidades?`
      );
      if (!confirma) return;
    }

    setSaving(true);
    try {
      for (const item of itens) {
        const { error: itemError } = await supabase
          .from("fechamento_itens")
          .update({ unidades: item.unidades })
          .eq("id", item.id);

        if (itemError) throw itemError;
      }

      const { error } = await supabase
        .from("fechamentos")
        .update({ 
          status: "em_conferencia",
          observacoes 
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Conferência concluída! Aguardando emissão de NF.");
      navigate("/pcp/fechamentos");
    } catch (error: any) {
      console.error("Erro ao conferir:", error);
      toast.error("Erro ao concluir conferência");
    } finally {
      setSaving(false);
    }
  };

  // Fase 2: Emitido - muda status_nf para emitida
  const handleEmitido = async () => {
    if (!canEmitirNf()) {
      toast.error("Preencha todos os campos obrigatórios da NF antes de emitir");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("fechamentos")
        .update({ 
          status: "fechado",
          status_nf: "emitida",
          numero_nf: numeroNf,
          data_emissao_nf: dataEmissaoNf,
          valor_total_nf: parseFloat(valorTotalNf),
          link_arquivo_nf: linkArquivoNf
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("NF emitida com sucesso! Pedido pronto para entrega.");
      navigate("/pcp/fechamentos");
    } catch (error: any) {
      console.error("Erro ao emitir NF:", error);
      toast.error("Erro ao emitir NF");
    } finally {
      setSaving(false);
    }
  };

  // Fase 3: Marcar pedido como faturado
  const handleMarcarFaturado = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ status_geral: "faturado" })
        .eq("id", fechamento?.pedido_id);

      if (error) throw error;

      toast.success("Pedido marcado como faturado!");
      fetchFechamento();
    } catch (error: any) {
      console.error("Erro ao faturar pedido:", error);
      toast.error("Erro ao marcar pedido como faturado");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `fechamentos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("pedidos-arquivos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("pedidos-arquivos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("fechamentos")
        .update({ foto_caderno_url: urlData.publicUrl })
        .eq("id", id);

      if (updateError) throw updateError;

      setFechamento((prev) => prev ? { ...prev, foto_caderno_url: urlData.publicUrl } : null);
      toast.success("Foto anexada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao anexar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getTotalGeral = () => itens.reduce((sum, item) => sum + item.unidades, 0);

  const calcularPrecoTotal = () => {
    if (!fechamento?.pedidos.preco_venda) return null;
    return fechamento.pedidos.preco_venda * getTotalGeral();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fechamento) {
    return (
      <div className="container mx-auto p-4">
        <p>Fechamento não encontrado</p>
      </div>
    );
  }

  const isReadOnly = fechamento.pedidos.status_geral === "faturado";

  return (
    <div className="container mx-auto p-4 max-w-7xl pb-24">
      <Button variant="ghost" onClick={() => navigate("/pcp/fechamentos")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Cabeçalho com fase atual */}
      <Card className={`mb-6 border-2 ${phaseConfig.bgColor}`}>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{phaseConfig.icon}</span>
              <div>
                <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                  {fechamento.pedidos.produto_modelo}
                  {fechamento.pedidos.status_geral === "faturado" && (
                    <Badge variant="default" className="bg-blue-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Faturado
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-base font-medium text-muted-foreground mb-2">{fechamento.pedidos.clientes.nome}</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium">Pedido:</span> {fechamento.pedidos.codigo_pedido}</p>
                  <p><span className="font-medium">Lote/OF:</span> {fechamento.lote_of}</p>
                  {fechamento.referencias && (
                    <p><span className="font-medium">Referência:</span> {fechamento.referencias.codigo_referencia}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge className={`${phaseConfig.color} ${phaseConfig.bgColor} border text-sm px-3 py-1`}>
                {phaseConfig.label}
              </Badge>
              <p className="text-xs text-muted-foreground">{phaseConfig.description}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alerta de fase */}
      <Alert className={`mb-6 ${phaseConfig.bgColor}`}>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {currentPhase === "fechamento" && "Preencha as quantidades produzidas e clique em CONFERIDO para avançar para emissão de NF."}
          {currentPhase === "emissao_nf" && "Preencha TODOS os campos da Nota Fiscal (Número, Data, Valor e Link XML) e clique em EMITIDO."}
          {currentPhase === "entrega" && "Pedido pronto para entrega. Todas as informações estão completas."}
        </AlertDescription>
      </Alert>

      {/* Alertas de validação - apenas na fase de fechamento */}
      {currentPhase === "fechamento" && (
        <Card className={`mb-6 border-2 ${
          getValidationStatus().type === "exceed" || getValidationStatus().type === "divergent" ? "bg-red-50 border-red-300" :
          getValidationStatus().type === "loss" ? "bg-yellow-50 border-yellow-300" :
          getValidationStatus().type === "valid" ? "bg-green-50 border-green-300" :
          "bg-gray-50 border-gray-300"
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${
                  getValidationStatus().type === "exceed" || getValidationStatus().type === "divergent" ? "text-red-600" :
                  getValidationStatus().type === "loss" ? "text-yellow-600" :
                  getValidationStatus().type === "valid" ? "text-green-600" :
                  "text-gray-600"
                }`} />
                <span className={`font-medium ${
                  getValidationStatus().type === "exceed" || getValidationStatus().type === "divergent" ? "text-red-700" :
                  getValidationStatus().type === "loss" ? "text-yellow-700" :
                  getValidationStatus().type === "valid" ? "text-green-700" :
                  "text-gray-700"
                }`}>
                  {getValidationStatus().message}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Esperado:</span> {getTotalPlanejado()} | 
                <span className="font-medium ml-2">Contado:</span> {getTotalFechado()} | 
                <span className={`font-bold ml-2 ${
                  getValidationStatus().type === "divergent" || parseFloat(getPercentageDiff()) > 110 ? "text-red-600" :
                  parseFloat(getPercentageDiff()) < 90 ? "text-yellow-600" :
                  "text-green-600"
                }`}>
                  {getPercentageDiff()}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Comerciais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Dados Comerciais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-md p-4">
                  <Label className="text-xs text-muted-foreground">Composição do Tecido</Label>
                  <p className="font-semibold mt-1">{fechamento.pedidos.composicao_tecido || "Não informado"}</p>
                </div>
                <div className="bg-muted/50 rounded-md p-4">
                  <Label className="text-xs text-muted-foreground">Preço Unitário</Label>
                  <p className="font-semibold mt-1">
                    {fechamento.pedidos.preco_venda 
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fechamento.pedidos.preco_venda)
                      : "Não informado"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-md p-4">
                  <Label className="text-xs text-muted-foreground">Quantidade Total</Label>
                  <p className="font-semibold mt-1">{getTotalGeral()} unidades</p>
                </div>
                <div className="bg-primary/10 rounded-md p-4">
                  <Label className="text-xs text-muted-foreground">Preço Total Calculado</Label>
                  <p className="font-bold text-primary mt-1">
                    {calcularPrecoTotal() 
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calcularPrecoTotal()!)
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anexar foto - apenas na fase de fechamento */}
          {currentPhase === "fechamento" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Anexar Foto do Caderno</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto || isReadOnly}
                  />
                  {fechamento.foto_caderno_url && (
                    <img
                      src={fechamento.foto_caderno_url}
                      alt="Foto do caderno"
                      className="w-full h-48 object-cover rounded-md"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Foto anexada - para outras fases */}
          {currentPhase !== "fechamento" && fechamento.foto_caderno_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Foto do Caderno</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={fechamento.foto_caderno_url}
                  alt="Foto do caderno"
                  className="w-full h-48 object-cover rounded-md"
                />
              </CardContent>
            </Card>
          )}

          {/* Grade de Tamanhos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quantidades por Tamanho</CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentPhase === "fechamento" 
                  ? gradeVaziaOuZerada() 
                    ? "Este pedido não possui grade definida. Preencha as quantidades contadas para cada tamanho."
                    : "Preencha a quantidade produzida para cada tamanho"
                  : "Quantidades conferidas"}
              </p>
            </CardHeader>
            <CardContent>
              {gradeVaziaOuZerada() ? (
                /* Grade vazia - mostrar todos os tamanhos disponíveis */
                <>
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      A grade de tamanhos do pedido está vazia. Preencha as quantidades que foram contadas fisicamente.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {TODOS_TAMANHOS.map((tamanho) => {
                      const item = itens.find(i => i.tamanho === tamanho);
                      const atual = item?.unidades || 0;
                      const bate = quantidadesBatem();
                      
                      return (
                        <div key={tamanho} className={`p-3 rounded-md border-2 ${
                          atual > 0 
                            ? bate 
                              ? "bg-green-50 border-green-400" 
                              : "bg-red-50 border-red-400"
                            : "bg-muted/50 border-border"
                        }`}>
                          <Label className="text-sm font-bold mb-1 block text-center">{tamanho}</Label>
                          <Input
                            type="number"
                            min="0"
                            value={atual === 0 ? "" : atual}
                            onChange={(e) => handleItemChange(tamanho, e.target.value)}
                            disabled={currentPhase !== "fechamento" || isReadOnly}
                            placeholder="0"
                            className={`text-center text-lg font-semibold h-10 ${
                              atual > 0 
                                ? bate 
                                  ? "border-green-400 focus:ring-green-400" 
                                  : "border-red-400 focus:ring-red-400"
                                : ""
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Grade preenchida - comportamento original */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.keys((fechamento.pedidos.grade_tamanhos as Record<string, number>) || {})
                    .filter(tamanho => ((fechamento.pedidos.grade_tamanhos as Record<string, number>)[tamanho] || 0) > 0)
                    .map((tamanho) => {
                      const item = itens.find(i => i.tamanho === tamanho);
                      const validation = item ? validateItem(item) : "empty";
                      const planejado = (fechamento.pedidos.grade_tamanhos as Record<string, number>)[tamanho];
                      const atual = item?.unidades || 0;
                      
                      return (
                        <div key={tamanho} className={`p-4 rounded-md border-2 ${
                          validation === "empty" ? "bg-muted/50 border-border" :
                          validation === "exceed" ? "bg-red-50 border-red-300" :
                          "bg-green-50 border-green-300"
                        }`}>
                          <Label className="text-lg font-bold mb-2 block">{tamanho}</Label>
                          <div className="text-sm text-muted-foreground mb-2">
                            Planejado: <span className="font-semibold">{planejado}</span>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            value={atual === 0 ? "" : atual}
                            onChange={(e) => handleItemChange(tamanho, e.target.value)}
                            disabled={currentPhase !== "fechamento" || isReadOnly}
                            placeholder="0"
                            className="text-center text-lg font-semibold h-12"
                          />
                          {atual > 0 && (
                            <div className={`text-xs mt-2 text-center font-medium ${
                              atual > planejado ? "text-red-600" :
                              atual < planejado ? "text-yellow-600" :
                              "text-green-600"
                            }`}>
                              {((atual / planejado) * 100).toFixed(0)}% do planejado
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nota Fiscal - visível nas fases de emissão e entrega */}
          {(currentPhase === "emissao_nf" || currentPhase === "entrega") && (
            <Card className={currentPhase === "emissao_nf" ? "border-2 border-yellow-300" : ""}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Nota Fiscal
                  {currentPhase === "emissao_nf" && (
                    <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-300">
                      Campos obrigatórios
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {currentPhase === "emissao_nf" 
                    ? "Preencha TODOS os campos abaixo para emitir a NF"
                    : "Dados da Nota Fiscal emitida"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero_nf" className="flex items-center gap-1">
                      Número da NF
                      {currentPhase === "emissao_nf" && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="numero_nf"
                      value={numeroNf}
                      onChange={(e) => setNumeroNf(e.target.value)}
                      disabled={currentPhase === "entrega" || isReadOnly}
                      placeholder="Ex: 001234"
                      className={`mt-1 ${currentPhase === "emissao_nf" && !numeroNf ? "border-red-300" : ""}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="data_emissao_nf" className="flex items-center gap-1">
                      Data de Emissão
                      {currentPhase === "emissao_nf" && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="data_emissao_nf"
                      type="date"
                      value={dataEmissaoNf}
                      onChange={(e) => setDataEmissaoNf(e.target.value)}
                      disabled={currentPhase === "entrega" || isReadOnly}
                      className={`mt-1 ${currentPhase === "emissao_nf" && !dataEmissaoNf ? "border-red-300" : ""}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="valor_total_nf" className="flex items-center gap-1">
                      Valor Total da NF (R$)
                      {currentPhase === "emissao_nf" && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="valor_total_nf"
                      type="number"
                      step="0.01"
                      value={valorTotalNf}
                      onChange={(e) => setValorTotalNf(e.target.value)}
                      disabled={currentPhase === "entrega" || isReadOnly}
                      placeholder="0.00"
                      className={`mt-1 ${currentPhase === "emissao_nf" && !valorTotalNf ? "border-red-300" : ""}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="link_arquivo_nf" className="flex items-center gap-1">
                      Link do Arquivo XML
                      {currentPhase === "emissao_nf" && <span className="text-red-500">*</span>}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="link_arquivo_nf"
                        value={linkArquivoNf}
                        onChange={(e) => setLinkArquivoNf(e.target.value)}
                        disabled={currentPhase === "entrega" || isReadOnly}
                        placeholder="https://..."
                        className={`${currentPhase === "emissao_nf" && !linkArquivoNf ? "border-red-300" : ""}`}
                      />
                      {linkArquivoNf && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(linkArquivoNf, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status da NF */}
                <div className="mt-4 p-4 rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Status da NF</Label>
                      <p className={`font-semibold ${fechamento.status_nf === "emitida" ? "text-green-600" : "text-orange-600"}`}>
                        {fechamento.status_nf === "emitida" ? "✅ EMITIDA" : "⏳ PENDENTE"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={currentPhase !== "fechamento" || isReadOnly}
                placeholder="Adicione observações sobre o fechamento..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral - Resumo */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Total Produzido</h4>
                <div className="text-2xl font-bold text-primary">
                  {getTotalGeral()} unidades
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Por Tamanho</h4>
                {gradeVaziaOuZerada() ? (
                  /* Mostrar tamanhos agregados (consolidados) */
                  (() => {
                    const agregados = getItensAgregados();
                    const tamanhos = Object.keys(agregados);
                    const bate = quantidadesBatem();
                    
                    return tamanhos.length > 0 ? (
                      tamanhos.map((tamanho) => (
                        <div key={tamanho} className="flex justify-between text-sm mb-1">
                          <span>{tamanho}:</span>
                          <span className={`font-medium ${bate ? "text-green-600" : "text-red-600"}`}>
                            {agregados[tamanho]}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum tamanho preenchido</p>
                    );
                  })()
                ) : (
                  /* Comportamento original com agregação */
                  Object.keys((fechamento.pedidos.grade_tamanhos as Record<string, number>) || {})
                    .filter(tamanho => ((fechamento.pedidos.grade_tamanhos as Record<string, number>)[tamanho] || 0) > 0)
                    .map((tamanho) => {
                      // Agregar todas as unidades deste tamanho
                      const totalTamanho = itens
                        .filter(i => i.tamanho === tamanho)
                        .reduce((sum, i) => sum + i.unidades, 0);
                      const planejado = (fechamento.pedidos.grade_tamanhos as Record<string, number>)[tamanho];
                      return (
                        <div key={tamanho} className="flex justify-between text-sm mb-1">
                          <span>{tamanho}:</span>
                          <span className={`font-medium ${
                            totalTamanho === 0 ? "text-muted-foreground" :
                            totalTamanho > planejado ? "text-red-600" :
                            totalTamanho < planejado ? "text-yellow-600" :
                            "text-green-600"
                          }`}>
                            {totalTamanho} / {planejado}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Ações baseadas na fase */}
              <div className="pt-4 border-t space-y-3">
                {/* Fase Entrega - Marcar como faturado */}
                {currentPhase === "entrega" && fechamento.pedidos.status_geral !== "faturado" && (
                  <Button onClick={handleMarcarFaturado} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marcar Pedido como Faturado
                  </Button>
                )}

                {/* Indicador de validação para emissão de NF */}
                {currentPhase === "emissao_nf" && (
                  <div className={`p-3 rounded-md text-sm ${canEmitirNf() ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {canEmitirNf() 
                      ? "✅ Todos os campos preenchidos" 
                      : "⚠️ Preencha todos os campos da NF"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Botões fixos no rodapé mobile - Fase Fechamento */}
      {currentPhase === "fechamento" && !isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-2 md:hidden">
          <Button onClick={() => handleSaveRascunho()} disabled={saving} variant="outline" className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          <Button
            onClick={handleConferido}
            disabled={!canSendToConferencia() || saving}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            CONFERIDO
          </Button>
        </div>
      )}

      {/* Botões fixos no rodapé mobile - Fase Emissão NF */}
      {currentPhase === "emissao_nf" && !isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-2 md:hidden">
          <Button onClick={() => handleSaveRascunho()} disabled={saving} variant="outline" className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          <Button
            onClick={handleEmitido}
            disabled={!canEmitirNf() || saving}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Receipt className="h-4 w-4 mr-2" />
            EMITIDO
          </Button>
        </div>
      )}

      {/* Botões para desktop - Fase Fechamento */}
      {currentPhase === "fechamento" && !isReadOnly && (
        <div className="hidden md:flex gap-4 mt-6 justify-end">
          <Button onClick={() => handleSaveRascunho()} disabled={saving} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button
            onClick={handleConferido}
            disabled={!canSendToConferencia() || saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            CONFERIDO
          </Button>
        </div>
      )}

      {/* Botões para desktop - Fase Emissão NF */}
      {currentPhase === "emissao_nf" && !isReadOnly && (
        <div className="hidden md:flex gap-4 mt-6 justify-end">
          <Button onClick={() => handleSaveRascunho()} disabled={saving} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          <Button
            onClick={handleEmitido}
            disabled={!canEmitirNf() || saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Receipt className="h-4 w-4 mr-2" />
            EMITIDO
          </Button>
        </div>
      )}
    </div>
  );
};

export default DetalhesFechamento;

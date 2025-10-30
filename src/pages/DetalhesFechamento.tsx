import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Save, Send, Loader2, AlertTriangle } from "lucide-react";
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
  pedidos: {
    codigo_pedido: string;
    produto_modelo: string;
    grade_tamanhos: any;
    clientes: {
      nome: string;
    };
  };
  referencias: {
    codigo_referencia: string;
  } | null;
}

const DetalhesFechamento = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [itens, setItens] = useState<FechamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      fetchFechamento();
      fetchItens();
    }
  }, [id]);

  // Auto-save a cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      if (fechamento?.status === "em_aberto") {
        handleSaveRascunho(true);
      }
    }, 10000);
    setAutoSaveTimer(timer);
    return () => clearInterval(timer);
  }, [itens, observacoes, fechamento]);

  const fetchFechamento = async () => {
    try {
      const { data, error } = await supabase
        .from("fechamentos")
        .select(`
          *,
          pedidos!inner(codigo_pedido, produto_modelo, grade_tamanhos, clientes!inner(nome)),
          referencias(codigo_referencia)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setFechamento(data);
      setObservacoes(data.observacoes || "");
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

  const handleItemChange = (tamanho: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setItens((prev) =>
      prev.map((item) =>
        item.tamanho === tamanho ? { ...item, unidades: numValue, caixas: numValue > 0 ? 1 : 0 } : item
      )
    );
  };

  const validateItem = (item: FechamentoItem) => {
    // Verificar se está vazio
    if (item.unidades === 0) return "empty";
    
    // Verificar se excede o planejado
    if (item.unidades > item.saldo_a_fechar) return "exceed";
    
    return "valid";
  };

  const getTotalPlanejado = () => {
    return itens.reduce((sum, item) => sum + item.saldo_a_fechar, 0);
  };

  const getTotalFechado = () => {
    return itens.reduce((sum, item) => sum + item.unidades, 0);
  };

  const getPercentageDiff = () => {
    const planejado = getTotalPlanejado();
    const fechado = getTotalFechado();
    if (planejado === 0) return "0";
    return ((fechado / planejado) * 100).toFixed(1);
  };

  const getValidationStatus = () => {
    const percentage = parseFloat(getPercentageDiff());
    
    // Verificar se tem campos vazios
    const hasEmpty = itens.some(item => item.unidades === 0);
    if (hasEmpty) return { type: "empty", message: "Preencha todos os tamanhos" };
    
    // Verificar se está acima de 110%
    if (percentage > 110) return { type: "exceed", message: "⚠️ Quantidade acima do planejado" };
    
    // Verificar se está abaixo de 90%
    if (percentage < 90) return { type: "loss", message: "⚠️ Possível perda na produção" };
    
    return { type: "valid", message: "✅ Quantidades dentro do esperado" };
  };

  const canSendToConferencia = () => {
    const validation = getValidationStatus();
    return validation.type === "valid" || validation.type === "loss" || validation.type === "exceed";
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; label: string; icon: string }> = {
      em_aberto: { 
        color: "text-red-600", 
        bgColor: "bg-red-100 border-red-300", 
        label: "Em Aberto",
        icon: "🔴"
      },
      em_conferencia: { 
        color: "text-yellow-600", 
        bgColor: "bg-yellow-100 border-yellow-300", 
        label: "Em Conferência",
        icon: "🟡"
      },
      fechado: { 
        color: "text-green-600", 
        bgColor: "bg-green-100 border-green-300", 
        label: "Fechado / Pronto para NF",
        icon: "🟢"
      }
    };
    return configs[status] || configs.em_aberto;
  };

  const handleSaveRascunho = async (isAutoSave = false) => {
    setSaving(true);
    try {
      // Atualizar observações
      const { error: fechError } = await supabase
        .from("fechamentos")
        .update({ observacoes })
        .eq("id", id);

      if (fechError) throw fechError;

      // Atualizar itens
      for (const item of itens) {
        const { error: itemError } = await supabase
          .from("fechamento_itens")
          .update({
            unidades: item.unidades,
          })
          .eq("id", item.id);

        if (itemError) throw itemError;
      }

      if (!isAutoSave) {
        toast.success("Rascunho salvo com sucesso!");
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      if (!isAutoSave) {
        toast.error("Erro ao salvar rascunho");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarParaConferencia = async () => {
    const validation = getValidationStatus();
    
    if (validation.type === "empty") {
      toast.error("Preencha todos os campos antes de enviar para conferência");
      return;
    }

    setSaving(true);
    try {
      // Primeiro, salvar os itens
      for (const item of itens) {
        const { error: itemError } = await supabase
          .from("fechamento_itens")
          .update({
            unidades: item.unidades,
          })
          .eq("id", item.id);

        if (itemError) throw itemError;
      }

      // Depois, atualizar status
      const { error } = await supabase
        .from("fechamentos")
        .update({ 
          status: "em_conferencia",
          observacoes 
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Fechamento enviado para conferência!");
      navigate("/pcp/fechamentos");
    } catch (error: any) {
      console.error("Erro ao enviar:", error);
      toast.error("Erro ao enviar para conferência");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (10MB)
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

  const getTotalGeral = () => {
    return itens.reduce((sum, item) => sum + item.unidades, 0);
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

  const isReadOnly = fechamento.status !== "em_aberto";

  return (
    <div className="container mx-auto p-4 max-w-7xl pb-24">
      <Button variant="ghost" onClick={() => navigate("/pcp/fechamentos")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Cabeçalho */}
      <Card className={`mb-6 border-2 ${getStatusConfig(fechamento.status).bgColor}`}>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{getStatusConfig(fechamento.status).icon}</span>
              <div>
                <CardTitle className="text-2xl mb-2">{fechamento.pedidos.produto_modelo}</CardTitle>
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
            <Badge className={`${getStatusConfig(fechamento.status).color} ${getStatusConfig(fechamento.status).bgColor} border`}>
              {getStatusConfig(fechamento.status).label}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Alertas de validação */}
      {!isReadOnly && (
        <Card className={`mb-6 border-2 ${
          getValidationStatus().type === "exceed" ? "bg-red-50 border-red-300" :
          getValidationStatus().type === "loss" ? "bg-yellow-50 border-yellow-300" :
          getValidationStatus().type === "valid" ? "bg-green-50 border-green-300" :
          "bg-gray-50 border-gray-300"
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${
                  getValidationStatus().type === "exceed" ? "text-red-600" :
                  getValidationStatus().type === "loss" ? "text-yellow-600" :
                  getValidationStatus().type === "valid" ? "text-green-600" :
                  "text-gray-600"
                }`} />
                <span className={`font-medium ${
                  getValidationStatus().type === "exceed" ? "text-red-700" :
                  getValidationStatus().type === "loss" ? "text-yellow-700" :
                  getValidationStatus().type === "valid" ? "text-green-700" :
                  "text-gray-700"
                }`}>
                  {getValidationStatus().message}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Planejado:</span> {getTotalPlanejado()} | 
                <span className="font-medium ml-2">Fechado:</span> {getTotalFechado()} | 
                <span className={`font-bold ml-2 ${
                  parseFloat(getPercentageDiff()) > 110 ? "text-red-600" :
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
          {/* Anexar foto */}
          {!isReadOnly && (
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
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grade de Tamanhos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quantidades por Tamanho</CardTitle>
              <p className="text-sm text-muted-foreground">Preencha a quantidade produzida para cada tamanho</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.keys((fechamento.pedidos.grade_tamanhos as Record<string, number>) || {})
                  .filter(tamanho => ((fechamento.pedidos.grade_tamanhos as Record<string, number>)[tamanho] || 0) > 0)
                  .map((tamanho) => {
                    const item = itens.find(i => i.tamanho === tamanho);
                    const validation = item ? validateItem(item) : "empty";
                    const planejado = (fechamento.pedidos.grade_tamanhos as Record<string, number>)[tamanho];
                    const atual = item?.unidades || 0;
                    
                    return (
                      <div key={tamanho} className={`p-4 rounded-lg border-2 ${
                        validation === "empty" ? "bg-gray-50 border-gray-300" :
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
                          disabled={isReadOnly}
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
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={isReadOnly}
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
                {Object.keys((fechamento.pedidos.grade_tamanhos as Record<string, number>) || {})
                  .filter(tamanho => ((fechamento.pedidos.grade_tamanhos as Record<string, number>)[tamanho] || 0) > 0)
                  .map((tamanho) => {
                    const item = itens.find(i => i.tamanho === tamanho);
                    const atual = item?.unidades || 0;
                    const planejado = (fechamento.pedidos.grade_tamanhos as Record<string, number>)[tamanho];
                    return (
                      <div key={tamanho} className="flex justify-between text-sm mb-1">
                        <span>{tamanho}:</span>
                        <span className={`font-medium ${
                          atual === 0 ? "text-gray-500" :
                          atual > planejado ? "text-red-600" :
                          atual < planejado ? "text-yellow-600" :
                          "text-green-600"
                        }`}>
                          {atual} / {planejado}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Botões fixos no rodapé mobile */}
      {!isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-2 md:hidden">
          <Button onClick={() => handleSaveRascunho()} disabled={saving} variant="outline" className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          <Button
            onClick={handleEnviarParaConferencia}
            disabled={!canSendToConferencia()}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      )}

      {/* Botões para desktop */}
      {!isReadOnly && (
        <div className="hidden md:flex gap-4 mt-6 justify-end">
          <Button onClick={() => handleSaveRascunho()} disabled={saving} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button
            onClick={handleEnviarParaConferencia}
            disabled={!canSendToConferencia()}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar para Conferência
          </Button>
        </div>
      )}
    </div>
  );
};

export default DetalhesFechamento;

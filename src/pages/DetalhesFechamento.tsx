import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
          pedidos!inner(codigo_pedido),
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

  const handleItemChange = (itemId: string, field: "caixas" | "unidades", value: string) => {
    const numValue = parseInt(value) || 0;
    setItens((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [field]: numValue } : item
      )
    );
  };

  const validateItem = (item: FechamentoItem) => {
    const total = item.caixas * item.unidades;
    
    // Verificar se está vazio
    if (item.caixas === 0 || item.unidades === 0) return "empty";
    
    // Verificar se excede o planejado
    if (total > item.saldo_a_fechar) return "exceed";
    
    return "valid";
  };

  const getTotalPlanejado = () => {
    return itens.reduce((sum, item) => sum + item.saldo_a_fechar, 0);
  };

  const getTotalFechado = () => {
    return itens.reduce((sum, item) => sum + (item.caixas * item.unidades), 0);
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
    const hasEmpty = itens.some(item => item.caixas === 0 || item.unidades === 0);
    if (hasEmpty) return { type: "empty", message: "Preencha todos os campos" };
    
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
            caixas: item.caixas,
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
            caixas: item.caixas,
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

  const getSumByCor = () => {
    const sumByCor: Record<string, number> = {};
    itens.forEach((item) => {
      const total = item.caixas * item.unidades;
      sumByCor[item.cor] = (sumByCor[item.cor] || 0) + total;
    });
    return sumByCor;
  };

  const getSumByTamanho = () => {
    const sumByTamanho: Record<string, number> = {};
    itens.forEach((item) => {
      const total = item.caixas * item.unidades;
      sumByTamanho[item.tamanho] = (sumByTamanho[item.tamanho] || 0) + total;
    });
    return sumByTamanho;
  };

  const getTotalGeral = () => {
    return itens.reduce((sum, item) => sum + item.caixas * item.unidades, 0);
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
                <CardTitle className="text-2xl mb-2">{fechamento.pedidos.codigo_pedido}</CardTitle>
                <div className="space-y-1 text-sm text-muted-foreground">
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

          {/* Tabela de itens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Itens do Fechamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">SKU</th>
                      <th className="text-left p-2">Modelo</th>
                      <th className="text-left p-2">Cor</th>
                      <th className="text-left p-2">Tamanho</th>
                      <th className="text-right p-2">Saldo</th>
                      <th className="text-right p-2">Caixas</th>
                      <th className="text-right p-2">Unidades</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => {
                      const validation = validateItem(item);
                      const total = item.caixas * item.unidades;
                      const percentOfPlanned = item.saldo_a_fechar > 0 
                        ? ((total / item.saldo_a_fechar) * 100).toFixed(0)
                        : "0";
                      
                      return (
                        <tr key={item.id} className={`border-b ${
                          validation === "empty" ? "bg-gray-100" :
                          validation === "exceed" ? "bg-red-50" :
                          "bg-white"
                        }`}>
                          <td className="p-2">{item.sku}</td>
                          <td className="p-2">{item.modelo}</td>
                          <td className="p-2">{item.cor}</td>
                          <td className="p-2">{item.tamanho}</td>
                          <td className="text-right p-2 font-medium">{item.saldo_a_fechar}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              value={item.caixas === 0 ? "" : item.caixas}
                              onChange={(e) => handleItemChange(item.id, "caixas", e.target.value)}
                              disabled={isReadOnly}
                              className={`w-20 text-right ${validation === "empty" ? "border-gray-400" : ""}`}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              value={item.unidades === 0 ? "" : item.unidades}
                              onChange={(e) => handleItemChange(item.id, "unidades", e.target.value)}
                              disabled={isReadOnly}
                              className={`w-20 text-right ${validation === "empty" ? "border-gray-400" : ""}`}
                            />
                          </td>
                          <td className="text-right p-2">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`font-medium ${
                                validation === "exceed" ? "text-red-600" :
                                validation === "empty" ? "text-gray-500" :
                                "text-green-600"
                              }`}>
                                {total}
                              </span>
                              {validation === "exceed" && <AlertTriangle className="h-3 w-3 text-red-600" />}
                              {validation === "empty" && item.saldo_a_fechar > 0 && (
                                <span className="text-xs text-gray-500">0%</span>
                              )}
                              {validation === "valid" && total > 0 && (
                                <span className="text-xs text-green-600">({percentOfPlanned}%)</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                <h4 className="font-medium mb-2">Por Cor</h4>
                {Object.entries(getSumByCor()).map(([cor, total]) => (
                  <div key={cor} className="flex justify-between text-sm">
                    <span>{cor}:</span>
                    <span className="font-medium">{total}</span>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-medium mb-2">Por Tamanho</h4>
                {Object.entries(getSumByTamanho()).map(([tamanho, total]) => (
                  <div key={tamanho} className="flex justify-between text-sm">
                    <span>{tamanho}:</span>
                    <span className="font-medium">{total}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between text-base font-bold">
                  <span>Total Geral:</span>
                  <span>{getTotalGeral()}</span>
                </div>
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

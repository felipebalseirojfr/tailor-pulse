import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X, FileText, ImageIcon, Save, Loader2 } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
}

interface ArquivoExistente {
  nome: string;
  caminho: string;
  tipo: string;
  tamanho: number;
}

interface Etapa {
  id: string;
  tipo_etapa: string;
  ordem: number;
  data_inicio_prevista: string | null;
  data_termino_prevista: string | null;
  observacoes: string | null;
}

const ETAPAS_NOMES: Record<string, string> = {
  pilotagem: "Pilotagem",
  liberacao_corte: "Liberação de Corte",
  corte: "Corte",
  lavanderia: "Lavanderia",
  costura: "Costura",
  caseado: "Caseado",
  estamparia_bordado: "Estamparia/Bordado",
  acabamento: "Acabamento",
  entrega: "Entrega",
};

export default function EditarPedido() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [arquivosExistentes, setArquivosExistentes] = useState<ArquivoExistente[]>([]);
  const [arquivosParaRemover, setArquivosParaRemover] = useState<string[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dadosOriginais, setDadosOriginais] = useState<any>(null);
  const [etapasOriginais, setEtapasOriginais] = useState<Etapa[]>([]);

  const [formData, setFormData] = useState({
    cliente_id: "",
    produto_modelo: "",
    tipo_peca: "",
    tecido: "",
    aviamentos: [] as string[],
    quantidade_total: "",
    data_inicio: "",
    prazo_final: "",
    tem_personalizacao: false,
    tipos_personalizacao: [] as string[],
    grade_tamanhos: {} as Record<string, number>,
    observacoes_pedido: "",
  });

  const tamanhos = ["1", "2", "4", "6", "8", "10", "12", "14", "PP", "P", "M", "G", "GG", "XGG", "XGG1", "XGG2", "XGG3"];

  useEffect(() => {
    fetchClientes();
    fetchPedido();
    fetchEtapas();
  }, [id]);

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome")
      .order("nome");

    if (!error && data) {
      setClientes(data);
    }
  };

  const fetchPedido = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Pedido não encontrado");

      // Salvar dados originais para auditoria
      setDadosOriginais(data);

      // Preencher formulário
      setFormData({
        cliente_id: data.cliente_id || "",
        produto_modelo: data.produto_modelo || "",
        tipo_peca: data.tipo_peca || "",
        tecido: data.tecido || "",
        aviamentos: data.aviamentos || [],
        quantidade_total: data.quantidade_total?.toString() || "",
        data_inicio: data.data_inicio || "",
        prazo_final: data.prazo_final || "",
        tem_personalizacao: data.tem_personalizacao || false,
        tipos_personalizacao: data.tipos_personalizacao || [],
        grade_tamanhos: (data.grade_tamanhos as Record<string, number>) || {},
        observacoes_pedido: data.observacoes_pedido || "",
      });

      // Carregar arquivos existentes
      if (data.arquivos && Array.isArray(data.arquivos)) {
        setArquivosExistentes(data.arquivos as unknown as ArquivoExistente[]);
      }

    } catch (error: any) {
      console.error("Erro ao carregar pedido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o pedido para edição.",
        variant: "destructive",
      });
      navigate("/pedidos");
    }
  };

  const fetchEtapas = async () => {
    try {
      const { data, error } = await supabase
        .from("etapas_producao")
        .select("*")
        .eq("pedido_id", id)
        .order("ordem");

      if (error) throw error;
      if (data) {
        setEtapas(data);
        setEtapasOriginais(data);
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Erro ao carregar etapas:", error);
    }
  };

  const atualizarEtapa = (etapaId: string, campo: string, valor: any) => {
    setEtapas(etapas.map(etapa => 
      etapa.id === etapaId 
        ? { ...etapa, [campo]: valor }
        : etapa
    ));
  };

  const registrarAuditoria = async (camposAlterados: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user.id)
        .single();

      await supabase.from("pedidos_auditoria").insert([{
        pedido_id: id!,
        usuario_id: user.id,
        usuario_nome: profile?.nome || user.email,
        acao: "Edição de produção",
        campos_alterados: camposAlterados as any,
        dados_antes: { pedido: dadosOriginais, etapas: etapasOriginais } as any,
        dados_depois: { pedido: formData, etapas } as any,
      }]);
    } catch (error) {
      console.error("Erro ao registrar auditoria:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Identificar campos alterados
      const camposAlterados: string[] = [];
      Object.keys(formData).forEach((key) => {
        if (JSON.stringify(formData[key as keyof typeof formData]) !== JSON.stringify(dadosOriginais[key])) {
          camposAlterados.push(key);
        }
      });

      // Upload de novos arquivos
      const novosArquivosUpload = [];
      for (const arquivo of arquivos) {
        try {
          const fileName = `${Date.now()}_${arquivo.name}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('pedidos-arquivos')
            .upload(filePath, arquivo, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Erro ao fazer upload:', uploadError);
            toast({
              title: "Aviso",
              description: `Não foi possível fazer upload do arquivo ${arquivo.name}`,
              variant: "default",
            });
            continue;
          }

          novosArquivosUpload.push({
            nome: arquivo.name,
            caminho: filePath,
            tipo: arquivo.type,
            tamanho: arquivo.size,
          });
        } catch (fileError) {
          console.error('Erro ao processar arquivo:', fileError);
        }
      }

      // Remover arquivos marcados para remoção
      for (const caminho of arquivosParaRemover) {
        try {
          await supabase.storage
            .from('pedidos-arquivos')
            .remove([caminho]);
        } catch (error) {
          console.error('Erro ao remover arquivo:', error);
        }
      }

      // Combinar arquivos: existentes (não removidos) + novos
      const arquivosFinais = [
        ...arquivosExistentes.filter(a => !arquivosParaRemover.includes(a.caminho)),
        ...novosArquivosUpload
      ];

      // Atualizar pedido
      const { error } = await supabase
        .from("pedidos")
        .update({
          cliente_id: formData.cliente_id,
          produto_modelo: formData.produto_modelo,
          tipo_peca: formData.tipo_peca,
          tecido: formData.tecido,
          aviamentos: formData.aviamentos,
          quantidade_total: parseInt(formData.quantidade_total),
          data_inicio: formData.data_inicio,
          prazo_final: formData.prazo_final,
          tem_personalizacao: formData.tipos_personalizacao.length > 0,
          tipos_personalizacao: formData.tipos_personalizacao,
          grade_tamanhos: formData.grade_tamanhos,
          arquivos: arquivosFinais,
          observacoes_pedido: formData.observacoes_pedido,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Atualizar etapas alteradas
      const etapasAlteradas = etapas.filter((etapa, index) => {
        const original = etapasOriginais[index];
        return !original || 
          etapa.data_inicio_prevista !== original.data_inicio_prevista ||
          etapa.data_termino_prevista !== original.data_termino_prevista ||
          etapa.observacoes !== original.observacoes;
      });

      for (const etapa of etapasAlteradas) {
        const { error: etapaError } = await supabase
          .from("etapas_producao")
          .update({
            data_inicio_prevista: etapa.data_inicio_prevista,
            data_termino_prevista: etapa.data_termino_prevista,
            observacoes: etapa.observacoes,
          })
          .eq("id", etapa.id);

        if (etapaError) {
          console.error("Erro ao atualizar etapa:", etapaError);
        }
      }

      // Registrar auditoria
      if (camposAlterados.length > 0 || arquivos.length > 0 || arquivosParaRemover.length > 0 || etapasAlteradas.length > 0) {
        if (arquivos.length > 0) camposAlterados.push("arquivos_adicionados");
        if (arquivosParaRemover.length > 0) camposAlterados.push("arquivos_removidos");
        if (etapasAlteradas.length > 0) camposAlterados.push("etapas_alteradas");
        await registrarAuditoria(camposAlterados);
      }

      toast({
        title: "Produção atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });
      
      navigate(`/pedidos/${id}`);
    } catch (error: any) {
      console.error("Erro ao atualizar:", error);
      toast({
        title: "Erro ao atualizar produção",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setArquivos(Array.from(e.target.files));
    }
  };

  const removerArquivoNovo = (index: number) => {
    setArquivos(arquivos.filter((_, i) => i !== index));
  };

  const removerArquivoExistente = (caminho: string) => {
    setArquivosParaRemover([...arquivosParaRemover, caminho]);
  };

  const restaurarArquivo = (caminho: string) => {
    setArquivosParaRemover(arquivosParaRemover.filter(c => c !== caminho));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/pedidos/${id}`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Detalhes
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Editar Produção</CardTitle>
          <CardDescription>
            Atualize as informações da produção. Todas as alterações serão registradas no histórico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cliente_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="produto_modelo">Produto/Modelo *</Label>
                  <Input
                    id="produto_modelo"
                    value={formData.produto_modelo}
                    onChange={(e) =>
                      setFormData({ ...formData, produto_modelo: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tipo_peca">Tipo de Peça *</Label>
                  <Input
                    id="tipo_peca"
                    value={formData.tipo_peca}
                    onChange={(e) =>
                      setFormData({ ...formData, tipo_peca: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tecido">Tecido</Label>
                  <Input
                    id="tecido"
                    value={formData.tecido}
                    onChange={(e) =>
                      setFormData({ ...formData, tecido: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes_pedido}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes_pedido: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            {/* Quantidade e Prazos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quantidade e Prazos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantidade_total">Quantidade Total *</Label>
                  <Input
                    id="quantidade_total"
                    type="number"
                    value={formData.quantidade_total}
                    onChange={(e) =>
                      setFormData({ ...formData, quantidade_total: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="data_inicio">Data de Início *</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) =>
                      setFormData({ ...formData, data_inicio: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="prazo_final">Prazo Final *</Label>
                  <Input
                    id="prazo_final"
                    type="date"
                    value={formData.prazo_final}
                    onChange={(e) =>
                      setFormData({ ...formData, prazo_final: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Etapas de Produção - Datas Previstas */}
            {etapas.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Etapas de Produção - Datas Previstas</h3>
                <div className="space-y-3">
                  {etapas.map((etapa) => (
                    <Card key={etapa.id}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="font-semibold">
                              {ETAPAS_NOMES[etapa.tipo_etapa] || etapa.tipo_etapa}
                            </Label>
                          </div>
                          <div>
                            <Label htmlFor={`etapa-inicio-${etapa.id}`}>
                              Data Início Prevista
                            </Label>
                            <Input
                              id={`etapa-inicio-${etapa.id}`}
                              type="date"
                              value={etapa.data_inicio_prevista || ""}
                              onChange={(e) =>
                                atualizarEtapa(etapa.id, "data_inicio_prevista", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`etapa-termino-${etapa.id}`}>
                              Data Término Prevista
                            </Label>
                            <Input
                              id={`etapa-termino-${etapa.id}`}
                              type="date"
                              value={etapa.data_termino_prevista || ""}
                              onChange={(e) =>
                                atualizarEtapa(etapa.id, "data_termino_prevista", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <Label htmlFor={`etapa-obs-${etapa.id}`}>Observações</Label>
                          <Textarea
                            id={`etapa-obs-${etapa.id}`}
                            value={etapa.observacoes || ""}
                            onChange={(e) =>
                              atualizarEtapa(etapa.id, "observacoes", e.target.value)
                            }
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Grade de Tamanhos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Grade de Tamanhos</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {tamanhos.map((tamanho) => (
                  <div key={tamanho}>
                    <Label htmlFor={`tamanho-${tamanho}`}>{tamanho}</Label>
                    <Input
                      id={`tamanho-${tamanho}`}
                      type="number"
                      min="0"
                      value={formData.grade_tamanhos[tamanho] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          grade_tamanhos: {
                            ...formData.grade_tamanhos,
                            [tamanho]: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Arquivos Existentes */}
            {arquivosExistentes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Arquivos Anexados</h3>
                <div className="space-y-2">
                  {arquivosExistentes.map((arquivo) => {
                    const removido = arquivosParaRemover.includes(arquivo.caminho);
                    return (
                      <div
                        key={arquivo.caminho}
                        className={`flex items-center justify-between p-3 border rounded-md ${
                          removido ? "opacity-50 bg-destructive/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {arquivo.tipo.startsWith("image/") ? (
                            <ImageIcon className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                          <span className="text-sm">
                            {arquivo.nome}
                            {removido && " (será removido)"}
                          </span>
                        </div>
                        {removido ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => restaurarArquivo(arquivo.caminho)}
                          >
                            Restaurar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removerArquivoExistente(arquivo.caminho)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Novos Arquivos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Adicionar Novos Arquivos</h3>
              <div>
                <Label htmlFor="arquivos">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Selecionar arquivos
                  </div>
                </Label>
                <Input
                  id="arquivos"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="mt-2"
                />
                {arquivos.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {arquivos.map((arquivo, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <span className="text-sm">{arquivo.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerArquivoNovo(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/pedidos/${id}`)}
                disabled={saving}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

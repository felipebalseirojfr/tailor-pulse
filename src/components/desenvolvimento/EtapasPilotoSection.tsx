import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Check, ListChecks, Pencil, ChevronRight, PlayCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  PILOTO_ETAPAS_CONFIGURAVEIS, PILOTO_ETAPAS_FIXAS_INICIO, PILOTO_ETAPAS_FIXAS_FIM,
  ETAPAS_COM_TERCEIRO, labelEtapa,
  fetchPilotoEtapas, hasActiveDxf, avancarEtapa,
  lacrarPiloto, solicitarFittingNovaPiloto, checkFichasFinalizadas,
  PilotoEtapaRow,
} from "@/lib/piloto-etapas";

interface Terceiro { id: string; nome: string; tipo_etapa: string; ativo: boolean }

export default function EtapasPilotoSection({
  referenciaId,
  onChanged,
}: { referenciaId: string; onChanged?: () => void }) {
  const { toast } = useToast();
  const [etapas, setEtapas] = useState<PilotoEtapaRow[]>([]);
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [dxfOk, setDxfOk] = useState(false);

  // Configurator
  const [configOpen, setConfigOpen] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>([]); // configurable only
  const [step, setStep] = useState<"selecionar" | "terceiros">("selecionar");
  const [terceirosMap, setTerceirosMap] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  // Decision modal (aguardando_aprovacao_cliente)
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionMode, setDecisionMode] = useState<"inicial" | "fitting">("inicial");
  const [fittingTexto, setFittingTexto] = useState("");
  const [fittingNovaPiloto, setFittingNovaPiloto] = useState<"sim" | "nao">("sim");
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [fichasMissing, setFichasMissing] = useState<{ tecnica: boolean; costura: boolean } | null>(null);

  const carregar = async () => {
    setLoading(true);
    const [e, t, dxf] = await Promise.all([
      fetchPilotoEtapas(referenciaId),
      supabase.from("terceiros").select("id, nome, tipo_etapa, ativo").eq("ativo", true).order("nome"),
      hasActiveDxf(referenciaId),
    ]);
    setEtapas(e);
    setTerceiros(((t.data as any[]) || []) as Terceiro[]);
    setDxfOk(dxf);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    const ch = supabase
      .channel(`piloto-etapas-${referenciaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "piloto_etapas", filter: `referencia_id=eq.${referenciaId}` }, () => carregar())
      .on("postgres_changes", { event: "*", schema: "public", table: "modelagens_dxf", filter: `referencia_id=eq.${referenciaId}` }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenciaId]);

  const algumaConcluida = etapas.some((e) => e.status === "concluido");
  const atual = etapas.find((e) => e.status === "em_andamento");
  const podeEditarEtapas = !algumaConcluida;

  const abrirConfig = () => {
    if (etapas.length) {
      const configuradasAtuais = etapas
        .map((e) => e.tipo_etapa)
        .filter((t) => (PILOTO_ETAPAS_CONFIGURAVEIS as readonly string[]).includes(t));
      setSelecionadas(configuradasAtuais);
      const map: Record<string, string> = {};
      etapas.forEach((e) => { if (e.terceiro_id) map[e.tipo_etapa] = e.terceiro_id; });
      setTerceirosMap(map);
    } else {
      setSelecionadas([]);
      setTerceirosMap({});
    }
    setStep("selecionar");
    setConfigOpen(true);
  };

  const toggleEtapa = (et: string) => {
    setSelecionadas((s) => (s.includes(et) ? s.filter((x) => x !== et) : [...s, et]));
  };

  // Final sequence: fixed start + configurable (in their canonical order) + fixed end
  const configuraveisOrdenadas = PILOTO_ETAPAS_CONFIGURAVEIS.filter((e) => selecionadas.includes(e));
  const sequenciaFinal: string[] = [
    ...PILOTO_ETAPAS_FIXAS_INICIO,
    ...configuraveisOrdenadas,
    ...PILOTO_ETAPAS_FIXAS_FIM,
  ];
  const etapasComTerceiroSel = sequenciaFinal.filter((e) => ETAPAS_COM_TERCEIRO.has(e));

  // Modelista não atribui terceiros — isso é definido pelo PCP.
  const irProximoStep = () => salvarConfig();

  const salvarConfig = async () => {
    setSalvando(true);
    await (supabase.from("piloto_etapas") as any).delete().eq("referencia_id", referenciaId);
    const now = new Date().toISOString();
    const payload = sequenciaFinal.map((tipo, idx) => ({
      referencia_id: referenciaId,
      tipo_etapa: tipo,
      ordem: idx + 1,
      status: idx === 0 ? "em_andamento" : "pendente",
      data_inicio: idx === 0 ? now : null,
      terceiro_id: terceirosMap[tipo] || null,
    }));
    const { error } = await (supabase.from("piloto_etapas") as any).insert(payload);
    if (!error) {
      await (supabase.from("referencias") as any).update({ status: "em_desenvolvimento", updated_at: now }).eq("id", referenciaId);
    }
    setSalvando(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Etapas configuradas!" });
    setConfigOpen(false);
    carregar();
    onChanged?.();
  };

  const fazerAvancar = async () => {
    const r = await avancarEtapa(referenciaId);
    if (r.isAprovacaoCliente) { abrirDecisao(); return; }
    if (!r.ok) { toast({ title: "Não foi possível avançar", description: r.error, variant: "destructive" }); return; }
    toast({ title: "Etapa avançada" });
    carregar();
    onChanged?.();
  };

  const handleAvancar = () => {
    if (atual?.tipo_etapa === "aguardando_aprovacao_cliente") { abrirDecisao(); return; }
    fazerAvancar();
  };

  const abrirDecisao = () => {
    setDecisionMode("inicial");
    setFittingTexto("");
    setFittingNovaPiloto("sim");
    setFichasMissing(null);
    setDecisionOpen(true);
  };

  const handleLacrar = async (aprovadaComAlteracoes = false, alteracoes: string | null = null) => {
    setDecisionLoading(true);
    const r = await lacrarPiloto(referenciaId, { aprovadaComAlteracoes, alteracoes });
    setDecisionLoading(false);
    if (!r.ok) {
      if (r.fichas) setFichasMissing(r.fichas);
      else toast({ title: "Erro ao lacrar", description: r.error, variant: "destructive" });
      return;
    }
    toast({ title: aprovadaComAlteracoes ? "Piloto aprovada com alterações" : "Piloto lacrada!" });
    setDecisionOpen(false);
    carregar();
    onChanged?.();
  };

  const handleFittingSubmit = async () => {
    if (!fittingTexto.trim()) { toast({ title: "Descreva as correções", variant: "destructive" }); return; }
    if (fittingNovaPiloto === "sim") {
      setDecisionLoading(true);
      const r = await solicitarFittingNovaPiloto(referenciaId, fittingTexto.trim());
      setDecisionLoading(false);
      if (!r.ok) { toast({ title: "Erro", description: r.error, variant: "destructive" }); return; }
      toast({ title: "Fitting iniciado", description: "A referência voltou para Desenvolvimento de Modelagem." });
      setDecisionOpen(false);
      carregar();
      onChanged?.();
    } else {
      // NO: validate fichas + lacrar
      await handleLacrar(true, fittingTexto.trim());
    }
  };

  const bloqueadoPorDxf = atual?.tipo_etapa === "desenvolvimento_modelagem" && !dxfOk;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> Etapas da Piloto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : etapas.length === 0 ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">As etapas desta piloto ainda não foram configuradas.</p>
            <Button onClick={abrirConfig}><ListChecks className="h-4 w-4 mr-2" /> Configurar Etapas</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 flex-wrap">
              {etapas.map((e, i) => {
                const isAtual = e.status === "em_andamento";
                const isFeito = e.status === "concluido";
                const terc = terceiros.find((t) => t.id === e.terceiro_id);
                return (
                  <div key={e.id} className="flex items-center gap-1">
                    <div className={`px-3 py-2 rounded-md border text-xs flex items-center gap-1.5 ${
                      isAtual ? "bg-primary/15 border-primary/40 text-primary font-medium" :
                      isFeito ? "bg-muted text-muted-foreground border-border" :
                      "bg-background border-border text-foreground"
                    }`}>
                      {isFeito && <Check className="h-3 w-3" />}
                      <span className="font-medium">{i + 1}.</span>
                      <span>{labelEtapa(e.tipo_etapa)}</span>
                      {terc && <span className="text-muted-foreground">· {terc.nome}</span>}
                    </div>
                    {i < etapas.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2">
              {atual && (
                <Button
                  onClick={handleAvancar}
                  disabled={bloqueadoPorDxf}
                  title={bloqueadoPorDxf ? "Envie o arquivo DXF antes de avançar para o corte." : undefined}
                  className="gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  {atual.tipo_etapa === "aguardando_aprovacao_cliente" ? "Decidir Resultado" : "Avançar Etapa"}
                </Button>
              )}
              {podeEditarEtapas && (
                <Button variant="outline" onClick={abrirConfig} className="gap-2">
                  <Pencil className="h-4 w-4" /> Editar Etapas
                </Button>
              )}
              {!podeEditarEtapas && (
                <Badge variant="outline" className="text-xs">Sequência bloqueada (etapa concluída)</Badge>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Configurator */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Etapas da Piloto</DialogTitle>
            <DialogDescription>
              {step === "selecionar"
                ? "Selecione as etapas intermediárias adicionais. Desenvolvimento de Modelagem, Plotagem/Risco, Corte e Costura são sempre fixas no início, e Piloto Enviada ao Cliente + Aguardando Aprovação são sempre as duas últimas."
                : "Atribua um terceiro às etapas que envolvem operação externa (opcional)."}
            </DialogDescription>
          </DialogHeader>

          {step === "selecionar" ? (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-2">Etapas fixas (sempre presentes)</p>
                <div className="flex flex-wrap gap-2">
                  {PILOTO_ETAPAS_FIXAS_INICIO.map((et, i) => (
                    <Badge key={et} variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                      {i + 1}. {labelEtapa(et)}
                    </Badge>
                  ))}
                  {PILOTO_ETAPAS_FIXAS_FIM.map((et, i) => (
                    <Badge key={et} variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                      {sequenciaFinal.length - PILOTO_ETAPAS_FIXAS_FIM.length + i + 1}. {labelEtapa(et)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground mb-2">Etapas configuráveis</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PILOTO_ETAPAS_CONFIGURAVEIS.map((et) => {
                    const sel = selecionadas.includes(et);
                    const ordem = sel ? sequenciaFinal.indexOf(et) + 1 : null;
                    return (
                      <button
                        key={et}
                        type="button"
                        onClick={() => toggleEtapa(et)}
                        className={`relative text-left p-3 rounded-md border text-sm transition-all cursor-pointer ${
                          sel ? "bg-primary/15 border-primary/50 text-primary" : "bg-background border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="font-medium">{labelEtapa(et)}</div>
                        {ordem && (
                          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                            {ordem}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {etapasComTerceiroSel.map((et) => {
                const opcoes = terceiros.filter((t) => t.tipo_etapa === et);
                return (
                  <div key={et} className="space-y-1">
                    <Label>{labelEtapa(et)}</Label>
                    <Select
                      value={terceirosMap[et] || "__none__"}
                      onValueChange={(v) => setTerceirosMap((m) => ({ ...m, [et]: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem terceiro</SelectItem>
                        {opcoes.length === 0 && <SelectItem value="__empty__" disabled>Nenhum terceiro cadastrado para esta etapa</SelectItem>}
                        {opcoes.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            {step === "terceiros" && (
              <Button variant="outline" onClick={() => setStep("selecionar")}>Voltar</Button>
            )}
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            {step === "selecionar" ? (
              <Button onClick={irProximoStep}>
                {etapasComTerceiroSel.length ? "Continuar" : "Salvar"}
              </Button>
            ) : (
              <Button onClick={salvarConfig} disabled={salvando}>{salvando ? "Salvando..." : "Salvar Etapas"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decision Modal (aguardando_aprovacao_cliente) */}
      <Dialog open={decisionOpen} onOpenChange={(o) => { if (!decisionLoading) setDecisionOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resultado da aprovação da piloto</DialogTitle>
            <DialogDescription>
              {decisionMode === "inicial"
                ? "O que o cliente decidiu?"
                : "Descreva as correções solicitadas pelo cliente."}
            </DialogDescription>
          </DialogHeader>

          {fichasMissing && (!fichasMissing.tecnica || !fichasMissing.costura) && (
            <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-3 text-sm space-y-2">
              <div className="flex items-start gap-2 text-orange-700 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Para lacrar a piloto, finalize primeiro:</strong>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {!fichasMissing.tecnica && (
                      <a href="#ficha-tecnica" onClick={() => setDecisionOpen(false)} className="underline hover:no-underline">Ficha Técnica</a>
                    )}
                    {!fichasMissing.costura && (
                      <a href="#ficha-costura" onClick={() => setDecisionOpen(false)} className="underline hover:no-underline">Ficha de Costura</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {decisionMode === "inicial" ? (
            <div className="space-y-3 py-2">
              <Button
                onClick={() => handleLacrar(false)}
                disabled={decisionLoading}
                className="w-full justify-start gap-2 h-auto py-3"
              >
                <CheckCircle2 className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Piloto Aprovada — Lacrar</div>
                  <div className="text-xs opacity-90">Cliente aprovou sem alterações</div>
                </div>
              </Button>
              <Button
                onClick={() => { setDecisionMode("fitting"); setFichasMissing(null); }}
                disabled={decisionLoading}
                variant="outline"
                className="w-full justify-start gap-2 h-auto py-3"
              >
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div className="text-left">
                  <div className="font-medium">Fitting — Solicitar Correções</div>
                  <div className="text-xs text-muted-foreground">Cliente pediu ajustes</div>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Descreva as correções solicitadas pelo cliente *</Label>
                <Textarea
                  value={fittingTexto}
                  onChange={(e) => setFittingTexto(e.target.value)}
                  placeholder="Ex: encurtar 2cm na bainha, reforçar costura do ombro..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Será necessária uma nova piloto?</Label>
                <RadioGroup value={fittingNovaPiloto} onValueChange={(v) => setFittingNovaPiloto(v as "sim" | "nao")}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="sim" id="fp-sim" />
                    <Label htmlFor="fp-sim" className="cursor-pointer">Sim — refazer piloto com as correções</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="nao" id="fp-nao" />
                    <Label htmlFor="fp-nao" className="cursor-pointer">Não — aprovar e aplicar correções direto na produção</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDecisionMode("inicial")} disabled={decisionLoading}>Voltar</Button>
                <Button onClick={handleFittingSubmit} disabled={decisionLoading || !fittingTexto.trim()}>
                  {decisionLoading ? "Processando..." : fittingNovaPiloto === "sim" ? "Iniciar Fitting" : "Aprovar com alterações"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

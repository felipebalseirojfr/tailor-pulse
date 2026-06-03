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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, ListChecks, Pencil, ChevronRight, PlayCircle } from "lucide-react";
import {
  PILOTO_ETAPAS_DISPONIVEIS, ETAPAS_COM_TERCEIRO, labelEtapa,
  fetchPilotoEtapas, hasActiveDxf, avancarEtapa, PilotoEtapaRow,
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

  // Configurator state
  const [configOpen, setConfigOpen] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [step, setStep] = useState<"selecionar" | "terceiros">("selecionar");
  const [terceirosMap, setTerceirosMap] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  // Advance dialog
  const [confirmLacre, setConfirmLacre] = useState(false);

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
      setSelecionadas(etapas.map((e) => e.tipo_etapa));
      const map: Record<string, string> = {};
      etapas.forEach((e) => { if (e.terceiro_id) map[e.tipo_etapa] = e.terceiro_id; });
      setTerceirosMap(map);
    } else {
      setSelecionadas(["desenvolvimento_modelagem", "lacre_piloto"]);
      setTerceirosMap({});
    }
    setStep("selecionar");
    setConfigOpen(true);
  };

  const toggleEtapa = (et: string) => {
    if (et === "desenvolvimento_modelagem" || et === "lacre_piloto") return;
    setSelecionadas((s) =>
      s.includes(et) ? s.filter((x) => x !== et) : [...s.filter((x) => x !== "lacre_piloto"), et, "lacre_piloto"]
    );
  };

  const ordemFinal = PILOTO_ETAPAS_DISPONIVEIS.filter((e) => selecionadas.includes(e));
  const etapasComTerceiroSel = ordemFinal.filter((e) => ETAPAS_COM_TERCEIRO.has(e));

  const irProximoStep = () => {
    if (etapasComTerceiroSel.length === 0) return salvarConfig();
    setStep("terceiros");
  };

  const salvarConfig = async () => {
    setSalvando(true);
    // delete existing then insert
    await (supabase.from("piloto_etapas") as any).delete().eq("referencia_id", referenciaId);
    const now = new Date().toISOString();
    const payload = ordemFinal.map((tipo, idx) => ({
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
    if (!r.ok) { toast({ title: "Não foi possível avançar", description: r.error, variant: "destructive" }); return; }
    if (r.lacrou) toast({ title: "Piloto lacrada!", description: "Aprovada pelo cliente." });
    else toast({ title: "Etapa avançada" });
    carregar();
    onChanged?.();
  };

  const handleAvancar = () => {
    if (atual?.tipo_etapa === "lacre_piloto") { setConfirmLacre(true); return; }
    fazerAvancar();
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
                  <PlayCircle className="h-4 w-4" /> Avançar Etapa
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
                ? "Clique nas etapas que esta piloto vai percorrer. A ordem segue a sequência padrão de produção."
                : "Atribua um terceiro às etapas que envolvem operação externa (opcional)."}
            </DialogDescription>
          </DialogHeader>

          {step === "selecionar" ? (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PILOTO_ETAPAS_DISPONIVEIS.map((et) => {
                  const sel = selecionadas.includes(et);
                  const fixo = et === "desenvolvimento_modelagem" || et === "lacre_piloto";
                  const ordem = sel ? ordemFinal.indexOf(et) + 1 : null;
                  return (
                    <button
                      key={et}
                      type="button"
                      onClick={() => toggleEtapa(et)}
                      disabled={fixo}
                      className={`relative text-left p-3 rounded-md border text-sm transition-all ${
                        sel ? "bg-primary/15 border-primary/50 text-primary" : "bg-background border-border hover:border-primary/30"
                      } ${fixo ? "opacity-90 cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="font-medium">{labelEtapa(et)}</div>
                      {fixo && <div className="text-[10px] text-muted-foreground mt-0.5">Obrigatória</div>}
                      {ordem && (
                        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                          {ordem}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                A etapa <strong>Desenvolvimento de Modelagem</strong> é sempre a primeira e <strong>Lacre da Piloto</strong> sempre a última.
              </p>
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
              <Button onClick={irProximoStep} disabled={selecionadas.length < 2}>
                {etapasComTerceiroSel.length ? "Continuar" : "Salvar"}
              </Button>
            ) : (
              <Button onClick={salvarConfig} disabled={salvando}>{salvando ? "Salvando..." : "Salvar Etapas"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmLacre} onOpenChange={setConfirmLacre}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar lacre da piloto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação indica que a piloto foi aprovada pelo cliente e está pronta para precificação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmLacre(false); fazerAvancar(); }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

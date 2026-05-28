import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Loader2, FileCheck2, PackageCheck, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/useUserRoles";
import { parseLocalDate, toLocalISO, todayLocal } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

// Ordem canônica de tamanhos do romaneio físico da JFR
const TAMANHO_ORDEM = [
  "1","2","3","4","6","8","10","12","14","16",
  "PP","P","M","G","GG","XG","XXG","XGG","XGG2","XGG3","UNICO"
];
const sortTamanhos = (arr: string[]) =>
  [...arr].sort((a, b) => {
    const ia = TAMANHO_ORDEM.indexOf(a.toUpperCase());
    const ib = TAMANHO_ORDEM.indexOf(b.toUpperCase());
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

export interface FechamentoRow {
  id: string;
  pedido_id: string;
  referencia_id: string;
  cliente_id: string;
  quantidade_prevista: number;
  quantidade_entrada: number | null;
  quantidade_saida: number | null;
  quantidade_caixas: number | null;
  observacao_perda: string | null;
  status_nf: "pendente" | "emitida";
  numero_nf: string | null;
  data_emissao_nf: string | null;
  arquivo_nf_url: string | null;
  data_fechamento: string | null;
  grade_entrada?: Record<string, number> | null;
  grade_saida?: Record<string, number> | null;
  data_entrada?: string | null;
  responsavel_entrada?: string | null;
  data_saida?: string | null;
  responsavel_saida?: string | null;
  cliente_nome?: string;
  pedido_codigo?: string;
  referencia_codigo?: string;
  produto_modelo?: string;
}

export type FechamentoFase = "revisao" | "fechamento" | "nf";

export function getFechamentoFase(r: Pick<FechamentoRow, "quantidade_entrada" | "quantidade_saida" | "status_nf">): FechamentoFase {
  if (r.quantidade_entrada == null) return "revisao";
  if (r.quantidade_saida == null) return "fechamento";
  return "nf";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fechamento: FechamentoRow | null;
  fase?: FechamentoFase;
  onSaved: () => void;
}

export function FechamentoSheet({ open, onOpenChange, fechamento, fase: faseProp, onSaved }: Props) {
  const { hasAnyRole } = useUserRoles();
  const canEmitNf = hasAnyRole(["admin", "backoffice_fiscal", "pcp_closer"]);

  const [gradeEntrada, setGradeEntrada] = useState<Record<string, string>>({});
  const [gradeSaida, setGradeSaida] = useState<Record<string, string>>({});
  const [tamanhos, setTamanhos] = useState<string[]>([]);
  const [dataEntrada, setDataEntrada] = useState<Date | null>(null);
  const [respEntrada, setRespEntrada] = useState<string>("");
  const [dataSaida, setDataSaida] = useState<Date | null>(null);
  const [respSaida, setRespSaida] = useState<string>("");
  const [caixas, setCaixas] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [nfDialogOpen, setNfDialogOpen] = useState(false);
  const [numeroNf, setNumeroNf] = useState("");
  const [dataEmissao, setDataEmissao] = useState<Date>(todayLocal());
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [emitting, setEmitting] = useState(false);

  useEffect(() => {
    if (!fechamento) return;
    setCaixas(fechamento.quantidade_caixas?.toString() ?? "");
    setObs(fechamento.observacao_perda ?? "");
    setNumeroNf(fechamento.numero_nf ?? "");
    setDataEmissao(parseLocalDate(fechamento.data_emissao_nf) ?? todayLocal());

    const toStr = (g: Record<string, number> | null | undefined) =>
      Object.fromEntries(Object.entries(g ?? {}).map(([k, v]) => [k, String(v ?? "")]));
    setGradeEntrada(toStr(fechamento.grade_entrada));
    setGradeSaida(toStr(fechamento.grade_saida));
    setDataEntrada(parseLocalDate(fechamento.data_entrada) ?? todayLocal());
    setRespEntrada(fechamento.responsavel_entrada ?? "");
    setDataSaida(parseLocalDate(fechamento.data_saida) ?? todayLocal());
    setRespSaida(fechamento.responsavel_saida ?? "");

    supabase
      .from("pedidos")
      .select("grade_tamanhos")
      .eq("id", fechamento.pedido_id)
      .maybeSingle()
      .then(({ data }) => {
        const grade = (data?.grade_tamanhos ?? {}) as Record<string, number>;
        const keys = Object.keys(grade).filter((k) => Number(grade[k]) > 0);
        setTamanhos(sortTamanhos(keys));
      });
  }, [fechamento]);

  if (!fechamento) return null;

  const fase: FechamentoFase = faseProp ?? getFechamentoFase(fechamento);

  const sumGrade = (g: Record<string, string>) =>
    Object.values(g).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const sumNumGrade = (g: Record<string, number> | null | undefined) =>
    Object.values(g ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const ent = sumGrade(gradeEntrada);
  const sai = sumGrade(gradeSaida);
  const diferenca = ent - sai;
  const hasEntrada = Object.values(gradeEntrada).some((v) => v !== "" && v != null && parseInt(v) > 0);
  const hasSaida = Object.values(gradeSaida).some((v) => v !== "" && v != null && parseInt(v) > 0);

  const toNum = (g: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(g)
        .map(([k, v]) => [k, parseInt(v) || 0])
        .filter(([, v]) => (v as number) > 0)
    );

  const salvarEntrada = async () => {
    if (!hasEntrada) {
      toast.error("Preencha a grade de entrada");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("fechamentos")
        .update({
          grade_entrada: toNum(gradeEntrada),
          quantidade_entrada: ent,
          data_entrada: dataEntrada ? toLocalISO(dataEntrada) : toLocalISO(todayLocal()),
          responsavel_entrada: respEntrada.trim() || null,
        })
        .eq("id", fechamento.id);
      if (error) throw error;
      toast.success("Entrada confirmada — peça enviada para fechamento");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar entrada");
    } finally {
      setSaving(false);
    }
  };

  const salvarFechamento = async () => {
    if (!hasSaida) {
      toast.error("Preencha a grade de saída");
      return;
    }
    if (diferenca !== 0 && !obs.trim()) {
      toast.error("Observação de perda é obrigatória quando há diferença");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("fechamentos")
        .update({
          grade_saida: toNum(gradeSaida),
          quantidade_saida: sai,
          quantidade_caixas: caixas === "" ? null : parseInt(caixas),
          observacao_perda: obs.trim() || null,
          data_saida: dataSaida ? toLocalISO(dataSaida) : toLocalISO(todayLocal()),
          responsavel_saida: respSaida.trim() || null,
          data_fechamento: new Date().toISOString(),
        })
        .eq("id", fechamento.id);
      if (error) throw error;
      toast.success("Fechamento salvo — pronto para emissão de NF");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar fechamento");
    } finally {
      setSaving(false);
    }
  };

  const handleEmitirNf = async () => {
    if (!numeroNf.trim()) {
      toast.error("Número da NF é obrigatório");
      return;
    }
    setEmitting(true);
    try {
      let arquivoUrl = fechamento.arquivo_nf_url;
      if (arquivo) {
        const ext = arquivo.name.split(".").pop();
        const path = `${fechamento.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("nf-files").upload(path, arquivo, { upsert: true });
        if (upErr) throw upErr;
        arquivoUrl = path;
      }

      const { error } = await supabase
        .from("fechamentos")
        .update({
          status_nf: "emitida",
          numero_nf: numeroNf.trim(),
          data_emissao_nf: toLocalISO(dataEmissao),
          arquivo_nf_url: arquivoUrl,
          data_fechamento: fechamento.data_fechamento ?? new Date().toISOString(),
        })
        .eq("id", fechamento.id);
      if (error) throw error;

      await advanceStage(fechamento.pedido_id, fechamento.referencia_id);

      toast.success("NF emitida e etapa avançada para Entrega");
      setNfDialogOpen(false);
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao emitir NF");
    } finally {
      setEmitting(false);
    }
  };

  const nfEmitida = fechamento.status_nf === "emitida";

  const faseInfo: Record<FechamentoFase, { titulo: string; descricao: string; icon: any }> = {
    revisao: {
      titulo: "Fase 1 — Entrada na revisão",
      descricao: "Conte a grade da referência que acabou de chegar para a revisão.",
      icon: PackageCheck,
    },
    fechamento: {
      titulo: "Fase 2 — Fechamento",
      descricao: "Conte novamente após revisão/acabamento para confirmar a quantidade final.",
      icon: ClipboardList,
    },
    nf: {
      titulo: "Fase 3 — Emissão de NF",
      descricao: "Emita a nota fiscal para liberar o pedido para entrega.",
      icon: FileCheck2,
    },
  };
  const FaseIcon = faseInfo[fase].icon;

  const ResumoGrade = ({ label, grade, total, data, resp }: {
    label: string;
    grade: Record<string, number> | null | undefined;
    total: number;
    data?: string | null;
    resp?: string | null;
  }) => {
    const entries = Object.entries(grade ?? {}).filter(([, v]) => Number(v) > 0);
    const sorted = sortTamanhos(entries.map(([k]) => k)).map((k) => [k, (grade as any)?.[k]] as [string, number]);
    return (
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{label}</p>
          <Badge variant="secondary">Total: {total}</Badge>
        </div>
        {sorted.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {sorted.map(([t, v]) => (
              <div key={t} className="text-xs rounded border border-border px-2 py-1 bg-background">
                <span className="text-muted-foreground uppercase mr-1">{t}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sem grade registrada</p>
        )}
        {(data || resp) && (
          <p className="text-xs text-muted-foreground">
            {data && format(parseLocalDate(data)!, "dd/MM/yyyy")}
            {data && resp && " · "}
            {resp && `por ${resp}`}
          </p>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FaseIcon className="h-5 w-5 text-primary" />
            {fechamento.referencia_codigo || fechamento.pedido_codigo}
          </SheetTitle>
          <SheetDescription>{fechamento.cliente_nome}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Cabeçalho da fase */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary">{faseInfo[fase].titulo}</p>
            <p className="text-xs text-muted-foreground mt-1">{faseInfo[fase].descricao}</p>
          </div>

          {/* Header read-only */}
          <div className="rounded-md border border-border bg-muted/40 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{fechamento.cliente_nome}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pedido</span><span className="font-medium">{fechamento.pedido_codigo}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Referência</span><span className="font-medium">{fechamento.referencia_codigo}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Peça</span><span className="font-medium">{fechamento.produto_modelo}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Qtd prevista</span><span className="font-medium">{fechamento.quantidade_prevista}</span></div>
          </div>

          {tamanhos.length === 0 && fase !== "nf" ? (
            <p className="text-xs text-muted-foreground">
              Este pedido não tem grade de tamanhos definida. Edite o pedido para registrar a grade.
            </p>
          ) : (
            <>
              {/* FASE 1 — Revisão (entrada) */}
              {fase === "revisao" && (
                <div className="space-y-4">
                  <div className="rounded-md border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Contagem na entrada da revisão</p>
                      <Badge variant="secondary">Total: {ent}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Data de entrada</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start font-normal">
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {dataEntrada ? format(dataEntrada, "dd/MM/yyyy") : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dataEntrada ?? undefined} onSelect={(d) => setDataEntrada(d ?? null)} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs">Contagem feita por</Label>
                        <Input value={respEntrada} onChange={(e) => setRespEntrada(e.target.value)} placeholder="Nome" className="h-9" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {tamanhos.map((t) => (
                        <div key={`ent-${t}`}>
                          <Label className="text-[10px] uppercase text-muted-foreground">{t}</Label>
                          <Input
                            type="number"
                            min={0}
                            value={gradeEntrada[t] ?? ""}
                            onChange={(e) => setGradeEntrada({ ...gradeEntrada, [t]: e.target.value })}
                            className="h-9 text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={salvarEntrada} disabled={saving} className="w-full">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar entrada na revisão
                  </Button>
                </div>
              )}

              {/* FASE 2 — Fechamento (saída) */}
              {fase === "fechamento" && (
                <div className="space-y-4">
                  <ResumoGrade
                    label="Entrada registrada na revisão"
                    grade={fechamento.grade_entrada}
                    total={fechamento.quantidade_entrada ?? sumNumGrade(fechamento.grade_entrada)}
                    data={fechamento.data_entrada}
                    resp={fechamento.responsavel_entrada}
                  />

                  <div className="rounded-md border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Contagem final (pós-revisão)</p>
                      <Badge variant="secondary">Total: {sai}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Data do fechamento</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start font-normal">
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {dataSaida ? format(dataSaida, "dd/MM/yyyy") : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dataSaida ?? undefined} onSelect={(d) => setDataSaida(d ?? null)} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs">Contagem feita por</Label>
                        <Input value={respSaida} onChange={(e) => setRespSaida(e.target.value)} placeholder="Nome" className="h-9" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {tamanhos.map((t) => (
                        <div key={`sai-${t}`}>
                          <Label className="text-[10px] uppercase text-muted-foreground">{t}</Label>
                          <Input
                            type="number"
                            min={0}
                            value={gradeSaida[t] ?? ""}
                            onChange={(e) => setGradeSaida({ ...gradeSaida, [t]: e.target.value })}
                            className="h-9 text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Caixas</Label>
                      <Input type="number" value={caixas} onChange={(e) => setCaixas(e.target.value)} />
                    </div>
                    <div>
                      <Label>Diferença (entrada − saída)</Label>
                      <div className={cn(
                        "h-10 flex items-center px-3 rounded-md border text-sm font-medium",
                        !hasSaida ? "text-muted-foreground" :
                        diferenca > 0 ? "text-destructive border-destructive/40" :
                        diferenca < 0 ? "text-orange-500 border-orange-500/40" :
                        "text-muted-foreground"
                      )}>
                        {!hasSaida ? "—" : diferenca}
                      </div>
                    </div>
                  </div>
                  {hasSaida && diferenca < 0 && (
                    <p className="text-xs text-orange-500">⚠ Saída maior que entrada — verifique a contagem</p>
                  )}
                  <div>
                    <Label>
                      Observação de perda{" "}
                      {hasSaida && diferenca !== 0 && <span className="text-destructive">*</span>}
                    </Label>
                    <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} placeholder="Justifique a diferença..." />
                  </div>
                  <Button onClick={salvarFechamento} disabled={saving} className="w-full">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar fechamento e enviar para NF
                  </Button>
                </div>
              )}

              {/* FASE 3 — Emissão de NF */}
              {fase === "nf" && (
                <div className="space-y-4">
                  <ResumoGrade
                    label="Entrada (revisão)"
                    grade={fechamento.grade_entrada}
                    total={fechamento.quantidade_entrada ?? 0}
                    data={fechamento.data_entrada}
                    resp={fechamento.responsavel_entrada}
                  />
                  <ResumoGrade
                    label="Saída (fechamento)"
                    grade={fechamento.grade_saida}
                    total={fechamento.quantidade_saida ?? 0}
                    data={fechamento.data_saida}
                    resp={fechamento.responsavel_saida}
                  />
                  {fechamento.quantidade_entrada != null && fechamento.quantidade_saida != null && (
                    <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                      <span className="text-muted-foreground">Diferença</span>
                      <span className={cn(
                        "font-medium",
                        fechamento.quantidade_entrada - fechamento.quantidade_saida > 0 ? "text-destructive" :
                        fechamento.quantidade_entrada - fechamento.quantidade_saida < 0 ? "text-orange-500" : ""
                      )}>
                        {fechamento.quantidade_entrada - fechamento.quantidade_saida}
                      </span>
                    </div>
                  )}
                  {fechamento.observacao_perda && (
                    <div className="rounded-md border border-border p-3 text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Observação de perda</p>
                      <p>{fechamento.observacao_perda}</p>
                    </div>
                  )}

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Nota Fiscal</h3>
                      <Badge variant={nfEmitida ? "default" : "secondary"}>{nfEmitida ? "Emitida" : "Pendente"}</Badge>
                    </div>

                    {nfEmitida ? (
                      <div className="rounded-md border p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Número</span><span className="font-medium">{fechamento.numero_nf}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Data emissão</span><span className="font-medium">{fechamento.data_emissao_nf ? format(parseLocalDate(fechamento.data_emissao_nf)!, "dd/MM/yyyy") : "—"}</span></div>
                        {fechamento.arquivo_nf_url && (
                          <button
                            type="button"
                            onClick={async () => {
                              const url = fechamento.arquivo_nf_url!;
                              const path = url.startsWith("http")
                                ? url.split("/nf-files/")[1] ?? null
                                : url;
                              if (!path) { toast.error("Arquivo indisponível"); return; }
                              const { data, error } = await supabase.storage.from("nf-files").createSignedUrl(path, 60);
                              if (error || !data) { toast.error("Não foi possível gerar link de download"); return; }
                              window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                            }}
                            className="inline-flex items-center gap-2 text-primary hover:underline"
                          >
                            <Download className="h-4 w-4" /> Baixar arquivo da NF
                          </button>
                        )}
                      </div>
                    ) : canEmitNf ? (
                      <Button onClick={() => setNfDialogOpen(true)} variant="default" className="w-full">
                        <FileCheck2 className="h-4 w-4" /> Emitir NF e avançar para Entrega
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Apenas Admin / Fiscal / PCP podem emitir NF.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dialog emissão */}
        <Dialog open={nfDialogOpen} onOpenChange={setNfDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Emitir Nota Fiscal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Número da NF *</Label><Input value={numeroNf} onChange={(e) => setNumeroNf(e.target.value)} /></div>
              <div>
                <Label>Data de emissão *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dataEmissao, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataEmissao} onSelect={(d) => d && setDataEmissao(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Arquivo da NF (PDF/XML, opcional)</Label>
                <Input type="file" accept=".pdf,.xml" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNfDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleEmitirNf} disabled={emitting}>
                {emitting && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

async function advanceStage(pedidoId: string, referenciaId: string) {
  const { data: etapas } = await supabase
    .from("etapas_producao")
    .select("id, tipo_etapa, ordem, status, referencia_id")
    .eq("pedido_id", pedidoId)
    .order("ordem", { ascending: true });
  if (!etapas) return;
  const refEtapas = etapas.filter((e) => e.referencia_id === referenciaId || e.referencia_id == null);
  const acabIdx = refEtapas.findIndex((e) => e.tipo_etapa === "acabamento" && e.status !== "concluido");
  if (acabIdx === -1) return;
  const acab = refEtapas[acabIdx];
  await supabase.from("etapas_producao").update({ status: "concluido", data_termino: new Date().toISOString() }).eq("id", acab.id);
  const next = refEtapas[acabIdx + 1];
  if (next) {
    await supabase.from("etapas_producao").update({
      status: "em_andamento",
      data_inicio: new Date().toISOString(),
    }).eq("id", next.id);
  }
}

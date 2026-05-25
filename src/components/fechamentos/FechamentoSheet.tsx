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
import { CalendarIcon, Download, Loader2, FileCheck2 } from "lucide-react";
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
  cliente_nome?: string;
  pedido_codigo?: string;
  referencia_codigo?: string;
  produto_modelo?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fechamento: FechamentoRow | null;
  onSaved: () => void;
}

export function FechamentoSheet({ open, onOpenChange, fechamento, onSaved }: Props) {
  const { hasAnyRole } = useUserRoles();
  const canEmitNf = hasAnyRole(["admin", "backoffice_fiscal", "pcp_closer"]);

  const [gradeEntrada, setGradeEntrada] = useState<Record<string, string>>({});
  const [gradeSaida, setGradeSaida] = useState<Record<string, string>>({});
  const [tamanhos, setTamanhos] = useState<string[]>([]);
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

    // Buscar grade de tamanhos do pedido para saber quais tamanhos exibir
    supabase
      .from("pedidos")
      .select("grade_tamanhos")
      .eq("id", fechamento.pedido_id)
      .maybeSingle()
      .then(({ data }) => {
        const grade = (data?.grade_tamanhos ?? {}) as Record<string, number>;
        const keys = Object.keys(grade).filter((k) => Number(grade[k]) > 0);
        setTamanhos(keys);
      });
  }, [fechamento]);

  if (!fechamento) return null;

  const sumGrade = (g: Record<string, string>) =>
    Object.values(g).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const ent = sumGrade(gradeEntrada);
  const sai = sumGrade(gradeSaida);
  const diferenca = ent - sai;
  const hasEntrada = Object.values(gradeEntrada).some((v) => v !== "" && v != null);
  const hasSaida = Object.values(gradeSaida).some((v) => v !== "" && v != null);

  const handleSalvarContagem = async () => {
    if (!hasEntrada && !hasSaida) {
      toast.error("Preencha pelo menos uma das grades");
      return;
    }
    if (hasEntrada && hasSaida && diferenca !== 0 && !obs.trim()) {
      toast.error("Observação de perda é obrigatória quando há diferença");
      return;
    }
    setSaving(true);
    try {
      const toNum = (g: Record<string, string>) =>
        Object.fromEntries(
          Object.entries(g)
            .map(([k, v]) => [k, parseInt(v) || 0])
            .filter(([, v]) => (v as number) > 0)
        );
      const { error } = await supabase
        .from("fechamentos")
        .update({
          grade_entrada: toNum(gradeEntrada),
          grade_saida: toNum(gradeSaida),
          quantidade_entrada: hasEntrada ? ent : null,
          quantidade_saida: hasSaida ? sai : null,
          quantidade_caixas: caixas === "" ? null : parseInt(caixas),
          observacao_perda: obs.trim() || null,
          data_fechamento: new Date().toISOString(),
        })
        .eq("id", fechamento.id);
      if (error) throw error;
      toast.success("Contagem salva");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
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
        // Store storage path (private bucket); signed URL is generated on demand
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

      // Auto-advance: marca acabamento como concluido e proxima etapa como em_andamento
      await advanceStage(fechamento.pedido_id, fechamento.referencia_id);

      toast.success("NF emitida e etapa avançada para Entrega");
      setNfDialogOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Erro ao emitir NF");
    } finally {
      setEmitting(false);
    }
  };

  const nfEmitida = fechamento.status_nf === "emitida";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Fechamento — {fechamento.referencia_codigo || fechamento.pedido_codigo}</SheetTitle>
          <SheetDescription>{fechamento.cliente_nome}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header read-only */}
          <div className="rounded-md border border-border bg-muted/40 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{fechamento.cliente_nome}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pedido</span><span className="font-medium">{fechamento.pedido_codigo}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Referência</span><span className="font-medium">{fechamento.referencia_codigo}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Peça</span><span className="font-medium">{fechamento.produto_modelo}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Qtd prevista</span><span className="font-medium">{fechamento.quantidade_prevista}</span></div>
          </div>

          {/* Contagens por tamanho */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contagem por tamanho</h3>

            {tamanhos.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Este pedido não tem grade de tamanhos definida. Edite o pedido para registrar a grade.
              </p>
            ) : (
              <>
                {/* Etapa 1 — Entrada (chegada na passadoria) */}
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">1. Entrada na passadoria</p>
                      <p className="text-xs text-muted-foreground">O que chegou para a passadeira</p>
                    </div>
                    <Badge variant="secondary">Total: {ent}</Badge>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
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

                {/* Etapa 2 — Saída (já revisado / nas caixas) */}
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">2. Saída para caixas</p>
                      <p className="text-xs text-muted-foreground">O que já foi revisado e embalado</p>
                    </div>
                    <Badge variant="secondary">Total: {sai}</Badge>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
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
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Caixas</Label>
                <Input type="number" value={caixas} onChange={(e) => setCaixas(e.target.value)} />
              </div>
              <div>
                <Label>Diferença (entrada − saída)</Label>
                <div className={cn(
                  "h-10 flex items-center px-3 rounded-md border text-sm font-medium",
                  !hasEntrada || !hasSaida ? "text-muted-foreground" :
                  diferenca > 0 ? "text-destructive border-destructive/40" :
                  diferenca < 0 ? "text-orange-500 border-orange-500/40" :
                  "text-muted-foreground"
                )}>
                  {!hasEntrada || !hasSaida ? "—" : diferenca}
                </div>
              </div>
            </div>
            {hasEntrada && hasSaida && diferenca < 0 && (
              <p className="text-xs text-orange-500">⚠ Saída maior que entrada — verifique a contagem</p>
            )}
            <div>
              <Label>
                Observação de perda{" "}
                {hasEntrada && hasSaida && diferenca !== 0 && <span className="text-destructive">*</span>}
              </Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} placeholder="Justifique a diferença..." />
            </div>
            <Button onClick={handleSalvarContagem} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar contagem
            </Button>
          </div>


          {/* NF */}
          <div className="space-y-3 border-t pt-6">
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
                      // Backward compat: legacy public URLs were stored fully; new format stores the path.
                      const path = url.startsWith("http")
                        ? url.split("/nf-files/")[1] ?? null
                        : url;
                      if (!path) {
                        toast.error("Arquivo indisponível");
                        return;
                      }
                      const { data, error } = await supabase.storage
                        .from("nf-files")
                        .createSignedUrl(path, 60);
                      if (error || !data) {
                        toast.error("Não foi possível gerar link de download");
                        return;
                      }
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
                <FileCheck2 className="h-4 w-4" /> Marcar NF como emitida
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Apenas Admin / Fiscal / PCP podem emitir NF.</p>
            )}
          </div>
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
  // Find current acabamento etapa for this pedido+referencia
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

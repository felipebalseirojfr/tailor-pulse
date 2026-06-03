import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Scissors, Plus, Trash2, Pencil, ArrowUp, ArrowDown, Upload, Image as ImgIcon,
  CheckCircle2, Lock, Unlock, ChevronDown, ChevronRight, Loader2, Sparkles,
} from "lucide-react";

const TAMANHOS = ["1","2","4","6","8","10","12","14","PP","P","M","G","GG","XG","XGG","XGG1","XGG2","XGG3"];
const PONTO_SUGESTOES = [
  "Overlock 3 fios","Overlock 4 fios","Reta simples","Reta dupla",
  "Galoneira 2 agulhas","Galoneira 3 agulhas","Travete","Zigzag",
];
const MAX_BYTES = 20 * 1024 * 1024;

interface Props {
  referenciaId: string;
  onSummaryChange?: (s: { tecidos: number; medidas: number; status: string } | null) => void;
}

type Ficha = { id: string; status: string; observacoes_gerais: string | null; finalizada_em: string | null };
type Foto = { id: string; lado: string; foto_url: string };
type TecidoRow = {
  id: string;
  tecido_variacao_id: string;
  consumo_kg_por_peca: number | null;
  consumo_m_por_peca: number | null;
  consumo_calculado_automaticamente: boolean;
  fornecido_pelo_cliente: boolean;
  observacoes: string | null;
};
type MedidaRow = { id: string; nome_medida: string; ordem: number; medidas_por_tamanho: Record<string, number>; gradacao_obs: string | null };
type AviRow = { id: string; aviamento_id: string; localizacao: string | null; como_pregar: string | null; medidas_por_tamanho: Record<string, string>; quantidade_por_tamanho: Record<string, number>; observacoes: string | null };
type LinhaRow = { id: string; descricao: string; cor: string; numero_fio: string | null; localizacao: string | null; ordem: number };
type PontoRow = { id: string; parte_peca: string; tipo_ponto: string; observacoes: string | null; ordem: number };
type EntreRow = { id: string; localizacao: string; tipo_entretela: string; observacoes: string | null; ordem: number };
type DobraRow = { id: string; parte_peca: string; descricao: string; medida_cm: number | null; observacoes: string | null; ordem: number };
type MontRow = { id: string; passo: number; descricao: string; observacoes: string | null };
type FotoDet = { id: string; foto_url: string; legenda: string | null; ordem: number };

type VariacaoOpt = { id: string; nome: string; cor: string };
type AviOpt = { id: string; nome: string; categoria: string };

export default function FichaCosturaSection({ referenciaId, onSummaryChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [fotosPiloto, setFotosPiloto] = useState<Record<string, string>>({});
  const [tecidos, setTecidos] = useState<TecidoRow[]>([]);
  const [medidas, setMedidas] = useState<MedidaRow[]>([]);
  const [avis, setAvis] = useState<AviRow[]>([]);
  const [linhas, setLinhas] = useState<LinhaRow[]>([]);
  const [pontos, setPontos] = useState<PontoRow[]>([]);
  const [entres, setEntres] = useState<EntreRow[]>([]);
  const [dobras, setDobras] = useState<DobraRow[]>([]);
  const [monts, setMonts] = useState<MontRow[]>([]);
  const [fotosDet, setFotosDet] = useState<FotoDet[]>([]);
  const [fotosDetUrls, setFotosDetUrls] = useState<Record<string, string>>({});
  const [variacoes, setVariacoes] = useState<VariacaoOpt[]>([]);
  const [aviamentos, setAviamentos] = useState<AviOpt[]>([]);
  const [obsLocal, setObsLocal] = useState("");
  const [entreOpen, setEntreOpen] = useState(false);
  const [expandedAvi, setExpandedAvi] = useState<Set<string>>(new Set());

  const readonly = ficha?.status === "finalizada";

  // ---------- Load ----------
  const load = useCallback(async () => {
    setLoading(true);
    const { data: f } = await (supabase.from("fichas_costura" as any) as any)
      .select("*").eq("referencia_id", referenciaId).maybeSingle();
    setFicha((f as any) || null);
    setObsLocal((f as any)?.observacoes_gerais || "");

    // Fotos piloto (read-only)
    const { data: fp } = await (supabase.from("referencias_fotos_piloto" as any) as any)
      .select("*").eq("referencia_id", referenciaId);
    const urls: Record<string, string> = {};
    await Promise.all(((fp || []) as Foto[]).map(async (foto) => {
      const { data } = await supabase.storage.from("fotos-piloto").createSignedUrl(foto.foto_url, 3600);
      if (data?.signedUrl) urls[foto.lado] = data.signedUrl;
    }));
    setFotosPiloto(urls);

    if (f) {
      const fid = (f as any).id;
      const [t, m, a, l, p, en, d, mt, fo] = await Promise.all([
        (supabase.from("fichas_costura_tecidos" as any) as any).select("*").eq("ficha_costura_id", fid),
        (supabase.from("fichas_costura_medidas" as any) as any).select("*").eq("ficha_costura_id", fid).order("ordem"),
        (supabase.from("fichas_costura_aviamentos_grade" as any) as any).select("*").eq("ficha_costura_id", fid),
        (supabase.from("fichas_costura_linhas" as any) as any).select("*").eq("ficha_costura_id", fid).order("ordem"),
        (supabase.from("fichas_costura_pontos" as any) as any).select("*").eq("ficha_costura_id", fid).order("ordem"),
        (supabase.from("fichas_costura_entretelas" as any) as any).select("*").eq("ficha_costura_id", fid).order("ordem"),
        (supabase.from("fichas_costura_dobras" as any) as any).select("*").eq("ficha_costura_id", fid).order("ordem"),
        (supabase.from("fichas_costura_montagem" as any) as any).select("*").eq("ficha_costura_id", fid).order("passo"),
        (supabase.from("fichas_costura_fotos" as any) as any).select("*").eq("ficha_costura_id", fid).order("ordem"),
      ]);
      setTecidos((t.data || []) as TecidoRow[]);
      setMedidas((m.data || []) as MedidaRow[]);
      setAvis((a.data || []) as AviRow[]);
      setLinhas((l.data || []) as LinhaRow[]);
      setPontos((p.data || []) as PontoRow[]);
      setEntres((en.data || []) as EntreRow[]);
      setDobras((d.data || []) as DobraRow[]);
      setMonts((mt.data || []) as MontRow[]);
      const fotoList = (fo.data || []) as FotoDet[];
      setFotosDet(fotoList);
      const fUrls: Record<string, string> = {};
      await Promise.all(fotoList.map(async (foto) => {
        const { data } = await supabase.storage.from("fichas-costura-fotos").createSignedUrl(foto.foto_url, 3600);
        if (data?.signedUrl) fUrls[foto.id] = data.signedUrl;
      }));
      setFotosDetUrls(fUrls);
    } else {
      setTecidos([]); setMedidas([]); setAvis([]); setLinhas([]); setPontos([]);
      setEntres([]); setDobras([]); setMonts([]); setFotosDet([]); setFotosDetUrls({});
    }

    // Catalogs
    const { data: vRaw } = await (supabase.from("tecidos_variacoes" as any) as any)
      .select("id, cor, ativo, tecido_id, tecidos(nome)").eq("ativo", true);
    setVariacoes(((vRaw || []) as any[]).map((r) => ({
      id: r.id, cor: r.cor, nome: r.tecidos?.nome || "Tecido",
    })));
    const { data: aRaw } = await supabase.from("aviamentos")
      .select("id, nome, categoria, ativo").eq("ativo", true);
    setAviamentos(((aRaw || []) as any[]).map((r) => ({ id: r.id, nome: r.nome, categoria: r.categoria })));

    setLoading(false);
  }, [referenciaId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!ficha) { onSummaryChange?.(null); return; }
    onSummaryChange?.({ tecidos: tecidos.length, medidas: medidas.length, status: ficha.status });
  }, [ficha, tecidos.length, medidas.length, onSummaryChange]);

  const criarFicha = async () => {
    const { error } = await (supabase.from("fichas_costura" as any) as any)
      .insert({ referencia_id: referenciaId });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Ficha de Costura criada" });
    load();
  };

  const finalizar = async () => {
    if (tecidos.length < 1 || medidas.length < 1) {
      return toast({ title: "Adicione pelo menos 1 tecido e 1 medida.", variant: "destructive" });
    }
    if (!confirm("Ao finalizar, a Ficha de Costura não poderá ser editada sem reabertura. Confirmar?")) return;
    const { error } = await (supabase.from("fichas_costura" as any) as any)
      .update({ status: "finalizada", finalizada_em: new Date().toISOString() })
      .eq("id", ficha!.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Ficha finalizada" });
    load();
  };

  const reabrir = async () => {
    const { error } = await (supabase.from("fichas_costura" as any) as any)
      .update({ status: "rascunho", finalizada_em: null }).eq("id", ficha!.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Ficha reaberta" });
    load();
  };

  const saveObs = async () => {
    if (!ficha) return;
    if (obsLocal === (ficha.observacoes_gerais || "")) return;
    await (supabase.from("fichas_costura" as any) as any)
      .update({ observacoes_gerais: obsLocal }).eq("id", ficha.id);
  };

  if (loading) {
    return (
      <Card id="ficha-costura" className="scroll-mt-24">
        <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="h-5 w-5"/> Ficha de Costura</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Carregando...</p></CardContent>
      </Card>
    );
  }

  if (!ficha) {
    return (
      <Card id="ficha-costura" className="scroll-mt-24">
        <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="h-5 w-5"/> Ficha de Costura</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Esta referência ainda não tem Ficha de Costura.</p>
          <Button onClick={criarFicha}><Plus className="h-4 w-4 mr-1"/>Criar Ficha de Costura</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="ficha-costura" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2"><Scissors className="h-5 w-5"/> Ficha de Costura</CardTitle>
        <div className="flex items-center gap-2">
          {readonly ? (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1"/>
              Finalizada {ficha.finalizada_em && `em ${new Date(ficha.finalizada_em).toLocaleDateString("pt-BR")}`}
            </Badge>
          ) : (
            <Badge variant="outline">Rascunho</Badge>
          )}
          {readonly ? (
            <Button size="sm" variant="outline" onClick={reabrir}><Unlock className="h-4 w-4 mr-1"/>Reabrir</Button>
          ) : (
            <Button size="sm" onClick={finalizar}><Lock className="h-4 w-4 mr-1"/>Finalizar Ficha de Costura</Button>
          )}
          <TooltipProvider><Tooltip>
            <TooltipTrigger asChild><span><Button size="sm" variant="outline" disabled>Gerar PDF</Button></span></TooltipTrigger>
            <TooltipContent>Disponível em breve</TooltipContent>
          </Tooltip></TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* 1 — Fotos piloto */}
        <Section title="Fotos da Piloto (referência)">
          {fotosPiloto.frente || fotosPiloto.costas ? (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {(["frente","costas"] as const).map((lado) => (
                <div key={lado} className="space-y-1">
                  <Label className="text-xs capitalize">{lado}</Label>
                  {fotosPiloto[lado] ? (
                    <img src={fotosPiloto[lado]} alt={`Piloto ${lado}`} className="rounded-md border w-full aspect-square object-cover"/>
                  ) : (
                    <div className="rounded-md border border-dashed h-40 flex items-center justify-center text-xs text-muted-foreground">Não enviada</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Fotos da piloto ainda não enviadas. Envie em Ficha Técnica → Fotos da Piloto.
            </p>
          )}
        </Section>

        {/* 2 — Tecidos */}
        <TecidosSection
          ficha={ficha} tecidos={tecidos} variacoes={variacoes} referenciaId={referenciaId}
          readonly={readonly} reload={load}
        />

        {/* 3 — Medidas */}
        <MedidasSection
          ficha={ficha} medidas={medidas} readonly={readonly} reload={load}
        />

        {/* 4 — Aviamentos por Grade */}
        <AviGradeSection
          ficha={ficha} avis={avis} aviamentos={aviamentos} readonly={readonly} reload={load}
          expanded={expandedAvi} setExpanded={setExpandedAvi}
        />

        {/* 5 — Linhas */}
        <GenericListSection
          title="Linhas e Fios" rows={linhas as any} readonly={readonly}
          table="fichas_costura_linhas" fichaId={ficha.id} reload={load}
          columns={[
            { key: "descricao", label: "Descrição", required: true },
            { key: "cor", label: "Cor", required: true },
            { key: "numero_fio", label: "Nº Fio" },
            { key: "localizacao", label: "Localização" },
          ]}
        />

        {/* 6 — Pontos */}
        <GenericListSection
          title="Tipos de Ponto" rows={pontos as any} readonly={readonly}
          table="fichas_costura_pontos" fichaId={ficha.id} reload={load}
          columns={[
            { key: "parte_peca", label: "Parte da Peça", required: true },
            { key: "tipo_ponto", label: "Tipo de Ponto", required: true, suggestions: PONTO_SUGESTOES },
            { key: "observacoes", label: "Observações" },
          ]}
        />

        {/* 7 — Entretelas (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setEntreOpen((v) => !v)}
            className="flex items-center gap-2 font-medium hover:text-foreground"
          >
            {entreOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
            Entretela e Interlining
          </button>
          {!entreOpen && (
            <p className="text-xs text-muted-foreground ml-6 mt-1">
              Adicione se a peça utilizar entretela ou interlining
            </p>
          )}
          {entreOpen && (
            <div className="mt-3">
              <GenericListSection
                title="" rows={entres as any} readonly={readonly}
                table="fichas_costura_entretelas" fichaId={ficha.id} reload={load}
                columns={[
                  { key: "localizacao", label: "Localização", required: true },
                  { key: "tipo_entretela", label: "Tipo", required: true },
                  { key: "observacoes", label: "Observações" },
                ]}
              />
            </div>
          )}
        </div>

        {/* 8 — Dobras */}
        <GenericListSection
          title="Dobras e Bainhamento" rows={dobras as any} readonly={readonly}
          table="fichas_costura_dobras" fichaId={ficha.id} reload={load}
          columns={[
            { key: "parte_peca", label: "Parte da Peça", required: true },
            { key: "descricao", label: "Descrição", required: true },
            { key: "medida_cm", label: "Medida (cm)", type: "number" },
            { key: "observacoes", label: "Observações" },
          ]}
        />

        {/* 9 — Montagem */}
        <MontagemSection ficha={ficha} rows={monts} readonly={readonly} reload={load}/>

        {/* 10 — Fotos detalhes */}
        <FotosDetSection ficha={ficha} rows={fotosDet} urls={fotosDetUrls} readonly={readonly} reload={load}/>

        {/* 11 — Observações */}
        <Section title="Observações Gerais">
          <Textarea
            value={obsLocal} onChange={(e) => setObsLocal(e.target.value)} onBlur={saveObs}
            disabled={readonly} rows={3} placeholder="Notas gerais sobre a ficha..."
          />
        </Section>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Sub-section helpers
// ============================================================

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        {title && <h3 className="font-medium">{title}</h3>}
        {action}
      </div>
      {children}
    </div>
  );
}

// ============== TECIDOS ==============
function TecidosSection({ ficha, tecidos, variacoes, referenciaId, readonly, reload }: {
  ficha: Ficha; tecidos: TecidoRow[]; variacoes: VariacaoOpt[]; referenciaId: string;
  readonly: boolean; reload: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState<TecidoRow | "new" | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Remover tecido?")) return;
    await (supabase.from("fichas_costura_tecidos" as any) as any).delete().eq("id", id);
    toast({ title: "Removido" });
    reload();
  };

  return (
    <Section title="Tecidos e Consumo" action={
      !readonly && <Button size="sm" onClick={() => setOpen("new")}><Plus className="h-4 w-4 mr-1"/>Adicionar Tecido</Button>
    }>
      {tecidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum tecido cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Tecido</th>
                <th className="text-left p-2">Cor</th>
                <th className="text-right p-2">kg/peça</th>
                <th className="text-right p-2">m/peça</th>
                <th className="text-center p-2">DXF</th>
                <th className="text-center p-2">Cliente</th>
                <th className="text-left p-2">Obs</th>
                {!readonly && <th className="p-2"></th>}
              </tr>
            </thead>
            <tbody>
              {tecidos.map((t) => {
                const v = variacoes.find((x) => x.id === t.tecido_variacao_id);
                return (
                  <tr key={t.id} className="border-b">
                    <td className="p-2">{v?.nome || "—"}</td>
                    <td className="p-2">{v?.cor || "—"}</td>
                    <td className="p-2 text-right">{t.consumo_kg_por_peca ?? "—"}</td>
                    <td className="p-2 text-right">{t.consumo_m_por_peca ?? "—"}</td>
                    <td className="p-2 text-center">{t.consumo_calculado_automaticamente ? "✦" : "—"}</td>
                    <td className="p-2 text-center">{t.fornecido_pelo_cliente ? "✓" : "—"}</td>
                    <td className="p-2 text-xs text-muted-foreground">{t.observacoes || ""}</td>
                    {!readonly && (
                      <td className="p-2 text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => setOpen(t)}><Pencil className="h-4 w-4"/></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4"/></Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <TecidoModal
          open={!!open} onClose={() => setOpen(null)} reload={reload}
          ficha={ficha} referenciaId={referenciaId} variacoes={variacoes}
          existing={open === "new" ? null : open}
          jaUsados={tecidos.map((t) => t.tecido_variacao_id).filter((v) => open === "new" || v !== (open as TecidoRow).tecido_variacao_id)}
        />
      )}
    </Section>
  );
}

function TecidoModal({ open, onClose, reload, ficha, referenciaId, variacoes, existing, jaUsados }: {
  open: boolean; onClose: () => void; reload: () => void; ficha: Ficha; referenciaId: string;
  variacoes: VariacaoOpt[]; existing: TecidoRow | null; jaUsados: string[];
}) {
  const { toast } = useToast();
  const [varId, setVarId] = useState(existing?.tecido_variacao_id || "");
  const [kg, setKg] = useState<string>(existing?.consumo_kg_por_peca?.toString() || "");
  const [m, setM] = useState<string>(existing?.consumo_m_por_peca?.toString() || "");
  const [calc, setCalc] = useState(existing?.consumo_calculado_automaticamente || false);
  const [cliente, setCliente] = useState(existing?.fornecido_pelo_cliente || false);
  const [obs, setObs] = useState(existing?.observacoes || "");
  const [loading, setLoading] = useState(false);
  const [dxfInfo, setDxfInfo] = useState<{ area: number; largura: number; margem: number } | null>(null);
  const [dxfMsg, setDxfMsg] = useState<string | null>(null);

  const onSelectVar = async (id: string) => {
    setVarId(id);
    if (existing) return;
    setLoading(true); setDxfInfo(null); setDxfMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("calcular-consumo-dxf", {
        body: { referencia_id: referenciaId, tecido_variacao_id: id },
      });
      if (error) throw error;
      if ((data as any)?.ok) {
        const d = data as any;
        setKg(d.consumo_kg?.toString() || "");
        setM(d.consumo_m?.toString() || "");
        setCalc(true);
        setDxfInfo({ area: d.area_cm2, largura: d.largura_cm, margem: d.margem_pct });
      } else {
        const err = (data as any)?.error;
        if (err === "no_dxf") setDxfMsg("Sem DXF ativo — preencha manualmente.");
        else if (err === "no_width") setDxfMsg("Tecido sem largura cadastrada — preencha manualmente.");
        else setDxfMsg("Não foi possível calcular automaticamente — preencha manualmente.");
      }
    } catch {
      setDxfMsg("Não foi possível calcular automaticamente — preencha manualmente.");
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!varId) return toast({ title: "Selecione um tecido", variant: "destructive" });
    if (!kg && !m) return toast({ title: "Informe ao menos kg ou m por peça", variant: "destructive" });
    if (jaUsados.includes(varId)) return toast({ title: "Tecido já adicionado", variant: "destructive" });
    const payload: any = {
      ficha_costura_id: ficha.id,
      tecido_variacao_id: varId,
      consumo_kg_por_peca: kg ? Number(kg) : null,
      consumo_m_por_peca: m ? Number(m) : null,
      consumo_calculado_automaticamente: calc,
      fornecido_pelo_cliente: cliente,
      observacoes: obs || null,
    };
    let error;
    if (existing) {
      ({ error } = await (supabase.from("fichas_costura_tecidos" as any) as any).update(payload).eq("id", existing.id));
    } else {
      ({ error } = await (supabase.from("fichas_costura_tecidos" as any) as any).insert(payload));
    }
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo" });
    onClose(); reload();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{existing ? "Editar" : "Adicionar"} Tecido</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tecido + Cor</Label>
            <ComboBox
              value={varId} options={variacoes.map((v) => ({ value: v.id, label: `${v.nome} — ${v.cor}` }))}
              onChange={onSelectVar} placeholder="Selecione tecido"
            />
          </div>
          {loading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/>Calculando consumo via DXF...</p>}
          {dxfInfo && (
            <div className="text-xs rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 p-2">
              <Sparkles className="h-3 w-3 inline mr-1"/>
              Calculado via DXF · Área: {dxfInfo.area} cm² · Largura: {dxfInfo.largura} cm · Margem: {dxfInfo.margem}% — Você pode ajustar se necessário.
            </div>
          )}
          {dxfMsg && (
            <div className="text-xs rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 p-2">
              {dxfMsg}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Consumo kg/peça</Label><Input type="number" step="0.001" value={kg} onChange={(e) => { setKg(e.target.value); setCalc(false); }}/></div>
            <div><Label>Consumo m/peça</Label><Input type="number" step="0.001" value={m} onChange={(e) => { setM(e.target.value); setCalc(false); }}/></div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={cliente} onCheckedChange={(v) => setCliente(!!v)} id="forn-cliente"/>
            <Label htmlFor="forn-cliente" className="font-normal cursor-pointer">Fornecido pelo cliente</Label>
          </div>
          <div><Label>Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}/></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== MEDIDAS ==============
function MedidasSection({ ficha, medidas, readonly, reload }: {
  ficha: Ficha; medidas: MedidaRow[]; readonly: boolean; reload: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState<MedidaRow | "new" | null>(null);
  const usedSizes = TAMANHOS.filter((s) => medidas.some((m) => m.medidas_por_tamanho?.[s] != null));
  const displaySizes = usedSizes.length ? usedSizes : ["PP","P","M","G","GG"];

  const move = async (row: MedidaRow, dir: -1 | 1) => {
    const idx = medidas.findIndex((m) => m.id === row.id);
    const other = medidas[idx + dir];
    if (!other) return;
    await Promise.all([
      (supabase.from("fichas_costura_medidas" as any) as any).update({ ordem: other.ordem }).eq("id", row.id),
      (supabase.from("fichas_costura_medidas" as any) as any).update({ ordem: row.ordem }).eq("id", other.id),
    ]);
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover medida?")) return;
    await (supabase.from("fichas_costura_medidas" as any) as any).delete().eq("id", id);
    toast({ title: "Removido" }); reload();
  };

  return (
    <Section title="Tabela de Medidas" action={
      !readonly && <Button size="sm" onClick={() => setOpen("new")}><Plus className="h-4 w-4 mr-1"/>Adicionar Medida</Button>
    }>
      {medidas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma medida cadastrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Medida</th>
                {displaySizes.map((s) => <th key={s} className="text-center p-2">{s}</th>)}
                {!readonly && <th className="p-2"></th>}
              </tr>
            </thead>
            <tbody>
              {medidas.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-2 font-medium">{m.nome_medida}</td>
                  {displaySizes.map((s) => (
                    <td key={s} className="p-2 text-center">{m.medidas_por_tamanho?.[s] ?? "—"}</td>
                  ))}
                  {!readonly && (
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => move(m, -1)}><ArrowUp className="h-4 w-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => move(m, 1)}><ArrowDown className="h-4 w-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => setOpen(m)}><Pencil className="h-4 w-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4"/></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <MedidaModal
          open={!!open} onClose={() => setOpen(null)} reload={reload}
          ficha={ficha} existing={open === "new" ? null : open}
          nextOrdem={(medidas[medidas.length - 1]?.ordem ?? -1) + 1}
        />
      )}
    </Section>
  );
}

function MedidaModal({ open, onClose, reload, ficha, existing, nextOrdem }: {
  open: boolean; onClose: () => void; reload: () => void; ficha: Ficha;
  existing: MedidaRow | null; nextOrdem: number;
}) {
  const { toast } = useToast();
  const [nome, setNome] = useState(existing?.nome_medida || "");
  const [grad, setGrad] = useState(existing?.gradacao_obs || "");
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    TAMANHOS.forEach((s) => { r[s] = existing?.medidas_por_tamanho?.[s]?.toString() || ""; });
    return r;
  });
  const save = async () => {
    if (!nome.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    const med: Record<string, number> = {};
    Object.entries(vals).forEach(([k, v]) => { if (v) med[k] = Number(v); });
    const payload: any = {
      ficha_costura_id: ficha.id,
      nome_medida: nome.trim(),
      gradacao_obs: grad || null,
      medidas_por_tamanho: med,
      ordem: existing?.ordem ?? nextOrdem,
    };
    let error;
    if (existing) ({ error } = await (supabase.from("fichas_costura_medidas" as any) as any).update(payload).eq("id", existing.id));
    else ({ error } = await (supabase.from("fichas_costura_medidas" as any) as any).insert(payload));
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo" }); onClose(); reload();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{existing ? "Editar" : "Adicionar"} Medida</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome da medida</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Busto, Comprimento total"/></div>
          <div>
            <Label>Valores por tamanho (cm)</Label>
            <div className="grid grid-cols-6 gap-2 mt-1">
              {TAMANHOS.map((s) => (
                <div key={s}>
                  <Label className="text-xs">{s}</Label>
                  <Input type="number" step="0.1" value={vals[s]} onChange={(e) => setVals({ ...vals, [s]: e.target.value })}/>
                </div>
              ))}
            </div>
          </div>
          <div><Label>Observações de gradação</Label><Textarea value={grad} onChange={(e) => setGrad(e.target.value)} rows={2}/></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== AVIAMENTOS ==============
function AviGradeSection({ ficha, avis, aviamentos, readonly, reload, expanded, setExpanded }: {
  ficha: Ficha; avis: AviRow[]; aviamentos: AviOpt[]; readonly: boolean; reload: () => void;
  expanded: Set<string>; setExpanded: (s: Set<string>) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState<AviRow | "new" | null>(null);
  const toggle = (id: string) => {
    const n = new Set(expanded);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpanded(n);
  };
  const remove = async (id: string) => {
    if (!confirm("Remover aviamento?")) return;
    await (supabase.from("fichas_costura_aviamentos_grade" as any) as any).delete().eq("id", id);
    toast({ title: "Removido" }); reload();
  };
  return (
    <Section title="Aviamentos por Grade" action={
      !readonly && <Button size="sm" onClick={() => setOpen("new")}><Plus className="h-4 w-4 mr-1"/>Adicionar Aviamento</Button>
    }>
      <p className="text-xs text-muted-foreground mb-2">Defina o tamanho e quantidade de cada aviamento por tamanho da peça.</p>
      {avis.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum aviamento cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {avis.map((a) => {
            const av = aviamentos.find((x) => x.id === a.aviamento_id);
            const ex = expanded.has(a.id);
            const sizes = TAMANHOS.filter((s) => a.medidas_por_tamanho?.[s] || a.quantidade_por_tamanho?.[s]);
            return (
              <div key={a.id} className="border rounded-md">
                <div className="flex items-center justify-between gap-2 p-2">
                  <button type="button" onClick={() => toggle(a.id)} className="flex items-center gap-1 text-left flex-1">
                    {ex ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                    <span className="font-medium">{av?.nome || "Aviamento"}</span>
                    <span className="text-xs text-muted-foreground">{av?.categoria}</span>
                    {a.localizacao && <span className="text-xs text-muted-foreground">· {a.localizacao}</span>}
                    {a.como_pregar && <span className="text-xs text-muted-foreground">· {a.como_pregar}</span>}
                  </button>
                  {!readonly && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setOpen(a)}><Pencil className="h-4 w-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                  )}
                </div>
                {ex && (
                  <div className="p-2 border-t bg-muted/30">
                    {sizes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum tamanho preenchido.</p>
                    ) : (
                      <table className="text-xs">
                        <thead><tr>
                          <th className="pr-3 text-left">Tam</th>
                          <th className="pr-3 text-left">Medida</th>
                          <th className="text-left">Qtd</th>
                        </tr></thead>
                        <tbody>
                          {sizes.map((s) => (
                            <tr key={s}>
                              <td className="pr-3 font-medium">{s}</td>
                              <td className="pr-3">{a.medidas_por_tamanho?.[s] || "—"}</td>
                              <td>{a.quantidade_por_tamanho?.[s] || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {a.observacoes && <p className="text-xs text-muted-foreground mt-2">Obs: {a.observacoes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {open && (
        <AviModal
          open={!!open} onClose={() => setOpen(null)} reload={reload}
          ficha={ficha} aviamentos={aviamentos} existing={open === "new" ? null : open}
          jaUsados={avis.map((a) => a.aviamento_id).filter((v) => open === "new" || v !== (open as AviRow).aviamento_id)}
        />
      )}
    </Section>
  );
}

function AviModal({ open, onClose, reload, ficha, aviamentos, existing, jaUsados }: {
  open: boolean; onClose: () => void; reload: () => void; ficha: Ficha;
  aviamentos: AviOpt[]; existing: AviRow | null; jaUsados: string[];
}) {
  const { toast } = useToast();
  const [aviId, setAviId] = useState(existing?.aviamento_id || "");
  const [loc, setLoc] = useState(existing?.localizacao || "");
  const [pregar, setPregar] = useState(existing?.como_pregar || "");
  const [obs, setObs] = useState(existing?.observacoes || "");
  const [med, setMed] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    TAMANHOS.forEach((s) => { r[s] = existing?.medidas_por_tamanho?.[s] || ""; });
    return r;
  });
  const [qtd, setQtd] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    TAMANHOS.forEach((s) => { r[s] = existing?.quantidade_por_tamanho?.[s]?.toString() || ""; });
    return r;
  });
  const save = async () => {
    if (!aviId) return toast({ title: "Selecione aviamento", variant: "destructive" });
    if (jaUsados.includes(aviId)) return toast({ title: "Aviamento já adicionado", variant: "destructive" });
    const medMap: Record<string, string> = {};
    const qtdMap: Record<string, number> = {};
    Object.entries(med).forEach(([k, v]) => { if (v) medMap[k] = v; });
    Object.entries(qtd).forEach(([k, v]) => { if (v) qtdMap[k] = Number(v); });
    const payload: any = {
      ficha_costura_id: ficha.id, aviamento_id: aviId,
      localizacao: loc || null, como_pregar: pregar || null,
      medidas_por_tamanho: medMap, quantidade_por_tamanho: qtdMap,
      observacoes: obs || null,
    };
    let error;
    if (existing) ({ error } = await (supabase.from("fichas_costura_aviamentos_grade" as any) as any).update(payload).eq("id", existing.id));
    else ({ error } = await (supabase.from("fichas_costura_aviamentos_grade" as any) as any).insert(payload));
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo" }); onClose(); reload();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{existing ? "Editar" : "Adicionar"} Aviamento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Aviamento</Label>
            <ComboBox
              value={aviId} options={aviamentos.map((a) => ({ value: a.id, label: `${a.nome} — ${a.categoria}` }))}
              onChange={setAviId} placeholder="Selecione aviamento"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Localização</Label><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Ex: lateral esquerda busto"/></div>
            <div><Label>Como pregar</Label><Input value={pregar} onChange={(e) => setPregar(e.target.value)} placeholder="Ex: embutida na costura"/></div>
          </div>
          <div>
            <Label>Por tamanho (medida + qtd)</Label>
            <div className="space-y-1 mt-1">
              {TAMANHOS.map((s) => (
                <div key={s} className="grid grid-cols-[60px_1fr_100px] gap-2 items-center">
                  <Label className="text-xs">{s}</Label>
                  <Input placeholder="Medida (ex: 13cm)" value={med[s]} onChange={(e) => setMed({ ...med, [s]: e.target.value })}/>
                  <Input type="number" placeholder="Qtd" value={qtd[s]} onChange={(e) => setQtd({ ...qtd, [s]: e.target.value })}/>
                </div>
              ))}
            </div>
          </div>
          <div><Label>Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}/></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== GENERIC LIST (linhas, pontos, entretelas, dobras) ==============
interface ColDef { key: string; label: string; required?: boolean; type?: "text" | "number"; suggestions?: string[]; }
function GenericListSection({ title, rows, readonly, table, fichaId, reload, columns }: {
  title: string; rows: any[]; readonly: boolean; table: string; fichaId: string;
  reload: () => void; columns: ColDef[];
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState<any | "new" | null>(null);

  const move = async (row: any, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === row.id);
    const other = rows[idx + dir];
    if (!other) return;
    await Promise.all([
      (supabase.from(table as any) as any).update({ ordem: other.ordem }).eq("id", row.id),
      (supabase.from(table as any) as any).update({ ordem: row.ordem }).eq("id", other.id),
    ]);
    reload();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover?")) return;
    await (supabase.from(table as any) as any).delete().eq("id", id);
    toast({ title: "Removido" }); reload();
  };
  return (
    <Section title={title} action={
      !readonly && <Button size="sm" onClick={() => setOpen("new")}><Plus className="h-4 w-4 mr-1"/>Adicionar</Button>
    }>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                {columns.map((c) => <th key={c.key} className="text-left p-2">{c.label}</th>)}
                {!readonly && <th className="p-2"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  {columns.map((c) => <td key={c.key} className="p-2">{r[c.key] ?? "—"}</td>)}
                  {!readonly && (
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => move(r, -1)}><ArrowUp className="h-4 w-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => move(r, 1)}><ArrowDown className="h-4 w-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => setOpen(r)}><Pencil className="h-4 w-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4"/></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <GenericModal
          open={!!open} onClose={() => setOpen(null)} reload={reload}
          existing={open === "new" ? null : open} columns={columns} table={table} fichaId={fichaId}
          nextOrdem={(rows[rows.length - 1]?.ordem ?? -1) + 1}
        />
      )}
    </Section>
  );
}

function GenericModal({ open, onClose, reload, existing, columns, table, fichaId, nextOrdem }: {
  open: boolean; onClose: () => void; reload: () => void; existing: any | null;
  columns: ColDef[]; table: string; fichaId: string; nextOrdem: number;
}) {
  const { toast } = useToast();
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    columns.forEach((c) => { r[c.key] = existing?.[c.key]?.toString() || ""; });
    return r;
  });
  const save = async () => {
    for (const c of columns) {
      if (c.required && !vals[c.key]?.trim()) {
        return toast({ title: `${c.label} obrigatório`, variant: "destructive" });
      }
    }
    const payload: any = { ficha_costura_id: fichaId, ordem: existing?.ordem ?? nextOrdem };
    columns.forEach((c) => {
      const v = vals[c.key];
      payload[c.key] = v ? (c.type === "number" ? Number(v) : v) : null;
    });
    let error;
    if (existing) ({ error } = await (supabase.from(table as any) as any).update(payload).eq("id", existing.id));
    else ({ error } = await (supabase.from(table as any) as any).insert(payload));
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo" }); onClose(); reload();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Editar" : "Adicionar"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {columns.map((c) => (
            <div key={c.key}>
              <Label>{c.label}{c.required && " *"}</Label>
              {c.suggestions ? (
                <>
                  <Input value={vals[c.key]} list={`sug-${c.key}`} onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })}/>
                  <datalist id={`sug-${c.key}`}>{c.suggestions.map((s) => <option key={s} value={s}/>)}</datalist>
                </>
              ) : (
                <Input type={c.type === "number" ? "number" : "text"} step="0.01" value={vals[c.key]} onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })}/>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== MONTAGEM ==============
function MontagemSection({ ficha, rows, readonly, reload }: {
  ficha: Ficha; rows: MontRow[]; readonly: boolean; reload: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState<MontRow | "new" | null>(null);
  const move = async (row: MontRow, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === row.id);
    const other = rows[idx + dir];
    if (!other) return;
    await Promise.all([
      (supabase.from("fichas_costura_montagem" as any) as any).update({ passo: other.passo }).eq("id", row.id),
      (supabase.from("fichas_costura_montagem" as any) as any).update({ passo: row.passo }).eq("id", other.id),
    ]);
    reload();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover passo?")) return;
    await (supabase.from("fichas_costura_montagem" as any) as any).delete().eq("id", id);
    toast({ title: "Removido" }); reload();
  };
  return (
    <Section title="Ordem de Montagem" action={
      !readonly && <Button size="sm" onClick={() => setOpen("new")}><Plus className="h-4 w-4 mr-1"/>Adicionar Passo</Button>
    }>
      <p className="text-xs text-muted-foreground mb-2">Sequência de costura da peça.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum passo cadastrado.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-start gap-2 border rounded-md p-2">
              <span className="text-sm font-mono font-semibold mt-1">{i + 1}.</span>
              <div className="flex-1">
                <div className="text-sm">{r.descricao}</div>
                {r.observacoes && <div className="text-xs text-muted-foreground">{r.observacoes}</div>}
              </div>
              {!readonly && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => move(r, -1)}><ArrowUp className="h-4 w-4"/></Button>
                  <Button size="icon" variant="ghost" onClick={() => move(r, 1)}><ArrowDown className="h-4 w-4"/></Button>
                  <Button size="icon" variant="ghost" onClick={() => setOpen(r)}><Pencil className="h-4 w-4"/></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {open && (
        <MontModal
          open={!!open} onClose={() => setOpen(null)} reload={reload}
          ficha={ficha} existing={open === "new" ? null : open}
          nextPasso={(rows[rows.length - 1]?.passo ?? 0) + 1}
        />
      )}
    </Section>
  );
}
function MontModal({ open, onClose, reload, ficha, existing, nextPasso }: {
  open: boolean; onClose: () => void; reload: () => void; ficha: Ficha;
  existing: MontRow | null; nextPasso: number;
}) {
  const { toast } = useToast();
  const [desc, setDesc] = useState(existing?.descricao || "");
  const [obs, setObs] = useState(existing?.observacoes || "");
  const save = async () => {
    if (!desc.trim()) return toast({ title: "Descrição obrigatória", variant: "destructive" });
    const payload: any = {
      ficha_costura_id: ficha.id, descricao: desc.trim(), observacoes: obs || null,
      passo: existing?.passo ?? nextPasso,
    };
    let error;
    if (existing) ({ error } = await (supabase.from("fichas_costura_montagem" as any) as any).update(payload).eq("id", existing.id));
    else ({ error } = await (supabase.from("fichas_costura_montagem" as any) as any).insert(payload));
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo" }); onClose(); reload();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Editar" : "Adicionar"} Passo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}/></div>
          <div><Label>Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}/></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== FOTOS DETALHES ==============
function FotosDetSection({ ficha, rows, urls, readonly, reload }: {
  ficha: Ficha; rows: FotoDet[]; urls: Record<string, string>; readonly: boolean; reload: () => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const upload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) { toast({ title: `${file.name} > 20MB`, variant: "destructive" }); continue; }
      const path = `${ficha.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("fichas-costura-fotos").upload(path, file);
      if (error) { toast({ title: "Erro upload", description: error.message, variant: "destructive" }); continue; }
      await (supabase.from("fichas_costura_fotos" as any) as any).insert({
        ficha_costura_id: ficha.id, foto_url: path, ordem: rows.length,
      });
    }
    setUploading(false); reload();
  };
  const updateLegenda = async (id: string, leg: string) => {
    await (supabase.from("fichas_costura_fotos" as any) as any).update({ legenda: leg }).eq("id", id);
  };
  const remove = async (foto: FotoDet) => {
    if (!confirm("Remover foto?")) return;
    await supabase.storage.from("fichas-costura-fotos").remove([foto.foto_url]);
    await (supabase.from("fichas_costura_fotos" as any) as any).delete().eq("id", foto.id);
    reload();
  };
  const move = async (foto: FotoDet, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === foto.id);
    const other = rows[idx + dir]; if (!other) return;
    await Promise.all([
      (supabase.from("fichas_costura_fotos" as any) as any).update({ ordem: other.ordem }).eq("id", foto.id),
      (supabase.from("fichas_costura_fotos" as any) as any).update({ ordem: foto.ordem }).eq("id", other.id),
    ]);
    reload();
  };
  return (
    <Section title="Fotos de Detalhes" action={
      !readonly && (
        <label className="cursor-pointer">
          <input type="file" multiple accept="image/jpeg,image/png" className="hidden" onChange={(e) => upload(e.target.files)}/>
          <Button size="sm" asChild disabled={uploading}><span><Upload className="h-4 w-4 mr-1"/>{uploading ? "Enviando..." : "Adicionar Foto"}</span></Button>
        </label>
      )
    }>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto adicionada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {rows.map((foto) => (
            <div key={foto.id} className="border rounded-md p-2 space-y-2">
              {urls[foto.id] ? (
                <img src={urls[foto.id]} alt="" className="w-full aspect-video object-cover rounded"/>
              ) : (
                <div className="aspect-video bg-muted rounded flex items-center justify-center"><ImgIcon className="h-8 w-8 text-muted-foreground"/></div>
              )}
              <Input
                defaultValue={foto.legenda || ""}
                placeholder="Legenda" disabled={readonly}
                onBlur={(e) => e.target.value !== (foto.legenda || "") && updateLegenda(foto.id, e.target.value)}
              />
              {!readonly && (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => move(foto, -1)}><ArrowUp className="h-4 w-4"/></Button>
                  <Button size="icon" variant="ghost" onClick={() => move(foto, 1)}><ArrowDown className="h-4 w-4"/></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(foto)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ============== ComboBox ==============
function ComboBox({ value, options, onChange, placeholder }: {
  value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {current?.label || placeholder || "Selecione"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder="Buscar..."/>
          <CommandList>
            <CommandEmpty>Nenhum resultado</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => { onChange(o.value); setOpen(false); }}>
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

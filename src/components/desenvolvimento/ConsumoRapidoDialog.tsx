import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Plus, Trash2, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface RefOpt { id: string; codigo: string; descricao: string | null; }
interface Tecido { id: string; nome: string; largura_m: number; gramatura_g_m2: number; }
interface Variacao { id: string; tecido_id: string; cor: string; }

interface Linha {
  id: string;
  referencia_id: string;
  tecido_variacao_id: string;
  loading?: boolean;
  resultado?: { ok: boolean; consumo_m?: number; consumo_kg?: number | null; message?: string };
}

const uid = () => Math.random().toString(36).slice(2, 10);

export default function ConsumoRapidoDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [refs, setRefs] = useState<RefOpt[]>([]);
  const [tecidos, setTecidos] = useState<Tecido[]>([]);
  const [variacoes, setVariacoes] = useState<Variacao[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([{ id: uid(), referencia_id: "", tecido_variacao_id: "" }]);

  // novo tecido inline
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoComp, setNovoComp] = useState("");
  const [novoGram, setNovoGram] = useState("");
  const [novoLarg, setNovoLarg] = useState("");
  const [novoCor, setNovoCor] = useState("");
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  useEffect(() => {
    if (open) loadAll();
  }, [open]);

  const loadAll = async () => {
    const [r, t, v] = await Promise.all([
      (supabase.from("referencias") as any).select("id, codigo, descricao").eq("ativo", true).order("codigo"),
      (supabase.from("tecidos") as any).select("id, nome, largura_m, gramatura_g_m2").eq("ativo", true).order("nome"),
      (supabase.from("tecidos_variacoes") as any).select("id, tecido_id, cor").eq("ativo", true).order("cor"),
    ]);
    setRefs((r.data as any) || []);
    setTecidos((t.data as any) || []);
    setVariacoes((v.data as any) || []);
  };

  const variacoesPorTecido = useMemo(() => {
    const map: Record<string, Variacao[]> = {};
    for (const v of variacoes) (map[v.tecido_id] ||= []).push(v);
    return map;
  }, [variacoes]);

  const addLinha = () => setLinhas((p) => [...p, { id: uid(), referencia_id: "", tecido_variacao_id: "" }]);
  const removeLinha = (id: string) => setLinhas((p) => p.filter((l) => l.id !== id));
  const updLinha = (id: string, patch: Partial<Linha>) =>
    setLinhas((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const calcLinha = async (l: Linha) => {
    if (!l.referencia_id || !l.tecido_variacao_id) return;
    updLinha(l.id, { loading: true, resultado: undefined });
    const { data, error } = await supabase.functions.invoke("calcular-consumo-dxf", {
      body: { referencia_id: l.referencia_id, tecido_variacao_id: l.tecido_variacao_id },
    });
    if (error) {
      updLinha(l.id, { loading: false, resultado: { ok: false, message: error.message } });
      return;
    }
    updLinha(l.id, { loading: false, resultado: data });
  };

  const calcTodas = async () => {
    await Promise.all(linhas.map(calcLinha));
  };

  const criarTecido = async () => {
    if (!novoNome.trim() || !novoComp.trim() || !novoGram || !novoLarg || !novoCor.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSalvandoNovo(true);
    const gram = parseFloat(novoGram);
    const larg = parseFloat(novoLarg);
    const rendimento = larg > 0 && gram > 0 ? 1000 / (larg * gram) : 1;
    const { data: tec, error: e1 } = await (supabase.from("tecidos") as any)
      .insert({ nome: novoNome.trim(), composicao: novoComp.trim(), gramatura_g_m2: gram, largura_m: larg, rendimento_m_kg: rendimento })
      .select("id, nome, largura_m, gramatura_g_m2")
      .single();
    if (e1 || !tec) {
      setSalvandoNovo(false);
      toast({ title: "Erro ao cadastrar tecido", description: e1?.message, variant: "destructive" });
      return;
    }
    const { data: vr, error: e2 } = await (supabase.from("tecidos_variacoes") as any)
      .insert({ tecido_id: tec.id, cor: novoCor.trim() })
      .select("id, tecido_id, cor")
      .single();
    setSalvandoNovo(false);
    if (e2 || !vr) {
      toast({ title: "Erro ao criar variação", description: e2?.message, variant: "destructive" });
      return;
    }
    setTecidos((p) => [...p, tec as any]);
    setVariacoes((p) => [...p, vr as any]);
    toast({ title: "Tecido cadastrado!" });
    setNovoOpen(false);
    setNovoNome(""); setNovoComp(""); setNovoGram(""); setNovoLarg(""); setNovoCor("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Consumo rápido</DialogTitle>
          <DialogDescription>
            Calcule consumo (m e kg) por peça para as referências e tecidos escolhidos. Usa o DXF ativo de cada referência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {linhas.map((l) => {
            const tecidoSel = variacoes.find((v) => v.id === l.tecido_variacao_id);
            return (
              <div key={l.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs">Referência</Label>
                  <Select value={l.referencia_id} onValueChange={(v) => updLinha(l.id, { referencia_id: v, resultado: undefined })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {refs.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.codigo} {r.descricao ? `— ${r.descricao}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs">Tecido / Cor</Label>
                  <Select value={l.tecido_variacao_id} onValueChange={(v) => updLinha(l.id, { tecido_variacao_id: v, resultado: undefined })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {tecidos.map((t) => (variacoesPorTecido[t.id] || []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {t.nome} — {v.cor} ({t.largura_m}m · {t.gramatura_g_m2}g/m²)
                        </SelectItem>
                      )))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex gap-1 justify-end">
                  <Button size="sm" variant="outline" onClick={() => calcLinha(l)} disabled={!l.referencia_id || !l.tecido_variacao_id || l.loading}>
                    {l.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
                  </Button>
                  {linhas.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => removeLinha(l.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {l.resultado && (
                  <div className="col-span-12 text-sm">
                    {l.resultado.ok ? (
                      <div className="rounded bg-green-500/10 border border-green-500/30 px-3 py-2 text-green-700 dark:text-green-400">
                        <strong>{l.resultado.consumo_m?.toFixed(3)} m</strong>
                        {l.resultado.consumo_kg != null && <> · <strong>{l.resultado.consumo_kg?.toFixed(3)} kg</strong></>}
                        {" "}por peça
                      </div>
                    ) : (
                      <div className="rounded bg-destructive/10 border border-destructive/30 px-3 py-2 text-destructive text-xs">
                        {l.resultado.message || "Erro no cálculo"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={addLinha} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar linha
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNovoOpen((p) => !p)} className="gap-1">
              <Plus className="h-4 w-4" /> Cadastrar tecido na hora
            </Button>
            <Button size="sm" onClick={calcTodas} className="gap-1 ml-auto">
              <Calculator className="h-4 w-4" /> Calcular todas
            </Button>
          </div>

          {novoOpen && (
            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do tecido</Label>
                  <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Malha PV" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Composição</Label>
                  <Input value={novoComp} onChange={(e) => setNovoComp(e.target.value)} placeholder="Ex: 67% PES 33% VI" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cor</Label>
                  <Input value={novoCor} onChange={(e) => setNovoCor(e.target.value)} placeholder="Ex: Preto" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gramatura (g/m²)</Label>
                  <Input type="number" value={novoGram} onChange={(e) => setNovoGram(e.target.value)} placeholder="180" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Largura (m)</Label>
                  <Input type="number" step="0.01" value={novoLarg} onChange={(e) => setNovoLarg(e.target.value)} placeholder="1.60" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setNovoOpen(false)}>Cancelar</Button>
                <Button size="sm" onClick={criarTecido} disabled={salvandoNovo}>
                  {salvandoNovo ? "Salvando..." : "Salvar tecido"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

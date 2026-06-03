import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";

interface Dxf {
  id: string;
  nome_arquivo: string;
  versao: string | null;
  created_at: string;
}

export default function DxfBanner({
  referenciaId,
  onChange,
}: {
  referenciaId: string;
  onChange?: () => void;
}) {
  const { toast } = useToast();
  const [dxf, setDxf] = useState<Dxf | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [versao, setVersao] = useState("");
  const [obs, setObs] = useState("");
  const [uploading, setUploading] = useState(false);

  const [fotos, setFotos] = useState<{ frente: boolean; costas: boolean }>({ frente: false, costas: false });

  const fetchDxf = async () => {
    setLoading(true);
    const [{ data }, { data: ftsData }] = await Promise.all([
      (supabase.from("modelagens_dxf") as any)
        .select("id, nome_arquivo, versao, created_at")
        .eq("referencia_id", referenciaId)
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1),
      (supabase.from("referencias_fotos_piloto" as any) as any)
        .select("lado").eq("referencia_id", referenciaId),
    ]);
    setDxf(((data as any[]) || [])[0] || null);
    const lados = new Set(((ftsData as any[]) || []).map((r) => r.lado));
    setFotos({ frente: lados.has("frente"), costas: lados.has("costas") });
    setLoading(false);
  };


  useEffect(() => { fetchDxf(); }, [referenciaId]);

  const handleUpload = async () => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".dxf")) {
      toast({ title: "Apenas arquivos .dxf", variant: "destructive" }); return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Máximo 50MB", variant: "destructive" }); return;
    }
    setUploading(true);
    const path = `${referenciaId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("modelagens-dxf").upload(path, file);
    if (upErr) { setUploading(false); toast({ title: "Erro upload", description: upErr.message, variant: "destructive" }); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase.from("modelagens_dxf") as any).insert([{
      referencia_id: referenciaId,
      nome_arquivo: file.name,
      arquivo_url: path,
      tamanho_bytes: file.size,
      versao: versao.trim() || null,
      observacoes: obs.trim() || null,
      enviado_por: u?.user?.id || null,
    }]);
    setUploading(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Modelagem enviada!" });
    setOpen(false); setFile(null); setVersao(""); setObs("");
    fetchDxf();
    onChange?.();
  };

  if (loading) return null;

  return (
    <>
      {dxf ? (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">Modelagem enviada</span> — <span className="font-mono">{dxf.nome_arquivo}</span>
              {dxf.versao && <span> · {dxf.versao}</span>}
              <span> · enviado em {new Date(dxf.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
          <button onClick={() => setOpen(true)} className="text-xs text-green-700 dark:text-green-400 underline hover:no-underline">
            Atualizar versão ›
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-orange-700 dark:text-orange-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">Modelagem não enviada</span> — Esta referência não possui arquivo DXF. Não será possível avançar para Corte sem o envio.
            </div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Enviar Modelagem (.dxf)
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar arquivo de modelagem</DialogTitle>
            <DialogDescription>Apenas arquivos .dxf. Máximo 50MB.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Arquivo .dxf *</Label>
              <Input type="file" accept=".dxf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Versão (opcional)</Label>
              <Input value={versao} onChange={(e) => setVersao(e.target.value)} placeholder="Ex: v1, v2" />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || !file}>{uploading ? "Enviando..." : "Enviar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

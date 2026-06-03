import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Upload, Trash2, Download, Image as ImageIcon, RefreshCw } from "lucide-react";

interface Props {
  referenciaId: string;
  refInfo?: { codigo: string; cliente: string; tipoPeca: string; descricao: string | null };
  onSummaryChange?: (s: { tecidos: number; aviamentos: number; status: string } | null) => void;
}

type Ficha = { id: string; status: string };
type Arq = { id: string; nome_arquivo: string; arquivo_url: string; tamanho_bytes: number | null; created_at: string };
type Foto = { id: string; lado: "frente" | "costas"; foto_url: string; tamanho_bytes: number | null; created_at: string };

const ACCEPT_DOCS = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
const ACCEPT_PHOTOS = "image/jpeg,image/png";
const MAX_BYTES = 20 * 1024 * 1024;

const formatBytes = (b?: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export default function FichaTecnicaSection({ referenciaId, onSummaryChange }: Props) {
  const { toast } = useToast();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [arquivos, setArquivos] = useState<Arq[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});
  const [uploadingLado, setUploadingLado] = useState<string | null>(null);
  const [uploadingArq, setUploadingArq] = useState(false);

  useEffect(() => {
    onSummaryChange?.(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenciaId]);

  const load = async () => {
    setLoading(true);
    const { data: f } = await (supabase.from("fichas_tecnicas" as any) as any)
      .select("id, status").eq("referencia_id", referenciaId).maybeSingle();
    if (f) {
      setFicha(f as any);
      const { data: arq } = await (supabase.from("fichas_tecnicas_arquivos_cliente" as any) as any)
        .select("*").eq("ficha_tecnica_id", (f as any).id).order("created_at", { ascending: false });
      setArquivos((arq || []) as Arq[]);
    } else {
      setFicha(null);
      setArquivos([]);
    }

    const { data: fts } = await (supabase.from("referencias_fotos_piloto" as any) as any)
      .select("*").eq("referencia_id", referenciaId);
    const list = (fts || []) as Foto[];
    setFotos(list);

    const urls: Record<string, string> = {};
    await Promise.all(list.map(async (foto) => {
      const { data } = await supabase.storage.from("fotos-piloto").createSignedUrl(foto.foto_url, 3600);
      if (data?.signedUrl) urls[foto.lado] = data.signedUrl;
    }));
    setFotoUrls(urls);

    setLoading(false);
  };

  const iniciarFicha = async () => {
    const { data, error } = await (supabase.from("fichas_tecnicas" as any) as any)
      .insert({ referencia_id: referenciaId }).select("id, status").single();
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setFicha(data as any);
    toast({ title: "Ficha Técnica iniciada" });
  };

  // --------- Fotos da Piloto ---------
  const uploadFoto = async (lado: "frente" | "costas", file: File) => {
    if (!file.type.match(/image\/(jpeg|png)/)) return toast({ title: "Apenas JPG ou PNG", variant: "destructive" });
    if (file.size > MAX_BYTES) return toast({ title: "Máximo 20MB", variant: "destructive" });
    setUploadingLado(lado);
    const existente = fotos.find((f) => f.lado === lado);
    const path = `${referenciaId}/${lado}_${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("fotos-piloto").upload(path, file);
    if (upErr) {
      setUploadingLado(null);
      return toast({ title: "Erro upload", description: upErr.message, variant: "destructive" });
    }
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      referencia_id: referenciaId,
      lado,
      foto_url: path,
      tamanho_bytes: file.size,
      uploaded_by: u?.user?.id || null,
    };
    let dbErr;
    if (existente) {
      const { error } = await (supabase.from("referencias_fotos_piloto" as any) as any)
        .update(payload).eq("id", existente.id);
      dbErr = error;
    } else {
      const { error } = await (supabase.from("referencias_fotos_piloto" as any) as any).insert(payload);
      dbErr = error;
    }
    setUploadingLado(null);
    if (dbErr) return toast({ title: "Erro", description: dbErr.message, variant: "destructive" });
    toast({ title: `Foto ${lado} enviada` });
    load();
  };

  const removerFoto = async (lado: "frente" | "costas") => {
    const existente = fotos.find((f) => f.lado === lado);
    if (!existente) return;
    if (!confirm(`Remover foto ${lado}?`)) return;
    await (supabase.from("referencias_fotos_piloto" as any) as any).delete().eq("id", existente.id);
    toast({ title: "Foto removida" });
    load();
  };

  // --------- Arquivos cliente ---------
  const uploadArquivo = async (files: FileList | null) => {
    if (!files || !ficha) return;
    setUploadingArq(true);
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) { toast({ title: `${file.name} > 20MB`, variant: "destructive" }); continue; }
      const path = `${ficha.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("fichas-tecnicas-cliente").upload(path, file);
      if (upErr) { toast({ title: `Erro upload ${file.name}`, description: upErr.message, variant: "destructive" }); continue; }
      await (supabase.from("fichas_tecnicas_arquivos_cliente" as any) as any).insert({
        ficha_tecnica_id: ficha.id,
        nome_arquivo: file.name,
        arquivo_url: path,
        tamanho_bytes: file.size,
      });
    }
    setUploadingArq(false);
    toast({ title: "Arquivos enviados" });
    load();
  };

  const downloadArq = async (a: Arq) => {
    const { data } = await supabase.storage.from("fichas-tecnicas-cliente").createSignedUrl(a.arquivo_url, 60);
    if (data?.signedUrl) {
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = a.nome_arquivo;
      link.click();
    }
  };

  const delArq = async (a: Arq) => {
    if (!confirm(`Excluir ${a.nome_arquivo}?`)) return;
    await supabase.storage.from("fichas-tecnicas-cliente").remove([a.arquivo_url]);
    await (supabase.from("fichas_tecnicas_arquivos_cliente" as any) as any).delete().eq("id", a.id);
    load();
  };

  if (loading) {
    return (
      <Card id="ficha-tecnica" className="scroll-mt-24">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Ficha Técnica</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Carregando...</p></CardContent>
      </Card>
    );
  }

  if (!ficha) {
    return (
      <Card id="ficha-tecnica" className="scroll-mt-24">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Ficha Técnica</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Esta referência ainda não tem Ficha Técnica.</p>
          <Button onClick={iniciarFicha}><Plus className="h-4 w-4 mr-1" /> Iniciar Ficha Técnica</Button>
        </CardContent>
      </Card>
    );
  }

  const fotoFrente = fotos.find((f) => f.lado === "frente");
  const fotoCostas = fotos.find((f) => f.lado === "costas");

  return (
    <Card id="ficha-tecnica" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Ficha Técnica</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Sub-section 1: Fotos da Piloto */}
        <section className="space-y-3">
          <div>
            <h3 className="font-semibold">Fotos da Piloto</h3>
            <p className="text-sm text-muted-foreground">
              Obrigatório para lacrar a piloto. Usadas na Ficha de Costura, Ficha de Corte e pré-pedido.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["frente", "costas"] as const).map((lado) => {
              const foto = lado === "frente" ? fotoFrente : fotoCostas;
              const url = fotoUrls[lado];
              const label = lado === "frente" ? "Foto Frente" : "Foto Costas";
              const uploading = uploadingLado === lado;
              return (
                <div key={lado} className="rounded-md border bg-card overflow-hidden">
                  <div className="aspect-square bg-muted/30 flex items-center justify-center relative">
                    {foto && url ? (
                      <img src={url} alt={label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground gap-2">
                        <ImageIcon className="h-12 w-12" />
                        <span className="text-sm">{label}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium">{label}</span>
                    <div className="flex gap-2">
                      <label>
                        <input
                          type="file"
                          accept={ACCEPT_PHOTOS}
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadFoto(lado, f);
                            e.target.value = "";
                          }}
                        />
                        <Button asChild size="sm" variant="outline" disabled={uploading}>
                          <span className="cursor-pointer">
                            {foto ? <RefreshCw className="h-3.5 w-3.5 mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                            {uploading ? "Enviando..." : foto ? "Substituir" : "Enviar"}
                          </span>
                        </Button>
                      </label>
                      {foto && (
                        <Button size="sm" variant="outline" onClick={() => removerFoto(lado)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sub-section 2: Ficha Técnica do Cliente */}
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold">Ficha Técnica do Cliente</h3>
              <p className="text-sm text-muted-foreground">Arquive aqui a ficha enviada pelo cliente para consulta.</p>
            </div>
            <label>
              <input
                type="file"
                multiple
                accept={ACCEPT_DOCS}
                className="hidden"
                disabled={uploadingArq}
                onChange={(e) => { uploadArquivo(e.target.files); e.target.value = ""; }}
              />
              <Button asChild size="sm" disabled={uploadingArq}>
                <span className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-1" /> {uploadingArq ? "Enviando..." : "Adicionar Arquivo"}
                </span>
              </Button>
            </label>
          </div>

          {arquivos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nenhuma ficha do cliente arquivada ainda.</p>
          ) : (
            <div className="rounded-md border divide-y">
              {arquivos.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(a.tamanho_bytes)} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => downloadArq(a)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => delArq(a)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

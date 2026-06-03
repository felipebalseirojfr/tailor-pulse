import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Ruler, Upload, Download, Trash2, Pencil, Check, X } from "lucide-react";

interface DxfFile {
  id: string;
  referencia_id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tamanho_bytes: number | null;
  versao: string | null;
  observacoes: string | null;
  enviado_por: string | null;
  ativo: boolean;
  created_at: string;
}

const formatBytes = (b: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

export default function ModelagemDxfSection({ referenciaId }: { referenciaId: string }) {
  const { toast } = useToast();
  const [files, setFiles] = useState<DxfFile[]>([]);
  const [uploadersById, setUploadersById] = useState<Record<string, string>>({});
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [versao, setVersao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVersao, setEditVersao] = useState("");
  const [editObs, setEditObs] = useState("");

  const fetchFiles = async () => {
    setLoading(true);
    const { data } = await (supabase.from("modelagens_dxf") as any)
      .select("*")
      .eq("referencia_id", referenciaId)
      .order("created_at", { ascending: false });
    const list = (data || []) as DxfFile[];
    setFiles(list);
    const ids = Array.from(new Set(list.map((f) => f.enviado_por).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.nome; });
      setUploadersById(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [referenciaId]);

  const visible = files.filter((f) => mostrarInativos || f.ativo);
  const versaoAtualId = files.find((f) => f.ativo)?.id;

  const handleUpload = async () => {
    if (!fileInput) return;
    if (!fileInput.name.toLowerCase().endsWith(".dxf")) {
      toast({ title: "Arquivo inválido", description: "Apenas arquivos .dxf são aceitos.", variant: "destructive" });
      return;
    }
    if (fileInput.size > 50 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 50MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ts = Date.now();
    const path = `${referenciaId}/${ts}_${fileInput.name}`;
    const { error: upErr } = await supabase.storage.from("modelagens-dxf").upload(path, fileInput);
    if (upErr) {
      setUploading(false);
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      referencia_id: referenciaId,
      nome_arquivo: fileInput.name,
      arquivo_url: path,
      tamanho_bytes: fileInput.size,
      versao: versao.trim() || null,
      observacoes: observacoes.trim() || null,
      enviado_por: userData?.user?.id || null,
    };
    const { error } = await (supabase.from("modelagens_dxf") as any).insert([payload]);
    setUploading(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Arquivo enviado!" });
    setUploadOpen(false);
    setFileInput(null); setVersao(""); setObservacoes("");
    fetchFiles();
  };

  const handleDownload = async (f: DxfFile) => {
    const { data, error } = await supabase.storage.from("modelagens-dxf").createSignedUrl(f.arquivo_url, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao baixar", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleToggleAtivo = async (f: DxfFile) => {
    const { error } = await (supabase.from("modelagens_dxf") as any).update({ ativo: !f.ativo }).eq("id", f.id);
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    fetchFiles();
  };

  const startEdit = (f: DxfFile) => {
    setEditingId(f.id);
    setEditVersao(f.versao || "");
    setEditObs(f.observacoes || "");
  };

  const saveEdit = async (f: DxfFile) => {
    const { error } = await (supabase.from("modelagens_dxf") as any)
      .update({ versao: editVersao.trim() || null, observacoes: editObs.trim() || null })
      .eq("id", f.id);
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    setEditingId(null);
    fetchFiles();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2"><Ruler className="h-5 w-5" /> Modelagem (DXF)</CardTitle>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
            Mostrar inativos
          </label>
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Enviar arquivo (.dxf)
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum arquivo de modelagem enviado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left">
                  <th className="p-2 font-medium">Arquivo</th>
                  <th className="p-2 font-medium">Versão</th>
                  <th className="p-2 font-medium">Tamanho</th>
                  <th className="p-2 font-medium">Enviado por</th>
                  <th className="p-2 font-medium">Data</th>
                  <th className="p-2 font-medium">Observações</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <tr key={f.id} className={`border-b ${!f.ativo ? "opacity-50" : ""}`}>
                    <td className="p-2 font-mono text-xs">{f.nome_arquivo}</td>
                    <td className="p-2">
                      {editingId === f.id ? (
                        <Input value={editVersao} onChange={(e) => setEditVersao(e.target.value)} className="h-8 w-32" />
                      ) : (f.versao || <span className="text-muted-foreground">—</span>)}
                    </td>
                    <td className="p-2 text-xs">{formatBytes(f.tamanho_bytes)}</td>
                    <td className="p-2 text-xs">{uploadersById[f.enviado_por || ""] || "—"}</td>
                    <td className="p-2 text-xs">{new Date(f.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-2 text-xs max-w-[200px]">
                      {editingId === f.id ? (
                        <Textarea value={editObs} onChange={(e) => setEditObs(e.target.value)} className="h-16" />
                      ) : (
                        <span className="line-clamp-2">{f.observacoes || <span className="text-muted-foreground">—</span>}</span>
                      )}
                    </td>
                    <td className="p-2">
                      {f.ativo && f.id === versaoAtualId ? (
                        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" variant="outline">Versão atual</Badge>
                      ) : f.ativo ? (
                        <Badge variant="outline">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted">Inativo</Badge>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        {editingId === f.id ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(f)}><Check className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(f)} title="Baixar"><Download className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(f)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleToggleAtivo(f)} title={f.ativo ? "Desativar" : "Reativar"}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar arquivo de modelagem</DialogTitle>
            <DialogDescription>Apenas arquivos .dxf. Máximo 50MB.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Arquivo .dxf *</Label>
              <Input type="file" accept=".dxf" onChange={(e) => setFileInput(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Versão (opcional)</Label>
              <Input value={versao} onChange={(e) => setVersao(e.target.value)} placeholder="Ex: v1, v2 - correção manga" />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || !fileInput}>{uploading ? "Enviando..." : "Enviar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

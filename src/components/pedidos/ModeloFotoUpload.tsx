import { useState, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Clipboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ModeloFotoUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export function ModeloFotoUpload({ value, onChange, label = "Foto do Modelo" }: ModeloFotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("modelos-fotos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("modelos-fotos").getPublicUrl(path);
      onChange(data.publicUrl);
      toast({ title: "Foto enviada" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent | ClipboardEvent) => {
    const items = (e as ClipboardEvent).clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await uploadFile(file);
          return;
        }
      }
    }
  };

  const pasteFromClipboard = async () => {
    try {
      // @ts-ignore
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t: string) => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          const file = new File([blob], `pasted.${type.split("/")[1] || "png"}`, { type });
          await uploadFile(file);
          return;
        }
      }
      toast({ title: "Nenhuma imagem", description: "Não há imagem na área de transferência.", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Não foi possível ler", description: "Use Ctrl+V sobre o campo da foto.", variant: "destructive" });
    }
  };


  const handleRemove = () => onChange(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <div className="relative inline-block group">
          <img
            src={value}
            alt="Foto do modelo"
            className="w-40 h-40 object-cover rounded-md border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-border rounded-md cursor-pointer hover:bg-muted/30 transition-colors">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">Clique para enviar</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}

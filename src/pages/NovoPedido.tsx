import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
}

export default function NovoPedido() {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    cliente_id: "",
    produto_modelo: "",
    tipo_peca: "",
    tecido: "",
    aviamentos: [] as string[],
    quantidade_total: "",
    data_inicio: new Date().toISOString().split("T")[0],
    prazo_final: "",
    tem_personalizacao: false,
    tipos_personalizacao: [] as string[],
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome")
      .order("nome");

    if (!error && data) {
      setClientes(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: pedidoData, error } = await supabase.from("pedidos").insert([
        {
          cliente_id: formData.cliente_id,
          produto_modelo: formData.produto_modelo,
          tipo_peca: formData.tipo_peca,
          tecido: formData.tecido,
          aviamentos: formData.aviamentos,
          quantidade_total: parseInt(formData.quantidade_total),
          data_inicio: formData.data_inicio,
          prazo_final: formData.prazo_final,
          responsavel_comercial_id: user.id,
          tem_personalizacao: formData.tipos_personalizacao.length > 0,
          tipos_personalizacao: formData.tipos_personalizacao,
        },
      ]).select();

      if (error) throw error;
      if (!pedidoData || pedidoData.length === 0) throw new Error("Erro ao criar pedido");

      const pedidoId = pedidoData[0].id;
      const qrCodeRef = pedidoData[0].qr_code_ref;

      // Gerar QR Code no frontend
      const QRCode = (await import('qrcode.react')).QRCodeSVG;
      const qrUrl = `${window.location.origin}/scan/${qrCodeRef}`;
      
      // Criar elemento temporário para gerar o QR Code
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(container);
      
      await new Promise<void>((resolve) => {
        root.render(
          <QRCode
            value={qrUrl}
            size={512}
            level="H"
            includeMargin={true}
          />
        );
        setTimeout(resolve, 100);
      });

      const svgElement = container.querySelector('svg');
      if (!svgElement) throw new Error("Erro ao gerar QR Code");

      // Converter SVG para PNG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx?.drawImage(img, 0, 0);
          resolve();
        };
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      });

      const qrCodeImage = canvas.toDataURL('image/png');

      // Limpar elementos temporários
      root.unmount();
      document.body.removeChild(container);

      // Enviar para edge function salvar no storage
      const { error: uploadError } = await supabase.functions.invoke('gerar-qr-code', {
        body: {
          pedidoId,
          qrCodeImage,
        },
      });

      if (uploadError) {
        console.error('Erro ao salvar QR Code:', uploadError);
      }

      toast({
        title: "Pedido criado!",
        description: "O pedido foi criado com sucesso e o QR Code foi gerado.",
      });
      navigate("/pedidos");
    } catch (error: any) {
      toast({
        title: "Erro ao criar pedido",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePersonalizacaoToggle = (tipo: string) => {
    setFormData((prev) => {
      const tipos = prev.tipos_personalizacao.includes(tipo)
        ? prev.tipos_personalizacao.filter((t) => t !== tipo)
        : [...prev.tipos_personalizacao, tipo];
      
      return {
        ...prev,
        tipos_personalizacao: tipos,
        tem_personalizacao: tipos.length > 0,
      };
    });
  };

  const handleAviamentosToggle = (tipo: string) => {
    setFormData((prev) => {
      const aviamentos = prev.aviamentos.includes(tipo)
        ? prev.aviamentos.filter((t) => t !== tipo)
        : [...prev.aviamentos, tipo];
      
      return {
        ...prev,
        aviamentos,
      };
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Novo Pedido</h1>
        <p className="text-muted-foreground">
          Cadastre um novo pedido de produção
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Pedido</CardTitle>
          <CardDescription>
            Preencha todos os campos obrigatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente (Marca) *</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, cliente_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="produto_modelo">Nome do Produto *</Label>
                <Input
                  id="produto_modelo"
                  name="produto_modelo"
                  value={formData.produto_modelo}
                  onChange={handleChange}
                  placeholder="Ex: Camisa Polo Listrada"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_peca">Referência *</Label>
                <Input
                  id="tipo_peca"
                  name="tipo_peca"
                  value={formData.tipo_peca}
                  onChange={handleChange}
                  placeholder="Ex: REF-001"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tecido">Tecido</Label>
                <Input
                  id="tecido"
                  name="tecido"
                  value={formData.tecido}
                  onChange={handleChange}
                  placeholder="Ex: Algodão, Poliéster"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade_total">Quantidade Total *</Label>
                <Input
                  id="quantidade_total"
                  name="quantidade_total"
                  type="number"
                  min="1"
                  value={formData.quantidade_total}
                  onChange={handleChange}
                  placeholder="Ex: 100"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Personalização</Label>
              <p className="text-sm text-muted-foreground">
                Selecione os tipos de personalização necessários
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="estamparia"
                    checked={formData.tipos_personalizacao.includes("estamparia")}
                    onCheckedChange={() => handlePersonalizacaoToggle("estamparia")}
                  />
                  <Label htmlFor="estamparia" className="font-normal cursor-pointer">
                    Estamparia
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bordado"
                    checked={formData.tipos_personalizacao.includes("bordado")}
                    onCheckedChange={() => handlePersonalizacaoToggle("bordado")}
                  />
                  <Label htmlFor="bordado" className="font-normal cursor-pointer">
                    Bordado
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="caseado"
                    checked={formData.tipos_personalizacao.includes("caseado")}
                    onCheckedChange={() => handlePersonalizacaoToggle("caseado")}
                  />
                  <Label htmlFor="caseado" className="font-normal cursor-pointer">
                    Caseado
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lavanderia"
                    checked={formData.tipos_personalizacao.includes("lavanderia")}
                    onCheckedChange={() => handlePersonalizacaoToggle("lavanderia")}
                  />
                  <Label htmlFor="lavanderia" className="font-normal cursor-pointer">
                    Lavanderia
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Aviamentos</Label>
              <p className="text-sm text-muted-foreground">
                Selecione os aviamentos necessários
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="etiq_marca"
                    checked={formData.aviamentos.includes("Etiq de marca")}
                    onCheckedChange={() => handleAviamentosToggle("Etiq de marca")}
                  />
                  <Label htmlFor="etiq_marca" className="font-normal cursor-pointer">
                    Etiq de marca
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="etiq_composicao"
                    checked={formData.aviamentos.includes("Etiq de composição")}
                    onCheckedChange={() => handleAviamentosToggle("Etiq de composição")}
                  />
                  <Label htmlFor="etiq_composicao" className="font-normal cursor-pointer">
                    Etiq de composição
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="etiq_tamanho"
                    checked={formData.aviamentos.includes("Etiq de tamanho")}
                    onCheckedChange={() => handleAviamentosToggle("Etiq de tamanho")}
                  />
                  <Label htmlFor="etiq_tamanho" className="font-normal cursor-pointer">
                    Etiq de tamanho
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ziper"
                    checked={formData.aviamentos.includes("Ziper")}
                    onCheckedChange={() => handleAviamentosToggle("Ziper")}
                  />
                  <Label htmlFor="ziper" className="font-normal cursor-pointer">
                    Ziper
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="botao"
                    checked={formData.aviamentos.includes("Botão")}
                    onCheckedChange={() => handleAviamentosToggle("Botão")}
                  />
                  <Label htmlFor="botao" className="font-normal cursor-pointer">
                    Botão
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="elastico"
                    checked={formData.aviamentos.includes("Elástico")}
                    onCheckedChange={() => handleAviamentosToggle("Elástico")}
                  />
                  <Label htmlFor="elastico" className="font-normal cursor-pointer">
                    Elástico
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cordao"
                    checked={formData.aviamentos.includes("Cordão")}
                    onCheckedChange={() => handleAviamentosToggle("Cordão")}
                  />
                  <Label htmlFor="cordao" className="font-normal cursor-pointer">
                    Cordão
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rebite"
                    checked={formData.aviamentos.includes("Rebite")}
                    onCheckedChange={() => handleAviamentosToggle("Rebite")}
                  />
                  <Label htmlFor="rebite" className="font-normal cursor-pointer">
                    Rebite
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ilhos"
                    checked={formData.aviamentos.includes("Ilhós")}
                    onCheckedChange={() => handleAviamentosToggle("Ilhós")}
                  />
                  <Label htmlFor="ilhos" className="font-normal cursor-pointer">
                    Ilhós
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="termocolante"
                    checked={formData.aviamentos.includes("Termocolante")}
                    onCheckedChange={() => handleAviamentosToggle("Termocolante")}
                  />
                  <Label htmlFor="termocolante" className="font-normal cursor-pointer">
                    Termocolante
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início *</Label>
                <Input
                  id="data_inicio"
                  name="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prazo_final">Prazo Final *</Label>
                <Input
                  id="prazo_final"
                  name="prazo_final"
                  type="date"
                  value={formData.prazo_final}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>


            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Criando..." : "Criar Pedido"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

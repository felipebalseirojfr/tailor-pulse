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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
}

interface Profile {
  id: string;
  nome: string;
}

export default function NovoPedido() {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [responsaveis, setResponsaveis] = useState<Profile[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    cliente_id: "",
    produto_modelo: "",
    tipo_peca: "",
    tecido: "",
    aviamentos: "",
    quantidade_total: "",
    data_inicio: new Date().toISOString().split("T")[0],
    prazo_final: "",
    responsavel_comercial_id: "",
    prioridade: "media",
  });

  useEffect(() => {
    fetchClientes();
    fetchResponsaveis();
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

  const fetchResponsaveis = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome")
      .order("nome");

    if (!error && data) {
      setResponsaveis(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("pedidos").insert([
        {
          ...formData,
          quantidade_total: parseInt(formData.quantidade_total),
          prioridade: formData.prioridade as "alta" | "media" | "baixa",
        },
      ]);

      if (error) throw error;

      toast({
        title: "Pedido criado!",
        description: "O pedido foi criado com sucesso.",
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
                <Label htmlFor="produto_modelo">Modelo do Produto *</Label>
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
                <Label htmlFor="tipo_peca">Tipo de Peça *</Label>
                <Input
                  id="tipo_peca"
                  name="tipo_peca"
                  value={formData.tipo_peca}
                  onChange={handleChange}
                  placeholder="Ex: Camisa, Calça, Vestido"
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

            <div className="space-y-2">
              <Label htmlFor="aviamentos">Aviamentos</Label>
              <Textarea
                id="aviamentos"
                name="aviamentos"
                value={formData.aviamentos}
                onChange={handleChange}
                placeholder="Ex: Botões, zíperes, etiquetas..."
                rows={3}
              />
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

            <div className="space-y-2">
              <Label htmlFor="responsavel_comercial_id">
                Responsável Comercial *
              </Label>
              <Select
                value={formData.responsavel_comercial_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, responsavel_comercial_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map((resp) => (
                    <SelectItem key={resp.id} value={resp.id}>
                      {resp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade *</Label>
              <RadioGroup
                value={formData.prioridade}
                onValueChange={(value) =>
                  setFormData({ ...formData, prioridade: value })
                }
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="baixa" id="baixa" />
                  <Label htmlFor="baixa" className="font-normal cursor-pointer">
                    Baixa
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="media" id="media" />
                  <Label htmlFor="media" className="font-normal cursor-pointer">
                    Média
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="alta" id="alta" />
                  <Label htmlFor="alta" className="font-normal cursor-pointer">
                    Alta
                  </Label>
                </div>
              </RadioGroup>
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

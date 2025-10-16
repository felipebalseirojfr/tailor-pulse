import { useState, useEffect } from "react";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FiltroAvancadoProps {
  tipo: "marca" | "referencia" | "op";
  opcoes: string[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}

export function FiltroAvancado({
  tipo,
  opcoes,
  valor,
  onChange,
  placeholder,
}: FiltroAvancadoProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [opcoesFiltradas, setOpcoesFiltradas] = useState<string[]>(opcoes);

  useEffect(() => {
    if (busca) {
      setOpcoesFiltradas(
        opcoes.filter((opcao) =>
          opcao.toLowerCase().includes(busca.toLowerCase())
        )
      );
    } else {
      setOpcoesFiltradas(opcoes);
    }
  }, [busca, opcoes]);

  const getLabel = () => {
    switch (tipo) {
      case "marca":
        return "Marca/Cliente";
      case "referencia":
        return "Referência";
      case "op":
        return "#OP";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start"
        >
          {valor || placeholder || `Selecionar ${getLabel()}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-background z-50" align="start">
        <div className="flex flex-col">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${getLabel().toLowerCase()}...`}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <div className="p-1">
              <button
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors",
                  !valor && "bg-muted"
                )}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Todos
              </button>
              {opcoesFiltradas.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              ) : (
                opcoesFiltradas.map((opcao) => (
                  <button
                    key={opcao}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center justify-between",
                      valor === opcao && "bg-muted"
                    )}
                    onClick={() => {
                      onChange(opcao);
                      setOpen(false);
                    }}
                  >
                    <span>{opcao}</span>
                    {valor === opcao && <Check className="h-4 w-4" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

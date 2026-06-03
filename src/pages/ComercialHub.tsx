import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ComercialHub() {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="absolute left-4 top-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>
      <h1 className="text-4xl font-bold text-foreground">Comercial</h1>
    </div>
  );
}

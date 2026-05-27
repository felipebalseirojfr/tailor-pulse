import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Factory, Briefcase } from "lucide-react";
import logoJfr from "@/assets/logo-jfr.png";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const roles = (rolesData || []).map((r: any) => r.role);
      if (roles.includes("corte") && !roles.includes("admin")) {
        navigate("/area-corte", { replace: true });
        return;
      }
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hubs = [
    {
      label: "PPCP",
      description: "Planejamento, Programação e Controle de Produção",
      icon: Factory,
      to: "/ppcp",
    },
    {
      label: "Comercial",
      description: "Gestão Comercial",
      icon: Briefcase,
      to: "/hub/comercial",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-sidebar to-background p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="relative flex flex-col items-center gap-3 mb-12">
        <img src={logoJfr} alt="JFR Logo" className="h-24 w-auto object-contain" />
        <h1 className="text-3xl font-bold text-blue-900">JFR Confecções</h1>
        <p className="text-muted-foreground">Selecione um módulo para começar</p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {hubs.map((hub) => {
          const Icon = hub.icon;
          return (
            <Card
              key={hub.to}
              onClick={() => navigate(hub.to)}
              className="group cursor-pointer p-8 flex flex-col items-center justify-center gap-4 text-center border-sidebar-border bg-card/95 backdrop-blur-sm shadow-xl transition-all duration-200 hover:scale-[1.03] hover:border-primary hover:shadow-2xl"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 group-hover:bg-primary/25 transition-colors">
                <Icon className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{hub.label}</h2>
                <p className="text-sm text-muted-foreground mt-1">{hub.description}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

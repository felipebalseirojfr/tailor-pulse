import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logoJfr from "@/assets/logo-jfr.png";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const redirectByRole = async (userId: string) => {
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (rolesData || []).map((r: any) => r.role);
    if (roles.includes("corte") && !roles.includes("admin")) {
      navigate("/area-corte");
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectByRole(session.user.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message === "Invalid login credentials" 
          ? "Email ou senha incorretos" 
          : error.message,
        variant: "destructive",
      });
    } else if (data.user) {
      toast({ title: "Login realizado!", description: "Bem-vindo de volta!" });
      await redirectByRole(data.user.id);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-sidebar to-background p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <Card className="relative w-full max-w-md border-sidebar-border bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 blur-lg" />
              <img 
                src={logoJfr} 
                alt="JFR Logo" 
                className="relative h-24 w-auto object-contain"
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-blue-900">
                JFR Confecções
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Sistema de Controle de Produção
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email-login" className="text-foreground">
                Email
              </Label>
              <Input
                id="email-login"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-input focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-login" className="text-foreground">
                Senha
              </Label>
              <Input
                id="password-login"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50 border-input focus:border-primary"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Acesso restrito a usuários autorizados
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

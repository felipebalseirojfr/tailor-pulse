import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Package,
  Users,
  Calendar as CalendarIcon,
  LogOut,
  Menu,
  X,
  UserCog,
  Shield,
  FileCheck,
  Wallet,
  Handshake,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Badge } from "@/components/ui/badge";
import logoJfr from "@/assets/logo-jfr.png";
import { QRNotificationsListener } from "@/components/QRNotificationsListener";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

export default function Layout({ children }: LayoutProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { roles, hasRole, hasAnyRole } = useUserRoles();

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(session);
        setLoading(false);

        if (!session && location.pathname !== "/auth") {
          setAuthRedirecting(true);
          navigate("/auth", { replace: true });
        } else {
          setAuthRedirecting(false);
        }

        if (session?.user) {
          fetchUserName(session.user.id);
        }
      } catch {
        if (cancelled) return;
        setLoading(false);
        setAuthRedirecting(true);
        if (location.pathname !== "/auth") {
          navigate("/auth", { replace: true });
        }
      }
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      if (!nextSession && location.pathname !== "/auth") {
        setAuthRedirecting(true);
        navigate("/auth", { replace: true });
      } else {
        setAuthRedirecting(false);
      }
      if (nextSession?.user) {
        fetchUserName(nextSession.user.id);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const fetchUserName = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", userId)
      .single();
    if (data) {
      setUserName(data.nome);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session && location.pathname !== "/auth") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h1 className="text-lg font-semibold">Sessão desconectada</h1>
          <p className="text-sm text-muted-foreground">
            {authRedirecting ? "Redirecionando para o login..." : "Sua sessão expirou. Faça login novamente."}
          </p>
          <Button onClick={() => navigate("/auth", { replace: true })}>
            Ir para login
          </Button>
        </div>
      </div>
    );
  }

  if (location.pathname === "/auth") {
    return <>{children}</>;
  }

  const allNavigation: NavItem[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Pedidos", href: "/pedidos", icon: Package },
    { name: "Comercial", href: "/comercial", icon: Handshake, roles: ["admin", "commercial"] },
    { name: "Carteira", href: "/carteira", icon: Wallet, roles: ["admin", "commercial"] },
    { name: "Fechamento", href: "/pcp/fechamentos", icon: FileCheck, roles: ["admin", "pcp_closer", "backoffice_fiscal", "commercial"] },
    { name: "Clientes", href: "/clientes", icon: Users, roles: ["admin", "commercial"] },
    { name: "Calendário", href: "/calendario", icon: CalendarIcon },
    { name: "Terceiros", href: "/terceiros", icon: UsersRound, roles: ["admin", "pcp_closer"] },
    { name: "Usuários", href: "/usuarios", icon: UserCog, roles: ["admin"] },
  ];

  const navigation = allNavigation.filter((item) => {
    if (!item.roles) return true;
    return hasAnyRole(item.roles);
  });

  const getRoleBadge = () => {
    if (hasRole("admin")) return { label: "Admin", variant: "destructive" as const };
    if (hasRole("commercial")) return { label: "Comercial", variant: "default" as const };
    if (hasRole("production")) return { label: "Produção", variant: "secondary" as const };
    if (hasRole("pcp_closer")) return { label: "PCP", variant: "outline" as const };
    if (hasRole("backoffice_fiscal")) return { label: "Fiscal", variant: "outline" as const };
    return { label: "Viewer", variant: "outline" as const };
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="flex min-h-screen bg-background">
      <QRNotificationsListener />

      {/* Sidebar Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-sidebar-border bg-sidebar px-6 pb-4">
          <div className="flex h-24 shrink-0 items-center gap-3 border-b border-sidebar-border pb-4 pt-4">
            <img src={logoJfr} alt="JFR Logo" className="h-20 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Controle de</span>
              <span className="text-sm font-semibold text-sidebar-foreground">Produções</span>
            </div>
          </div>

          {userName && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-sidebar-accent/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                <Badge variant={roleBadge.variant} className="text-xs h-5">
                  {roleBadge.label}
                </Badge>
              </div>
            </div>
          )}

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={`group flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-all duration-200 ${
                            isActive
                              ? "bg-sidebar-accent text-primary border-l-2 border-primary"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Sair
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile menu */}
      <div className="lg:hidden">
        <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-foreground"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <div className="flex items-center gap-3">
            <img src={logoJfr} alt="JFR Logo" className="h-12 w-auto object-contain" />
            <span className="text-lg font-bold text-primary">JFR Produções</span>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-sidebar p-6 border-r border-sidebar-border">
              <div className="flex items-center gap-3 mb-4">
                <img src={logoJfr} alt="JFR Logo" className="h-16 w-auto object-contain" />
                <span className="text-lg font-bold text-sidebar-foreground">JFR Produções</span>
              </div>

              {userName && (
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-sidebar-accent/50 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                    <Badge variant={roleBadge.variant} className="text-xs h-5">
                      {roleBadge.label}
                    </Badge>
                  </div>
                </div>
              )}

              <nav className="mt-12">
                <ul role="list" className="space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`group flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-all duration-200 ${
                            isActive
                              ? "bg-sidebar-accent text-primary border-l-2 border-primary"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                  <li className="pt-6">
                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      className="w-full justify-start text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      Sair
                    </Button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="w-full lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}

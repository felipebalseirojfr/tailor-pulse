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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useQRScanNotifications } from "@/hooks/useQRScanNotifications";
import { Badge } from "@/components/ui/badge";
import logoJfr from "@/assets/logo-jfr.png";

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
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { roles, hasRole, hasAnyRole } = useUserRoles();
  
  // Ativar notificações globais de escaneamentos QR
  useQRScanNotifications();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session && location.pathname !== "/auth") {
        navigate("/auth");
      }
      if (session?.user) {
        fetchUserName(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && location.pathname !== "/auth") {
        navigate("/auth");
      }
      if (session?.user) {
        fetchUserName(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
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
    return null;
  }

  if (location.pathname === "/auth") {
    return <>{children}</>;
  }

  const allNavigation: NavItem[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Pedidos", href: "/pedidos", icon: Package },
    { name: "Fechamento", href: "/pcp/fechamentos", icon: FileCheck, roles: ["admin", "pcp_closer", "backoffice_fiscal", "commercial"] },
    { name: "Clientes", href: "/clientes", icon: Users, roles: ["admin", "commercial"] },
    { name: "Calendário", href: "/calendario", icon: CalendarIcon },
    { name: "Usuários", href: "/usuarios", icon: UserCog, roles: ["admin"] },
  ];

  // Filter navigation based on user roles
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
      {/* Sidebar Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-sidebar-border bg-sidebar px-6 pb-4">
          {/* Logo Section */}
          <div className="flex h-24 shrink-0 items-center gap-3 border-b border-sidebar-border pb-4 pt-4">
            <img 
              src={logoJfr} 
              alt="JFR Logo" 
              className="h-20 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Controle de</span>
              <span className="text-sm font-semibold text-sidebar-foreground">Produções</span>
            </div>
          </div>

          {/* User Info */}
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
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
          <div className="flex items-center gap-3">
            <img 
              src={logoJfr} 
              alt="JFR Logo" 
              className="h-12 w-auto object-contain"
            />
            <span className="text-lg font-bold text-primary">JFR Produções</span>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-sidebar p-6 border-r border-sidebar-border">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={logoJfr} 
                  alt="JFR Logo" 
                  className="h-16 w-auto object-contain"
                />
                <span className="text-lg font-bold text-sidebar-foreground">JFR Produções</span>
              </div>

              {/* User Info Mobile */}
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

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Edit, Shield, Users, Loader2, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
}

interface UserRole {
  user_id: string;
  role: AppRole;
}

interface UserWithRoles extends Profile {
  roles: AppRole[];
}

type AppRole = "admin" | "commercial" | "production" | "viewer" | "pcp_closer" | "backoffice_fiscal" | "corte";
type RoleDefinition = {
  value: AppRole | "production_full";
  label: string;
  description: string;
  combo?: AppRole[];
};

const PRODUCTION_FULL_ROLES: AppRole[] = ["commercial", "production"];

const ALL_ROLES: RoleDefinition[] = [
  { value: "admin", label: "Administrador", description: "Acesso total ao sistema" },
  { value: "production_full", label: "Produção Completa", description: "Cadastra pedidos, controla produção e acompanha calendário", combo: PRODUCTION_FULL_ROLES },
  { value: "commercial", label: "Comercial", description: "Gerencia pedidos e clientes" },
  { value: "production", label: "Produção", description: "Visualiza e atualiza etapas" },
  { value: "corte", label: "Corte", description: "Acesso apenas à fila de corte" },
  { value: "viewer", label: "Visualizador", description: "Apenas visualização" },
  { value: "pcp_closer", label: "PCP Fechamento", description: "Gerencia fechamentos" },
  { value: "backoffice_fiscal", label: "Backoffice Fiscal", description: "Emite notas fiscais" },
];

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível concluir a operação.";

export default function Usuarios() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    password: "",
    roles: [] as AppRole[],
  });
  const [saving, setSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("deletar-usuario", {
        body: { user_id: userToDelete.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Usuário excluído", description: `${userToDelete.nome} foi removido do sistema.` });
      setUserToDelete(null);
      fetchUsers();
    } catch (error: unknown) {
      toast({ title: "Erro ao excluir", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const { hasRole, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!rolesLoading && !hasRole("admin")) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [rolesLoading, hasRole, navigate, toast]);

  useEffect(() => {
    if (!rolesLoading && hasRole("admin")) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesLoading]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("nome");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role),
      }));

      setUsers(usersWithRoles);
    } catch (error: unknown) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFormData({ nome: "", email: "", password: "", roles: ["commercial"] });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: UserWithRoles) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      password: "",
      roles: user.roles,
    });
    setIsDialogOpen(true);
  };

  const handleRoleToggle = (role: RoleDefinition["value"]) => {
    const roleDef = ALL_ROLES.find((r) => r.value === role);
    const targets = roleDef?.combo;

    setFormData((prev) => {
      if (targets) {
        const allActive = targets.every((t) => prev.roles.includes(t));
        const without = prev.roles.filter((r) => !targets.includes(r));
        return { ...prev, roles: allActive ? without : [...without, ...targets] };
      }
      if (role === "production_full") return prev;
      return {
        ...prev,
        roles: prev.roles.includes(role)
          ? prev.roles.filter((r) => r !== role)
          : [...prev.roles, role],
      };
    });
  };

  const isRoleChecked = (role: RoleDefinition) => {
    if (role.combo) return role.combo.every((t) => formData.roles.includes(t));
    if (role.value === "production_full") return false;
    return formData.roles.includes(role.value);
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.email || (!isEditing && !formData.password)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.roles.length === 0) {
      toast({
        title: "Selecione ao menos uma role",
        description: "O usuário precisa ter ao menos uma permissão.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (isEditing && selectedUser) {
        // Update profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ nome: formData.nome })
          .eq("id", selectedUser.id);

        if (profileError) throw profileError;

        // Update roles - delete existing and insert new
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedUser.id);

        if (deleteError) throw deleteError;

        const rolesToInsert = formData.roles.map((role) => ({
          user_id: selectedUser.id,
          role: role as AppRole,
        }));

        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(rolesToInsert);

        if (insertError) throw insertError;

        toast({
          title: "Usuário atualizado",
          description: "As permissões foram atualizadas com sucesso.",
        });
      } else {
        // Create new user via edge function
        const { data, error } = await supabase.functions.invoke("criar-usuario", {
          body: {
            email: formData.email,
            password: formData.password,
            nome: formData.nome,
            roles: formData.roles,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({
          title: "Usuário criado",
          description: "O novo usuário foi criado com sucesso.",
        });
      }

      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: unknown) {
      console.error("Erro ao salvar usuário:", error);
      toast({
        title: "Erro ao salvar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: AppRole): BadgeProps["variant"] => {
    switch (role) {
      case "admin":
        return "destructive";
      case "commercial":
        return "default";
      case "production":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    const found = ALL_ROLES.find((r) => r.value === role);
    return found?.label || role;
  };

  if (rolesLoading || !hasRole("admin")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os usuários e suas permissões no sistema
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Usuários do Sistema
          </CardTitle>
          <CardDescription>
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Permissões</TableHead>
                  <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      {user.nome}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={getRoleBadgeVariant(role)}
                            className="text-xs"
                          >
                            {getRoleLabel(role)}
                          </Badge>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-muted-foreground text-sm">
                            Sem permissões
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(user)}
                          className="gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToDelete(user)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isEditing ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Atualize as informações e permissões do usuário."
                : "Preencha os dados para criar um novo usuário."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-4 overflow-y-auto py-4 pr-1">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do usuário"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                disabled={isEditing}
                className="bg-background"
              />
            </div>

            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-background"
                />
              </div>
            )}

            <div className="space-y-3">
              <Label>Permissões</Label>
              <div className="space-y-2">
                {ALL_ROLES.map((role) => (
                  <div
                    key={role.value}
                    className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-background/50"
                  >
                    <Checkbox
                      id={role.value}
                      checked={isRoleChecked(role)}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={role.value}
                        className="text-sm font-medium text-foreground cursor-pointer"
                      >
                        {role.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                "Salvar alterações"
              ) : (
                "Criar usuário"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. {userToDelete?.nome} ({userToDelete?.email}) será removido do sistema, junto com suas permissões e acesso de login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Excluindo...</>) : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

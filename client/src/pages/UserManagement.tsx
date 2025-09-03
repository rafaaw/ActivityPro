import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Search, Filter, MoreVertical, UserPlus, Shield, Mail, MapPin, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";

const registerUserSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["collaborator", "sector_chief", "admin"]),
  sectorId: z.string().optional(),
});

const editUserSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["collaborator", "sector_chief", "admin"]),
  sectorId: z.string().optional(),
  isActive: z.boolean(),
});

type RegisterUserData = z.infer<typeof registerUserSchema>;
type EditUserData = z.infer<typeof editUserSchema>;

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'sector_chief'),
  });

  const { data: sectors = [] } = useQuery({
    queryKey: ["/api/sectors"],
    enabled: !!currentUser,
  });

  const form = useForm<RegisterUserData>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "collaborator",
      sectorId: "",
    },
  });

  const editForm = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "collaborator",
      sectorId: "",
      isActive: true,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterUserData) => {
      await apiRequest("POST", "/api/users/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsRegisterOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar usuário",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: EditUserData & { id: string }) => {
      const { id, ...updateData } = data;
      await apiRequest("PATCH", `/api/users/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditOpen(false);
      setEditingUser(null);
      editForm.reset();
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  // Verificar permissões
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sector_chief')) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">Acesso Negado</h2>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'sector_chief': return 'Chefe de Setor';
      case 'collaborator': return 'Colaborador';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'sector_chief': return 'default';
      case 'collaborator': return 'secondary';
      default: return 'outline';
    }
  };

  const getSectorName = (sectorId: string) => {
    const sector = (sectors as any[]).find((s: any) => s.id === sectorId);
    return sector?.name || 'Sem setor';
  };

  const handleSubmit = (data: RegisterUserData) => {
    registerMutation.mutate(data);
  };

  const handleEditSubmit = (data: EditUserData) => {
    if (editingUser) {
      // Remove campos vazios, especialmente password
      const cleanData = { ...data };
      if (!cleanData.password || cleanData.password.trim() === '') {
        delete cleanData.password;
      }
      editMutation.mutate({ ...cleanData, id: editingUser.id });
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    editForm.reset({
      username: user.username,
      password: "",
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role,
      sectorId: user.sectorId || "",
      isActive: user.isActive ?? true,
    });
    setIsEditOpen(true);
  };

  // Filtrar usuários
  const filteredUsers = (users as any[]).filter((user: any) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getUserStats = () => {
    const total = (users as any[]).length;
    const active = (users as any[]).filter((u: any) => u.isActive).length;
    const admins = (users as any[]).filter((u: any) => u.role === 'admin').length;
    const chiefs = (users as any[]).filter((u: any) => u.role === 'sector_chief').length;
    const collaborators = (users as any[]).filter((u: any) => u.role === 'collaborator').length;

    return { total, active, admins, chiefs, collaborators };
  };

  const stats = getUserStats();

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-4xl font-bold font-display gradient-text" data-testid="text-page-title">
              Gerenciamento de Usuários
            </h1>
            <p className="text-muted-foreground text-lg mt-2" data-testid="text-page-description">
              Gerencie usuários, permissões e organize equipes no sistema ActivityPro
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.active}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.admins}</p>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Admins</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.chiefs}</p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Chefes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.collaborators}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Colaboradores</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, email ou username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                    data-testid="input-search"
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px] h-11" data-testid="select-role-filter">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrar por papel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os papéis</SelectItem>
                      <SelectItem value="admin">Administradores</SelectItem>
                      <SelectItem value="sector_chief">Chefes de Setor</SelectItem>
                      <SelectItem value="collaborator">Colaboradores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-bg shadow-lg h-11" data-testid="button-add-user">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-2xl font-bold gradient-text flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                      Registrar Novo Usuário
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Preencha os dados abaixo para criar uma nova conta no sistema ActivityPro.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="border-t pt-6">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                        <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações de Acesso</h3>

                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Nome de usuário *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ex: joao.silva"
                                    data-testid="input-username"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Senha *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    data-testid="input-password"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h3>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Nome</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ex: João"
                                      data-testid="input-first-name"
                                      className="h-11"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Sobrenome</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ex: Silva"
                                      data-testid="input-last-name"
                                      className="h-11"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">E-mail</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="Ex: joao.silva@empresa.com"
                                    data-testid="input-email"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Permissões e Setor</h3>

                          {currentUser.role === 'admin' && (
                            <FormField
                              control={form.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Papel *</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-role" className="h-11">
                                        <SelectValue placeholder="Selecione o papel" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="collaborator">Colaborador</SelectItem>
                                      <SelectItem value="sector_chief">Chefe de Setor</SelectItem>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name="sectorId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Setor *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-sector" className="h-11">
                                      <SelectValue placeholder="Selecione o setor" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {(sectors as any[]).map((sector: any) => (
                                      <SelectItem key={sector.id} value={sector.id}>
                                        {sector.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-3 pt-6 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsRegisterOpen(false)}
                            data-testid="button-cancel"
                            className="px-6"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={registerMutation.isPending}
                            data-testid="button-submit"
                            className="gradient-bg px-6 shadow-md"
                          >
                            {registerMutation.isPending ? "Criando..." : "Criar Usuário"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit User Dialog */}
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-2xl font-bold gradient-text flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                        <Edit className="w-4 h-4 text-white" />
                      </div>
                      Editar Usuário
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Atualize os dados do usuário {editingUser?.username}.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="border-t pt-6">
                    <Form {...editForm}>
                      <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-5">
                        <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações de Acesso</h3>

                          <FormField
                            control={editForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Nome de usuário *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ex: joao.silva"
                                    data-testid="input-edit-username"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Nova Senha (deixe vazio para manter atual)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder="Deixe vazio para não alterar"
                                    data-testid="input-edit-password"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h3>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={editForm.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Nome</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ex: João"
                                      data-testid="input-edit-first-name"
                                      className="h-11"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={editForm.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Sobrenome</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ex: Silva"
                                      data-testid="input-edit-last-name"
                                      className="h-11"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={editForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">E-mail</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="Ex: joao.silva@empresa.com"
                                    data-testid="input-edit-email"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Permissões e Setor</h3>

                          {currentUser.role === 'admin' && (
                            <FormField
                              control={editForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Papel *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-edit-role" className="h-11">
                                        <SelectValue placeholder="Selecione o papel" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="collaborator">Colaborador</SelectItem>
                                      <SelectItem value="sector_chief">Chefe de Setor</SelectItem>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={editForm.control}
                            name="sectorId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Setor *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-sector" className="h-11">
                                      <SelectValue placeholder="Selecione o setor" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {(sectors as any[]).map((sector: any) => (
                                      <SelectItem key={sector.id} value={sector.id}>
                                        {sector.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={editForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Usuário Ativo</FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    Usuários inativos não conseguem fazer login no sistema
                                  </div>
                                </div>
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    data-testid="checkbox-edit-active"
                                    className="w-4 h-4"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-3 pt-6 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditOpen(false)}
                            data-testid="button-edit-cancel"
                            className="px-6"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={editMutation.isPending}
                            data-testid="button-edit-submit"
                            className="gradient-bg px-6 shadow-md"
                          >
                            {editMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              Lista de Usuários
              <Badge variant="secondary" className="ml-auto">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="animate-pulse flex items-center space-x-4 w-full">
                      <div className="w-12 h-12 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  {searchTerm || roleFilter !== "all" ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || roleFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Comece criando o primeiro usuário do sistema"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="gradient-bg text-white font-semibold">
                          {user.firstName?.[0]}{user.lastName?.[0] || user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-foreground" data-testid={`text-username-${user.id}`}>
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.username
                            }
                          </h3>
                          <Badge
                            variant={getRoleBadgeVariant(user.role) as any}
                            data-testid={`badge-role-${user.id}`}
                            className="text-xs"
                          >
                            {getRoleLabel(user.role)}
                          </Badge>
                          {!user.isActive && (
                            <Badge variant="outline" data-testid={`badge-inactive-${user.id}`} className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          {user.email && (
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span data-testid={`text-email-${user.id}`}>{user.email}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span data-testid={`text-sector-${user.id}`}>
                              {getSectorName(user.sectorId)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">@{user.username}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 hover:scale-110 transition-transform"
                        onClick={() => openEditModal(user)}
                        data-testid={`button-edit-${user.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:scale-110 transition-transform"
                        data-testid={`button-delete-${user.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
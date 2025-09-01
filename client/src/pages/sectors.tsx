import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building, Plus, Edit, Trash2, Users } from "lucide-react";
import type { Sector, InsertSector } from "@shared/schema";

interface SectorForm {
  name: string;
}

export default function Sectors() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [formData, setFormData] = useState<SectorForm>({ name: "" });

  const { data: sectors = [], isLoading } = useQuery<Sector[]>({
    queryKey: ['/api/sectors'],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSector) => {
      return await apiRequest('POST', '/api/sectors', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sectors'] });
      setIsCreateModalOpen(false);
      setFormData({ name: "" });
      toast({
        title: "Sucesso",
        description: "Setor criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar setor. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSector> }) => {
      return await apiRequest('PUT', `/api/sectors/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sectors'] });
      setIsEditModalOpen(false);
      setEditingSector(null);
      setFormData({ name: "" });
      toast({
        title: "Sucesso",
        description: "Setor atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar setor. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/sectors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sectors'] });
      toast({
        title: "Sucesso",
        description: "Setor excluído com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir setor. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      createMutation.mutate({ name: formData.name.trim() });
    }
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSector && formData.name.trim()) {
      updateMutation.mutate({
        id: editingSector.id,
        data: { name: formData.name.trim() }
      });
    }
  };

  const handleDelete = (sector: Sector) => {
    if (confirm(`Tem certeza que deseja excluir o setor "${sector.name}"?`)) {
      deleteMutation.mutate(sector.id);
    }
  };

  const openEditModal = (sector: Sector) => {
    setEditingSector(sector);
    setFormData({ name: sector.name });
    setIsEditModalOpen(true);
  };

  const getUserCountBySector = (sectorId: string) => {
    return (users as any[]).filter((user: any) => user.sectorId === sectorId).length;
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <Layout>
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center space-y-3">
            <Building className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">Acesso Restrito</h3>
              <p className="text-muted-foreground mt-1">
                Apenas administradores podem gerenciar setores
              </p>
            </div>
          </div>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-page-title">
              Gerenciar Setores
            </h1>
            <p className="text-muted-foreground mt-1">
              Administre os setores da organização
            </p>
          </div>

          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button 
                className="gradient-bg font-medium hover:shadow-lg transition-all duration-200"
                data-testid="button-new-sector"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Setor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Setor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="sector-name">Nome do Setor</Label>
                  <Input
                    id="sector-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder="Digite o nome do setor"
                    required
                    data-testid="input-sector-name"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createMutation.isPending || !formData.name.trim()}
                    data-testid="button-confirm-create"
                  >
                    {createMutation.isPending ? "Criando..." : "Criar Setor"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Setores Cadastrados</span>
              <Badge variant="secondary">{sectors.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : sectors.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg" data-testid="text-no-sectors">
                  Nenhum setor cadastrado
                </h3>
                <p className="text-muted-foreground mt-1">
                  Crie o primeiro setor da organização
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Setor</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectors.map((sector) => (
                    <TableRow key={sector.id} data-testid={`row-sector-${sector.id}`}>
                      <TableCell className="font-medium">
                        {sector.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{getUserCountBySector(sector.id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sector.createdAt ? new Date(sector.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(sector)}
                            data-testid={`button-edit-${sector.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(sector)}
                            disabled={getUserCountBySector(sector.id) > 0}
                            data-testid={`button-delete-${sector.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Setor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <Label htmlFor="edit-sector-name">Nome do Setor</Label>
                <Input
                  id="edit-sector-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="Digite o nome do setor"
                  required
                  data-testid="input-edit-sector-name"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMutation.isPending || !formData.name.trim()}
                  data-testid="button-confirm-edit"
                >
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
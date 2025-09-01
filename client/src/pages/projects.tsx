import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Project, ProjectWithDetails, InsertProject, Sector } from "@shared/schema";
import { Plus, Calendar, Users, BarChart3, MoreVertical, Edit, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProjectsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithDetails | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ['/api/projects'],
  });

  const { data: sectors } = useQuery<Sector[]>({
    queryKey: ['/api/sectors'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      return apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowCreateDialog(false);
      toast({
        title: "Projeto criado",
        description: "O projeto foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar projeto.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Project> }) => {
      return apiRequest(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setEditingProject(null);
      toast({
        title: "Projeto atualizado",
        description: "O projeto foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar projeto.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/projects/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Projeto excluído",
        description: "O projeto foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir projeto.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return 'Planejamento';
      case 'in_progress': return 'Em Andamento';
      case 'on_hold': return 'Em Pausa';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return 'Baixa';
      case 'medium': return 'Média';
      case 'high': return 'Alta';
      default: return priority;
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: InsertProject | Partial<Project> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as any,
      status: formData.get('status') as any,
      sectorId: formData.get('sectorId') as string || undefined,
      startDate: formData.get('startDate') ? new Date(formData.get('startDate') as string) : undefined,
      endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : undefined,
      estimatedHours: formData.get('estimatedHours') ? parseInt(formData.get('estimatedHours') as string) : undefined,
      color: formData.get('color') as string,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data as InsertProject);
    }
  };

  const handleDelete = (project: ProjectWithDetails) => {
    if (window.confirm(`Tem certeza que deseja excluir o projeto "${project.name}"?`)) {
      deleteMutation.mutate(project.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Projetos</h1>
          <p className="text-muted-foreground">
            Organize e acompanhe seus projetos
          </p>
        </div>
        <Dialog open={showCreateDialog || !!editingProject} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingProject(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-project">
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Atualize as informações do projeto.' : 'Crie um novo projeto para organizar suas atividades.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingProject?.name || ''}
                      required
                      data-testid="input-project-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Cor</Label>
                    <Input
                      id="color"
                      name="color"
                      type="color"
                      defaultValue={editingProject?.color || '#8B5CF6'}
                      data-testid="input-project-color"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingProject?.description || ''}
                    rows={3}
                    data-testid="textarea-project-description"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select name="priority" defaultValue={editingProject?.priority || 'medium'}>
                      <SelectTrigger data-testid="select-project-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingProject?.status || 'planning'}>
                      <SelectTrigger data-testid="select-project-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planejamento</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="on_hold">Em Pausa</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sectorId">Setor</Label>
                    <Select name="sectorId" defaultValue={editingProject?.sectorId || ''}>
                      <SelectTrigger data-testid="select-project-sector">
                        <SelectValue placeholder="Selecione um setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem setor específico</SelectItem>
                        {sectors?.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      defaultValue={editingProject?.startDate ? format(new Date(editingProject.startDate), 'yyyy-MM-dd') : ''}
                      data-testid="input-project-start-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Fim</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                      defaultValue={editingProject?.endDate ? format(new Date(editingProject.endDate), 'yyyy-MM-dd') : ''}
                      data-testid="input-project-end-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedHours">Horas Estimadas</Label>
                    <Input
                      id="estimatedHours"
                      name="estimatedHours"
                      type="number"
                      min="0"
                      defaultValue={editingProject?.estimatedHours || ''}
                      data-testid="input-project-estimated-hours"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setShowCreateDialog(false);
                  setEditingProject(null);
                }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProject ? 'Atualizar' : 'Criar'} Projeto
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando seu primeiro projeto para organizar suas atividades.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="projects-grid">
          {projects?.map((project) => (
            <Card key={project.id} className="relative" data-testid={`card-project-${project.id}`}>
              <div 
                className="absolute top-0 left-0 w-full h-1 rounded-t-lg"
                style={{ backgroundColor: project.color }}
              />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg" data-testid={`text-project-name-${project.id}`}>
                      {project.name}
                    </CardTitle>
                    <CardDescription data-testid={`text-project-description-${project.id}`}>
                      {project.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`button-project-menu-${project.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingProject(project)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(project)}
                        className="text-red-600"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(project.status)}>
                    {getStatusText(project.status)}
                  </Badge>
                  <Badge className={getPriorityColor(project.priority)}>
                    {getPriorityText(project.priority)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Responsável: {project.owner.firstName} {project.owner.lastName}</span>
                  </div>
                  
                  {project.sector && (
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Setor: {project.sector.name}</span>
                    </div>
                  )}
                  
                  {project.startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Início: {format(new Date(project.startDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                  
                  {project.estimatedHours && (
                    <div className="text-xs">
                      Estimativa: {project.estimatedHours}h
                      {project.actualHours > 0 && (
                        <span className="ml-2">
                          | Realizado: {project.actualHours}h
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {project.completionPercentage > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progresso</span>
                      <span>{project.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${project.completionPercentage}%`,
                          backgroundColor: project.color
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
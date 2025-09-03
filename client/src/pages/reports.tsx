import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { usePlants } from "@/hooks/usePlants";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import {
  Download,
  Filter,
  Calendar,
  Clock,
  Building,
  FolderOpen,
  User,
  FileText,
  CheckCircle,
  Circle,
  BarChart3,
  Search,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ActivityWithDetails } from "@shared/schema";

interface ReportFilters {
  plant?: string;
  project?: string;
  requester?: string;
  collaboratorId?: string;
  showTimeColumn?: boolean;
  startDate?: string;
  endDate?: string;
  status?: string[];
  type?: string;
  sectorId?: string;
}

export default function Reports() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ReportFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({});
  const [showFilters, setShowFilters] = useState(true);

  // Fetch activities based on applied filters and user permissions
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["/api/reports/activities", appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/reports/activities?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    enabled: !!user && Object.keys(appliedFilters).length > 0,
  });

  // Fetch plants for filter options
  const { data: plants = [], isLoading: plantsLoading } = usePlants();

  // Fetch filter options from backend
  const { data: filterOptionsData } = useQuery({
    queryKey: ['/api/reports/filter-options'],
    enabled: !!user,
  });

  const filterOptions = useMemo(() => {
    return {
      plants: plants.map(plant => plant.name), // Use plant names from usePlants hook
      projects: (filterOptionsData as any)?.projects || [],
      requesters: (filterOptionsData as any)?.requesters || [],
      collaborators: (filterOptionsData as any)?.collaborators || []
    };
  }, [plants, filterOptionsData]);

  const exportMutation = useMutation({
    mutationFn: async (format: 'csv' | 'excel' | 'pdf') => {
      const response = await fetch(`/api/reports/export?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appliedFilters),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${format}-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const toggleSubtaskCompletion = useMutation({
    mutationFn: async ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) => {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!response.ok) throw new Error('Failed to update subtask');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate reports activities cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/reports/activities"] });
    },
  });

  const updateFilters = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    setFilters({});
    setAppliedFilters({});
  };

  // Check if export buttons should be enabled (requires both start and end dates)
  const isExportEnabled = appliedFilters.startDate && appliedFilters.endDate;

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'paused': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800',
      'next': 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-orange-100 text-orange-800',
      'low': 'bg-green-100 text-green-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-display" data-testid="text-page-title">
            Relatórios Avançados
          </h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
            <Button
              onClick={() => exportMutation.mutate('csv')}
              disabled={exportMutation.isPending || !isExportEnabled}
              data-testid="button-export-csv"
              title={!isExportEnabled ? "Selecione as datas de início e fim para exportar" : ""}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={() => exportMutation.mutate('excel')}
              disabled={exportMutation.isPending || !isExportEnabled}
              data-testid="button-export-excel"
              title={!isExportEnabled ? "Selecione as datas de início e fim para exportar" : ""}
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={() => exportMutation.mutate('pdf')}
              disabled={exportMutation.isPending || !isExportEnabled}
              data-testid="button-export-pdf"
              title={!isExportEnabled ? "Selecione as datas de início e fim para exportar" : ""}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card data-testid="card-filters">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filtros Avançados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Plant Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    Planta
                  </Label>
                  <Select onValueChange={(value) => updateFilters('plant', value === 'all' ? undefined : value)}>
                    <SelectTrigger data-testid="select-plant-filter">
                      <SelectValue placeholder="Todas as plantas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as plantas</SelectItem>
                      {plantsLoading ? (
                        <SelectItem value="__loading__" disabled>Carregando plantas...</SelectItem>
                      ) : plants.length === 0 ? (
                        <SelectItem value="__empty__" disabled>Nenhuma planta disponível</SelectItem>
                      ) : (
                        plants.map((plant) => (
                          <SelectItem key={plant.id} value={plant.name}>{plant.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <FolderOpen className="w-4 h-4 mr-1" />
                    Projeto
                  </Label>
                  <Select onValueChange={(value) => updateFilters('project', value === 'all' ? undefined : value)}>
                    <SelectTrigger data-testid="select-project-filter">
                      <SelectValue placeholder="Todos os projetos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os projetos</SelectItem>
                      {filterOptions.projects.map((project: string) => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Requester Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Solicitante
                  </Label>
                  <Select onValueChange={(value) => updateFilters('requester', value === 'all' ? undefined : value)}>
                    <SelectTrigger data-testid="select-requester-filter">
                      <SelectValue placeholder="Todos os solicitantes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os solicitantes</SelectItem>
                      {filterOptions.requesters.map((requester: string) => (
                        <SelectItem key={requester} value={requester}>{requester}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <FileText className="w-4 h-4 mr-1" />
                    Tipo
                  </Label>
                  <Select onValueChange={(value) => updateFilters('type', value === 'all' ? undefined : value)}>
                    <SelectTrigger data-testid="select-type-filter">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="simple">Simples</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Collaborator Filter - Only for sector_chief and admin */}
                {(user?.role === 'sector_chief' || user?.role === 'admin') && (
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      Colaborador
                    </Label>
                    <Select onValueChange={(value) => updateFilters('collaboratorId', value === 'all' ? undefined : value)}>
                      <SelectTrigger data-testid="select-collaborator-filter">
                        <SelectValue placeholder="Todos os colaboradores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os colaboradores</SelectItem>
                        {filterOptions.collaborators.map((collaborator: any) => (
                          <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.username}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Data Início
                  </Label>
                  <Input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => updateFilters('startDate', e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Data Fim
                  </Label>
                  <Input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => updateFilters('endDate', e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Status
                  </Label>
                  <Select onValueChange={(value) => updateFilters('status', value === 'all' ? undefined : [value])}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="next">Próximas</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="paused">Pausadas</SelectItem>
                      <SelectItem value="completed">Concluídas</SelectItem>
                      <SelectItem value="cancelled">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show Time Column */}
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Mostrar Tempo
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.showTimeColumn !== false}
                      onCheckedChange={(checked) => updateFilters('showTimeColumn', !!checked)}
                      data-testid="checkbox-show-time"
                    />
                    <span className="text-sm text-muted-foreground">
                      Exibir coluna de tempo nas atividades
                    </span>
                  </div>
                </div>
                <div></div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button onClick={applyFilters} data-testid="button-apply-filters">
                  <Search className="w-4 h-4 mr-2" />
                  Filtrar
                </Button>
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="w-4 h-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Card data-testid="card-results">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Resultados ({activities.length} atividades)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma atividade encontrada com os filtros aplicados.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity: ActivityWithDetails) => (
                  <Card key={activity.id} className="border-l-4 border-l-primary" data-testid={`activity-${activity.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{activity.title}</h3>
                          {activity.observations && (
                            <p className="text-muted-foreground text-sm mb-2">{activity.observations}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(activity.status)} data-testid={`badge-status-${activity.id}`}>
                            {activity.status === 'completed' ? 'Concluída' :
                              activity.status === 'in_progress' ? 'Em Andamento' :
                                activity.status === 'paused' ? 'Pausada' :
                                  activity.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                          </Badge>
                          <Badge className={getPriorityColor(activity.priority)} data-testid={`badge-priority-${activity.id}`}>
                            {activity.priority === 'high' ? 'Alta' :
                              activity.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Planta:</span>
                          <div className="font-medium">{activity.plant || activity.plantRef?.name || 'N/A'}</div>
                        </div>
                        {activity.project && (
                          <div>
                            <span className="text-muted-foreground">Projeto:</span>
                            <div className="font-medium">{activity.project}</div>
                          </div>
                        )}
                        {activity.requester && (
                          <div>
                            <span className="text-muted-foreground">Solicitante:</span>
                            <div className="font-medium">{activity.requester}</div>
                          </div>
                        )}
                        {filters.showTimeColumn !== false && (
                          <div>
                            <span className="text-muted-foreground">Tempo:</span>
                            <div className="font-medium">{formatDuration(activity.totalTime || 0)}</div>
                          </div>
                        )}
                      </div>

                      {/* Observations */}
                      {activity.observations && (
                        <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                          <span className="text-muted-foreground text-sm">Observações:</span>
                          <p className="text-sm mt-1">{activity.observations}</p>
                        </div>
                      )}

                      {/* Interactive Checklist */}
                      {activity.type === 'checklist' && activity.subtasks && activity.subtasks.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Subtarefas:</h4>
                          <div className="space-y-2">
                            {activity.subtasks.map((subtask) => (
                              <div
                                key={subtask.id}
                                className="flex items-center space-x-2"
                                data-testid={`subtask-${subtask.id}`}
                              >
                                <Checkbox
                                  checked={subtask.completed || false}
                                  onCheckedChange={(checked) => {
                                    toggleSubtaskCompletion.mutate({
                                      subtaskId: subtask.id,
                                      completed: !!checked
                                    });
                                  }}
                                  data-testid={`checkbox-subtask-${subtask.id}`}
                                />
                                <span
                                  className={subtask.completed ? 'line-through text-muted-foreground' : ''}
                                  data-testid={`text-subtask-${subtask.id}`}
                                >
                                  {subtask.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activity.createdAt && (
                        <div className="text-xs text-muted-foreground mt-3">
                          Criada em: {format(new Date(activity.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                          {activity.collaborator && (
                            <> por {activity.collaborator.username}</>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

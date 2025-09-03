import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import ActivityCard from "@/components/ActivityCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Filter, Calendar, Users, Activity, BarChart3, X } from "lucide-react";
import type { ActivityWithDetails, User } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryFilters {
  collaborator: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  search: string;
}

export default function History() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState<HistoryFilters>({
    collaborator: 'all',
    status: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ["/api/activities"],
    enabled: isAuthenticated,
  });

  // Handle authentication errors
  if (error && isUnauthorizedError(error)) {
    toast({
      title: "Não autorizado",
      description: "Você precisa fazer login novamente",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  // Get users for filter (only for admins and sector chiefs)
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && (user?.role === 'admin' || user?.role === 'sector_chief'),
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Filter and sort history activities with advanced filters
  const filteredActivities = useMemo(() => {
    let filtered = (activities as ActivityWithDetails[])
      .filter((activity) => activity.status === 'completed' || activity.status === 'cancelled');

    // Apply filters
    if (filters.collaborator && filters.collaborator !== 'all') {
      filtered = filtered.filter(activity => activity.collaboratorId === filters.collaborator);
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(activity => activity.status === filters.status);
    }

    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(activity => activity.type === filters.type);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchLower) ||
        activity.project?.toLowerCase().includes(searchLower) ||
        activity.requester?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(activity => {
        const activityDate = activity.updatedAt ? new Date(activity.updatedAt) : null;
        return activityDate && activityDate >= startDate;
      });
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(activity => {
        const activityDate = activity.updatedAt ? new Date(activity.updatedAt) : null;
        return activityDate && activityDate <= endDate;
      });
    }

    return filtered.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [activities, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = filteredActivities.filter(a => a.status === 'completed').length;
    const cancelled = filteredActivities.filter(a => a.status === 'cancelled').length;
    const totalTime = filteredActivities.reduce((acc, activity) => {
      // Calculate time from sessions if available
      const sessionTime = activity.sessions?.reduce((sessionAcc, session) => {
        return sessionAcc + (session.duration || 0);
      }, 0) || 0;
      return acc + sessionTime;
    }, 0);

    return {
      total: filteredActivities.length,
      completed,
      cancelled,
      totalTime: Math.round(totalTime / 60), // Convert to minutes
    };
  }, [filteredActivities]);

  const clearFilters = () => {
    setFilters({
      collaborator: 'all',
      status: 'all',
      type: 'all',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  const hasActiveFilters = filters.search !== '' || filters.startDate !== '' || filters.endDate !== '' ||
    (filters.collaborator !== 'all' && filters.collaborator !== '') ||
    (filters.status !== 'all' && filters.status !== '') ||
    (filters.type !== 'all' && filters.type !== '');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display" data-testid="text-page-title">
              Histórico de Atividades
            </h1>
            <p className="text-muted-foreground">
              Visualize e analise o histórico completo de atividades com filtros avançados
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
            data-testid="button-toggle-filters"
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">{Object.values(filters).filter(v => v).length}</Badge>
            )}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Canceladas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <X className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Total</p>
                  <p className="text-2xl font-bold">{stats.totalTime}min</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Filtros Avançados
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground hover:bg-transparent"
                  >
                    Limpar Filtros
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <Label htmlFor="search">Buscar</Label>
                  <Input
                    id="search"
                    placeholder="Título, projeto ou solicitante..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    data-testid="input-search"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="completed">Concluídas</SelectItem>
                      <SelectItem value="cancelled">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Filter */}
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger data-testid="select-type">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="simple">Simples</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Collaborator Filter (only for admins and sector chiefs) */}
                {(user?.role === 'admin' || user?.role === 'sector_chief') && (
                  <div>
                    <Label htmlFor="collaborator">Colaborador</Label>
                    <Select
                      value={filters.collaborator}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, collaborator: value }))}
                    >
                      <SelectTrigger data-testid="select-collaborator">
                        <SelectValue placeholder="Todos os colaboradores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os colaboradores</SelectItem>
                        {(users as User[]).filter(u => u.id && u.id.trim() && (u.firstName || u.username)).map((collaborator) => (
                          <SelectItem key={collaborator.id} value={collaborator.id}>
                            {collaborator.firstName || collaborator.username} {collaborator.lastName || ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date Range */}
                <div>
                  <Label htmlFor="startDate">Data Inicial</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    data-testid="input-start-date"
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Data Final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activities List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground" data-testid="text-no-history">
                  {hasActiveFilters
                    ? "Nenhuma atividade encontrada com os filtros aplicados"
                    : "Nenhuma atividade concluída ou cancelada ainda"
                  }
                </p>
                {hasActiveFilters && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={clearFilters}>
                      Limpar Filtros
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
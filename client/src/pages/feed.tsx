import { useState, useMemo } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import Layout from "@/components/Layout";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Users, MoreHorizontal, Calendar } from "lucide-react";
import type { ActivityLogWithUser, ActivityWithDetails } from "@shared/schema";

export default function Feed() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isConnected } = useWebSocket(); // Enable WebSocket connection
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedActivityId, setSelectedActivityId] = useState<string>("all");

  // Use infinite query for better performance with pagination
  const {
    data: logsData,
    isLoading: logsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['/api/activity-logs', user?.role, user?.id],
    queryFn: ({ pageParam = 1 }) => {
      // Para colaboradores, filtrar apenas seus próprios logs
      const userParam = user?.role === 'collaborator' ? `&userId=${user.id}` : '';
      return fetch(`/api/activity-logs?page=${pageParam}&limit=20&days=7${userParam}`)
        .then(res => res.json());
    },
    enabled: isAuthenticated && !!user,
    refetchInterval: 30000, // Reduced from 5s to 30s for better performance
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.pagination?.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1
  });

  // Flatten the paginated data - handle both old and new API response formats
  const logs = useMemo(() => {
    if (!logsData?.pages) return [];
    return logsData.pages.flatMap(page => {
      // Handle paginated response format
      if (page.logs && Array.isArray(page.logs)) {
        return page.logs;
      }
      // Handle direct array response (fallback)
      if (Array.isArray(page)) {
        return page;
      }
      return [];
    });
  }, [logsData]);

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: isAuthenticated && (user?.role === 'admin' || user?.role === 'sector_chief'),
  });

  const { data: activities = [] } = useQuery<ActivityWithDetails[]>({
    queryKey: ['/api/activities', user?.id],
    queryFn: () => {
      // Para colaboradores, buscar apenas suas atividades
      const userParam = user?.role === 'collaborator' ? `?userId=${user.id}` : '';
      return fetch(`/api/activities${userParam}`).then(res => res.json());
    },
    enabled: isAuthenticated && user?.role === 'collaborator' && !!user?.id,
  });

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Filtro por usuário (para admin e chefe de setor)
    if (selectedUserId && selectedUserId !== 'all' && (user?.role === 'admin' || user?.role === 'sector_chief')) {
      filtered = filtered.filter(log => log.userId === selectedUserId);
    }

    // Filtro por atividade (para colaborador)
    if (selectedActivityId && selectedActivityId !== 'all' && user?.role === 'collaborator') {
      filtered = filtered.filter(log => log.activityId === selectedActivityId);
    }

    return filtered;
  }, [logs, selectedUserId, selectedActivityId, user?.role]);

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

  const getPageTitle = () => {
    switch (user?.role) {
      case 'admin':
        return 'Feed - Todo o Sistema';
      case 'sector_chief':
        return 'Feed - Sua Equipe';
      case 'collaborator':
        return 'Feed - Suas Atividades';
      default:
        return 'Feed de Atividades';
    }
  };

  const getPageDescription = () => {
    switch (user?.role) {
      case 'admin':
        return 'Acompanhe todas as atividades do sistema em tempo real';
      case 'sector_chief':
        return 'Acompanhe as atividades da sua equipe em tempo real';
      case 'collaborator':
        return 'Histórico de ações das suas atividades';
      default:
        return 'Feed de atividades em tempo real';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display dark:text-white" data-testid="text-page-title">
              {getPageTitle()}
            </h1>
            <p className="text-muted-foreground dark:text-gray-300">
              {getPageDescription()}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Últimos 7 dias
            </Badge>
            <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center">
              {isConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
                  Tempo Real
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-1"></div>
                  Offline
                </>
              )}
            </Badge>

            {logs.length > 0 && (
              <Badge className="flex items-center">
                <Activity className="h-3 w-3 mr-1" />
                {filteredLogs.length} eventos
              </Badge>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          {/* Filtro por usuário - apenas para admin e chefe de setor */}
          {(user?.role === 'admin' || user?.role === 'sector_chief') && (
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium dark:text-white">
                Filtrar por usuário:
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-user-filter">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {(users as any[]).filter(u => u.id).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName || u.username} {u.lastName || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro por atividade - apenas para colaborador */}
          {user?.role === 'collaborator' && (
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                Filtrar por atividade:
              </label>
              <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                <SelectTrigger data-testid="select-activity-filter">
                  <SelectValue placeholder="Todas as atividades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as atividades</SelectItem>
                  {activities.filter(activity => activity.id && activity.title).map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center dark:text-white">
              <Users className="h-5 w-5 mr-2" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 h-20 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div data-testid="activity-feed-container">
                <ActivityFeed
                  logs={filteredLogs}
                  showUserInfo={user?.role !== 'collaborator'}
                />

                {/* Load More Button */}
                {hasNextPage && (
                  <div className="flex justify-center mt-6">
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      data-testid="button-load-more"
                    >
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                    </Button>
                  </div>
                )}

                {logs.length === 0 && !logsLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma atividade encontrada nos últimos 7 dias.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  Clock,
  Activity,
  TrendingUp,
  Download,
  Calendar,
  User,
  MapPin,
  Briefcase
} from "lucide-react";
import type { User as UserType, Activity as ActivityType, UserWithSector } from "@shared/schema";

function TeamPage() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket(); // Enable WebSocket connection
  const [timeFilter, setTimeFilter] = useState("today");
  const [userFilter, setUserFilter] = useState("all");

  // Verificar se é gerente de setor ou admin
  if (!user || (user.role !== 'sector_chief' && user.role !== 'admin')) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
          <p className="text-muted-foreground mt-2">
            Esta página é apenas para gerentes de setor e administradores.
          </p>
        </div>
      </Layout>
    );
  }

  // Buscar usuários da equipe (mesmo setor)
  const { data: teamMembers = [], isLoading: loadingTeam } = useQuery<UserWithSector[]>({
    queryKey: ['/api/team/members'],
    enabled: !!user && (user.role === 'sector_chief' || user.role === 'admin'),
  });

  // Buscar atividades da equipe
  const { data: teamActivities = [], isLoading: loadingActivities } = useQuery<(ActivityType & { collaborator: UserType })[]>({
    queryKey: ['/api/team/activities', timeFilter],
    queryFn: () => fetch(`/api/team/activities?timeFilter=${timeFilter}`).then(res => res.json()),
    enabled: !!user && (user.role === 'sector_chief' || user.role === 'admin'),
  });

  // Buscar estatísticas da equipe
  const { data: teamStats, isLoading: loadingStats } = useQuery<{
    totalActivities: number;
    completedActivities: number;
    totalTime: number;
  }>({
    queryKey: ['/api/team/stats', timeFilter],
    queryFn: () => fetch(`/api/team/stats?timeFilter=${timeFilter}`).then(res => res.json()),
    enabled: !!user && (user.role === 'sector_chief' || user.role === 'admin'),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': return 'Em andamento';
      case 'completed': return 'Concluída';
      case 'paused': return 'Pausada';
      case 'cancelled': return 'Cancelada';
      case 'next': return 'Próxima';
      default: return status;
    }
  };

  // Filter activities based on selected user
  const filteredActivities = useMemo(() => {
    if (userFilter === "all") return teamActivities;
    return teamActivities.filter(activity => activity.collaboratorId === userFilter);
  }, [teamActivities, userFilter]);

  // Filter team members for current activity display
  const filteredMembers = useMemo(() => {
    if (userFilter === "all") return teamMembers;
    return teamMembers.filter(member => member.id === userFilter);
  }, [teamMembers, userFilter]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const activities = filteredActivities;
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.status === 'completed').length;
    const totalTime = activities.reduce((sum, a) => sum + (a.totalTime || 0), 0);
    const activeMembers = filteredMembers.filter((member: any) =>
      teamActivities.some(activity =>
        activity.collaboratorId === member.id && activity.status === 'in_progress'
      )
    ).length;

    return {
      totalActivities,
      completedActivities,
      totalTime,
      activeMembers,
      teamSize: filteredMembers.length,
    };
  }, [filteredActivities, filteredMembers, teamActivities]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getCurrentActivity = (memberId: string) => {
    return teamActivities.find((activity) =>
      activity.collaboratorId === memberId && activity.status === 'in_progress'
    );
  };

  return (
    <Layout>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Equipe</h1>
            <p className="text-muted-foreground">
              Visão geral da sua equipe e atividades
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* User Filter */}
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Usuários</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Time Filter */}
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </Button>
          </div>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membros da Equipe</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredStats.teamSize}</div>
              <p className="text-xs text-muted-foreground">
                {filteredStats.activeMembers} ativos agora
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(filteredStats.totalTime)}
              </div>
              <p className="text-xs text-muted-foreground">
                No período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atividades</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredStats.totalActivities}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredStats.completedActivities} concluídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtividade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredStats.totalActivities > 0
                  ? Math.round((filteredStats.completedActivities / filteredStats.totalActivities) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Taxa de conclusão
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs principais */}
        <Tabs defaultValue="status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="status">Status Atual</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="activities">Atividades</TabsTrigger>
          </TabsList>

          {/* Status Atual da Equipe */}
          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Status da Equipe - Agora</CardTitle>
                <CardDescription>
                  Veja o que cada membro está fazendo no momento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTeam ? (
                  <div>Carregando equipe...</div>
                ) : (
                  filteredMembers.map((member: UserType) => {
                    const currentActivity = getCurrentActivity(member.id);
                    return (
                      <div key={member.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profileImageUrl || undefined} />
                          <AvatarFallback>
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">
                              {member.firstName && member.lastName
                                ? `${member.firstName} ${member.lastName}`
                                : member.username}
                            </h3>
                            <Badge variant="outline">{member.role}</Badge>
                          </div>

                          {currentActivity ? (
                            <div className="mt-1">
                              <div className="flex items-center space-x-2 text-sm">
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(currentActivity.status)}`} />
                                <span className="font-medium">{currentActivity.title}</span>
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{currentActivity.plant}</span>
                                </div>
                                {currentActivity.project && (
                                  <div className="flex items-center space-x-1">
                                    <Briefcase className="w-3 h-3" />
                                    <span>{currentActivity.project}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTime(currentActivity.totalTime || 0)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              Sem atividade ativa no momento
                            </p>
                          )}
                        </div>

                        <Badge
                          variant={currentActivity ? "default" : "secondary"}
                          className={currentActivity ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                          {currentActivity ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatórios */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios da Equipe</CardTitle>
                <CardDescription>
                  Análise de tempo e produtividade por colaborador
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Relatórios detalhados em desenvolvimento</p>
                  <p className="text-sm">Em breve: análise por planta, projeto e período</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Atividades */}
          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Atividades da Equipe</CardTitle>
                <CardDescription>
                  Todas as atividades do período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingActivities ? (
                  <div>Carregando atividades...</div>
                ) : filteredActivities.length > 0 ? (
                  <div className="space-y-3">
                    {filteredActivities.map((activity: ActivityType & { collaborator: UserType }) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{activity.title}</h3>
                            <Badge variant="outline">
                              {getStatusText(activity.status)}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>
                                {activity.collaborator?.firstName
                                  ? `${activity.collaborator.firstName} ${activity.collaborator.lastName}`
                                  : activity.collaborator?.username}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{activity.plant}</span>
                            </div>
                            {activity.project && (
                              <div className="flex items-center space-x-1">
                                <Briefcase className="w-3 h-3" />
                                <span>{activity.project}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium">{formatTime(activity.totalTime || 0)}</div>
                          <div className="text-xs text-muted-foreground">
                            {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma atividade encontrada no período</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

export default TeamPage;
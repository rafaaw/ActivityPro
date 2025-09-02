import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import ActiveTimer from "@/components/ActiveTimer";
import ActivityCard from "@/components/ActivityCard";
import QuickActions from "@/components/QuickActions";
import RecentHistory from "@/components/RecentHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityWithDetails, DashboardStats } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<ActivityWithDetails[]>({
    queryKey: ["/api/activities"],
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  if (!user) return null;

  // Filter activities to show only the current user's activities
  const userActivities = activities.filter(a => a.collaboratorId === user.id);

  const activeActivity = userActivities.find(a => a.status === 'in_progress');
  const nextActivities = userActivities.filter(a => a.status === 'next');
  const pausedActivities = userActivities.filter(a => a.status === 'paused');
  const completedToday = userActivities.filter(a => {
    if (a.status !== 'completed' || !a.completedAt) return false;
    const today = new Date();
    const completedDate = new Date(a.completedAt);
    return completedDate.toDateString() === today.toDateString();
  });

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Active Timer */}
        {activeActivity && (
          <ActiveTimer activity={activeActivity} />
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="text-center">
                {statsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-12 md:w-16 mx-auto mb-1 md:mb-2" />
                ) : (
                  <p className="text-lg md:text-2xl font-bold text-foreground" data-testid="text-today-time">
                    {stats?.todayHours || 0}h {stats?.todayMinutes || 0}m
                  </p>
                )}
                <p className="text-xs md:text-sm text-muted-foreground">Hoje</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="text-center">
                {statsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-12 md:w-16 mx-auto mb-1 md:mb-2" />
                ) : (
                  <p className="text-lg md:text-2xl font-bold text-foreground" data-testid="text-week-time">
                    {stats?.weekHours || 0}h {stats?.weekMinutes || 0}m
                  </p>
                )}
                <p className="text-xs md:text-sm text-muted-foreground">Esta semana</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="text-center">
                <p className="text-lg md:text-2xl font-bold text-foreground" data-testid="text-completed-today">
                  {completedToday.length}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Concluídas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="text-center">
                <p className="text-lg md:text-2xl font-bold text-foreground" data-testid="text-total-activities">
                  {userActivities.length}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Next Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Próximas</span>
                </div>
                <Badge variant="secondary" data-testid="badge-next-count">
                  {nextActivities.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : nextActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-next-activities">
                  Nenhuma atividade pendente
                </p>
              ) : (
                nextActivities.map(activity => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Paused Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Pausadas</span>
                </div>
                <Badge variant="secondary" data-testid="badge-paused-count">
                  {pausedActivities.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : pausedActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-paused-activities">
                  Nenhuma atividade pausada
                </p>
              ) : (
                pausedActivities.map(activity => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Completed Today */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span>Concluídas Hoje</span>
                </div>
                <Badge variant="secondary" data-testid="badge-completed-count">
                  {completedToday.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : completedToday.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-completed-activities">
                  Nenhuma atividade concluída hoje
                </p>
              ) : (
                completedToday.map(activity => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions and Recent History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <QuickActions />
          <RecentHistory activities={userActivities} />
        </div>
      </div>
    </Layout>
  );
}

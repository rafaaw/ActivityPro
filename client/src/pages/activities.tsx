import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import ActivityForm from "@/components/ActivityForm";
import ActivityCard from "@/components/ActivityCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ActivityWithDetails, InsertActivity } from "@shared/schema";

export default function Activities() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["/api/activities"],
    enabled: isAuthenticated,
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: InsertActivity & { subtasks?: { title: string }[] }) => {
      await apiRequest("POST", "/api/activities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowCreateForm(false);
      toast({
        title: "Sucesso",
        description: "Atividade criada com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você precisa fazer login novamente",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar atividade",
        variant: "destructive",
      });
    },
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

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'next': return 'próximas';
      case 'in_progress': return 'em andamento';
      case 'paused': return 'pausadas';
      case 'completed': return 'concluídas';
      case 'cancelled': return 'canceladas';
      default: return status.replace('_', ' ');
    }
  };

  const groupedActivities = {
    next: (activities as any[]).filter((a: any) => a.status === 'next'),
    in_progress: (activities as any[]).filter((a: any) => a.status === 'in_progress'),
    paused: (activities as any[]).filter((a: any) => a.status === 'paused'),
    completed: (activities as any[]).filter((a: any) => a.status === 'completed'),
    cancelled: (activities as any[]).filter((a: any) => a.status === 'cancelled'),
    history: (activities as any[]).filter((a: any) => a.status === 'completed' || a.status === 'cancelled')
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display" data-testid="text-page-title">
              Minhas Atividades
            </h1>
            <p className="text-muted-foreground">
              Gerencie todas as suas atividades e controle seu tempo
            </p>
          </div>

          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="gradient-bg" data-testid="button-create-activity">
                <Plus className="w-4 h-4 mr-2" />
                Nova Atividade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Atividade</DialogTitle>
              </DialogHeader>
              <ActivityForm
                onSubmit={(data) => createActivityMutation.mutate(data)}
                isLoading={createActivityMutation.isPending}
                onCancel={() => setShowCreateForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all" data-testid="tab-all">
              Todas ({(activities as any[]).length})
            </TabsTrigger>
            <TabsTrigger value="next" data-testid="tab-next">
              Próximas ({groupedActivities.next.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" data-testid="tab-in-progress">
              Ativas ({groupedActivities.in_progress.length})
            </TabsTrigger>
            <TabsTrigger value="paused" data-testid="tab-paused">
              Pausadas ({groupedActivities.paused.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Concluídas ({groupedActivities.completed.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled">
              Canceladas ({groupedActivities.cancelled.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4" data-testid="content-all-activities">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : (activities as any[]).length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground" data-testid="text-no-activities">
                    Você ainda não tem atividades. Crie sua primeira atividade!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(activities as any[]).map((activity: any) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </TabsContent>

          {Object.entries(groupedActivities).map(([status, statusActivities]) => (
            <TabsContent key={status} value={status} className="space-y-4" data-testid={`content-${status}-activities`}>
              {statusActivities.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground" data-testid={`text-no-${status}-activities`}>
                      {status === 'history' 
                        ? 'Nenhuma atividade concluída ou cancelada ainda'
                        : `Nenhuma atividade com status "${getStatusDisplayName(status)}"`
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {statusActivities.map((activity: any) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}

        </Tabs>
      </div>
    </Layout>
  );
}

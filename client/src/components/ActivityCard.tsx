import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  CheckCircle,
  X,
  Edit,
  Copy,
  Clock,
  Square,
  CheckSquare,
  Eye,
  Undo2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import type { ActivityWithDetails } from "@shared/schema";
import { useActivityModal } from "@/contexts/ActivityModalContext";
import { useAuth } from "@/hooks/useAuth";
import CompletionDialog from "@/components/CompletionDialog";
import StartActivityDialog from "@/components/StartActivityDialog";
import CompletedActivityDetails from "@/components/CompletedActivityDetails";
import CancellationDialog from "@/components/CancellationDialog";
import TimeAdjustmentDialog from "@/components/TimeAdjustmentDialog";

interface ActivityCardProps {
  activity: ActivityWithDetails;
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openModal } = useActivityModal();
  const { user } = useAuth();
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showTimeAdjustmentDialog, setShowTimeAdjustmentDialog] = useState(false);
  const [showStartActivityDialog, setShowStartActivityDialog] = useState(false);

  // Query para buscar atividades em progresso apenas do usuário atual
  const { data: activities = [] } = useQuery<ActivityWithDetails[]>({
    queryKey: ["/api/activities"],
  });

  // Encontrar atividade ativa apenas do usuário atual
  const activeActivity = activities.find(a =>
    a.status === 'in_progress' &&
    a.collaboratorId === user?.id
  );


  const updateActivityMutation = useMutation({
    mutationFn: async (updates: any) => {
      await apiRequest("PATCH", `/api/activities/${activity.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
        description: "Falha ao atualizar atividade",
        variant: "destructive",
      });
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) => {
      await apiRequest("PATCH", `/api/subtasks/${subtaskId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Sucesso",
        description: "Subtarefa atualizada",
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
        description: error.message || "Falha ao atualizar subtarefa",
        variant: "destructive",
      });
    },
  });

  const formatTime = (seconds: number) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'next': return 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/50';
      case 'in_progress': return 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-950/50';
      case 'paused': return 'border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/50';
      case 'completed': return 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-950/50';
      case 'cancelled': return 'border-red-400 bg-red-100 dark:border-red-700 dark:bg-red-950/50';
      default: return 'border-border bg-background';
    }
  };

  const canStart = activity.status === 'next' || activity.status === 'paused';
  const canPause = activity.status === 'in_progress';
  const canComplete = activity.status === 'in_progress' || activity.status === 'paused';
  const canEdit = activity.status !== 'completed' && activity.status !== 'cancelled';
  const canAdjustTime = activity.status === 'paused' || activity.status === 'completed';

  const handleStart = () => {
    // Verificar se há uma atividade ativa
    if (activeActivity && activeActivity.id !== activity.id) {
      setShowStartActivityDialog(true);
    } else {
      // Não há atividade ativa, iniciar diretamente
      updateActivityMutation.mutate({ status: 'in_progress' });
    }
  };

  const handleConfirmStart = async () => {
    try {
      // Primeiro pausar a atividade ativa
      if (activeActivity) {
        await apiRequest("PATCH", `/api/activities/${activeActivity.id}`, { status: 'paused' });

        toast({
          title: "Atividade pausada",
          description: `"${activeActivity.title}" foi pausada automaticamente`,
        });
      }

      // Depois iniciar a nova atividade
      updateActivityMutation.mutate({ status: 'in_progress' }, {
        onSuccess: () => {
          setShowStartActivityDialog(false);
          toast({
            title: "Atividade iniciada",
            description: `"${activity.title}" foi iniciada com sucesso`,
          });
        }
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao pausar atividade atual",
        variant: "destructive",
      });
    }
  };

  const handlePause = () => {
    updateActivityMutation.mutate({ status: 'paused' });
  };

  // Check if all subtasks are completed
  const areAllSubtasksCompleted = () => {
    if (activity.type !== 'checklist' || !activity.subtasks || activity.subtasks.length === 0) {
      return true; // No subtasks or not checklist = can complete
    }
    return activity.subtasks.every(subtask => subtask.completed);
  };

  const handleComplete = () => {
    if (!areAllSubtasksCompleted()) {
      toast({
        title: "Atenção",
        description: "Complete todas as subtarefas antes de finalizar",
        variant: "destructive",
      });
      return;
    }
    setShowCompletionDialog(true);
  };

  const handleCompletionSuccess = () => {
    setShowCompletionDialog(false);
  };

  const handleViewDetails = () => {
    setShowDetailsDialog(true);
  };

  const handleCancelActivity = () => {
    setShowCancellationDialog(true);
  };

  const handleCancellationSuccess = () => {
    setShowCancellationDialog(false);
  };

  const handleEdit = () => {
    // Abrir modal de edição com os dados da atividade atual
    openModal(activity, true);
  };

  const handleRevertToPaused = () => {
    updateActivityMutation.mutate({ status: 'paused' }, {
      onSuccess: () => {
        toast({
          title: "Atividade revertida",
          description: "A atividade foi revertida para status 'Pausada'",
        });
      }
    });
  };

  const handleSubtaskToggle = (subtaskId: string, currentCompleted: boolean) => {
    updateSubtaskMutation.mutate({
      subtaskId,
      completed: !currentCompleted
    });
  };

  const getProgressPercentage = () => {
    if (!activity.subtasks || activity.subtasks.length === 0) return 0;
    const completed = activity.subtasks.filter(s => s.completed).length;
    return Math.round((completed / activity.subtasks.length) * 100);
  };

  const handleCopy = () => {
    // Preparar os dados para cópia, removendo campos que não devem ser copiados
    const copyData = {
      title: `${activity.title} (Cópia)`,
      type: activity.type,
      priority: activity.priority,
      plant: activity.plant || activity.plantRef?.name,
      project: activity.project,
      requester: activity.requester,
      observations: activity.observations,
      // Para cópia, convertemos subtasks para o formato esperado pelo modal
      ...(activity.subtasks && activity.subtasks.length > 0 && {
        subtasks: activity.subtasks.map(subtask => ({
          id: subtask.id,
          title: subtask.title,
          completed: false, // Nova cópia sempre com subtasks não completadas
          createdAt: subtask.createdAt,
          activityId: subtask.activityId
        }))
      })
    };

    console.log('Dados para cópia:', copyData);

    openModal(copyData);

    toast({
      title: "Atividade copiada",
      description: "Você pode modificar os dados antes de criar",
    });
  };

  // Remove old handleCancel - now using modal

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-md hover:scale-102 hover:border-primary/10 cursor-pointer",
        getStatusColor(activity.status)
      )}
      data-testid={`card-activity-${activity.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-4">
            <h4 className="font-medium text-foreground line-clamp-2 mb-2 dark:text-white" data-testid="text-activity-title">
              {activity.title}
            </h4>
            <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground dark:text-gray-300">
              <span data-testid="text-activity-plant">{activity.plant || activity.plantRef?.name || 'N/A'}</span>
              {activity.project && (
                <>
                  <span>•</span>
                  <span data-testid="text-activity-project">{activity.project}</span>
                </>
              )}
              {activity.requester && (
                <>
                  <span>•</span>
                  <span data-testid="text-activity-requester">{activity.requester}</span>
                </>
              )}
              {activity.observations && (
                <>
                  <span>•</span>
                  <span data-testid="text-activity-observations" className="italic text-gray-600 dark:text-gray-400">
                    {activity.observations.length > 50
                      ? `${activity.observations.substring(0, 50)}...`
                      : activity.observations}
                  </span>
                </>
              )}
              {activity.totalTime && activity.totalTime > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center" data-testid="text-activity-time">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(activity.totalTime)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={getPriorityColor(activity.priority)} data-testid="badge-activity-priority">
              {getPriorityText(activity.priority)}
            </Badge>
          </div>
        </div>

        {/* Subtasks - Sempre mostrar para atividades checklist */}
        {activity.type === 'checklist' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground dark:text-gray-300">
                Subtarefas ({activity.subtasks ? activity.subtasks.filter(s => s.completed).length : 0}/{activity.subtasks ? activity.subtasks.length : 0})
              </p>
              <span className="text-xs font-medium text-primary dark:text-blue-400">
                {getProgressPercentage()}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-1.5 mb-3">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>

            <div className="space-y-2 max-h-[7.5rem] overflow-y-auto">
              {activity.subtasks && activity.subtasks.length > 0 ? (
                <>
                  {activity.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center space-x-2 text-xs group hover:bg-muted/30 p-1 rounded transition-colors"
                      data-testid={`subtask-${subtask.id}`}
                    >
                      <button
                        onClick={() => handleSubtaskToggle(subtask.id, subtask.completed || false)}
                        disabled={updateSubtaskMutation.isPending || activity.status === 'next' || activity.status === 'cancelled'}
                        className={`flex items-center justify-center w-4 h-4 transition-transform ${activity.status === 'next' || activity.status === 'cancelled' ? 'cursor-not-allowed opacity-50' : 'hover:scale-110'
                          }`}
                        data-testid={`checkbox-subtask-${subtask.id}`}
                      >
                        {subtask.completed ? (
                          <CheckSquare className="w-4 h-4 text-success" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                      <span className={cn(
                        "flex-1 transition-all duration-200",
                        subtask.completed
                          ? "line-through text-muted-foreground dark:text-gray-400"
                          : "text-foreground group-hover:text-primary dark:text-white dark:group-hover:text-blue-400"
                      )}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-xs text-muted-foreground dark:text-gray-400 italic p-2 text-center border border-dashed rounded dark:border-gray-600">
                  {activity.status === 'in_progress'
                    ? "Carregando subtarefas..."
                    : "Nenhuma subtarefa definida"
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {canStart && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStart}
                disabled={updateActivityMutation.isPending}
                className="text-success border-success hover:bg-success hover:text-success-foreground hover:scale-110 transition-transform"
                data-testid="button-start-activity"
              >
                <Play className="w-3 h-3 mr-1" />
                Iniciar
              </Button>
            )}

            {canPause && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePause}
                disabled={updateActivityMutation.isPending}
                className="text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-orange-50 hover:scale-110 transition-transform"
                data-testid="button-pause-activity"
              >
                <Pause className="w-3 h-3 mr-1" />
                Pausar
              </Button>
            )}

            {canComplete && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleComplete}
                disabled={updateActivityMutation.isPending}
                className="text-success border-success hover:bg-success hover:text-success-foreground hover:scale-110 transition-transform"
                data-testid="button-complete-activity"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Concluir
              </Button>
            )}

            {(activity.status === 'completed' || activity.status === 'cancelled') && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewDetails}
                className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-blue-50 hover:scale-110 transition-transform"
                data-testid="button-view-details"
              >
                <Eye className="w-3 h-3 mr-1" />
                Detalhes
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEdit}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-110 transition-transform p-1"
                data-testid="button-edit-activity"
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-110 transition-transform p-1"
              data-testid="button-duplicate-activity"
            >
              <Copy className="w-3 h-3" />
            </Button>

            {activity.status === 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRevertToPaused}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-110 transition-transform p-1"
                data-testid="button-revert-to-paused"
                title="Reverter para Pausada"
              >
                <Undo2 className="w-3 h-3" />
              </Button>
            )}

            {canAdjustTime && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTimeAdjustmentDialog(true)}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-110 transition-transform p-1"
                data-testid="button-adjust-time"
              >
                <Clock className="w-3 h-3" />
              </Button>
            )}

            {activity.status === 'next' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelActivity}
                className="text-destructive hover:text-destructive hover:bg-transparent hover:scale-110 transition-transform p-1"
                data-testid="button-cancel-activity"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Completion Dialog */}
      <CompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        activityId={activity.id}
        activityTitle={activity.title}
        onSuccess={handleCompletionSuccess}
      />

      {/* Details Dialog for Completed/Cancelled Activities */}
      <CompletedActivityDetails
        isOpen={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        activity={activity}
      />

      {/* Cancellation Dialog */}
      <CancellationDialog
        isOpen={showCancellationDialog}
        onClose={() => setShowCancellationDialog(false)}
        activityId={activity.id}
        activityTitle={activity.title}
        onSuccess={handleCancellationSuccess}
      />

      {/* Time Adjustment Dialog */}
      <TimeAdjustmentDialog
        isOpen={showTimeAdjustmentDialog}
        onClose={() => setShowTimeAdjustmentDialog(false)}
        activity={activity}
      />

      {/* Start Activity Dialog */}
      {activeActivity && (
        <StartActivityDialog
          isOpen={showStartActivityDialog}
          onClose={() => setShowStartActivityDialog(false)}
          activeActivity={activeActivity}
          newActivityTitle={activity.title}
          onConfirm={handleConfirmStart}
          isLoading={updateActivityMutation.isPending}
        />
      )}
    </Card>
  );
}

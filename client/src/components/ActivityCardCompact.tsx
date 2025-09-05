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

interface ActivityCardCompactProps {
  activity: ActivityWithDetails;
}

export default function ActivityCardCompact({ activity }: ActivityCardCompactProps) {
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
    if (activeActivity && activeActivity.id !== activity.id) {
      setShowStartActivityDialog(true);
    } else {
      updateActivityMutation.mutate({ status: 'in_progress' });
    }
  };

  const handleConfirmStart = async () => {
    try {
      if (activeActivity) {
        await apiRequest("PATCH", `/api/activities/${activeActivity.id}`, { status: 'paused' });
        toast({
          title: "Atividade pausada",
          description: `"${activeActivity.title}" foi pausada automaticamente`,
        });
      }

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

  const handleComplete = () => {
    setShowCompletionDialog(true);
  };

  const handleCompletionSuccess = () => {
    setShowCompletionDialog(false);
    toast({
      title: "Atividade concluída",
      description: `"${activity.title}" foi concluída com sucesso`,
    });
  };

  const handleEdit = () => {
    openModal(activity);
  };

  const handleCopy = () => {
    const activityCopy = {
      ...activity,
      id: undefined,
      status: 'next' as const,
      totalTime: 0,
      startedAt: null,
      pausedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      completionNotes: null,
      evidenceUrl: null,
      isRetroactive: false,
    };
    openModal(activityCopy);
  };

  const handleViewDetails = () => {
    setShowDetailsDialog(true);
  };

  const handleRevertToPaused = () => {
    updateActivityMutation.mutate({ status: 'paused' });
  };

  const handleCancelActivity = () => {
    setShowCancellationDialog(true);
  };

  const handleCancellationSuccess = () => {
    setShowCancellationDialog(false);
    toast({
      title: "Atividade cancelada",
      description: `"${activity.title}" foi cancelada`,
    });
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-md hover:scale-102 hover:border-primary/10 cursor-pointer",
        getStatusColor(activity.status)
      )}
      data-testid={`card-activity-${activity.id}`}
    >
      <CardContent className="p-3">
        {/* Compact layout - single row with title, priority and actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Title and Priority */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge
              variant={getPriorityColor(activity.priority)}
              className="flex-shrink-0 text-xs"
              data-testid="badge-activity-priority"
            >
              {getPriorityText(activity.priority)}
            </Badge>
            <h4
              className="font-medium text-foreground line-clamp-1 text-sm dark:text-white"
              data-testid="text-activity-title"
              title={activity.title}
            >
              {activity.title}
            </h4>
            {!!(activity.totalTime && activity.totalTime > 0) && (
              <span className="flex items-center text-xs text-muted-foreground dark:text-gray-300 flex-shrink-0" data-testid="text-activity-time">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(activity.totalTime)}
              </span>
            )}
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex items-center gap-1">
            {canStart && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStart}
                disabled={updateActivityMutation.isPending}
                className="text-success border-success hover:bg-success hover:text-success-foreground hover:scale-110 transition-transform px-2 py-1 h-7"
                data-testid="button-start-activity"
              >
                <Play className="w-3 h-3" />
              </Button>
            )}

            {canPause && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePause}
                disabled={updateActivityMutation.isPending}
                className="text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-orange-50 hover:scale-110 transition-transform px-2 py-1 h-7"
                data-testid="button-pause-activity"
              >
                <Pause className="w-3 h-3" />
              </Button>
            )}

            {canComplete && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleComplete}
                disabled={updateActivityMutation.isPending}
                className="text-success border-success hover:bg-success hover:text-success-foreground hover:scale-110 transition-transform px-2 py-1 h-7"
                data-testid="button-complete-activity"
              >
                <CheckCircle className="w-3 h-3" />
              </Button>
            )}

            {(activity.status === 'completed' || activity.status === 'cancelled' || activity.status === 'next') && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewDetails}
                className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-blue-50 hover:scale-110 transition-transform px-2 py-1 h-7"
                data-testid="button-view-details"
              >
                <Eye className="w-3 h-3" />
              </Button>
            )}

            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEdit}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-110 transition-transform p-1 h-7 w-7"
                data-testid="button-edit-activity"
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-110 transition-transform p-1 h-7 w-7"
              data-testid="button-duplicate-activity"
            >
              <Copy className="w-3 h-3" />
            </Button>

            {activity.status === 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRevertToPaused}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-110 transition-transform p-1 h-7 w-7"
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
                className="text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-110 transition-transform p-1 h-7 w-7"
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
                className="text-destructive hover:text-destructive hover:bg-transparent hover:scale-110 transition-transform p-1 h-7 w-7"
                data-testid="button-cancel-activity"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Dialogs */}
      <CompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        activityId={activity.id}
        activityTitle={activity.title}
        onSuccess={handleCompletionSuccess}
      />

      <CompletedActivityDetails
        isOpen={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        activity={activity}
      />

      <CancellationDialog
        isOpen={showCancellationDialog}
        onClose={() => setShowCancellationDialog(false)}
        activityId={activity.id}
        activityTitle={activity.title}
        onSuccess={handleCancellationSuccess}
      />

      <TimeAdjustmentDialog
        isOpen={showTimeAdjustmentDialog}
        onClose={() => setShowTimeAdjustmentDialog(false)}
        activity={activity}
      />

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

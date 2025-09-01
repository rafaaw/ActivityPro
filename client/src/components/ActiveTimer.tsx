import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pause, Play, CheckCircle, Square, CheckSquare, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import CompletionDialog from "@/components/CompletionDialog";
import type { ActivityWithDetails } from "@shared/schema";

interface ActiveTimerProps {
  activity: ActivityWithDetails;
}

export default function ActiveTimer({ activity }: ActiveTimerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState(activity.totalTime || 0);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // Update timer every second
  useEffect(() => {
    if (activity.status !== 'in_progress') return;

    const interval = setInterval(() => {
      // Use active session start time if available, otherwise fallback to activity startedAt
      const startTime = activity.activeSession?.startedAt
        ? new Date(activity.activeSession.startedAt).getTime()
        : activity.startedAt
          ? new Date(activity.startedAt).getTime()
          : Date.now();

      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime((activity.totalTime || 0) + elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activity.startedAt, activity.totalTime, activity.status, activity.activeSession]);

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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const handlePause = () => {
    updateActivityMutation.mutate({ status: 'paused' });
    toast({
      title: "Atividade pausada",
      description: "Cronômetro parado com sucesso",
    });
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

  // Check if all subtasks are completed
  const areAllSubtasksCompleted = () => {
    if (activity.type !== 'checklist' || !activity.subtasks || activity.subtasks.length === 0) {
      return true; // No subtasks or not checklist = can complete
    }
    return activity.subtasks.every(subtask => subtask.completed);
  };

  return (
    <Card className="gradient-bg text-white shadow-lg" data-testid="card-active-timer">
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Play className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-base md:text-lg truncate" data-testid="text-activity-title">
                {activity.title}
              </h3>
              <div className="flex items-center space-x-2 md:space-x-4 text-white/80 text-xs md:text-sm mt-1 overflow-hidden">
                <span className="truncate" data-testid="text-activity-plant">{activity.plant}</span>
                <span className="hidden md:inline">•</span>
                <span className={cn("px-1.5 py-0.5 md:px-2 md:py-1 rounded text-xs font-medium", getPriorityColor(activity.priority))} data-testid="badge-activity-priority">
                  {getPriorityText(activity.priority)}
                </span>
                {activity.project && (
                  <>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden sm:inline truncate" data-testid="text-activity-project">{activity.project}</span>
                  </>
                )}
                {activity.requester && (
                  <>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden sm:inline truncate" data-testid="text-activity-requester">Sol: {activity.requester}</span>
                  </>
                )}
                {activity.observations && (
                  <>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden lg:inline truncate italic" data-testid="text-activity-observations" title={activity.observations}>
                      Obs: {activity.observations.length > 30 ? `${activity.observations.substring(0, 30)}...` : activity.observations}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-center md:text-right">
            <div className="text-2xl md:text-3xl font-bold" data-testid="text-elapsed-time">
              {formatTime(elapsedTime)}
            </div>
            <p className="text-white/80 text-xs md:text-sm">Tempo decorrido</p>

            {/* Timer Controls */}
            <div className="flex items-center justify-center md:justify-end space-x-2 mt-2 md:mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white text-xs md:text-sm"
                onClick={handlePause}
                disabled={updateActivityMutation.isPending}
                data-testid="button-pause-activity"
              >
                <Pause className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Pausar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs md:text-sm ${!areAllSubtasksCompleted()
                  ? 'bg-gray-500/50 hover:bg-gray-500/60 text-white/50 cursor-not-allowed'
                  : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                onClick={handleComplete}
                disabled={updateActivityMutation.isPending || !areAllSubtasksCompleted()}
                data-testid="button-complete-activity"
                title={!areAllSubtasksCompleted() ? 'Complete todas as subtarefas primeiro' : ''}
              >
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Concluir
              </Button>
            </div>
          </div>
        </div>

        {/* Subtasks Section */}
        {activity.type === 'checklist' && (
          <div className="mt-6 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setSubtasksExpanded(!subtasksExpanded)}
                className="flex items-center space-x-2 text-white hover:text-white/80 transition-colors"
                data-testid="button-toggle-subtasks"
              >
                <h4 className="font-medium text-sm">
                  Subtarefas ({activity.subtasks ? activity.subtasks.filter(s => s.completed).length : 0}/{activity.subtasks ? activity.subtasks.length : 0})
                </h4>
                {subtasksExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              <span className="text-white/80 text-sm font-medium">
                {getProgressPercentage()}%
              </span>
            </div>

            {/* Progress Bar - Always visible */}
            <div className="w-full bg-white/20 rounded-full h-2 mb-4">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>

            {/* Collapsible Subtasks List */}
            {subtasksExpanded && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                {activity.subtasks && activity.subtasks.length > 0 ? (
                  activity.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center space-x-3 text-sm group hover:bg-white/10 p-2 rounded transition-colors"
                      data-testid={`subtask-${subtask.id}`}
                    >
                      <button
                        onClick={() => handleSubtaskToggle(subtask.id, subtask.completed || false)}
                        disabled={updateSubtaskMutation.isPending}
                        className="flex items-center justify-center w-5 h-5 hover:scale-110 transition-transform"
                        data-testid={`checkbox-subtask-${subtask.id}`}
                      >
                        {subtask.completed ? (
                          <CheckSquare className="w-5 h-5 text-white" />
                        ) : (
                          <Square className="w-5 h-5 text-white/60 hover:text-white" />
                        )}
                      </button>
                      <span className={cn(
                        "flex-1 transition-all duration-200 text-white",
                        subtask.completed
                          ? "line-through text-white/60"
                          : "group-hover:text-white"
                      )}>
                        {subtask.title}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-white/60 text-sm italic p-2 text-center border border-white/20 border-dashed rounded">
                    Carregando subtarefas...
                  </div>
                )}
                {/* Warning when expanded and subtasks incomplete */}
                {activity.subtasks && activity.subtasks.length > 0 && !areAllSubtasksCompleted() && (
                  <div className="text-yellow-300 text-xs text-center mt-3 p-2 bg-yellow-500/20 rounded border border-yellow-500/30">
                    ⚠️ Complete todas as subtarefas para finalizar a atividade
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Completion Dialog */}
      <CompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        activityId={activity.id}
        activityTitle={activity.title}
        onSuccess={handleCompletionSuccess}
      />
    </Card>
  );
}

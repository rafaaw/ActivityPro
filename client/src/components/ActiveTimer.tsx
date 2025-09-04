import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pause, Play, CheckCircle, Square, CheckSquare, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
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
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

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

  const createSubtaskMutation = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      await apiRequest("POST", `/api/activities/${activity.id}/subtasks`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setNewSubtaskTitle("");
      setShowAddSubtask(false);
      toast({
        title: "Sucesso",
        description: "Nova subtarefa adicionada",
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
        description: error.message || "Falha ao criar subtarefa",
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
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
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

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    createSubtaskMutation.mutate({ title: newSubtaskTitle.trim() });
  };

  const handleCancelAddSubtask = () => {
    setNewSubtaskTitle("");
    setShowAddSubtask(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      handleCancelAddSubtask();
    }
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
    <Card className="relative overflow-hidden gradient-bg dark:bg-gradient-to-br dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 text-white shadow-xl border-0 transform hover:scale-[1.01] transition-all duration-300" data-testid="card-active-timer">
      {/* Subtle border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-secondary/60 to-primary/60 dark:from-slate-500 dark:via-slate-600 dark:to-slate-700 opacity-40"></div>
      <div className="absolute inset-[1px] gradient-bg dark:bg-gradient-to-br dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 rounded-lg"></div>

      {/* Content */}
      <div className="relative p-4 md:p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="relative">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce shadow-lg ring-2 ring-white/50">
                <Play className="text-white w-5 h-5 md:w-6 md:h-6 drop-shadow-lg" />
              </div>
              {/* Pulsing ring effect */}
              <div className="absolute inset-0 w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full animate-ping"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-base md:text-lg truncate drop-shadow-md text-white" data-testid="text-activity-title">
                {activity.title}
              </h3>
              <div className="flex items-center space-x-2 md:space-x-4 text-white/90 text-xs md:text-sm mt-1 overflow-hidden">
                <span className="truncate backdrop-blur-sm bg-white/10 px-2 py-1 rounded-full" data-testid="text-activity-plant">{activity.plant || activity.plantRef?.name || 'N/A'}</span>
                <span className={cn("px-2 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm", getPriorityColor(activity.priority))} data-testid="badge-activity-priority">
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
            <div className="relative">
              <div className="text-3xl md:text-4xl font-bold font-mono bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-white/20" data-testid="text-elapsed-time">
                {formatTime(elapsedTime)}
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg opacity-20 blur-sm"></div>
            </div>
            <p className="text-white/90 text-xs md:text-sm mt-2 font-medium">Tempo decorrido</p>

            {/* Timer Controls */}
            <div className="flex items-center justify-center md:justify-end space-x-3 mt-4">
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white text-xs md:text-sm hover:scale-105 transition-all duration-200 backdrop-blur-sm border border-white/30 shadow-lg font-semibold"
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
                className={`text-xs md:text-sm hover:scale-105 transition-all duration-200 backdrop-blur-sm border shadow-lg font-semibold ${!areAllSubtasksCompleted()
                  ? 'bg-gray-500/30 hover:bg-gray-500/40 text-white/60 cursor-not-allowed border-gray-400/30'
                  : 'bg-green-600/40 hover:bg-green-600/50 dark:bg-green-500/30 dark:hover:bg-green-500/40 text-white border-green-500/50 dark:border-green-400/50'
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
          <div className="mt-6 pt-4 border-t border-white/30 dark:border-white/30 bg-white/10 dark:bg-white/5 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setSubtasksExpanded(!subtasksExpanded)}
                className="flex items-center space-x-2 text-white hover:text-white/80 hover:scale-105 transition-all duration-200 font-semibold"
                data-testid="button-toggle-subtasks"
              >
                <h4 className="font-bold text-base bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Subtarefas ({activity.subtasks ? activity.subtasks.filter(s => s.completed).length : 0}/{activity.subtasks ? activity.subtasks.length : 0})
                </h4>
                {subtasksExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              <span className="text-white/90 dark:text-white/80 text-sm font-bold bg-white/20 dark:bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm">
                {getProgressPercentage()}%
              </span>
            </div>

            {/* Progress Bar - Always visible */}
            <div className="w-full bg-white/30 dark:bg-white/20 rounded-full h-2 mb-4 shadow-inner">
              <div
                className="bg-gradient-to-r from-white to-white/90 dark:from-blue-500 dark:to-blue-600 h-2 rounded-full transition-all duration-300 shadow-sm"
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
                      className="flex items-center space-x-3 text-sm group hover:bg-white/25 dark:hover:bg-white/15 p-3 rounded-lg transition-all duration-200 border border-white/40 dark:border-white/10 backdrop-blur-sm hover:border-white/60 dark:hover:border-white/20 hover:shadow-lg"
                      data-testid={`subtask-${subtask.id}`}
                    >
                      <button
                        onClick={() => handleSubtaskToggle(subtask.id, subtask.completed || false)}
                        disabled={updateSubtaskMutation.isPending}
                        className="flex items-center justify-center w-6 h-6 hover:scale-110 transition-all duration-200"
                        data-testid={`checkbox-subtask-${subtask.id}`}
                      >
                        {subtask.completed ? (
                          <CheckSquare className="w-6 h-6 text-green-300 dark:text-green-400 drop-shadow-lg" />
                        ) : (
                          <Square className="w-6 h-6 text-white/80 dark:text-white/60 hover:text-white border-white/60 dark:border-white/40 hover:border-white" />
                        )}
                      </button>
                      <span className={cn(
                        "flex-1 transition-all duration-200 font-medium",
                        subtask.completed
                          ? "line-through text-white/70 dark:text-white/60"
                          : "text-white/95 dark:text-white group-hover:text-white drop-shadow-sm"
                      )}>
                        {subtask.title}
                      </span>
                      {subtask.completed && (
                        <div className="w-2 h-2 bg-green-300 dark:bg-green-400 rounded-full"></div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-white/80 dark:text-white/70 text-sm italic p-4 text-center border border-white/40 dark:border-white/30 border-dashed rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur-sm">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/40 dark:border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Carregando subtarefas...</span>
                    </div>
                  </div>
                )}

                {/* Add New Subtask Section */}
                {showAddSubtask ? (
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/50 dark:border-white/20 bg-white/20 dark:bg-white/10 backdrop-blur-sm">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Digite o título da nova subtarefa..."
                      className="flex-1 bg-white/25 dark:bg-white/10 border-white/40 dark:border-white/20 text-white placeholder:text-white/70 dark:placeholder:text-white/60 focus:border-white/60 dark:focus:border-white/40"
                      autoFocus
                      disabled={createSubtaskMutation.isPending}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddSubtask}
                      disabled={!newSubtaskTitle.trim() || createSubtaskMutation.isPending}
                      className="bg-green-600/40 hover:bg-green-600/50 text-white border-green-500/50 hover:scale-105 transition-all duration-200"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelAddSubtask}
                      disabled={createSubtaskMutation.isPending}
                      className="bg-red-600/40 hover:bg-red-600/50 text-white border-red-500/50 hover:scale-105 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddSubtask(true)}
                    className="w-full mt-2 bg-white/15 dark:bg-white/5 hover:bg-white/25 dark:hover:bg-white/10 text-white border border-white/40 dark:border-white/10 hover:border-white/60 dark:hover:border-white/20 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar nova subtarefa
                  </Button>
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

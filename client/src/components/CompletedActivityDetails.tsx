import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Download, 
  Clock, 
  Calendar,
  CheckSquare,
  MessageSquare,
  X
} from "lucide-react";
import type { ActivityWithDetails } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompletedActivityDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ActivityWithDetails;
}

export default function CompletedActivityDetails({
  isOpen,
  onClose,
  activity,
}: CompletedActivityDetailsProps) {
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

  const handleDownloadEvidence = () => {
    if (activity.evidenceUrl) {
      // Create a temporary link and click it to download
      const link = document.createElement('a');
      link.href = activity.evidenceUrl;
      link.download = `evidencia-${activity.title.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const completedSubtasks = activity.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = activity.subtasks?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activity.status === 'completed' ? (
              <CheckSquare className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
            {activity.status === 'completed' ? 'Detalhes da Atividade Concluída' : 'Detalhes da Atividade Cancelada'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{activity.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getPriorityColor(activity.priority)}>
                  {getPriorityText(activity.priority)}
                </Badge>
                {activity.status === 'completed' ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Concluída
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    Cancelada
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Description would go here if available in schema */}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Tempo gasto: {formatTime(activity.totalTime || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {activity.status === 'completed' ? 'Concluída' : 'Cancelada'} em: {
                      activity.status === 'completed' 
                        ? (activity.completedAt ? format(new Date(activity.completedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A')
                        : (activity.cancelledAt ? format(new Date(activity.cancelledAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A')
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subtasks */}
          {activity.type === 'checklist' && activity.subtasks && activity.subtasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  Subtarefas ({completedSubtasks}/{totalSubtasks})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activity.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <CheckSquare 
                        className={`w-4 h-4 ${
                          subtask.completed ? 'text-green-600' : 'text-muted-foreground'
                        }`} 
                      />
                      <span className={subtask.completed ? 'line-through text-muted-foreground' : ''}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Notes or Cancellation Reason */}
          {activity.status === 'completed' && activity.completionNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Observações da Conclusão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {activity.completionNotes}
                </p>
              </CardContent>
            </Card>
          )}

          {activity.status === 'cancelled' && activity.cancellationReason && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Motivo do Cancelamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {activity.cancellationReason}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Evidence - Only for completed activities */}
          {activity.status === 'completed' && activity.evidenceUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Evidência Anexada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="font-medium">Arquivo de Evidência</p>
                      <p className="text-sm text-muted-foreground">
                        Anexado na conclusão da atividade
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDownloadEvidence}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
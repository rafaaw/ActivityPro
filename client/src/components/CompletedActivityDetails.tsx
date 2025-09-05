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
  X,
  Building
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

  const formatDateOnly = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';

    // Verificar se é atividade retroativa pelo formato da string original
    if (typeof dateString === 'string' && dateString.includes('T00:00:00')) {
      // É retroativa (tem 00:00:00 no banco), mostrar só a data
      const dateParts = dateString.split('T')[0].split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        const localDate = new Date(year, month, day);
        return format(localDate, 'dd/MM/yyyy', { locale: ptBR });
      }
    }

    // Para atividades normais, mostrar data e hora
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
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
      // Use a nova API para servir arquivos com autenticação
      const fileUrl = `/api/files${activity.evidenceUrl}`;
      window.open(fileUrl, '_blank');
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
            ) : activity.status === 'cancelled' ? (
              <X className="w-5 h-5 text-red-600" />
            ) : (
              <FileText className="w-5 h-5 text-blue-600" />
            )}
            {activity.status === 'completed'
              ? 'Detalhes da Atividade Concluída'
              : activity.status === 'cancelled'
                ? 'Detalhes da Atividade Cancelada'
                : 'Detalhes da Atividade'
            }
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
                ) : activity.status === 'cancelled' ? (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    Cancelada
                  </Badge>
                ) : activity.status === 'next' ? (
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    Próxima
                  </Badge>
                ) : activity.status === 'in_progress' ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Em Progresso
                  </Badge>
                ) : activity.status === 'paused' ? (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Pausada
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {activity.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Description would go here if available in schema */}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span>Planta: {activity.plant || activity.plantRef?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>Projeto: {activity.project || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Tempo gasto: {formatTime(activity.totalTime || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {activity.status === 'completed'
                      ? `Concluída em: ${formatDateOnly(activity.completedAt)}`
                      : activity.status === 'cancelled'
                        ? `Cancelada em: ${formatDateOnly(activity.cancelledAt)}`
                        : `Criada em: ${formatDateOnly(activity.createdAt)}`
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          {activity.observations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {activity.observations}
                </p>
              </CardContent>
            </Card>
          )}

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
                        className={`w-4 h-4 ${subtask.completed ? 'text-green-600' : 'text-muted-foreground'
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
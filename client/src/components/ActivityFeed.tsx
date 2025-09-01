import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Pause, CheckCircle, XCircle, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ActivityLogWithUser } from "@shared/schema";

interface ActivityFeedProps {
  showUserInfo?: boolean;
  logs?: ActivityLogWithUser[];
}

const actionIcons = {
  created: Plus,
  started: Play,
  paused: Pause,
  completed: CheckCircle,
  cancelled: XCircle,
};

const actionLabels = {
  created: "criou",
  started: "iniciou",
  paused: "pausou",
  completed: "concluiu",
  cancelled: "cancelou",
};

const actionColors = {
  created: "bg-blue-100 text-blue-800",
  started: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatTimeSpent(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function ActivityFeed({ showUserInfo = true, logs: providedLogs }: ActivityFeedProps) {
  const { data: fetchedLogs = [], isLoading } = useQuery<ActivityLogWithUser[]>({
    queryKey: ['/api/activity-logs'],
    refetchInterval: 5000,
    enabled: !providedLogs, // Só faz fetch se não recebeu logs como props
  });

  const logs = providedLogs || fetchedLogs;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-20 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">Nenhuma atividade recente</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const Icon = actionIcons[log.action as keyof typeof actionIcons];
        const actionLabel = actionLabels[log.action as keyof typeof actionLabels];
        const colorClass = actionColors[log.action as keyof typeof actionColors];
        
        return (
          <Card key={log.id} className="p-4 border-l-4 border-l-purple-500" data-testid={`log-entry-${log.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm">
                    {showUserInfo && (
                      <span className="font-medium text-gray-900">
                        {log.user.firstName} {log.user.lastName}
                      </span>
                    )}
                    {showUserInfo ? " " : ""}
                    <span className="text-gray-700">
                      {actionLabel} a atividade
                    </span>
                    <span className="font-medium text-gray-900 ml-1">
                      "{log.activityTitle}"
                    </span>
                  </p>
                  <div className="flex items-center space-x-3 mt-1">
                    <p className="text-xs text-gray-500">
                      {log.createdAt && formatDistanceToNow(new Date(log.createdAt), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                    {log.timeSpent && log.timeSpent > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeSpent(log.timeSpent)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Badge className={colorClass}>
                {actionLabel}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
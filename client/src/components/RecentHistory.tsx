import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  History, 
  CheckCircle, 
  Pause, 
  Play, 
  X 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ActivityWithDetails } from "@shared/schema";

interface RecentHistoryProps {
  activities: ActivityWithDetails[];
}

interface HistoryItem {
  id: string;
  type: 'completed' | 'paused' | 'started' | 'cancelled';
  activityTitle: string;
  timestamp: Date;
  duration?: number;
}

export default function RecentHistory({ activities }: RecentHistoryProps) {
  // Generate recent history from activities
  const recentHistory: HistoryItem[] = [];
  
  activities.forEach(activity => {
    if (activity.completedAt) {
      recentHistory.push({
        id: `${activity.id}-completed`,
        type: 'completed',
        activityTitle: activity.title,
        timestamp: new Date(activity.completedAt),
        duration: activity.totalTime,
      });
    }
    
    if (activity.pausedAt) {
      recentHistory.push({
        id: `${activity.id}-paused`,
        type: 'paused',
        activityTitle: activity.title,
        timestamp: new Date(activity.pausedAt),
      });
    }
    
    if (activity.startedAt) {
      recentHistory.push({
        id: `${activity.id}-started`,
        type: 'started',
        activityTitle: activity.title,
        timestamp: new Date(activity.startedAt),
      });
    }
    
    if (activity.cancelledAt) {
      recentHistory.push({
        id: `${activity.id}-cancelled`,
        type: 'cancelled',
        activityTitle: activity.title,
        timestamp: new Date(activity.cancelledAt),
      });
    }
  });

  // Sort by most recent first and take only the last 10
  const sortedHistory = recentHistory
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'completed': return CheckCircle;
      case 'paused': return Pause;
      case 'started': return Play;
      case 'cancelled': return X;
      default: return CheckCircle;
    }
  };

  const getHistoryColor = (type: string) => {
    switch (type) {
      case 'completed': return 'bg-success/10 text-success';
      case 'paused': return 'bg-orange-100 text-orange-600';
      case 'started': return 'bg-blue-100 text-blue-600';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-success/10 text-success';
    }
  };

  const getHistoryAction = (type: string) => {
    switch (type) {
      case 'completed': return 'Concluiu';
      case 'paused': return 'Pausou';
      case 'started': return 'Iniciou';
      case 'cancelled': return 'Cancelou';
      default: return 'Atualizou';
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <Card data-testid="card-recent-history">
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="text-primary mr-2 w-5 h-5" />
          Histórico Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedHistory.length === 0 ? (
          <p className="text-center text-muted-foreground py-8" data-testid="text-no-history">
            Nenhuma atividade recente
          </p>
        ) : (
          <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
            {sortedHistory.map((item) => {
              const Icon = getHistoryIcon(item.type);
              
              return (
                <div 
                  key={item.id} 
                  className="flex items-start space-x-3 text-sm"
                  data-testid={`history-item-${item.id}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getHistoryColor(item.type)}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">
                      {getHistoryAction(item.type)} <span className="font-medium" data-testid="text-history-activity">
                        {item.activityTitle}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-xs" data-testid="text-history-timestamp">
                      {formatDistanceToNow(item.timestamp, { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                      {item.duration && ` • ${formatTime(item.duration)}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <Button 
          variant="ghost" 
          className="w-full mt-4 text-primary hover:text-primary/80 font-medium text-sm"
          data-testid="button-view-full-history"
        >
          Ver histórico completo →
        </Button>
      </CardContent>
    </Card>
  );
}

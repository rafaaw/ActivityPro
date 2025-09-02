import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import type { UserSettings } from "@shared/schema";

export function useWebSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar configurações do usuário para notificações
  const { data: userSettings } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
    enabled: !!user && (user.role === 'sector_chief' || user.role === 'admin'),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/team/activities"] });
    queryClient.invalidateQueries({ queryKey: ["/api/team/stats"] });
  }, [queryClient]);

  const connect = useCallback(() => {
    if (!user || ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      // Authenticate the connection
      ws.current?.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id,
      }));

      // Clear any reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'activity_updated':
            console.log('Activity updated via WebSocket:', message.activity);
            invalidateQueries();

            // Show notification for team supervision only if enabled in settings
            if ((user.role === 'admin' || user.role === 'sector_chief') &&
              userSettings?.teamNotificationsEnabled) {
              const activity = message.activity;
              const collaboratorName = activity.collaborator ?
                `${activity.collaborator.firstName || ''} ${activity.collaborator.lastName || ''}`.trim() ||
                activity.collaborator.username : 'Colaborador';

              if (activity.status === 'in_progress') {
                toast({
                  title: "🟢 Atividade Iniciada",
                  description: `${collaboratorName} iniciou: ${activity.title}`,
                  duration: 4000,
                });
              } else if (activity.status === 'paused') {
                toast({
                  title: "🟡 Atividade Pausada",
                  description: `${collaboratorName} pausou: ${activity.title}`,
                  duration: 4000,
                });
              } else if (activity.status === 'completed') {
                const totalTime = activity.totalTime || 0;
                const hours = Math.floor(totalTime / 3600);
                const minutes = Math.floor((totalTime % 3600) / 60);
                const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                toast({
                  title: "✅ Atividade Concluída",
                  description: `${collaboratorName} concluiu: ${activity.title} (${timeText})`,
                  duration: 6000,
                });
              } else if (activity.status === 'cancelled') {
                toast({
                  title: "❌ Atividade Cancelada",
                  description: `${collaboratorName} cancelou: ${activity.title}`,
                  duration: 4000,
                });
              }
            }
            break;

          case 'user_updated':
            console.log('User updated via WebSocket');
            queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
            break;

          default:
            console.log('Unknown WebSocket message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);

      // Attempt to reconnect after 3 seconds
      if (user) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect WebSocket...");
          connect();
        }, 3000);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };
  }, [user, invalidateQueries, toast]);

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      ws.current?.close();
    };
  }, [user, connect]);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    sendMessage,
    ws: ws.current,
  };
}

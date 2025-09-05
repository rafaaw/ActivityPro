import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UserSettings } from "@shared/schema";

export function useUserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar configurações do usuário
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/user/settings');
    },
    enabled: !!user,
  });

  // Mutation para salvar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      return await apiRequest('PUT', '/api/user/settings', newSettings);
    },
    onSuccess: () => {
      toast({
        title: "✅ Configurações salvas",
        description: "Suas preferências foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
    },
    onError: () => {
      toast({
        title: "❌ Erro",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    updateSettingsMutation.mutate(newSettings);
  };

  return {
    settings,
    isLoading,
    updateSettings,
    isUpdating: updateSettingsMutation.isPending,
  };
}

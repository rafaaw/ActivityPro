import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Bell, Save } from "lucide-react";
import type { UserSettings } from "@shared/schema";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [teamNotificationsEnabled, setTeamNotificationsEnabled] = useState(false);

  // Verificar se é chefe de setor ou admin para mostrar configurações avançadas
  const canConfigureNotifications = user?.role === 'sector_chief' || user?.role === 'admin';

  // Buscar configurações do usuário
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
    enabled: !!user && canConfigureNotifications,
  });

  // Sincronizar estado local com dados da API
  useEffect(() => {
    if (settings && settings.teamNotificationsEnabled !== null) {
      setTeamNotificationsEnabled(settings.teamNotificationsEnabled);
    }
  }, [settings]);

  // Mutation para salvar configurações
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: { teamNotificationsEnabled: boolean }) => {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configurações');
      }

      return response.json();
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

  const handleSave = () => {
    saveSettingsMutation.mutate({
      teamNotificationsEnabled,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-display" data-testid="text-page-title">
          Configurações
        </h1>

        {canConfigureNotifications && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações da Equipe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="team-notifications" className="text-base font-medium">
                    Notificações de Atividades
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações quando colaboradores da sua equipe iniciarem, pausarem ou completarem atividades.
                  </p>
                </div>
                <Switch
                  id="team-notifications"
                  checked={teamNotificationsEnabled}
                  onCheckedChange={setTeamNotificationsEnabled}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saveSettingsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Outras Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground" data-testid="text-under-development">
              Mais configurações personalizadas estarão disponíveis em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
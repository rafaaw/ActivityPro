import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeCard } from "@/components/ThemeCard";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Bell, Save, Palette, Layout as LayoutIcon, Monitor, Smartphone } from "lucide-react";
import type { UserSettings } from "@shared/schema";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, isLoading, isUpdating } = useUserSettings();
  const [teamNotificationsEnabled, setTeamNotificationsEnabled] = useState(false);
  const [cardViewMode, setCardViewMode] = useState<'comfortable' | 'compact'>('comfortable');

  // Verificar se é chefe de setor ou admin para mostrar configurações avançadas
  const canConfigureNotifications = user?.role === 'sector_chief' || user?.role === 'admin';

  // Sincronizar estado local com dados da API
  useEffect(() => {
    if (settings) {
      if (settings.teamNotificationsEnabled !== null) {
        setTeamNotificationsEnabled(settings.teamNotificationsEnabled);
      }
      if (settings.cardViewMode) {
        setCardViewMode(settings.cardViewMode as 'comfortable' | 'compact');
      }
    }
  }, [settings]);

  const handleSave = () => {
    const newSettings: Partial<UserSettings> = { cardViewMode };
    
    if (canConfigureNotifications) {
      newSettings.teamNotificationsEnabled = teamNotificationsEnabled;
    }
    
    updateSettings(newSettings);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-display" data-testid="text-page-title">
          Configurações
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">
                  Tema da Interface
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha como você deseja que a interface seja exibida.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ThemeCard
                  theme="light"
                  currentTheme={theme}
                  onSelect={setTheme}
                />
                <ThemeCard
                  theme="dark"
                  currentTheme={theme}
                  onSelect={setTheme}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutIcon className="h-5 w-5" />
              Visualização de Atividades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">
                  Modo de Exibição dos Cards
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha como as atividades são exibidas no dashboard.
                </p>
              </div>

              <RadioGroup 
                value={cardViewMode} 
                onValueChange={(value) => setCardViewMode(value as 'comfortable' | 'compact')}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="comfortable" id="comfortable" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-primary" />
                      <Label htmlFor="comfortable" className="font-medium cursor-pointer">
                        Confortável
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Exibe todas as informações da atividade incluindo subtarefas, observações, planta, projeto e solicitante.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="compact" id="compact" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      <Label htmlFor="compact" className="font-medium cursor-pointer">
                        Compacto
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Exibe apenas o título, prioridade, tempo e botões de ação em uma linha compacta.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isUpdating ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </CardContent>
        </Card>

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, BarChart3, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 font-display">
            ActivityPro
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Sistema completo de gestão de atividades e controle de tempo para equipes produtivas
          </p>
          <Button 
            size="lg" 
            className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-3"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Entrar no Sistema
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center">
              <Clock className="w-12 h-12 text-white mx-auto mb-4" />
              <CardTitle className="text-white">Controle de Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80 text-sm text-center">
                Cronômetro integrado com registro automático e manual de atividades
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center">
              <Users className="w-12 h-12 text-white mx-auto mb-4" />
              <CardTitle className="text-white">Gestão por Setores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80 text-sm text-center">
                Organização hierárquica com visibilidade controlada por setor
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center">
              <BarChart3 className="w-12 h-12 text-white mx-auto mb-4" />
              <CardTitle className="text-white">Relatórios Detalhados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80 text-sm text-center">
                Análises completas de produtividade e exportação personalizada
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 text-white mx-auto mb-4" />
              <CardTitle className="text-white">Auditoria Completa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80 text-sm text-center">
                Log de todas as alterações com rastreabilidade total
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

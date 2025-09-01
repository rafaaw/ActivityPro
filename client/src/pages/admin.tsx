import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <Alert className="border-destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription data-testid="text-access-denied">
            Acesso negado. Apenas administradores podem acessar esta página.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-display" data-testid="text-page-title">
          Administração
        </h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Painel Administrativo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground" data-testid="text-under-development">
              Painel administrativo em desenvolvimento. Em breve você poderá gerenciar usuários, setores e configurações do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

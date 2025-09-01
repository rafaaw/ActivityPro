import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-display" data-testid="text-page-title">
          Configurações
        </h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Em Desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground" data-testid="text-under-development">
              Esta página está em desenvolvimento. Em breve você terá acesso a configurações personalizadas e preferências do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
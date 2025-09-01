import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  CheckSquare, 
  Clock, 
  BarChart3,
  Zap 
} from "lucide-react";
import { useActivityModal } from "@/contexts/ActivityModalContext";
import QuickReportModal from "./QuickReportModal";
import { useState } from "react";

interface QuickAction {
  title: string;
  description: string;
  icon: any;
  action: string;
}

const quickActions: QuickAction[] = [
  {
    title: "Atividade Simples",
    description: "Criar nova atividade",
    icon: PlusCircle,
    action: "createSimpleActivity",
  },
  {
    title: "Checklist",
    description: "Com subtarefas",
    icon: CheckSquare,
    action: "createChecklistActivity",
  },
  {
    title: "Retroativa",
    description: "Já realizada",
    icon: Clock,
    action: "createRetroactiveActivity",
  },
  {
    title: "Relatórios",
    description: "Análise de tempo",
    icon: BarChart3,
    action: "viewReports",
  },
];

export default function QuickActions() {
  const { openModal } = useActivityModal();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleAction = (action: string) => {
    console.log(`Quick action: ${action}`);
    
    switch (action) {
      case "createSimpleActivity":
        openModal({ 
          type: "simple",
          status: "in_progress"
        });
        break;
      case "createChecklistActivity":
        openModal({ 
          type: "checklist",
          status: "in_progress"
        });
        break;
      case "createRetroactiveActivity":
        openModal({ 
          type: "simple",
          status: "next",
          isRetroactive: true
        });
        break;
      case "viewReports":
        setIsReportModalOpen(true);
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  };

  return (
    <Card data-testid="card-quick-actions">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="text-primary mr-2 w-5 h-5" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-muted transition-colors"
                onClick={() => handleAction(action.action)}
                data-testid={`button-quick-${action.action}`}
              >
                <Icon className="text-primary w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium text-sm text-foreground">
                    {action.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
      
      <QuickReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
      />
    </Card>
  );
}

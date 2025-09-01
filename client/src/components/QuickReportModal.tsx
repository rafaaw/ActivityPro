import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { FileText, Download, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuickReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickReportModal({ isOpen, onClose }: QuickReportModalProps) {
  const [period, setPeriod] = useState<string>("today");
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async (periodType: string) => {
      // Calculate date range based on selected period
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (periodType) {
        case "today":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "week":
          startDate = startOfWeek(now, { locale: ptBR });
          endDate = endOfWeek(now, { locale: ptBR });
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        default:
          startDate = startOfDay(now);
          endDate = endOfDay(now);
      }

      const filters = {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      };

      const response = await fetch(`/api/reports/export?format=docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename with period description
      const periodName = periodType === 'today' ? 'hoje' : 
                        periodType === 'week' ? 'semana' : 'mes';
      const dateStr = format(now, 'yyyy-MM-dd');
      a.download = `relatorio-${periodName}-${dateStr}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Relatório exportado com sucesso!",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você precisa fazer login novamente",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao exportar relatório. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate(period);
  };

  const getPeriodDescription = () => {
    const now = new Date();
    switch (period) {
      case "today":
        return `Hoje - ${format(now, 'dd/MM/yyyy', { locale: ptBR })}`;
      case "week":
        const weekStart = startOfWeek(now, { locale: ptBR });
        const weekEnd = endOfWeek(now, { locale: ptBR });
        return `Esta semana - ${format(weekStart, 'dd/MM', { locale: ptBR })} a ${format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}`;
      case "month":
        return `Este mês - ${format(now, 'MMMM/yyyy', { locale: ptBR })}`;
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Exportar Relatório Rápido
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="period">Período do relatório:</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger data-testid="select-period">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Período selecionado:</span>
              </div>
              <p className="font-medium mt-1">{getPeriodDescription()}</p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p>O relatório será exportado em formato Word (.docx) contendo:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
              <li>Lista de todas as atividades do período</li>
              <li>Tempo total investido</li>
              <li>Status das atividades</li>
              <li>Detalhes dos colaboradores</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="flex-1"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? "Exportando..." : "Exportar Word"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
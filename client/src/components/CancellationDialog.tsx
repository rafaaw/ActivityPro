import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CancellationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  activityTitle: string;
  onSuccess?: () => void;
}

export default function CancellationDialog({
  isOpen,
  onClose,
  activityId,
  activityTitle,
  onSuccess,
}: CancellationDialogProps) {
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async (data: { reason?: string }) => {
      await apiRequest("PATCH", `/api/activities/${activityId}`, {
        status: "cancelled",
        cancellationReason: data.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Atividade cancelada",
        description: "A atividade foi cancelada com sucesso",
      });
      handleClose();
      onSuccess?.();
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
        description: "Falha ao cancelar atividade",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const handleCancel = () => {
    cancelMutation.mutate({ reason: reason || undefined });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]" data-testid="dialog-cancellation">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertCircle className="text-red-600 w-5 h-5" />
            <span>Cancelar Atividade</span>
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja cancelar: <strong>{activityTitle}</strong>?
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cancellation Reason */}
          <div className="space-y-3">
            <Label htmlFor="reason" className="text-sm font-medium">
              Motivo do cancelamento (opcional)
            </Label>
            <p className="text-sm text-muted-foreground">
              Informe o motivo pelo qual a atividade está sendo cancelada.
            </p>
            <Textarea
              id="reason"
              placeholder="Ex: Mudança de prioridade, falta de recursos, etc..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-cancellation-reason"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={cancelMutation.isPending}
            data-testid="button-cancel-cancellation"
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            data-testid="button-confirm-cancellation"
          >
            {cancelMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Cancelando...
              </>
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancelar Atividade
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Upload, X, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  activityTitle: string;
  onSuccess?: () => void;
}

export default function CompletionDialog({
  isOpen,
  onClose,
  activityId,
  activityTitle,
  onSuccess,
}: CompletionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const completeMutation = useMutation({
    mutationFn: async ({ evidenceUrl, notes }: { evidenceUrl?: string; notes?: string }) => {
      await apiRequest("PATCH", `/api/activities/${activityId}`, {
        status: "completed",
        evidenceUrl,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Atividade concluída",
        description: "Atividade finalizada com sucesso",
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
        description: "Falha ao concluir atividade",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setEvidenceUrl("");
    setEvidenceFile(null);
    setNotes("");
    onClose();
  };

  const handleComplete = () => {
    completeMutation.mutate({ evidenceUrl: evidenceUrl || undefined, notes: notes || undefined });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEvidenceFile(file);
      setEvidenceUrl(file.name); // Usar nome do arquivo temporariamente
      toast({
        title: "Arquivo selecionado",
        description: `${file.name} está pronto para upload`,
      });
    }
  };

  const removeEvidence = () => {
    setEvidenceUrl("");
    setEvidenceFile(null);
    // Reset input file
    const fileInput = document.getElementById('evidence-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]" data-testid="dialog-completion">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="text-green-600 w-5 h-5" />
            <span>Concluir Atividade</span>
          </DialogTitle>
          <DialogDescription>
            Confirme a conclusão da atividade: <strong>{activityTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Evidence Upload Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Evidência (opcional)</Label>
            <p className="text-sm text-muted-foreground">
              Anexe um arquivo como comprovante da conclusão da atividade.
            </p>
            
            {evidenceFile ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="text-green-600 w-4 h-4" />
                  <span className="text-sm font-medium text-green-700">
                    {evidenceFile.name}
                  </span>
                  <span className="text-xs text-green-600">
                    ({(evidenceFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeEvidence}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid="button-remove-evidence"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label htmlFor="evidence-file" className="cursor-pointer">
                <div className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 bg-transparent rounded-lg transition-colors">
                  <div className="flex flex-col items-center py-4 space-y-2">
                    <Upload className="text-gray-400 w-6 h-6" />
                    <span className="text-sm font-medium text-gray-600">
                      Clique para anexar evidência
                    </span>
                    <span className="text-xs text-gray-500">
                      PDF, imagem ou documento (máx. 10MB)
                    </span>
                  </div>
                </div>
                <input
                  id="evidence-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-evidence-file"
                />
              </label>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm font-medium">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre a conclusão da atividade..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
              data-testid="textarea-completion-notes"
            />
          </div>
        </div>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={completeMutation.isPending}
            data-testid="button-cancel-completion"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={completeMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-confirm-completion"
          >
            {completeMutation.isPending ? "Concluindo..." : "Concluir Atividade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
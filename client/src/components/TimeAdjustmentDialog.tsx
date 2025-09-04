import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Plus, Minus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ActivityWithDetails } from "@shared/schema";

const timeAdjustmentSchema = z.object({
  hours: z.number().min(0).max(23),
  minutes: z.number().min(0).max(59),
  operation: z.enum(["add", "subtract"]),
  reason: z.string().min(1, "Motivo é obrigatório"),
}).refine((data) => {
  // Validação customizada será feita no componente
  return true;
}, {
  message: "Validação de tempo será feita no formulário"
});

type TimeAdjustmentData = z.infer<typeof timeAdjustmentSchema>;

interface TimeAdjustmentDialogProps {
  activity: ActivityWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export default function TimeAdjustmentDialog({
  activity,
  isOpen,
  onClose,
}: TimeAdjustmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [operation, setOperation] = useState<"add" | "subtract">("add");

  const currentTotalSeconds = activity.totalTime || 0;
  const currentHours = Math.floor(currentTotalSeconds / 3600);
  const currentMinutes = Math.floor((currentTotalSeconds % 3600) / 60);

  const form = useForm<TimeAdjustmentData>({
    resolver: zodResolver(timeAdjustmentSchema),
    defaultValues: {
      hours: 0,
      minutes: 0,
      operation: "add",
      reason: "",
    },
  });

  const timeAdjustmentMutation = useMutation({
    mutationFn: async (data: TimeAdjustmentData) => {
      const adjustmentSeconds = (data.hours * 3600) + (data.minutes * 60);

      let newTotalSeconds: number;
      if (data.operation === "add") {
        newTotalSeconds = currentTotalSeconds + adjustmentSeconds;
      } else {
        newTotalSeconds = Math.max(0, currentTotalSeconds - adjustmentSeconds);
      }

      // Validação para não permitir tempo negativo
      if (data.operation === "subtract" && currentTotalSeconds < adjustmentSeconds) {
        throw new Error("Não é possível subtrair mais tempo do que o disponível");
      }

      await apiRequest("POST", `/api/activities/${activity.id}/adjust-time`, {
        newTotalTime: newTotalSeconds,
        reason: data.reason,
        previousTotalTime: currentTotalSeconds,
        operation: data.operation,
        adjustmentSeconds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: `Tempo ${operation === "add" ? "adicionado" : "subtraído"} com sucesso`,
      });
      onClose();
      form.reset();
      setOperation("add");
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

      // Tratamento específico para erro de tempo insuficiente
      if (error.message && error.message.includes("mais tempo do que o disponível")) {
        toast({
          title: "Tempo insuficiente",
          description: "Não é possível remover mais tempo do que o disponível na atividade",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Erro",
        description: `Falha ao ${operation === "add" ? "adicionar" : "remover"} tempo da atividade`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TimeAdjustmentData) => {
    // Validação no frontend para operação de subtração
    const adjustmentSeconds = (data.hours * 3600) + (data.minutes * 60);

    if (operation === "subtract" && currentTotalSeconds < adjustmentSeconds) {
      toast({
        title: "Tempo insuficiente",
        description: "Não é possível remover mais tempo do que o disponível na atividade",
        variant: "destructive",
      });
      return;
    }

    if (adjustmentSeconds === 0) {
      toast({
        title: "Ajuste inválido",
        description: "Informe um tempo maior que zero para o ajuste",
        variant: "destructive",
      });
      return;
    }

    // Atualiza a operação no formulário
    const dataWithOperation = { ...data, operation };
    timeAdjustmentMutation.mutate(dataWithOperation);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const calculateNewTime = () => {
    const hours = form.watch("hours") || 0;
    const minutes = form.watch("minutes") || 0;
    const adjustmentSeconds = (hours * 3600) + (minutes * 60);

    if (operation === "add") {
      return currentTotalSeconds + adjustmentSeconds;
    } else {
      return Math.max(0, currentTotalSeconds - adjustmentSeconds);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ajustar Tempo da Atividade
          </DialogTitle>
          <DialogDescription>
            Atividade: <strong>{activity.title}</strong>
            <br />
            Tempo atual: <strong>{formatTime(currentTotalSeconds)}</strong>
            <br />
            Novo tempo: <strong>{formatTime(calculateNewTime())}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={operation === "add" ? "default" : "outline"}
                onClick={() => setOperation("add")}
                className="flex-1 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Tempo
              </Button>
              <Button
                type="button"
                variant={operation === "subtract" ? "default" : "outline"}
                onClick={() => setOperation("subtract")}
                className="flex-1 flex items-center gap-2"
              >
                <Minus className="w-4 h-4" />
                Remover Tempo
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-adjustment-hours"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-adjustment-minutes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo do Ajuste *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Explique o motivo para ${operation === "add" ? "adicionar" : "remover"} tempo...`}
                      {...field}
                      data-testid="textarea-adjustment-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {operation === "subtract" && calculateNewTime() === 0 && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                ⚠️ O tempo será reduzido para 0 (zero)
              </div>
            )}

            {operation === "subtract" && (() => {
              const hours = form.watch("hours") || 0;
              const minutes = form.watch("minutes") || 0;
              const adjustmentSeconds = (hours * 3600) + (minutes * 60);
              return adjustmentSeconds > currentTotalSeconds;
            })() && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  ❌ Não é possível remover mais tempo do que o disponível ({formatTime(currentTotalSeconds)})
                </div>
              )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={timeAdjustmentMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  timeAdjustmentMutation.isPending ||
                  (operation === "subtract" && (() => {
                    const hours = form.watch("hours") || 0;
                    const minutes = form.watch("minutes") || 0;
                    const adjustmentSeconds = (hours * 3600) + (minutes * 60);
                    return adjustmentSeconds > currentTotalSeconds;
                  })()) ||
                  (() => {
                    const hours = form.watch("hours") || 0;
                    const minutes = form.watch("minutes") || 0;
                    return (hours * 3600) + (minutes * 60) === 0;
                  })()
                }
                data-testid="button-submit-adjustment"
              >
                {timeAdjustmentMutation.isPending
                  ? `${operation === "add" ? "Adicionando" : "Removendo"}...`
                  : `${operation === "add" ? "Adicionar" : "Remover"} Tempo`
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
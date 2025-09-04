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
      <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-lg rounded-lg">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
            <Clock className="w-5 h-5 text-blue-600" />
            Ajustar Tempo da Atividade
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            <div className="bg-gray-50 p-2 rounded-md">
              <p><strong>Atividade:</strong> {activity.title}</p>
              <p><strong>Tempo atual:</strong> {formatTime(currentTotalSeconds)}</p>
              <p><strong>Novo tempo:</strong> {formatTime(calculateNewTime())}</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <Button
                type="button"
                variant={operation === "add" ? "default" : "outline"}
                onClick={() => setOperation("add")}
                className={`flex-1 flex items-center gap-2 py-2 px-4 font-medium transition-all ${
                  operation === "add"
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    : "bg-white hover:bg-gray-100 text-gray-700 border-gray-300"
                }`}
              >
                <Plus className="w-4 h-4" />
                Adicionar Tempo
              </Button>
              <Button
                type="button"
                variant={operation === "subtract" ? "default" : "outline"}
                onClick={() => setOperation("subtract")}
                className={`flex-1 flex items-center gap-2 py-2 px-4 font-medium transition-all ${
                  operation === "subtract"
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md"
                    : "bg-white hover:bg-gray-100 text-gray-700 border-gray-300"
                }`}
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
                    <FormLabel className="text-sm font-medium text-gray-700">Horas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        placeholder="0"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md"
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
                    <FormLabel className="text-sm font-medium text-gray-700">Minutos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="0"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md"
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
                  <FormLabel className="text-sm font-medium text-gray-700">Motivo do Ajuste *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Explique o motivo para ${operation === "add" ? "adicionar" : "remover"} tempo...`}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md resize-none"
                      rows={3}
                      {...field}
                      data-testid="textarea-adjustment-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {operation === "subtract" && calculateNewTime() === 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded mb-2">
                ⚠️ Tempo será reduzido para 0
              </div>
            )}

            {operation === "subtract" && (() => {
              const hours = form.watch("hours") || 0;
              const minutes = form.watch("minutes") || 0;
              const adjustmentSeconds = (hours * 3600) + (minutes * 60);
              return adjustmentSeconds > currentTotalSeconds;
            })() && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded mb-2">
                  ❌ Tempo insuficiente ({formatTime(currentTotalSeconds)})
                </div>
              )}

            <DialogFooter className="pt-4 border-t border-gray-100 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={timeAdjustmentMutation.isPending}
                className="px-6 py-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
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
                className={`px-6 py-2 font-medium transition-all ${
                  operation === "add"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
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
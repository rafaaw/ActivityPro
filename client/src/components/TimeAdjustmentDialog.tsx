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
import { Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ActivityWithDetails } from "@shared/schema";

const timeAdjustmentSchema = z.object({
  hours: z.number().min(0).max(23),
  minutes: z.number().min(0).max(59),
  reason: z.string().min(1, "Motivo é obrigatório"),
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
  
  const currentTotalSeconds = activity.totalTime || 0;
  const currentHours = Math.floor(currentTotalSeconds / 3600);
  const currentMinutes = Math.floor((currentTotalSeconds % 3600) / 60);

  const form = useForm<TimeAdjustmentData>({
    resolver: zodResolver(timeAdjustmentSchema),
    defaultValues: {
      hours: currentHours,
      minutes: currentMinutes,
      reason: "",
    },
  });

  const timeAdjustmentMutation = useMutation({
    mutationFn: async (data: TimeAdjustmentData) => {
      const newTotalSeconds = (data.hours * 3600) + (data.minutes * 60);
      
      await apiRequest("POST", `/api/activities/${activity.id}/adjust-time`, {
        newTotalTime: newTotalSeconds,
        reason: data.reason,
        previousTotalTime: currentTotalSeconds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Tempo da atividade ajustado com sucesso",
      });
      onClose();
      form.reset();
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
        description: "Falha ao ajustar tempo da atividade",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TimeAdjustmentData) => {
    timeAdjustmentMutation.mutate(data);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
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
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="Explique o motivo do ajuste de tempo..."
                      {...field}
                      data-testid="textarea-adjustment-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={timeAdjustmentMutation.isPending}
                data-testid="button-submit-adjustment"
              >
                {timeAdjustmentMutation.isPending ? "Ajustando..." : "Ajustar Tempo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
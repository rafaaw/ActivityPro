import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActivitySchema } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { usePlants } from "@/hooks/usePlants";

const formSchema = insertActivitySchema.extend({
  subtasks: z.array(z.object({
    title: z.string().min(1, "Título da subtarefa é obrigatório"),
    completed: z.boolean().optional(),
  })).optional(),
  isRetroactive: z.boolean().optional(),
  completeAllSubtasks: z.boolean().optional(),
  retroactiveStartDate: z.string().optional(),
  retroactiveEndDate: z.string().optional(),
  retroactiveHours: z.number().min(0, "Horas devem ser maior ou igual a 0").max(999, "Horas devem ser menor que 1000").optional(),
  retroactiveMinutes: z.number().min(0, "Minutos devem ser maior ou igual a 0").max(59, "Minutos devem ser menor que 60").optional(),
}).refine((data) => {
  if (data.isRetroactive) {
    return !!(data.retroactiveStartDate && data.retroactiveEndDate &&
      (data.retroactiveHours !== undefined || data.retroactiveMinutes !== undefined));
  }
  return true;
}, {
  message: "Data de início, data de fim e tempo trabalhado são obrigatórios para atividades retroativas",
  path: ["retroactiveStartDate"]
});

type FormData = z.infer<typeof formSchema>;

interface ActivityFormProps {
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading: boolean;
  initialData?: Partial<FormData>;
}

export default function ActivityForm({
  onSubmit,
  onCancel,
  isLoading,
  initialData
}: ActivityFormProps) {
  const { data: plants = [], isLoading: plantsLoading } = usePlants();

  const [subtasks, setSubtasks] = useState<{ title: string; completed?: boolean }[]>(
    initialData?.subtasks?.map(s => ({ title: s.title, completed: s.completed })) || []
  );
  const [newSubtask, setNewSubtask] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      type: initialData?.type || "simple",
      priority: initialData?.priority || "medium",
      plantId: initialData?.plantId || "",
      plant: initialData?.plant || "",
      project: initialData?.project || "",
      requester: initialData?.requester || "",
      observations: initialData?.observations || "",
      status: initialData?.status || "next",
      isRetroactive: initialData?.isRetroactive || false,
      completeAllSubtasks: initialData?.completeAllSubtasks || false,
      retroactiveStartDate: initialData?.retroactiveStartDate || "",
      retroactiveEndDate: initialData?.retroactiveEndDate || "",
      retroactiveHours: initialData?.retroactiveHours || 0,
      retroactiveMinutes: initialData?.retroactiveMinutes || 0,
      subtasks: subtasks,
    },
  });

  const watchedType = form.watch("type");

  // Sincronizar subtasks quando initialData mudar (importante para edição)
  useEffect(() => {
    if (initialData?.subtasks) {
      const mappedSubtasks = initialData.subtasks.map(s => ({
        title: s.title,
        completed: s.completed || false
      }));
      setSubtasks(mappedSubtasks);
      form.setValue("subtasks", mappedSubtasks);
    } else {
      setSubtasks([]);
      form.setValue("subtasks", []);
    }
  }, [initialData, form]); // Trigger quando initialData mudar

  const addSubtask = () => {
    if (newSubtask.trim()) {
      const updatedSubtasks = [...subtasks, { title: newSubtask.trim(), completed: false }];
      setSubtasks(updatedSubtasks);
      form.setValue("subtasks", updatedSubtasks);
      setNewSubtask("");
    }
  };

  const removeSubtask = (index: number) => {
    const updatedSubtasks = subtasks.filter((_, i) => i !== index);
    setSubtasks(updatedSubtasks);
    form.setValue("subtasks", updatedSubtasks);
  };

  const moveSubtaskUp = (index: number) => {
    if (index > 0) {
      const updatedSubtasks = [...subtasks];
      [updatedSubtasks[index], updatedSubtasks[index - 1]] = [updatedSubtasks[index - 1], updatedSubtasks[index]];
      setSubtasks(updatedSubtasks);
      form.setValue("subtasks", updatedSubtasks);
    }
  };

  const moveSubtaskDown = (index: number) => {
    if (index < subtasks.length - 1) {
      const updatedSubtasks = [...subtasks];
      [updatedSubtasks[index], updatedSubtasks[index + 1]] = [updatedSubtasks[index + 1], updatedSubtasks[index]];
      setSubtasks(updatedSubtasks);
      form.setValue("subtasks", updatedSubtasks);
    }
  };

  const handleSubmit = (data: FormData) => {
    // Filtrar valores especiais de loading/empty que não devem ser enviados
    const cleanData = {
      ...data,
      plantId: data.plantId?.startsWith('__') ? '' : data.plantId,
      subtasks: watchedType === "checklist" ? subtasks : undefined,
    };

    // Se for retroativa, calcular o total_time em segundos
    if (data.isRetroactive && (data.retroactiveHours || data.retroactiveMinutes)) {
      const hours = data.retroactiveHours || 0;
      const minutes = data.retroactiveMinutes || 0;
      const totalSeconds = (hours * 3600) + (minutes * 60);
      cleanData.totalTime = totalSeconds;
    }

    onSubmit(cleanData);
  };

  return (
    <Form {...form}>
      <div className="p-4">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 ">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Título da Atividade *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o título da atividade"
                      {...field}
                      data-testid="input-activity-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-activity-type">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="simple">Simples</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-activity-priority">
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planta *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-activity-plant">
                        <SelectValue placeholder="Selecione a planta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plantsLoading ? (
                        <SelectItem value="__loading__" disabled>Carregando plantas...</SelectItem>
                      ) : plants.length === 0 ? (
                        <SelectItem value="__empty__" disabled>Nenhuma planta disponível</SelectItem>
                      ) : (
                        plants.map((plant) => (
                          <SelectItem key={plant.id} value={plant.id}>
                            {plant.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="project"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Projeto</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome do projeto (opcional)"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-activity-project"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solicitante</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome do solicitante (opcional)"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-activity-requester"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre a atividade (opcional)"
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-activity-observations"
                      rows={2}
                      className="md:min-h-[60px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Subtasks for checklist type */}
          {watchedType === "checklist" && (
            <div className="space-y-2">
              <div>
                <FormLabel className="text-sm">Subtarefas</FormLabel>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Nova subtarefa"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                    data-testid="input-new-subtask"
                    className="text-sm h-8"
                  />
                  <Button
                    type="button"
                    onClick={addSubtask}
                    disabled={!newSubtask.trim()}
                    data-testid="button-add-subtask"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {subtasks.length > 0 && (
                <div className="h-20 overflow-y-auto border rounded p-2 bg-muted/30 resize-y">
                  {subtasks.map((subtask, index) => (
                    <div key={index} className="flex items-center justify-between py-1 text-xs">
                      <span className="truncate flex-1 mr-2">{subtask.title}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => moveSubtaskUp(index)}
                          disabled={index === 0}
                          className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                          data-testid={`button-move-up-subtask-${index}`}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => moveSubtaskDown(index)}
                          disabled={index === subtasks.length - 1}
                          className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                          data-testid={`button-move-down-subtask-${index}`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeSubtask(index)}
                          className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                          data-testid={`button-remove-subtask-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Retroactive Activity Section */}
          <div className="border-t pt-3">
            <FormField
              control={form.control}
              name="isRetroactive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded border p-2">
                  <div>
                    <FormLabel className="text-sm">Atividade Retroativa</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Atividade já realizada
                    </p>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border"
                      data-testid="checkbox-retroactive"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isRetroactive") && (
              <div className="mt-2 p-3 bg-muted/30 rounded space-y-3">
                {/* Complete All Subtasks Option */}
                {form.watch("type") === "checklist" && subtasks.length > 0 && (
                  <FormField
                    control={form.control}
                    name="completeAllSubtasks"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded border p-2 bg-blue-50">
                        <div>
                          <FormLabel className="text-sm text-blue-900">Completar Todas as Subtarefas</FormLabel>
                          <p className="text-xs text-blue-700">
                            Marcar todas como concluídas
                          </p>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-blue-500"
                            data-testid="checkbox-complete-all-subtasks"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel className="text-xs">Data Início</FormLabel>
                    <FormField
                      control={form.control}
                      name="retroactiveStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-retroactive-start-date"
                              className="h-8 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormLabel className="text-xs">Data Fim</FormLabel>
                    <FormField
                      control={form.control}
                      name="retroactiveEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-retroactive-end-date"
                              className="h-8 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <FormLabel className="text-xs">Tempo Trabalhado</FormLabel>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="retroactiveHours"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max="999"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-retroactive-hours"
                                  className="pr-6 h-8 text-sm"
                                />
                                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                                  h
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="retroactiveMinutes"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max="59"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-retroactive-minutes"
                                  className="pr-8 h-8 text-sm"
                                />
                                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                                  min
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              data-testid="button-cancel-form"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gradient-bg"
              data-testid="button-submit-form"
            >
              {isLoading
                ? "Criando..."
                : form.watch("isRetroactive")
                  ? "Criar Atividade Retroativa"
                  : "Criar Atividade"
              }
            </Button>
          </div>
        </form>
      </div>
    </Form>
  );
}

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
      <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Seção Principal */}
          <Card className="p-3 dark:bg-gray-700">
            <CardContent className="p-0">
              <h3 className="text-base font-semibold mb-3 text-gray-800 dark:text-white">Informações da Atividade</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-sm font-medium">Título da Atividade *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite o título da atividade"
                          {...field}
                          className="h-9"
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
                      <FormLabel className="text-sm font-medium">Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9" data-testid="select-activity-type">
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
                      <FormLabel className="text-sm font-medium">Prioridade *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9" data-testid="select-activity-priority">
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
                      <FormLabel className="text-sm font-medium">Planta *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="h-9" data-testid="select-activity-plant">
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
                      <FormLabel className="text-sm font-medium">Projeto</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do projeto (opcional)"
                          {...field}
                          value={field.value || ""}
                          className="h-9"
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
                      <FormLabel className="text-sm font-medium">Solicitante</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do solicitante (opcional)"
                          {...field}
                          value={field.value || ""}
                          className="h-9"
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
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-sm font-medium">Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações sobre a atividade (opcional)"
                          {...field}
                          value={field.value || ""}
                          className="min-h-[60px] resize-none"
                          data-testid="textarea-activity-observations"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Subtasks for checklist type */}
          {watchedType === "checklist" && (
            <Card className="p-3 dark:bg-gray-700">
              <CardContent className="p-0">
                <h3 className="text-base font-semibold mb-3 text-gray-800">Subtarefas</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite uma nova subtarefa"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSubtask();
                        }
                      }}
                      className="flex-1 h-9"
                      data-testid="input-new-subtask"
                    />
                    <Button
                      type="button"
                      onClick={addSubtask}
                      disabled={!newSubtask.trim()}
                      className="px-3 h-9"
                      data-testid="button-add-subtask"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {subtasks.length > 0 && (
                    <div className="h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50 dark:bg-gray-600 space-y-2 resize-y">
                      {subtasks.map((subtask, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border shadow-sm dark:border-gray-600">
                          <span className="flex-1 text-sm font-medium truncate mr-2 dark:text-white">{subtask.title}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSubtaskUp(index)}
                              disabled={index === 0}
                              className="h-7 w-7 p-0"
                              data-testid={`button-move-up-subtask-${index}`}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSubtaskDown(index)}
                              disabled={index === subtasks.length - 1}
                              className="h-7 w-7 p-0"
                              data-testid={`button-move-down-subtask-${index}`}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSubtask(index)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-remove-subtask-${index}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {subtasks.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <p className="text-xs">Nenhuma subtarefa adicionada ainda.</p>
                      <p className="text-xs mt-1">Adicione subtarefas para organizar sua atividade.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Retroactive Activity Section */}
          <Card className="p-3 dark:bg-gray-700">
            <CardContent className="p-0">
              <FormField
                control={form.control}
                name="isRetroactive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div>
                      <FormLabel className="text-sm font-medium text-gray-800 dark:text-white">Atividade Retroativa</FormLabel>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        Marque se esta atividade já foi realizada
                      </p>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                        data-testid="checkbox-retroactive"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("isRetroactive") && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-gray-600 space-y-3">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2">Detalhes da Atividade Retroativa</h4>

                  {/* Complete All Subtasks Option */}
                  {form.watch("type") === "checklist" && subtasks.length > 0 && (
                    <FormField
                      control={form.control}
                      name="completeAllSubtasks"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded border p-2 bg-white dark:bg-gray-700 border-blue-300 dark:border-blue-600">
                          <div>
                            <FormLabel className="text-xs font-medium text-blue-900 dark:text-blue-400">Completar Todas as Subtarefas</FormLabel>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              Marcar todas as subtarefas como concluídas
                            </p>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 rounded border-2 border-blue-500 text-blue-600 focus:ring-blue-500"
                              data-testid="checkbox-complete-all-subtasks"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="retroactiveStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-blue-900 dark:text-blue-400">Data de Início *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className="h-9 border-blue-300 focus:border-blue-500"
                              data-testid="input-retroactive-start-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="retroactiveEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-blue-900 dark:text-blue-400">Data de Fim *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className="h-9 border-blue-300 focus:border-blue-500"
                              data-testid="input-retroactive-end-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormLabel className="text-xs font-medium text-blue-900 dark:text-blue-400">Tempo Trabalhado *</FormLabel>
                    <div className="flex gap-2 mt-1">
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
                                  className="h-9 pr-10 border-blue-300 focus:border-blue-500"
                                  data-testid="input-retroactive-hours"
                                />
                                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  horas
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
                                  className="h-9 pr-12 border-blue-300 focus:border-blue-500"
                                  data-testid="input-retroactive-minutes"
                                />
                                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  minutos
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 h-9 text-sm font-medium"
              data-testid="button-cancel-form"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 h-9 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
              data-testid="button-submit-form"
            >
              {isLoading
                ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Criando...
                  </div>
                )
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

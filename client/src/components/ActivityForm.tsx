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
import { X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { usePlants } from "@/hooks/usePlants";

const formSchema = insertActivitySchema.extend({
  subtasks: z.array(z.object({
    title: z.string().min(1, "Título da subtarefa é obrigatório"),
    completed: z.boolean().optional(),
  })).optional(),
  isRetroactive: z.boolean().optional(),
  retroactiveStartDate: z.string().optional(),
  retroactiveStartTime: z.string().optional(),
  retroactiveEndDate: z.string().optional(),
  retroactiveEndTime: z.string().optional(),
}).refine((data) => {
  if (data.isRetroactive) {
    return !!(data.retroactiveStartDate && data.retroactiveStartTime &&
      data.retroactiveEndDate && data.retroactiveEndTime);
  }
  return true;
}, {
  message: "Todos os campos de data e hora são obrigatórios para atividades retroativas",
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
      retroactiveStartDate: initialData?.retroactiveStartDate || "",
      retroactiveStartTime: initialData?.retroactiveStartTime || "",
      retroactiveEndDate: initialData?.retroactiveEndDate || "",
      retroactiveEndTime: initialData?.retroactiveEndTime || "",
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

  const handleSubmit = (data: FormData) => {
    // Filtrar valores especiais de loading/empty que não devem ser enviados
    const cleanData = {
      ...data,
      plantId: data.plantId?.startsWith('__') ? '' : data.plantId,
      subtasks: watchedType === "checklist" ? subtasks : undefined,
    };

    onSubmit(cleanData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="space-y-4">
            <div>
              <FormLabel>Subtarefas</FormLabel>
              <div className="flex items-center space-x-2 mt-2">
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
                />
                <Button
                  type="button"
                  onClick={addSubtask}
                  disabled={!newSubtask.trim()}
                  data-testid="button-add-subtask"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {subtasks.length > 0 && (
              <Card>
                <CardContent className="p-1">
                  <div className="space-y-0 max-h-[7.5rem] overflow-y-auto">
                    {subtasks.map((subtask, index) => (
                      <div key={index}>
                        <div
                          className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded text-xs"
                          data-testid={`subtask-item-${index}`}
                        >
                          <span className="text-xs">{subtask.title}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubtask(index)}
                            className="text-destructive hover:text-destructive p-0.5 h-6 w-6"
                            data-testid={`button-remove-subtask-${index}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        {index < subtasks.length - 1 && (
                          <div className="border-b border-border/20 my-0.5"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Retroactive Activity Section */}
        <div className="space-y-4 border-t pt-4">
          <FormField
            control={form.control}
            name="isRetroactive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Atividade Retroativa</FormLabel>
                  <FormControl>
                    <p className="text-sm text-muted-foreground">
                      Marque para inserir uma atividade já realizada com data e hora específicas
                    </p>
                  </FormControl>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    data-testid="checkbox-retroactive"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("isRetroactive") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">Data e Hora de Início</FormLabel>
                <div className="flex space-x-2">
                  <FormField
                    control={form.control}
                    name="retroactiveStartDate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-retroactive-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="retroactiveStartTime"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            data-testid="input-retroactive-start-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">Data e Hora de Fim</FormLabel>
                <div className="flex space-x-2">
                  <FormField
                    control={form.control}
                    name="retroactiveEndDate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-retroactive-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="retroactiveEndTime"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            data-testid="input-retroactive-end-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
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
    </Form>
  );
}

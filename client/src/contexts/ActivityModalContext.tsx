import { createContext, useContext, useState, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ActivityForm from "@/components/ActivityForm";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { InsertActivity, ActivityWithDetails } from "@shared/schema";

interface ActivityModalContextType {
  openModal: (initialData?: Partial<ActivityWithDetails>, isEdit?: boolean) => void;
  closeModal: () => void;
  isOpen: boolean;
  initialData?: Partial<ActivityWithDetails>;
  isEditMode: boolean;
}

const ActivityModalContext = createContext<ActivityModalContextType | undefined>(undefined);

export function useActivityModal() {
  const context = useContext(ActivityModalContext);
  if (!context) {
    throw new Error("useActivityModal must be used within ActivityModalProvider");
  }
  return context;
}

interface ActivityModalProviderProps {
  children: ReactNode;
}

export function ActivityModalProvider({ children }: ActivityModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialData, setInitialData] = useState<Partial<ActivityWithDetails> | undefined>();
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createActivityMutation = useMutation({
    mutationFn: async (data: InsertActivity & {
      subtasks?: { title: string }[]
      isRetroactive?: boolean
      retroactiveStartDate?: string
      retroactiveStartTime?: string
      retroactiveEndDate?: string
      retroactiveEndTime?: string
    }) => {
      await apiRequest("POST", "/api/activities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsOpen(false);
      toast({
        title: "Sucesso",
        description: "Atividade criada com sucesso",
      });
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
        description: "Falha ao criar atividade",
        variant: "destructive",
      });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async (data: { id: string } & Partial<InsertActivity> & { subtasks?: { title: string; completed?: boolean | null }[] }) => {
      const { id, ...updateData } = data;
      await apiRequest("PATCH", `/api/activities/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsOpen(false);
      toast({
        title: "Sucesso",
        description: "Atividade atualizada com sucesso",
      });
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
        description: "Falha ao atualizar atividade",
        variant: "destructive",
      });
    },
  });

  const openModal = (data?: Partial<ActivityWithDetails>, isEdit?: boolean) => {
    setInitialData(data);
    setIsEditMode(isEdit || false);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setInitialData(undefined);
    setIsEditMode(false);
  };

  return (
    <ActivityModalContext.Provider value={{ openModal, closeModal, isOpen, initialData, isEditMode }}>
      {children}

      {/* Modal Global */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-semibold gradient-text">
              {isEditMode ? 'Editar Atividade' : initialData ? 'Copiar Atividade' : 'Criar Nova Atividade'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <ActivityForm
              initialData={initialData ? {
                ...initialData,
                isRetroactive: initialData.isRetroactive ?? false,
                subtasks: initialData.subtasks?.map(s => ({
                  title: s.title,
                  completed: s.completed ?? false
                }))
              } : undefined}
              onSubmit={(data) => {
                if (isEditMode && initialData?.id) {
                  updateActivityMutation.mutate({ ...data, id: initialData.id });
                } else {
                  createActivityMutation.mutate(data);
                }
              }}
              isLoading={isEditMode ? updateActivityMutation.isPending : createActivityMutation.isPending}
              onCancel={closeModal}
            />
          </div>
        </DialogContent>
      </Dialog>
    </ActivityModalContext.Provider>
  );
}
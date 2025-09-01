import { useQuery } from "@tanstack/react-query";
import type { UserWithSector } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<UserWithSector>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos - mantém os dados "fresh" por 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos - mantém no cache por 30 minutos
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
    refetchOnMount: true, // Sempre refetch ao montar para garantir estado correto após logout
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

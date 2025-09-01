import { useQuery } from "@tanstack/react-query";
import type { UserWithSector } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<UserWithSector>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

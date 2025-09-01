import { useQuery } from "@tanstack/react-query";
import type { Plant } from "@shared/schema";

export function usePlants() {
    return useQuery<Plant[]>({
        queryKey: ["plants"],
        queryFn: async () => {
            const response = await fetch("/api/plants");
            if (!response.ok) {
                throw new Error("Failed to fetch plants");
            }
            return response.json();
        },
    });
}

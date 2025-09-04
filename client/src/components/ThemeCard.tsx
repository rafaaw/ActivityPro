import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ThemeCardProps {
    theme: "light" | "dark";
    currentTheme: string | undefined;
    onSelect: (theme: "light" | "dark") => void;
}

const themeConfig = {
    light: {
        icon: Sun,
        label: "Claro",
        description: "Interface clara com fundo branco",
        preview: "bg-white border-2 border-gray-200",
        previewContent: "bg-gray-100",
    },
    dark: {
        icon: Moon,
        label: "Escuro",
        description: "Interface escura com fundo preto",
        preview: "bg-gray-800 border-2 border-gray-600",
        previewContent: "bg-gray-700",
    },
};

export function ThemeCard({ theme, currentTheme, onSelect }: ThemeCardProps) {
    const config = themeConfig[theme];
    const Icon = config.icon;
    const isSelected = currentTheme === theme;
    const { toast } = useToast();

    const handleSelect = () => {
        onSelect(theme);
        toast({
            title: "✨ Tema alterado",
            description: `Tema alterado para ${config.label.toLowerCase()}.`,
            duration: 2000,
        });
    };

    return (
        <Card
            className={cn(
                "relative cursor-pointer transition-all duration-200 hover:scale-105",
                isSelected && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={handleSelect}
        >
            <div className="p-4 space-y-3">
                {/* Preview */}
                <div className={cn("h-16 w-full rounded-lg", config.preview)}>
                    <div className="p-2 h-full flex flex-col justify-between">
                        <div className={cn("h-2 w-8 rounded", config.previewContent)} />
                        <div className="space-y-1">
                            <div className={cn("h-1 w-full rounded", config.previewContent)} />
                            <div className={cn("h-1 w-3/4 rounded", config.previewContent)} />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{config.label}</span>
                        </div>
                        {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {config.description}
                    </p>
                </div>
            </div>
        </Card>
    );
}

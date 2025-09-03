import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Pause, Clock, AlertTriangle } from "lucide-react";
import type { ActivityWithDetails } from "@shared/schema";

interface StartActivityDialogProps {
    isOpen: boolean;
    onClose: () => void;
    activeActivity: ActivityWithDetails;
    newActivityTitle: string;
    onConfirm: () => void;
    isLoading?: boolean;
}

export default function StartActivityDialog({
    isOpen,
    onClose,
    activeActivity,
    newActivityTitle,
    onConfirm,
    isLoading = false,
}: StartActivityDialogProps) {
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <span>Atividade em Andamento</span>
                    </DialogTitle>
                    <DialogDescription>
                        Você já possui uma atividade em execução. O que deseja fazer?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Atividade Atual */}
                    <Alert>
                        <Clock className="w-4 h-4" />
                        <AlertDescription>
                            <div className="space-y-2">
                                <p className="font-medium">Atividade Atual:</p>
                                <p className="text-sm">{activeActivity.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    Tempo atual: {formatTime(activeActivity.totalTime || 0)}
                                </p>
                            </div>
                        </AlertDescription>
                    </Alert>

                    {/* Nova Atividade */}
                    <Alert className="border-blue-200 bg-blue-50">
                        <Play className="w-4 h-4 text-blue-600" />
                        <AlertDescription>
                            <div className="space-y-1">
                                <p className="font-medium text-blue-900">Nova Atividade:</p>
                                <p className="text-sm text-blue-800">{newActivityTitle}</p>
                            </div>
                        </AlertDescription>
                    </Alert>

                    {/* Explicação do que acontecerá */}
                    <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            <strong>Se você continuar:</strong>
                        </p>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                            <li>• A atividade atual será pausada automaticamente</li>
                            <li>• O tempo trabalhado será salvo</li>
                            <li>• A nova atividade será iniciada imediatamente</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="flex space-x-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Pausando...
                            </>
                        ) : (
                            <>
                                <Pause className="w-4 h-4 mr-2" />
                                Pausar e Iniciar Nova
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

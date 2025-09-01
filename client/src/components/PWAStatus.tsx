import { usePWA } from "@/hooks/usePWA";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Download, Smartphone } from "lucide-react";

export default function PWAStatus() {
  const { isOnline, isStandalone, isInstalled, canUpdate } = usePWA();

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Status */}
      <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3 mr-1" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 mr-1" />
            Offline
          </>
        )}
      </Badge>

      {/* PWA Status */}
      {isStandalone && (
        <Badge variant="secondary" className="text-xs">
          <Smartphone className="h-3 w-3 mr-1" />
          App Instalado
        </Badge>
      )}

      {/* Update Available */}
      {canUpdate && (
        <Badge variant="outline" className="text-xs animate-pulse">
          <Download className="h-3 w-3 mr-1" />
          Atualização
        </Badge>
      )}
    </div>
  );
}
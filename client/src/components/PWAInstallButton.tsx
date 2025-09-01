import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true ||
             document.referrer.includes('android-app://');
    };

    // Check if it's iOS
    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    };

    setIsStandalone(checkStandalone());
    setIsIOS(checkIOS());

    // If it's not installed and not iOS, always show install option
    if (!checkStandalone() && !checkIOS()) {
      setCanInstall(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    // Listen for successful app installation
    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
      toast({
        title: "App Instalado!",
        description: "ActivityPro foi instalado com sucesso.",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          toast({
            title: "Instalação Iniciada",
            description: "O ActivityPro está sendo instalado...",
          });
        }
        
        setDeferredPrompt(null);
        setCanInstall(false);
      } catch (error) {
        console.error('Error during installation:', error);
      }
    } else if (isIOS) {
      toast({
        title: "Como instalar no iOS",
        description: "Toque no botão Compartilhar e selecione 'Adicionar à Tela de Início'",
        duration: 5000,
      });
    } else {
      // Fallback para outros navegadores
      toast({
        title: "Instalar App",
        description: "Use o menu do navegador para instalar como aplicativo",
        duration: 3000,
      });
    }
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  // Show for iOS or when install prompt is available
  if (canInstall || isIOS) {
    return (
      <Button
        onClick={handleInstallClick}
        variant="outline"
        size="sm"
        className="gap-2"
        data-testid="button-install-app"
      >
        {isIOS ? (
          <>
            <Smartphone className="h-4 w-4" />
            Instalar
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Instalar App
          </>
        )}
      </Button>
    );
  }

  return null;
}
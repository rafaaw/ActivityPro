import { useLocation } from "wouter";
import { Home, Activity, BarChart3, History, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivityModal } from "@/contexts/ActivityModalContext";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    href: "/",
    icon: Home,
    label: "Início",
    testId: "nav-home"
  },
  {
    href: "/activities", 
    icon: Activity,
    label: "Atividades",
    testId: "nav-activities"
  },
  {
    href: "/reports",
    icon: BarChart3, 
    label: "Relatórios",
    testId: "nav-reports"
  },
  {
    href: "/history",
    icon: History,
    label: "Histórico", 
    testId: "nav-history"
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Config",
    testId: "nav-settings"
  }
];

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const { openModal } = useActivityModal();

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-50 md:hidden">
        <Button
          onClick={() => openModal()}
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "gradient-bg hover:shadow-xl active:scale-95",
            "transform hover:scale-105 active:scale-90 transition-all duration-200",
            "touch-manipulation"
          )}
          data-testid="button-fab-new-activity"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border md:hidden">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
                  "min-w-0 flex-1 max-w-[4.5rem] active:scale-95 touch-manipulation",
                  isActive 
                    ? "text-primary bg-primary/10 scale-105" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                data-testid={item.testId}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import PWAInstallPrompt from "./PWAInstallPrompt";
import MobileBottomNav from "./MobileBottomNav";
import MobileHeader from "./MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Menu, X } from "lucide-react";
import { useActivityModal } from "@/contexts/ActivityModalContext";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@shared/schema";

interface LayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { user } = useAuth();
  const { openModal } = useActivityModal();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  return (
    <>
      <Sidebar />
      <div
        className={cn(
          "flex flex-col overflow-hidden transition-all duration-300 min-h-screen bg-background w-full",
          "md:pl-64 lg:pl-64", // Desktop padding
          isCollapsed && "md:pl-16 lg:pl-16" // Collapsed desktop padding
        )}
      >
        {/* Mobile Header */}
        <MobileHeader />

        {/* Desktop Header */}
        <header className="hidden md:block bg-card shadow-sm border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Toggle Sidebar Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="h-8 w-8 p-0 hover:bg-muted"
                data-testid="button-toggle-sidebar"
              >
                {state === "collapsed" ? (
                  <Menu className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>

              <div>
                <h2 className="text-2xl font-display font-semibold text-foreground" data-testid="text-header-title">
                  Dashboard
                </h2>
                <p className="text-muted-foreground">
                  Gerencie suas atividades e acompanhe seu tempo
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-foreground" data-testid="text-header-today">
                    {stats ? `${stats.todayHours}h ${stats.todayMinutes}m` : '--'}
                  </p>
                  <p className="text-muted-foreground">Hoje</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground" data-testid="text-header-week">
                    {stats ? `${stats.weekHours}h ${stats.weekMinutes}m` : '--'}
                  </p>
                  <p className="text-muted-foreground">Esta semana</p>
                </div>
              </div>

              {/* Actions */}
              <Button
                className="gradient-bg font-medium hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                data-testid="button-new-activity-header"
                onClick={() => openModal()}
              >
                <Plus className="w-4 h-4" />
                <span>Nova Atividade</span>
              </Button>

              {/* Separator */}
              <div className="h-8 w-px bg-border"></div>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt="Profile"
                      className="w-8 h-8 rounded-md object-cover"
                      data-testid="img-profile"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-semibold" data-testid="text-profile-initials">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="font-medium text-foreground text-sm" data-testid="text-header-user-name">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-muted-foreground text-xs" data-testid="text-header-user-role">
                    {user?.role === 'admin' ? 'Administração' :
                      user?.role === 'sector_chief' ? 'Chefe de Setor' :
                        'Colaborador'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </>
  );
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

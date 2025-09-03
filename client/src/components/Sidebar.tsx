import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Home,
  Plus,
  History,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  Users,
  CheckSquare,
  Activity,
  Building,
  FolderKanban,
} from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Atividades', href: '/activities', icon: CheckSquare },
  { name: 'Feed', href: '/feed', icon: Activity },
  { name: 'Histórico', href: '/history', icon: History },
  { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const [location, navigate] = useLocation();
  const { state, openMobile, setOpenMobile, isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const isCollapsed = state === "collapsed";

  // On mobile, use openMobile to control visibility
  const isVisible = isMobile ? openMobile : !isCollapsed;

  // Function to handle navigation and close mobile sidebar
  const handleNavigation = (href: string) => {
    navigate(href);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div className="md:hidden">
        {isVisible && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpenMobile(false)}
          />
        )}
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full bg-card shadow-lg border-r border-border flex flex-col transition-all duration-300",
        "z-50 md:z-30", // Higher z-index on mobile
        // Width based on collapsed state
        isCollapsed ? "w-16" : "w-64",
        // Visibility behavior
        isMobile
          ? (isVisible ? "translate-x-0" : "-translate-x-full")
          : "translate-x-0" // Always visible on desktop
      )}>
        {/* Logo */}
        <div className={cn(
          "gradient-bg transition-all duration-300 flex items-center w-full",
          isCollapsed ? "h-16 justify-center" : "px-6 py-4"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center" : "space-x-3"
          )}>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="text-white w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-white font-display font-semibold text-lg" data-testid="text-app-title">
                  ActivityPro
                </h1>
                <p className="text-white/80 text-sm">Time Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border/20"></div>

        {/* Navigation Menu */}
        <nav className={cn("flex-1 py-6 space-y-2", isCollapsed ? "px-2" : "px-4")}>
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "flex items-center rounded-lg font-medium transition-colors w-full hover:scale-105",
                  isCollapsed ? "justify-center px-2 py-3" : "space-x-3 px-3 py-2 text-left",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-${item.href.replace('/', '') || 'home'}`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </button>
            );
          })}

          {/* Admin Only Navigation */}
          {user?.role === 'admin' && (
            <>
              <div className="border-t border-border my-4"></div>
              {!isCollapsed && (
                <div className="px-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Administração
                  </p>
                </div>
              )}
              <button
                onClick={() => handleNavigation('/sectors')}
                className={cn(
                  "flex items-center rounded-lg font-medium transition-colors w-full",
                  isCollapsed ? "justify-center px-2 py-3" : "space-x-3 px-3 py-2 text-left",
                  location === '/sectors'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid="nav-sectors"
                title={isCollapsed ? "Setores" : undefined}
              >
                <Building className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>Setores</span>}
              </button>
            </>
          )}

          {/* Team Management for Sector Chiefs */}
          {user?.role === 'sector_chief' && (
            <button
              onClick={() => handleNavigation('/team')}
              className={cn(
                "flex items-center rounded-lg font-medium transition-colors w-full",
                isCollapsed ? "justify-center px-2 py-3" : "space-x-3 px-3 py-2 text-left",
                location === '/team'
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-team"
              title={isCollapsed ? "Equipe" : undefined}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Equipe</span>}
            </button>
          )}

          {/* User Management for Admins and Sector Chiefs */}
          {(user?.role === 'admin' || user?.role === 'sector_chief') && (
            <button
              onClick={() => handleNavigation('/users')}
              className={cn(
                "flex items-center rounded-lg font-medium transition-colors w-full",
                isCollapsed ? "justify-center px-2 py-3" : "space-x-3 px-3 py-2 text-left",
                location === '/users'
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid="nav-users"
              title={isCollapsed ? "Usuários" : undefined}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Usuários</span>}
            </button>
          )}

          {user?.role === 'admin' && (
            <>
              <hr className="border-border my-4" />
              <button
                onClick={() => handleNavigation('/admin')}
                className={cn(
                  "flex items-center rounded-lg font-medium transition-colors w-full",
                  isCollapsed ? "justify-center px-2 py-3" : "space-x-3 px-3 py-2 text-left",
                  location === '/admin'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid="nav-admin"
                title={isCollapsed ? "Admin" : undefined}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>Admin</span>}
              </button>
            </>
          )}
        </nav>

        {/* Status and Logout */}
        <div className={cn("border-t border-border space-y-3", isCollapsed ? "p-2" : "p-4")}>
          {!isCollapsed && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected
                  ? "bg-green-400 animate-pulse"
                  : "bg-red-400"
              )}></div>
              <span data-testid="text-online-status">
                {isConnected ? "Conectado" : "Desconectado"}
              </span>
            </div>
          )}

          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
                // Limpar todo o cache do React Query
                queryClient.clear();
                // Forçar reload da página para garantir que tudo seja limpo
                window.location.reload();
              } catch (error) {
                console.error('Logout error:', error);
                // Mesmo em caso de erro, limpar cache e forçar reload
                queryClient.clear();
                window.location.reload();
              }
            }}
            className={cn(
              "flex items-center w-full rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm",
              isCollapsed ? "justify-center px-2 py-3" : "space-x-2 px-3 py-2"
            )}
            data-testid="button-logout"
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </div>
    </>
  );
}

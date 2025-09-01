import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/components/ui/sidebar";

export default function MobileHeader() {
  const { user } = useAuth();
  const { setOpenMobile, openMobile } = useSidebar();

  return (
    <header className="bg-card shadow-sm border-b border-border px-4 py-3 md:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpenMobile(!openMobile)}
            className="h-8 w-8 p-0"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              ActivityPro
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 relative"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full"></span>
          </Button>

          {/* User Avatar */}
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover"
                data-testid="img-mobile-profile"
              />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
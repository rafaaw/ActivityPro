import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActivityModalProvider } from "@/contexts/ActivityModalContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/dashboard";
import Activities from "@/pages/activities";
import Feed from "@/pages/feed";
import History from "@/pages/history";
import Reports from "@/pages/reports";
import Admin from "@/pages/admin";
import UserManagement from "@/pages/UserManagement";
import Sectors from "@/pages/sectors";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import Projects from "@/pages/projects";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Login} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/activities" component={Activities} />
          <Route path="/feed" component={Feed} />
          <Route path="/history" component={History} />
          <Route path="/reports" component={Reports} />
          <Route path="/projects" component={Projects} />
          <Route path="/users" component={UserManagement} />
          <Route path="/sectors" component={Sectors} />
          <Route path="/team" component={Team} />
          <Route path="/admin" component={Admin} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ActivityModalProvider>
          <Toaster />
          <Router />
        </ActivityModalProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

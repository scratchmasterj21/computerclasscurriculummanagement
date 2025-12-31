import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { LogOut, LayoutDashboard, BarChart3, GitCompare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function Header() {
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/comparison", label: "Comparison", icon: GitCompare },
  ];

  return (
    <header className="border-b bg-gradient-to-r from-primary/10 via-background to-background shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CM</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Curriculum Management System
            </h1>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground font-medium">
            {currentUser?.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout} className="shadow-sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}


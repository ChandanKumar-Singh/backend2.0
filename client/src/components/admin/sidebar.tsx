import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Bell,
  Settings,
  Activity,
  BarChart3,
  Server,
  LogOut,
  Home,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  className?: string;
}

const navigation = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        description: "System overview and analytics",
      },
      {
        title: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        description: "Business metrics and reports",
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Users",
        href: "/admin/users",
        icon: Users,
        description: "Manage user accounts",
        badge: "Active",
      },
      {
        title: "Orders",
        href: "/admin/orders",
        icon: ShoppingCart,
        description: "Order management",
      },
      {
        title: "Products",
        href: "/admin/products",
        icon: Package,
        description: "Product catalog",
      },
      {
        title: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        description: "System notifications",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Monitoring",
        href: "/admin/monitoring",
        icon: Activity,
        description: "System health and performance",
      },
      {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        description: "System configuration",
      },
    ],
  },
];

export function AdminSidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className={cn("pb-12 min-h-screen", className)}>
      <div className="space-y-4 py-4">
        {/* Header */}
        <div className="px-3 py-2">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Enterprise Admin</h2>
              <p className="text-xs text-muted-foreground">Backend Management</p>
            </div>
          </div>
          
          {/* User Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-medium">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {user?.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-3">
          <div className="space-y-1">
            <Link href="/">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Home className="mr-2 h-4 w-4" />
                Go to App
              </Button>
            </Link>
          </div>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="px-3">
          <div className="space-y-6">
            {navigation.map((section) => (
              <div key={section.title}>
                <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start h-auto p-3",
                            isActive && "bg-secondary"
                          )}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          <div className="flex-1 text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.title}</span>
                              {item.badge && (
                                <Badge variant="outline" className="text-xs">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* System Status */}
        <div className="px-3">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                All Systems Operational
              </span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              API, Database, and Cache are running normally
            </p>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

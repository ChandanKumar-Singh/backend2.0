import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster.jsx";
import { TooltipProvider } from "@/components/ui/tooltip.jsx";
import { AuthProvider } from "@/hooks/use-auth";
import { AdminSidebar } from "@/components/admin/sidebar";

// Pages
import Login from "@/pages/app/login.jsx";
import Products from "@/pages/app/products.jsx";
import AdminDashboard from "@/pages/admin/dashboard.jsx";
import AdminUsers from "@/pages/admin/users.jsx";
import NotFound from "@/pages/not-found.jsx";

function AdminLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <AdminSidebar />
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

function AppRouter() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      
      {/* App Routes */}
      <Route path="/products" component={Products} />
      
      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
      
      <Route path="/admin/users">
        <AdminLayout>
          <AdminUsers />
        </AdminLayout>
      </Route>
      
      {/* Default redirect */}
      <Route path="/">
        <Products />
      </Route>
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
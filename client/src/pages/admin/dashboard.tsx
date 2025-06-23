import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, ShoppingCart, Package, Bell, TrendingUp, Activity, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DashboardStats {
  users: {
    total: number;
    active: number;
    admin: number;
    recent: number;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
    revenue: {
      total: number;
      monthly: number;
    };
  };
  products: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
  };
  notifications: {
    total: number;
    unread: number;
  };
}

export default function AdminDashboard() {
  const { data: userStats, isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/v1/admin/users/stats'],
  });

  const { data: orderStats, isLoading: loadingOrders } = useQuery({
    queryKey: ['/api/v1/admin/orders/stats'],
  });

  const { data: productStats, isLoading: loadingProducts } = useQuery({
    queryKey: ['/api/v1/admin/products/stats'],
  });

  const stats: DashboardStats = {
    users: userStats?.data || { total: 0, active: 0, admin: 0, recent: 0 },
    orders: orderStats?.data || { total: 0, pending: 0, processing: 0, completed: 0, cancelled: 0, revenue: { total: 0, monthly: 0 } },
    products: productStats?.data || { total: 0, active: 0, lowStock: 0, outOfStock: 0 },
    notifications: { total: 0, unread: 0 },
  };

  const isLoading = loadingUsers || loadingOrders || loadingProducts;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Enterprise Backend System Overview</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">System Online</span>
          </div>
          <Button variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            View Logs
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.users.total.toLocaleString()}</div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {stats.users.active} active
              </Badge>
              <span className="text-xs text-blue-600 dark:text-blue-400">+{stats.users.recent} this month</span>
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.orders.total.toLocaleString()}</div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                {stats.orders.pending} pending
              </Badge>
              <span className="text-xs text-green-600 dark:text-green-400">${stats.orders.revenue.monthly.toLocaleString()} this month</span>
            </div>
          </CardContent>
        </Card>

        {/* Products Card */}
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">Products</CardTitle>
            <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.products.total.toLocaleString()}</div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                {stats.products.active} active
              </Badge>
              {stats.products.lowStock > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.products.lowStock} low stock
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              ${stats.orders.revenue.total.toLocaleString()}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                ${stats.orders.revenue.monthly.toLocaleString()} monthly
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Order Status</span>
            </CardTitle>
            <CardDescription>Current order distribution by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.orders.pending}</span>
                  <Progress 
                    value={(stats.orders.pending / stats.orders.total) * 100} 
                    className="w-16 h-2" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Processing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.orders.processing}</span>
                  <Progress 
                    value={(stats.orders.processing / stats.orders.total) * 100} 
                    className="w-16 h-2" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.orders.completed}</span>
                  <Progress 
                    value={(stats.orders.completed / stats.orders.total) * 100} 
                    className="w-16 h-2" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Cancelled</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.orders.cancelled}</span>
                  <Progress 
                    value={(stats.orders.cancelled / stats.orders.total) * 100} 
                    className="w-16 h-2" 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>System Status</span>
            </CardTitle>
            <CardDescription>Current system health and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">API Server</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Database</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Redis Cache</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Job Queue</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Processing
                </Badge>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  View Products
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(stats.products.lowStock > 0 || stats.products.outOfStock > 0) && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-900 dark:text-orange-100">
              <AlertCircle className="h-5 w-5" />
              <span>Inventory Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.products.lowStock > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">
                      {stats.products.lowStock} products are running low on stock
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    View Products
                  </Button>
                </div>
              )}
              {stats.products.outOfStock > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-800 dark:text-red-200">
                      {stats.products.outOfStock} products are out of stock
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    Restock Now
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

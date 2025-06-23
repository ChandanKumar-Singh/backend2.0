import { useQuery } from "@tanstack/react-query";
import { usersApi, productsApi } from "@/lib/api.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Users, Package, ShoppingCart, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { data: users } = useQuery({
    queryKey: ["/api/v1/admin/users"],
    queryFn: () => usersApi.getUsers(),
  });

  const { data: products } = useQuery({
    queryKey: ["/api/v1/admin/products"],
    queryFn: () => productsApi.getProducts(),
  });

  const stats = [
    {
      title: "Total Users",
      value: users?.data?.length || 0,
      description: "Registered users",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Products",
      value: products?.data?.length || 0,
      description: "Products in catalog",
      icon: Package,
      color: "text-green-600",
    },
    {
      title: "Orders",
      value: "0",
      description: "Total orders",
      icon: ShoppingCart,
      color: "text-purple-600",
    },
    {
      title: "Revenue",
      value: "$0",
      description: "Total revenue",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Overview of your application metrics and data
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users?.data?.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
              )) || (
                <p className="text-gray-500 dark:text-gray-400">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Products */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>Latest added products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products?.data?.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ${product.price}
                    </p>
                  </div>
                  <Badge variant={product.stock > 0 ? "success" : "destructive"}>
                    Stock: {product.stock}
                  </Badge>
                </div>
              )) || (
                <p className="text-gray-500 dark:text-gray-400">No products found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
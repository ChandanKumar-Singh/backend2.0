import { apiRequest } from "./queryClient.jsx";

// Auth API endpoints
export const authApi = {
  login: async (email, password) => {
    return apiRequest("/api/v1/app/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData) => {
    return apiRequest("/api/v1/app/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  logout: async (refreshToken) => {
    return apiRequest("/api/v1/app/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },

  refreshToken: async (refreshToken) => {
    return apiRequest("/api/v1/app/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },

  getProfile: async () => {
    return apiRequest("/api/v1/app/auth/profile");
  },
};

// Users API endpoints
export const usersApi = {
  getUsers: async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return apiRequest(`/api/v1/admin/users?${searchParams}`);
  },

  createUser: async (userData) => {
    return apiRequest("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (id, userData) => {
    return apiRequest(`/api/v1/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (id) => {
    return apiRequest(`/api/v1/admin/users/${id}`, {
      method: "DELETE",
    });
  },
};

// Products API endpoints
export const productsApi = {
  getProducts: async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return apiRequest(`/api/v1/app/products?${searchParams}`);
  },

  getProduct: async (id) => {
    return apiRequest(`/api/v1/app/products/${id}`);
  },

  createProduct: async (productData) => {
    return apiRequest("/api/v1/admin/products", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  },

  updateProduct: async (id, productData) => {
    return apiRequest(`/api/v1/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  },

  deleteProduct: async (id) => {
    return apiRequest(`/api/v1/admin/products/${id}`, {
      method: "DELETE",
    });
  },
};

// Orders API endpoints
export const ordersApi = {
  getOrders: async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return apiRequest(`/api/v1/app/orders?${searchParams}`);
  },

  createOrder: async (orderData) => {
    return apiRequest("/api/v1/app/orders", {
      method: "POST",  
      body: JSON.stringify(orderData),
    });
  },

  updateOrderStatus: async (id, status) => {
    return apiRequest(`/api/v1/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
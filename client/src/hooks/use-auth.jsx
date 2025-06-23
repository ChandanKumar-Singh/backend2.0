import { useState, useEffect, createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authApi } from "@/lib/api.jsx";
import { useToast } from "./use-toast.jsx";

const AuthContext = createContext(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [, setLocation] = useLocation();
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get tokens from localStorage
  const getTokens = () => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    return { accessToken, refreshToken };
  };

  // Set tokens in localStorage
  const setTokens = (tokens) => {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
  };

  // Clear tokens from localStorage
  const clearTokens = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  // Check if user is authenticated
  const isAuthenticated = Boolean(getTokens().accessToken);

  // Get current user profile
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/v1/app/auth/profile"],
    queryFn: authApi.getProfile,
    enabled: isAuthenticated,
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      setTokens(data.data.tokens);
      queryClient.setQueryData(["/api/v1/app/auth/profile"], data.data.user);
      setError(null);
      
      // Redirect based on user role
      if (data.data.user.role === "admin") {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/products");
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    },
    onError: (error) => {
      const errorMessage = error.message || "Login failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData) =>
      authApi.register(userData),
    onSuccess: (data) => {
      setTokens(data.data.tokens);
      queryClient.setQueryData(["/api/v1/app/auth/profile"], data.data.user);
      setError(null);
      
      // Redirect to products page for new users
      setLocation("/products");

      toast({
        title: "Welcome!",
        description: "Your account has been created successfully.",
      });
    },
    onError: (error) => {
      const errorMessage = error.message || "Registration failed. Please try again.";
      setError(errorMessage);
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Login function
  const login = async (email, password) => {
    setError(null);
    await loginMutation.mutateAsync({ email, password });
  };

  // Register function
  const register = async (userData) => {
    setError(null);
    await registerMutation.mutateAsync(userData);
  };

  // Logout function
  const logout = async () => {
    try {
      const { refreshToken } = getTokens();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      clearTokens();
      queryClient.clear();
      setLocation("/login");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    }
  };

  // Automatic token refresh
  useEffect(() => {
    const refreshToken = async () => {
      const { refreshToken: storedRefreshToken, accessToken } = getTokens();
      
      if (!accessToken && storedRefreshToken) {
        try {
          const response = await authApi.refreshToken(storedRefreshToken);
          setTokens(response.data.tokens);
        } catch (error) {
          // Refresh failed, clear tokens
          clearTokens();
          setLocation("/login");
        }
      }
    };

    refreshToken();
  }, [setLocation]);

  // Redirect unauthenticated users
  useEffect(() => {
    const { accessToken } = getTokens();
    const currentPath = window.location.pathname;
    
    if (!accessToken && !currentPath.includes("/login") && !currentPath.includes("/register")) {
      setLocation("/login");
    }
  }, [setLocation]);

  const contextValue = {
    user: user?.data || null,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    isAuthenticated,
    error,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
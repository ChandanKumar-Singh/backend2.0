import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Global API request function
export async function apiRequest(url, options = {}) {
  const token = localStorage.getItem("accessToken");
  
  const config = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    // Handle token refresh if needed
    if (response.status === 401 && token) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const refreshResponse = await fetch("/api/v1/app/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            localStorage.setItem("accessToken", refreshData.data.tokens.accessToken);
            localStorage.setItem("refreshToken", refreshData.data.tokens.refreshToken);
            
            // Retry original request with new token
            config.headers.Authorization = `Bearer ${refreshData.data.tokens.accessToken}`;
            const retryResponse = await fetch(url, config);
            
            if (retryResponse.ok) {
              return retryResponse.json();
            }
          }
        } catch (error) {
          // Refresh failed, redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          throw new Error("Session expired");
        }
      }
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Set the default query function
queryClient.setQueryDefaults([""], {
  queryFn: ({ queryKey }) => {
    const [url, params] = queryKey;
    if (params) {
      const searchParams = new URLSearchParams(params);
      return apiRequest(`${url}?${searchParams}`);
    }
    return apiRequest(url);
  },
});
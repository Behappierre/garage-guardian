
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/components/theme-provider";
import { ChatAgent } from "@/components/chat/ChatAgent";
import { Suspense, lazy } from "react";
import { AuthLoading } from "@/components/auth/AuthLoading";
import "./App.css";

// Lazy load components to reduce initial bundle size
const Auth = lazy(() => import("@/pages/Auth"));
const Home = lazy(() => import("@/pages/Home"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Appointments = lazy(() => import("@/pages/Appointments"));
const Clients = lazy(() => import("@/pages/Clients"));
const JobTickets = lazy(() => import("@/pages/JobTickets"));
const Admin = lazy(() => import("@/pages/Admin"));
const Settings = lazy(() => import("@/pages/Settings"));
const MyWork = lazy(() => import("@/pages/MyWork"));
const Help = lazy(() => import("@/pages/Help"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const GarageManagement = lazy(() => import("@/pages/GarageManagement"));

// Configure React Query with better performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (replaced cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Suspense fallback={<AuthLoading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route 
                  path="/garage-management" 
                  element={
                    <ProtectedRoute>
                      <GarageManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                >
                  <Route path="appointments" element={<Appointments />}>
                    <Route path=":id" element={<Appointments />} />
                  </Route>
                  <Route path="clients" element={<Clients />}>
                    <Route path=":id" element={<Clients />} />
                  </Route>
                  <Route path="job-tickets" element={<JobTickets />}>
                    <Route path=":id" element={<JobTickets />} />
                  </Route>
                  <Route path="admin" element={<Admin />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="my-work" element={<MyWork />} />
                  <Route path="help/*" element={<Help />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <ChatAgent />
          </Router>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

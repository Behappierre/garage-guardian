
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { GarageProvider } from "@/contexts/GarageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/components/theme-provider";
import { ChatAgent } from "@/components/chat/ChatAgent";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Appointments from "@/pages/Appointments";
import Clients from "@/pages/Clients";
import JobTickets from "@/pages/JobTickets";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";
import MyWork from "@/pages/MyWork";
import Help from "@/pages/Help";
import NotFound from "@/pages/NotFound";
import CreateGarage from "@/pages/CreateGarage";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GarageProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Index />} />
                
                {/* Public routes that don't require authentication */}
                <Route path="/auth" element={<Auth />} />
                
                {/* Semi-protected route - requires auth but accessible even with no garages */}
                <Route path="/create-garage" element={<CreateGarage />} />
                
                {/* Protected routes that require authentication and garage */}
                <Route
                  path="/dashboard/*"
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
              <ChatAgent />
            </Router>
            <Toaster />
          </GarageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

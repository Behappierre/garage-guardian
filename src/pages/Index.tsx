
import { Calendar, Users, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      
      <main className="pt-20 px-4 sm:px-6 lg:px-8 animate-fadeIn">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center py-16 sm:py-20">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Smart Garage Management
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Streamline your garage operations with our comprehensive management solution.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Get Started
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-12">
            <div className="p-6 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <Calendar className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">Efficiently manage appointments and resource allocation</p>
            </div>

            <div className="p-6 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Client Management</h3>
              <p className="text-gray-600">Keep track of client information and service history</p>
            </div>

            <div className="p-6 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <Clock className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Time Tracking</h3>
              <p className="text-gray-600">Log and monitor time spent on repairs</p>
            </div>

            <div className="p-6 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <History className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Service History</h3>
              <p className="text-gray-600">Maintain detailed records of all services</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

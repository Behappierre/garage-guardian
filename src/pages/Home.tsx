
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Github } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";

const Home = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);

  const navigateTo = (path: string) => {
    navigate(path);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen relative overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 object-cover w-full h-full"
          >
            <source src="/lovable-uploads/5079986_Uniform_Occupation_1920x1080.mp4" type="video/mp4" />
          </video>
          {/* Overlay for better text visibility */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-playfair text-5xl sm:text-6xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent mb-4">
              GarageWizz
            </h1>
            <p className="text-white text-xl max-w-2xl mx-auto">
              Intelligent garage management powered by AI assistance
            </p>
          </div>

          {/* Main Cards - adjusted positioning and height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto mb-24 mt-[50vh]">
            {/* Garage Owner Card - adjusted height for better proportions */}
            <div 
              className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 flex flex-col ${
                hovered === 'owner' 
                  ? 'transform -translate-y-2 shadow-xl' 
                  : ''
              }`}
              style={{ height: '250px' }} /* Reduced height but still ensures buttons are visible */
              onMouseEnter={() => setHovered('owner')}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-200 to-cyan-50 opacity-80 z-0"></div>
              <div className="relative z-10 p-6 flex-1 flex flex-col">
                <div className="flex items-center mb-4">
                  <div className="bg-teal-500 p-3 rounded-lg text-white mr-4">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Garage Owner</h2>
                </div>
                <p className="text-gray-600 mb-4 flex-grow">
                  Manage your auto repair business efficiently with comprehensive tools for scheduling, 
                  inventory, customer management, and financial reporting.
                </p>
                <Button 
                  className="w-full transition-all duration-300 hover:bg-teal-600 hover:scale-105 mt-auto"
                  onClick={() => navigateTo("/auth?type=owner")}
                >
                  Sign In as Owner
                </Button>
              </div>
            </div>

            {/* Staff Member Card - adjusted height to match owner card */}
            <div 
              className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 flex flex-col ${
                hovered === 'staff' 
                  ? 'transform -translate-y-2 shadow-xl' 
                  : ''
              }`}
              style={{ height: '250px' }} /* Reduced height but still ensures buttons are visible */
              onMouseEnter={() => setHovered('staff')}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-300 to-purple-100 opacity-90 z-0"></div>
              <div className="relative z-10 p-6 flex-1 flex flex-col">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-600 p-3 rounded-lg text-white mr-4">
                    <Users className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Staff Member</h2>
                </div>
                <p className="text-gray-700 mb-4 flex-grow">
                  Access the tools you need for day-to-day operations, including repair tracking, 
                  time management, and client service with AI-powered assistance.
                </p>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 transition-all duration-300 hover:scale-105 mt-auto text-white"
                  onClick={() => navigateTo("/auth?type=staff")}
                >
                  Sign In as Staff
                </Button>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mb-24 w-full max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">
              Smart Garage Management
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "AI Assistance",
                  description: "Get intelligent recommendations and automation for common tasks",
                  gradient: "from-blue-200 to-blue-50"
                },
                {
                  title: "Customer Management",
                  description: "Maintain detailed client records and service history",
                  gradient: "from-green-200 to-green-50"
                },
                {
                  title: "Appointment Scheduling",
                  description: "Optimize your shop's workflow with smart calendaring",
                  gradient: "from-amber-200 to-amber-50"
                },
                {
                  title: "Job Tracking",
                  description: "Monitor repair progress and technician productivity",
                  gradient: "from-purple-200 to-purple-50"
                }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <div className={`h-2 w-24 rounded-full bg-gradient-to-r ${feature.gradient} mb-4`}></div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-white/10 pt-8 text-center text-white/70 text-sm w-full">
            <div className="flex justify-center space-x-6 mb-4">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact Us</a>
            </div>
            <div className="flex items-center justify-center">
              <p>© 2025 GarageWizz. All rights reserved.</p>
              <a href="https://github.com" className="ml-2 text-white/70 hover:text-white">
                <Github size={16} />
              </a>
            </div>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Home;

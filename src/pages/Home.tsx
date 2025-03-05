
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-3xl font-bold">GarageWizz</h1>
        <p className="mt-2 text-gray-600">The complete garage management solution</p>
        
        <div className="mt-10 space-y-6">
          <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
            <h2 className="text-xl font-semibold">I am a Garage Owner</h2>
            <p className="text-gray-600">Create an account to manage your garage operations</p>
            <Button 
              onClick={() => navigate("/auth?type=owner")} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Sign Up as Garage Owner
            </Button>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
            <h2 className="text-xl font-semibold">I am a Staff Member</h2>
            <p className="text-gray-600">Sign in to your garage account</p>
            <Button 
              onClick={() => navigate("/auth?type=staff")} 
              className="w-full bg-teal-500 hover:bg-teal-600"
            >
              Staff Sign In
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Staff accounts are created by garage administrators
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

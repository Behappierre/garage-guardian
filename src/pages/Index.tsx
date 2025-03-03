
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Garage, Wrench } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center mb-4">
          <Wrench className="h-12 w-12 text-primary mr-2" />
          <h1 className="text-4xl font-bold text-gray-900">GarageWizz</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          The complete management solution for automotive repair shops
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Garage className="h-6 w-6 mr-2 text-primary" />
              I have a garage
            </CardTitle>
            <CardDescription>
              Sign in to access your garage's dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate("/auth")} 
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-6 w-6 mr-2 text-primary" />
              I need to create a garage
            </CardTitle>
            <CardDescription>
              Set up a new garage in just a few minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate("/create-garage")} 
              className="w-full"
              variant="outline"
            >
              Create Garage
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="mt-10 text-sm text-gray-500">
        GarageWizz provides dedicated workspaces for each garage with complete data isolation
      </p>
    </div>
  );
};

export default Index;


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { createGarage } from "@/services/garage-service";
import { CreateGarageFormData } from "@/types/garage";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const CreateGarage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateGarageFormData>({
    name: "",
    slug: "",
    address: "",
    phone: "",
    email: user?.email || "",
    owner_first_name: "",
    owner_last_name: "",
    owner_email: user?.email || "",
    owner_password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name
    if (name === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      if (!formData.name || !formData.slug) {
        toast.error("Garage name and slug are required");
        return;
      }
      
      if (!formData.owner_email || !formData.owner_password) {
        toast.error("Owner email and password are required");
        return;
      }
      
      const { garage, error } = await createGarage(formData);
      
      if (error) {
        console.error("Failed to create garage:", error);
        setErrorMessage(error.message || "Failed to create garage");
        toast.error(error.message || "Failed to create garage");
        return;
      }
      
      if (garage) {
        toast.success("Garage created successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error:", error);
      setErrorMessage(error.message || "An unexpected error occurred");
      toast.error(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Garage</CardTitle>
          <CardDescription>
            Set up your garage to get started with the application.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Garage Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. John's Auto Repair"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="e.g. johns-auto-repair"
                required
              />
              <p className="text-sm text-muted-foreground">
                This will be used in your URL: app.example.com/{formData.slug}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main St, Anytown, CA"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Business Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="garage@example.com"
              />
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">Owner Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="owner_first_name">First Name</Label>
                <Input
                  id="owner_first_name"
                  name="owner_first_name"
                  value={formData.owner_first_name}
                  onChange={handleChange}
                  placeholder="John"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="owner_last_name">Last Name</Label>
                <Input
                  id="owner_last_name"
                  name="owner_last_name"
                  value={formData.owner_last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="owner_email">Email</Label>
                <Input
                  id="owner_email"
                  name="owner_email"
                  type="email"
                  value={formData.owner_email}
                  onChange={handleChange}
                  placeholder="owner@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="owner_password">Password</Label>
                <Input
                  id="owner_password"
                  name="owner_password"
                  type="password"
                  value={formData.owner_password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Garage"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateGarage;

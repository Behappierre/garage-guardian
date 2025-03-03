
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { CreateGarageFormData } from "@/types/garage";
import { useGarage } from "@/contexts/GarageContext";

export default function CreateGarage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userGarages } = useGarage();
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    if (user && userGarages.length > 0) {
      navigate('/dashboard');
    }
  }, [user, userGarages, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      setFormData({ 
        ...formData, 
        name: value,
        slug
      });
    } else {
      setFormData({ 
        ...formData, 
        [name]: value 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);

      if (!formData.name || !formData.slug) {
        toast.error("Garage name and URL slug are required");
        return;
      }

      const { data: existingGarage, error: slugCheckError } = await supabase
        .from("garages")
        .select("id")
        .eq("slug", formData.slug)
        .maybeSingle();

      if (slugCheckError) {
        throw slugCheckError;
      }

      if (existingGarage) {
        toast.error("This URL is already taken. Please choose another one.");
        return;
      }

      if (user) {
        const { data: garage, error: garageError } = await supabase
          .from("garages")
          .insert({
            name: formData.name,
            slug: formData.slug,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            settings: {
              workingHours: {
                monday: { open: "09:00", close: "17:00" },
                tuesday: { open: "09:00", close: "17:00" },
                wednesday: { open: "09:00", close: "17:00" },
                thursday: { open: "09:00", close: "17:00" },
                friday: { open: "09:00", close: "17:00" },
                saturday: { open: "10:00", close: "15:00" },
                sunday: { open: "", close: "" }
              },
              serviceTypes: ["Oil Change", "Tire Rotation", "Brake Service"],
              currency: "USD"
            }
          })
          .select()
          .single();

        if (garageError) {
          throw garageError;
        }

        const { error: memberError } = await supabase
          .from("garage_members")
          .insert({
            garage_id: garage.id,
            user_id: user.id,
            role: "owner"
          });

        if (memberError) {
          throw memberError;
        }

        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({
            user_id: user.id,
            role: "administrator"
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: true
          });

        if (roleError) {
          console.error("Error setting user role:", roleError);
        }

        if (userGarages.length === 0) {
          localStorage.setItem("currentGarageId", garage.id);
        }

        toast.success("Garage created successfully!");
        navigate("/dashboard");
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.owner_email,
          password: formData.owner_password,
          options: {
            data: {
              first_name: formData.owner_first_name,
              last_name: formData.owner_last_name,
            }
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!authData?.user) {
          throw new Error("Failed to create user account");
        }

        const { data: garage, error: garageError } = await supabase
          .from("garages")
          .insert({
            name: formData.name,
            slug: formData.slug,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            settings: {
              workingHours: {
                monday: { open: "09:00", close: "17:00" },
                tuesday: { open: "09:00", close: "17:00" },
                wednesday: { open: "09:00", close: "17:00" },
                thursday: { open: "09:00", close: "17:00" },
                friday: { open: "09:00", close: "17:00" },
                saturday: { open: "10:00", close: "15:00" },
                sunday: { open: "", close: "" }
              },
              serviceTypes: ["Oil Change", "Tire Rotation", "Brake Service"],
              currency: "USD"
            }
          })
          .select()
          .single();

        if (garageError) {
          throw garageError;
        }

        const { error: memberError } = await supabase
          .from("garage_members")
          .insert({
            garage_id: garage.id,
            user_id: authData.user.id,
            role: "owner"
          });

        if (memberError) {
          throw memberError;
        }

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "administrator"
          });

        if (roleError) {
          console.error("Error setting user role:", roleError);
        }

        localStorage.setItem("currentGarageId", garage.id);

        toast.success("Garage created successfully! Check your email to verify your account.");
        navigate("/auth");
      }
    } catch (error: any) {
      console.error("Error creating garage:", error);
      toast.error(error.message || "Failed to create garage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
          GarageWizz
        </h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Create Your Garage</CardTitle>
            <CardDescription>
              Set up your garage on GarageWizz to manage clients, appointments, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Garage Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="slug">Garage URL</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-500 sm:text-sm">
                      garagewizz.com/
                    </span>
                    <Input
                      id="slug"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      className="rounded-l-none"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {!user && (
                  <>
                    <div className="pt-3 border-t">
                      <h3 className="text-sm font-medium mb-3">Owner Account</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="owner_first_name">First Name</Label>
                        <Input
                          id="owner_first_name"
                          name="owner_first_name"
                          value={formData.owner_first_name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="owner_last_name">Last Name</Label>
                        <Input
                          id="owner_last_name"
                          name="owner_last_name"
                          value={formData.owner_last_name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="owner_email">Email</Label>
                      <Input
                        id="owner_email"
                        name="owner_email"
                        type="email"
                        value={formData.owner_email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="owner_password">Password</Label>
                      <Input
                        id="owner_password"
                        name="owner_password"
                        type="password"
                        value={formData.owner_password}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
                
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Garage"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <p className="text-sm text-gray-600">
              Already have a garage? {" "}
              <button 
                onClick={handleSignInClick}
                className="text-primary font-medium hover:underline"
              >
                Sign in here
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

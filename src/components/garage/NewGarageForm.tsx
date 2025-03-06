import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Garage } from "@/types/garage";

interface NewGarageFormProps {
  onBack: () => void;
  onComplete: (garageId: string) => void;
}

interface GarageFormValues {
  name: string;
  slug: string;
  address: string;
  email: string;
  phone?: string;
}

export const NewGarageForm = ({ onBack, onComplete }: NewGarageFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<GarageFormValues>();
  const garageName = watch("name") || "";

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const onSubmit = async (data: GarageFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const slug = data.slug || generateSlug(data.name);
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error("Authentication required to create a garage");
      }
      
      // Use the edge function to create garage
      const { data: garageData, error: garageError } = await supabase.functions.invoke('create-garage', {
        body: {
          name: data.name,
          slug: slug,
          address: data.address,
          email: data.email,
          phone: data.phone || null,
          userId: userData.user.id
        }
      });
      
      if (garageError || !garageData) {
        console.error("Error creating garage:", garageError || "No data returned");
        throw new Error(garageError?.message || "Failed to create garage");
      }
      
      if (!garageData.id) {
        throw new Error("No garage ID returned");
      }
      
      toast.success("Garage created successfully");
      
      // Force refresh auth session to update user claims
      await supabase.auth.refreshSession();
      
      onComplete(garageData.id);
    } catch (error: any) {
      console.error("Error creating garage:", error);
      setError(error.message || "Failed to create garage");
      toast.error("Failed to create garage");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Create New Garage</h1>
        <p className="text-gray-500">Set up your garage business details</p>
      </div>
      
      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6 mt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Garage Name</Label>
            <Input
              id="name"
              placeholder="My Awesome Garage"
              {...register("name", { required: "Garage name is required" })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="slug">
              URL Slug (Optional)
              <span className="text-gray-500 text-sm ml-2">
                ({generateSlug(garageName) || "auto-generated"})
              </span>
            </Label>
            <Input
              id="slug"
              placeholder="my-awesome-garage"
              {...register("slug")}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="123 Main St, Anytown, ST 12345"
              {...register("address", { required: "Address is required" })}
            />
            {errors.address && (
              <p className="text-red-500 text-sm">{errors.address.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Business Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@mygarage.com"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Business Phone (Optional)</Label>
            <Input
              id="phone"
              placeholder="(123) 456-7890"
              {...register("phone")}
            />
          </div>
          
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Garage"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

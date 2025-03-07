
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface GarageFormProps {
  userId: string;
  onComplete: (garageId: string) => void;
}

interface GarageFormValues {
  name: string;
  address: string;
  email: string;
  phone?: string;
}

export const GarageForm = ({ userId, onComplete }: GarageFormProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<GarageFormValues>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const onSubmit = async (data: GarageFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Creating garage with data:", data);
      
      // Create a URL-friendly slug from the garage name
      const slug = data.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      console.log("Submitting garage with slug:", slug);
      
      // This approach uses two steps to avoid RLS issues:
      // 1. Insert the garage as service_role to bypass RLS
      const { data: garageData, error: garageError } = await supabase.functions.invoke('create-garage', {
        body: {
          name: data.name,
          slug: slug,
          address: data.address,
          email: data.email,
          phone: data.phone || null,
          userId: userId
        }
      });
      
      if (garageError || !garageData) {
        console.error("Error creating garage:", garageError || "No data returned");
        throw new Error(garageError?.message || "Failed to create garage");
      }
      
      console.log("Created garage:", garageData);
      
      if (!garageData.id) {
        throw new Error("No garage ID returned");
      }
      
      toast({
        title: "Success!",
        description: "Your garage has been created successfully.",
      });
      
      // Force refresh auth session to update user claims
      await supabase.auth.refreshSession();
      
      // Use the safe completion handler
      if (typeof onComplete === 'function') {
        onComplete(garageData.id);
      } else {
        console.warn("onComplete is not a function, redirecting to dashboard instead");
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error("Error creating garage:", error.message);
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create garage: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create Your Garage</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter the details of your garage business
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Garage Name</Label>
          <Input
            id="name"
            {...register("name", { required: "Garage name is required" })}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            {...register("address", { required: "Address is required" })}
          />
          {errors.address && (
            <p className="text-sm text-red-500">{errors.address.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Business Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Business Phone (optional)</Label>
          <Input id="phone" {...register("phone")} />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Garage"}
        </Button>
      </form>
    </div>
  );
};

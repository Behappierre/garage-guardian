
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
import { toast } from "sonner";

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
  const { toast: toastNotification } = useToast();
  const navigate = useNavigate();

  const onSubmit = async (data: GarageFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Creating garage with data:", data);
      
      // Check if user profile exists and create if not
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (profileError || !profileData) {
        console.warn("User profile not found, creating it before garage creation");
        
        // Get user details to create profile
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData?.user) {
          const userMeta = userData.user.user_metadata;
          const firstName = userMeta?.first_name || '';
          const lastName = userMeta?.last_name || '';
          
          // Create profile
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              first_name: firstName,
              last_name: lastName
            });
            
          if (createProfileError) {
            console.error("Failed to create user profile:", createProfileError);
          } else {
            console.log("Created user profile before garage creation");
          }
        }
      }
      
      // Create a URL-friendly slug from the garage name
      const slug = data.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      console.log("Submitting garage with slug:", slug);
      
      // Call the edge function to create the garage
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
      
      if (garageError) {
        console.error("Error from create-garage function:", garageError);
        throw new Error(garageError.message || "Failed to create garage");
      }
      
      if (!garageData) {
        throw new Error("No data returned from create-garage function");
      }
      
      if (garageData.status === 'error') {
        throw new Error(garageData.error || "Failed to create garage");
      }
      
      console.log("Created garage:", garageData);
      
      if (!garageData.id) {
        throw new Error("No garage ID returned");
      }
      
      toast.success("Your garage has been created successfully");
      
      // Force refresh auth session to update user claims
      try {
        await supabase.auth.refreshSession();
        console.log("Auth session refreshed");
        
        // Verify user role exists
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .eq('role', 'administrator');
          
        if (!roleData || roleData.length === 0) {
          console.warn("User role missing, attempting to create it");
          await supabase.from('user_roles').insert({
            user_id: userId,
            role: 'administrator',
            garage_id: garageData.id
          });
        }
        
        // Use the safe completion handler
        if (typeof onComplete === 'function') {
          onComplete(garageData.id);
        } else {
          console.warn("onComplete is not a function, redirecting to dashboard instead");
          // Add a small delay to ensure the toast is seen
          setTimeout(() => navigate('/garage-management'), 500);
        }
      } catch (refreshError) {
        console.error("Error refreshing session:", refreshError);
        // Still try to redirect even if refresh fails
        if (typeof onComplete === 'function') {
          onComplete(garageData.id);
        } else {
          console.warn("onComplete is not a function, redirecting to dashboard instead");
          setTimeout(() => navigate('/garage-management'), 500);
        }
      }
    } catch (error: any) {
      console.error("Error creating garage:", error.message);
      setError(error.message);
      toast.error(`Failed to create garage: ${error.message}`);
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

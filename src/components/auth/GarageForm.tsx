
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
import { Garage } from "@/types/garage";

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
      
      // First, create the garage with explicit owner_id
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .insert([
          {
            name: data.name,
            slug: slug,
            address: data.address,
            email: data.email,
            phone: data.phone || null,
            owner_id: userId
          }
        ])
        .select();
      
      if (garageError) {
        console.error("Error creating garage:", garageError);
        throw garageError;
      }
      
      if (!garageData || garageData.length === 0) {
        throw new Error("No garage data returned after creation");
      }
      
      const garageId = garageData[0].id;
      console.log("Created garage with ID:", garageId);
      
      // Then, add the user as a garage member with 'owner' role
      const { error: memberError } = await supabase
        .from('garage_members')
        .insert([
          {
            user_id: userId,
            garage_id: garageId,
            role: 'owner'
          }
        ]);
      
      if (memberError) {
        console.error("Error adding user as garage member:", memberError);
        throw memberError;
      }
      
      // Use direct SQL update with CTE to avoid ambiguity
      console.log("Updating profile with garage_id:", garageId);
      
      // Diagnose the issue first using the read-only query
      const { data: diagData, error: diagError } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          WITH profile_target AS (SELECT '${userId}' AS uid, '${garageId}' AS gid)
          SELECT * FROM profile_target;
        `
      });
      
      if (diagError) {
        console.error("Diagnostic query error:", diagError);
      } else {
        console.log("Diagnostic query result:", diagData);
      }
      
      // Now use the RPC function that handles the update
      const { error: profileError } = await supabase.rpc(
        'update_profile_garage',
        { 
          p_user_id: userId,
          p_garage_id: garageId
        }
      );
      
      if (profileError) {
        console.error("Error updating profile:", profileError);
        console.warn("Non-critical error updating profile:", profileError.message);
      } else {
        console.log("Profile updated successfully with garage ID");
      }
      
      toast({
        title: "Success!",
        description: "Your garage has been created successfully.",
      });
      
      // Force refresh auth session to update user claims
      await supabase.auth.refreshSession();
      
      onComplete(garageId);
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

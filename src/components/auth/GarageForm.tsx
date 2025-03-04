
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  const { register, handleSubmit, formState: { errors } } = useForm<GarageFormValues>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const onSubmit = async (data: GarageFormValues) => {
    setLoading(true);
    
    try {
      console.log("Creating garage with data:", data);
      
      // Create a URL-friendly slug from the garage name
      const slug = data.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      // First, create the garage
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .insert([
          {
            name: data.name,
            slug: slug,
            address: data.address,
            email: data.email,
            phone: data.phone || null
          }
        ])
        .select();
      
      if (garageError) {
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
        throw memberError;
      }
      
      // Update the user's profile with the garage ID
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userId);
      
      if (profileError && !profileError.message.includes("infinite recursion")) {
        console.error("Non-critical error updating profile:", profileError.message);
      }
      
      toast({
        title: "Success!",
        description: "Your garage has been created successfully.",
      });
      
      // Force refresh auth session to update user claims
      await supabase.auth.refreshSession();
      
      // Redirect to garage management
      navigate("/garage-management");
    } catch (error: any) {
      console.error("Error creating garage:", error.message);
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
          <Input
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

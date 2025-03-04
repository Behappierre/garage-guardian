
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { addUserToGarage } from "@/hooks/garage/utils/membershipHelpers";
import { useNavigate } from "react-router-dom";

interface CreateGarageFormProps {
  onBack: () => void;
  onComplete: (garageId: string) => void;
  userId?: string;
}

interface GarageFormValues {
  name: string;
  slug: string;
  address: string;
  email: string;
  phone?: string;
}

export const CreateGarageForm = ({ onBack, onComplete, userId }: CreateGarageFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<GarageFormValues>();
  const garageName = watch("name") || "";

  // Generate a slug from the garage name
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
      setLoading(true);
      setError(null);
      
      // Auto-generate slug if not provided
      const slug = data.slug || generateSlug(data.name);
      
      console.log("Creating garage with data:", {
        name: data.name,
        slug,
        address: data.address,
        email: data.email,
        phone: data.phone
      });
      
      // Get the current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: userData } = await supabase.auth.getUser();
        currentUserId = userData.user?.id;
        
        if (!currentUserId) {
          throw new Error("Could not determine current user");
        }
      }
      
      // Create the garage with owner_id directly set
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .insert({
          name: data.name,
          slug: slug,
          address: data.address,
          email: data.email,
          phone: data.phone,
          owner_id: currentUserId  // Set the owner directly
        })
        .select();
      
      if (garageError) {
        console.error("Garage creation error:", garageError);
        setError(garageError.message);
        toast.error(`Failed to create garage: ${garageError.message}`);
        setLoading(false);
        return;
      }
      
      if (!garageData || garageData.length === 0) {
        throw new Error("No garage data returned after creation");
      }
      
      const newGarageId = garageData[0].id;
      console.log("Created garage:", newGarageId);
      
      // For backward compatibility, also add the user as a garage member
      const success = await addUserToGarage(currentUserId, newGarageId, 'owner');
      if (!success) {
        console.warn("Failed to add user as garage member, but garage was created successfully");
      }
      
      // Update user's profile with selected garage
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: newGarageId })
        .eq('id', currentUserId);
      
      if (profileError && !profileError.message.includes("recursive")) {
        console.warn("Non-critical error updating profile:", profileError.message);
      }
      
      // Refresh the session to update claims
      await supabase.auth.refreshSession();
      
      toast.success("Garage created successfully");
      onComplete(newGarageId);
    } catch (error: any) {
      console.error("Error creating garage:", error);
      setError(error.message || "Failed to create garage");
      toast.error(`Failed to create garage: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    console.log("Back button clicked");
    if (typeof onBack === 'function') {
      onBack();
    } else {
      navigate("/garage-management");
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <PageHeader 
        title="Create New Garage" 
        description="Set up your garage business details"
      />
      
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
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Garage"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

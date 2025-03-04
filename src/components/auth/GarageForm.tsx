
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GarageFormProps {
  userId: string;
  onComplete: (garageId: string) => void;
}

export const GarageForm = ({ userId, onComplete }: GarageFormProps) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Generate slug from garage name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setSlug(newName.toLowerCase().replace(/[^a-z0-9]/g, "-"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !slug) {
      toast.error("Garage name is required");
      return;
    }
    
    setLoading(true);
    
    try {
      // Create a new garage
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .insert({
          name,
          slug,
          address,
          phone,
          email
        })
        .select();
      
      if (garageError) throw garageError;
      
      // Get the garage ID
      const garageId = (garageData && Array.isArray(garageData) && garageData.length > 0) 
        ? garageData[0].id 
        : null;
      
      if (!garageId) throw new Error("Failed to create garage");
      
      console.log("Created garage with ID:", garageId);
      
      // Add user as an owner of the garage
      const { error: memberError } = await supabase
        .from('garage_members')
        .insert({
          user_id: userId,
          garage_id: garageId,
          role: 'owner'
        });
      
      if (memberError) throw memberError;
      
      console.log("Added user as garage member");
      
      // Update user's profile with the new garage ID
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      console.log("Updated user profile with garage ID");
      
      toast.success("Garage created successfully!");
      onComplete(garageId);
      
    } catch (error: any) {
      console.error("Error creating garage:", error.message);
      toast.error(`Error creating garage: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create Your Garage</h2>
        <p className="mt-2 text-sm text-gray-600">
          Set up your garage details to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Garage Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={handleNameChange}
            required
            placeholder="e.g. City Auto Repair"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Garage Slug (URL identifier)</Label>
          <Input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            placeholder="e.g. city-auto-repair"
          />
          <p className="text-xs text-gray-500">
            This will be used in URLs and must be unique
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Full address of your garage"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Contact phone number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Contact Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Contact email address"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating Garage..." : "Create Garage"}
        </Button>
      </form>
    </div>
  );
};

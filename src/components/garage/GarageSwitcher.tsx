
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAccessibleGarages } from "@/utils/auth/garageAccess";
import type { Garage } from "@/types/garage";

export function GarageSwitcher() {
  const navigate = useNavigate();
  const { user, garageId, refreshAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentGarage, setCurrentGarage] = useState<Garage | null>(null);

  // Fetch accessible garages
  useEffect(() => {
    const fetchGarages = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const accessibleGarages = await getAccessibleGarages(user.id);
        setGarages(accessibleGarages);
        
        // Find current garage
        if (garageId) {
          const current = accessibleGarages.find(g => g.id === garageId);
          if (current) {
            setCurrentGarage(current);
          }
        }
      } catch (error) {
        console.error("Error fetching garages:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGarages();
  }, [user?.id, garageId]);

  // Skip rendering if not admin or only one garage
  if (garages.length <= 1) {
    return null;
  }

  const handleGarageSelect = async (selectedGarage: Garage) => {
    try {
      if (!user?.id) return;
      
      // Update profile and user_role with selected garage
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: selectedGarage.id })
        .eq('id', user.id);
        
      if (profileError) {
        console.error("Error updating profile:", profileError);
        toast.error("Failed to switch garage");
        return;
      }
      
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ garage_id: selectedGarage.id })
        .eq('user_id', user.id);
        
      if (roleError) {
        console.error("Error updating user role:", roleError);
        toast.error("Failed to switch garage");
        return;
      }
      
      // Refresh auth context to get new garage
      await refreshAuth();
      
      toast.success(`Switched to ${selectedGarage.name}`);
      navigate("/dashboard");
      setOpen(false);
    } catch (error) {
      console.error("Error switching garage:", error);
      toast.error("Failed to switch garage");
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-fit justify-between"
        >
          <Building2 className="mr-2 h-4 w-4" />
          {currentGarage?.name || "Select garage"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search garage..." />
          <CommandEmpty>No garage found.</CommandEmpty>
          <CommandGroup>
            {garages.map((garage) => (
              <CommandItem
                key={garage.id}
                value={garage.id}
                onSelect={() => handleGarageSelect(garage)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentGarage?.id === garage.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {garage.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

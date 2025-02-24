
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export const WelcomeHeader = () => {
  const { user } = useAuth();

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
      <p className="text-gray-500">
        {userProfile?.first_name 
          ? `Welcome back, ${userProfile.first_name}! Here's what's happening today.`
          : "Welcome back! Here's what's happening today."}
      </p>
    </div>
  );
};

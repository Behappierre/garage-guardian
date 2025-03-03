
import { Building, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSubdomainInfo } from "@/utils/subdomain";
import { type Garage } from "@/types/garage";

interface GarageCardProps {
  garage: Garage;
}

export const GarageCard = ({ garage }: GarageCardProps) => {
  const navigateToGarageSubdomain = (garageSlug: string) => {
    // Get current hostname and protocol
    const { hostname, isLocalhost } = getSubdomainInfo();
    const protocol = window.location.protocol;
    
    let targetUrl;
    
    // Handle local development vs production
    if (isLocalhost) {
      // For local development, simulate subdomains via URL parameter
      targetUrl = `${protocol}//${hostname}:${window.location.port}/?garage=${garageSlug}`;
    } else {
      // For production, use actual subdomains
      // Extract the base domain (remove any existing subdomain)
      const hostParts = hostname.split('.');
      const baseDomain = hostParts.length > 2 
        ? hostParts.slice(1).join('.')
        : hostname;
      
      targetUrl = `${protocol}//${garageSlug}.${baseDomain}`;
    }
    
    // Log and show what's happening
    console.log(`Redirecting to: ${targetUrl}`);
    toast.info(`Redirecting to ${garageSlug} garage...`);
    
    // Open in the same window
    window.location.href = targetUrl;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building className="h-5 w-5 text-primary mr-2" />
          {garage.name}
        </CardTitle>
        <CardDescription>
          {garage.address || "No address provided"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-2">
          Access this garage via its dedicated subdomain
        </p>
        <div className="text-xs font-mono bg-gray-100 p-2 rounded mb-4">
          {garage.slug}.garagewizz.com
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={() => navigateToGarageSubdomain(garage.slug)}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Access Garage
        </Button>
      </CardFooter>
    </Card>
  );
};

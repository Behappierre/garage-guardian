
/**
 * Utility for handling subdomain detection and parsing
 */

export const getSubdomainInfo = () => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const hostParts = hostname.split('.');
  
  // For localhost testing, check if there's a subdomain in a simulated format
  // In production, we'd simply check if hostParts.length > 2
  const isSubdomain = isLocalhost 
    ? hostname.includes('.')
    : hostParts.length > 2;
    
  const subdomain = isSubdomain 
    ? hostParts[0] 
    : null;
    
  return {
    hostname,
    isLocalhost,
    isSubdomain,
    subdomain
  };
};

export const getEffectiveGarageSlug = (garageSlug: string | null) => {
  const { subdomain } = getSubdomainInfo();
  return garageSlug || subdomain;
};

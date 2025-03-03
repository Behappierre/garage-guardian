
import { Garage } from "@/types/garage";

/**
 * Response type for garage operations
 */
export interface GarageResponse {
  garage: Garage | null;
  error: any;
}

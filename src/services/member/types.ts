
import { GarageMember } from "@/types/garage";

/**
 * Response type for garage member operations
 */
export interface GarageMembersResponse {
  members: GarageMember[];
  error: any;
}

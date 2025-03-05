
/**
 * @deprecated This file is now split into smaller files.
 * Please import from '@/utils/auth/garage-access' instead.
 */

// Re-export all functions from the new location for backward compatibility
export { 
  getAccessibleGarages,
  repairUserGarageRelationships,
  createGarageMember 
} from './garage-access';

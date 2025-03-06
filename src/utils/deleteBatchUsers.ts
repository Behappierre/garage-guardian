
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Utility function to delete multiple users in a batch
 * @param userIds Array of user IDs to delete
 * @returns Promise with results of the deletion operations
 */
export const deleteBatchUsers = async (userIds: string[]): Promise<{
  successful: string[];
  failed: { id: string; error: string }[];
}> => {
  const results = {
    successful: [] as string[],
    failed: [] as { id: string; error: string }[]
  };

  console.log(`Starting batch deletion of ${userIds.length} users...`);
  
  // Process each user ID sequentially to avoid overwhelming the server
  for (const userId of userIds) {
    try {
      console.log(`Deleting user: ${userId}`);
      
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });
      
      if (error) {
        console.error(`Error deleting user ${userId}:`, error);
        results.failed.push({ id: userId, error: error.message });
        toast.error(`Failed to delete user ${userId.substring(0, 8)}...`);
      } else {
        console.log(`Successfully deleted user ${userId}`);
        results.successful.push(userId);
        toast.success(`User ${userId.substring(0, 8)}... deleted successfully`);
      }
    } catch (err: any) {
      console.error(`Exception when deleting user ${userId}:`, err);
      results.failed.push({ id: userId, error: err.message || 'Unknown error' });
      toast.error(`Error deleting user ${userId.substring(0, 8)}...`);
    }
  }
  
  console.log(`Batch deletion completed. Success: ${results.successful.length}, Failed: ${results.failed.length}`);
  return results;
};

/**
 * Delete the specific batch of users from the image
 */
export const deleteRequestedUsers = async () => {
  const userIds = [
    "ed7446c8-3554-4d34-b828-51b4f7a0d293", // Wizard
    "cc7f9f30-8baf-4faa-ad33-7e4627c67499", // test
    "1b143f58-13c5-41fd-b28e-f7b8ae4fe0f4", // 1634
    "28c19ed1-39d0-48b6-8a73-34ce49c4e1ee"  // 1639
  ];
  
  console.log("Starting deletion of requested users...");
  const results = await deleteBatchUsers(userIds);
  
  if (results.successful.length === userIds.length) {
    toast.success(`All ${results.successful.length} users were deleted successfully`);
  } else {
    toast.warning(`Deleted ${results.successful.length} of ${userIds.length} users`);
    if (results.failed.length > 0) {
      console.error("Failed deletions:", results.failed);
    }
  }
  
  return results;
};

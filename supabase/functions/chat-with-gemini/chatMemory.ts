
export async function updateChatMemory(userId: string, message: string, response: string) {
  // For now, just log the chat. This can be expanded to store in Supabase
  console.log(`Chat memory updated for user ${userId}:`, { message, response });
}

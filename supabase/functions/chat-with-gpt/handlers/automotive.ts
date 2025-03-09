
import { OpenAI } from "https://esm.sh/openai@4.0.0";

export async function handleAutomotiveQuestion(message: string, openAIApiKey: string): Promise<string> {
  try {
    console.log('Processing automotive question:', message);
    
    const openai = new OpenAI({
      apiKey: openAIApiKey,
    });

    // Create a chat completion focused on automotive questions
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: `You are an automotive service assistant specialized in answering technical questions about vehicles,
                    maintenance, and repair. Provide accurate and helpful information about car problems, maintenance schedules,
                    and general automotive knowledge. Keep responses concise and focused on the automotive domain.
                    
                    When providing vehicle advice:
                    1. Focus on safety aspects first
                    2. Explain possible causes of problems in order of likelihood
                    3. Give practical diagnostics that can be done at a garage
                    4. Recommend appropriate maintenance schedules
                    5. Cite industry standard practices where appropriate
                    
                    Be helpful, friendly, and professional in your responses.`
        },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    console.log('Automotive response generated successfully');
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error in automotive handler:', error);
    return "I'm sorry, I encountered an error while trying to answer your automotive question. Please try again later.";
  }
}

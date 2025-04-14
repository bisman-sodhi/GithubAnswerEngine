import { NextResponse } from 'next/server';
import { getGroqResponse } from '@/app/utils/groqClient';

export async function POST(req: Request) {
  try {
    const { messages, owner, repo } = await req.json();
    const lastMessage = messages[messages.length - 1];
    
    // Convert previous messages to the format expected by getGroqResponse
    const previousMessages = messages
      .slice(0, -1) // Exclude the last message (current one)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      }));
    
    try {
      // Get response from Groq with repository context and conversation history
      const response = await getGroqResponse(
        lastMessage.content, 
        owner, 
        repo, 
        previousMessages
      );
      
      console.log(`Response for ${owner}/${repo}:`, response.substring(0, 100) + '...');
      
      return NextResponse.json({ response });
    } catch (error: any) {
      console.error(`Error getting response from Groq:`, error);
      
      // Check for token limit errors
      if (error?.status === 413 || (error?.message && error?.message.includes('too large'))) {
        return NextResponse.json({ 
          response: "The repository contains too much information to process at once. Please ask a more specific question about a particular aspect of the repository."
        });
      }
      
      return NextResponse.json({ 
        response: "An error occurred while processing your question. Please try again with a more specific question."
      });
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
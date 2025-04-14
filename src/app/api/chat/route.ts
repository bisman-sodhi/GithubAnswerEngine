import { NextResponse } from 'next/server';
import { getGroqResponse } from '@/app/utils/groqClient';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];
    
    // Get response from Groq
    const response = await getGroqResponse(lastMessage.content);
    console.log("response from groq: ", response);
    
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
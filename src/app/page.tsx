"use client";

import { useState, KeyboardEvent } from "react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
}

// Helper function to extract repo info from message
function extractRepoInfo(message: string): { owner: string; repo: string } | null {
  // Match patterns like "owner/repo" or "tell me about owner/repo"
  const repoPattern = /(?:^|\s)([a-zA-Z0-9-]+)\/([a-zA-Z0-9-._]+)(?:\s|$)/;
  const match = message.match(repoPattern);
  
  if (match) {
    return {
      owner: match[1],
      repo: match[2]
    };
  }
  return null;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [indexedRepos, setIndexedRepos] = useState<Set<string>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create a new user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user"
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const repoInfo = extractRepoInfo(userMessage.content);
      
      // If this is a new repository mentioned, index it first
      if (repoInfo && !indexedRepos.has(`${repoInfo.owner}/${repoInfo.repo}`)) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: `Indexing repository ${repoInfo.owner}/${repoInfo.repo}...`,
          role: "assistant"
        }]);

        // Index the repository
        const indexResponse = await fetch('/api/index-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(repoInfo)
        });

        if (!indexResponse.ok) {
          throw new Error('Failed to index repository');
        }

        setIndexedRepos(prev => new Set(prev).add(`${repoInfo.owner}/${repoInfo.repo}`));
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: `Repository indexed successfully! Now answering your question...`,
          role: "assistant"
        }]);
      }

      // Get answer from API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant's response
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant"
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: "Sorry, I encountered an error. Please try again.",
        role: "assistant"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSubmit(e);
      }
    }
  };

  const exampleQuestions = [
    {
      title: "Tell me about",
      subtitle: "facebook/react"
    },
    {
      title: "What is the purpose of",
      subtitle: "vercel/next.js"
    },
    {
      title: "Explain the architecture of",
      subtitle: "kubernetes/kubernetes"
    },
    {
      title: "What are the main features of",
      subtitle: "openai/openai-python"
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <h1 className="text-3xl font-semibold text-white">Hello there!</h1>
            <p className="text-xl text-gray-400">How can I help you today?</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mt-8">
              {exampleQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    setInput(q.title + " " + q.subtitle);
                  }}
                  className="text-left p-4 rounded-xl bg-[#1a1a1a] hover:bg-[#222] transition-colors"
                >
                  <p className="text-white">{q.title}</p>
                  <p className="text-gray-400">{q.subtitle}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              {message.role === "user" ? (
                <div className="max-w-[70%] rounded-2xl p-3 bg-[#2A2A2A] text-[#E6E6E6] rounded-br-none">
                  {message.content}
                </div>
              ) : (
                <div className="max-w-[70%] text-[#E6E6E6] px-1">
                  {message.content}
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] text-[#E6E6E6] px-1">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="bg-[#1a1a1a] border-t border-gray-800">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4">
          <div className="relative flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                rows={1}
                className="w-full p-4 pr-14 bg-[#1a1a1a] text-white rounded-xl focus:outline-none transition-all placeholder-gray-500 resize-none"
                style={{
                  height: 'auto',
                  minHeight: '56px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />
            </div>
            <button
              type="submit"
              className="absolute right-3 bottom-3 p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!input.trim() || isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 -rotate-90">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

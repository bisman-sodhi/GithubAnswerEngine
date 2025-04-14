import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { VectorStore } from './vectorStore';
import { GitHubClient } from './githubClient';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = "llama-3.3-70b-versatile";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const vectorStore = new VectorStore();

export async function getGroqResponse(message: string): Promise<string> {
  try {
    // Get relevant context from vector store
    const context = await vectorStore.queryDocuments(message, 5);
    
    if (context.documents.length === 0) {
      return "I don't have enough context about this repository yet. Please try indexing the repository first using the indexRepository function.";
    }

    const systemPrompt = `You are a GitHub repository expert. Use the following context from the repository to answer the user's question. 
    If the context doesn't contain enough information to answer the question, say so. 
    If you can answer based on the context, provide a clear and concise response.
    
    Context:
    ${context.documents.join('\n\n')}
    
    Question: ${message}`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0]?.message.content || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Error while processing query:", error);
    return "An error occurred while processing your question. Please try again.";
  }
}

// Add function to index a repository
export async function indexRepository(owner: string, repo: string) {
  const github = new GitHubClient();
  
  const RELEVANT_EXTENSIONS = new Set([
    '.py', '.js', '.tsx', '.jsx', '.ipynb', '.java', '.cpp', '.ts', 
    '.go', '.rs', '.vue', '.swift', '.c', '.h', '.md', '.txt', '.json',
    '.yaml', '.yml', '.sh', '.bash', '.zsh', '.fish', '.rb', '.php'
  ]);

  const IGNORED_DIRS = new Set([
    'node_modules', 'venv', 'env', 'dist', 'build', '.git', '__pycache__',
    '.next', '.vscode', 'vendor', 'coverage', '.github', '.circleci',
    '.travis', 'docs', 'examples', 'test', 'tests', 'spec', 'specs'
  ]);

  async function processContent(path: string = '') {
    const content = await github.getRepositoryContent(owner, repo, path);
    
    for (const item of content) {
      if (item.type === 'file') {
        const ext = item.path.split('.').pop()?.toLowerCase();
        if (ext && RELEVANT_EXTENSIONS.has(`.${ext}`)) {
          try {
            const fileContent = await github.getFileContent(owner, repo, item.path);
            await vectorStore.storeDocument(fileContent, {
              path: item.path,
              owner,
              repo,
              type: 'file',
              extension: ext
            });
          } catch (error) {
            console.error(`Error processing file ${item.path}:`, error);
          }
        }
      } else if (item.type === 'dir' && !IGNORED_DIRS.has(item.name)) {
        await processContent(item.path);
      }
    }
  }

  try {
    console.log(`Indexing repository ${owner}/${repo}...`);
    await processContent();
    console.log('Repository indexed successfully!');
  } catch (error) {
    console.error('Error indexing repository:', error);
    throw error;
  }
}



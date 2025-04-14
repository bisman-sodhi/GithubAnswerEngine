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

interface EnhancedContext {
  fileReferences?: string[];
  intent?: string;
}

export async function getGroqResponse(
  message: string,
  owner?: string,
  repo?: string,
  previousMessages: Array<{ role: string; content: string }> = [],
  enhancedContext: EnhancedContext = {}
): Promise<string> {
  try {
    // Determine the namespace if owner and repo are provided
    const namespace = owner && repo ? `${owner}/${repo}` : undefined;
    
    console.log(`Processing query for repository: ${namespace || 'unknown'}`);
    
    const commonExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.php', '.rb', '.html', '.css', '.json'];
    let potentialFiles: string[] = [];
    
    // Extract words that might be filenames
    const words = message.split(/\s+/);
    words.forEach(word => {
      // Clean the word of punctuation
      const cleanWord = word.replace(/[.,?!;:(){}[\]]/g, '');
      
      // Check if it looks like a filename (contains a dot and extension)
      if (cleanWord.includes('.')) {
        const ext = '.' + cleanWord.split('.').pop()?.toLowerCase();
        if (commonExtensions.includes(ext)) {
          potentialFiles.push(cleanWord);
        }
      }
    });
    
    // Also check for specific filenames that might not have been caught
    const specificFilesToCheck = ['page.tsx', 'index.tsx', 'app.tsx'];
    specificFilesToCheck.forEach(filename => {
      if (message.toLowerCase().includes(filename.toLowerCase()) && 
          !potentialFiles.includes(filename)) {
        potentialFiles.push(filename);
      }
    });
    
    // Also check if there are references to common file types or patterns
    const fileReferences = ['file', 'script', 'component', 'module', 'page', 'class', 'function'];
    const containsFileReference = fileReferences.some(ref => message.toLowerCase().includes(ref));
    
    // Create query enhancements based on analysis
    let enhancedQuery = message;
    if (potentialFiles.length > 0) {
      // Add the most likely filename to the query
      const filename = potentialFiles[0];
      console.log(`Detected potential filename: ${filename}`);
      
      // For page.tsx, make the query even more specific
      if (filename.toLowerCase() === 'page.tsx') {
        // Try different query formulations to maximize chance of finding the file
        enhancedQuery = `${message} "page.tsx" filename:page.tsx path:page.tsx file:page.tsx`;
      } else {
        enhancedQuery = `${message} filename:${filename}`;
      }
    } else if (containsFileReference) {
      // If no specific file but talking about files, enhance the query slightly
      console.log('Query contains references to files or code structures');
      enhancedQuery = `${message} code structure implementation`;
    }
    
    // Get relevant context from vector store with namespace
    const result = await vectorStore.queryDocuments(enhancedQuery, 15, namespace);
    
    if (result.documents.length === 0) {
      return "I don't have enough context about this repository yet. Please try indexing the repository first using the indexRepository function.";
    }

    // Format the context with file information but limit to prevent token overflow
    const sortedMatches = [...result.matches].sort((a, b) => {
        // Complex sorting logic for matches
        // Prioritizes:
        // 1. Exact file matches
        // 2. Path matches
        // 3. Documentation
        // 4. Important files
        // 5. UI files
        // 6. Score-based ranking
      
      // If we detected potential filenames, prioritize those matches
      if (potentialFiles.length > 0) {
        for (const file of potentialFiles) {
          const aMatches = typeof a.metadata?.filename === 'string' && 
                         a.metadata.filename.toLowerCase() === file.toLowerCase();
          const bMatches = typeof b.metadata?.filename === 'string' && 
                         b.metadata.filename.toLowerCase() === file.toLowerCase();
          
          if (aMatches && !bMatches) return -1;
          if (!aMatches && bMatches) return 1;
          
          // Also check for partial path matches
          const aHasFile = typeof a.metadata?.path === 'string' && 
                        a.metadata.path.toLowerCase().includes(file.toLowerCase());
          const bHasFile = typeof b.metadata?.path === 'string' && 
                        b.metadata.path.toLowerCase().includes(file.toLowerCase());
          
          if (aHasFile && !bHasFile) return -1;
          if (!aHasFile && bHasFile) return 1;
        }
      }
      
      // If potentialFiles includes page.tsx, specifically check for page.tsx file
      if (potentialFiles.some(file => file.toLowerCase() === 'page.tsx')) {
        const aIsPageTsx = typeof a.metadata?.filename === 'string' && 
                          a.metadata.filename.toLowerCase() === 'page.tsx';
        const bIsPageTsx = typeof b.metadata?.filename === 'string' && 
                          b.metadata.filename.toLowerCase() === 'page.tsx';
        
        if (aIsPageTsx && !bIsPageTsx) return -1;
        if (!aIsPageTsx && bIsPageTsx) return 1;
      }
      
      // Prioritize documentation and important files
      if (a.metadata?.isDocumentation && !b.metadata?.isDocumentation) return -1;
      if (!a.metadata?.isDocumentation && b.metadata?.isDocumentation) return 1;
      if (a.metadata?.isImportant && !b.metadata?.isImportant) return -1;
      if (!a.metadata?.isImportant && b.metadata?.isImportant) return 1;
      if (a.metadata?.isUIFile && !b.metadata?.isUIFile) return -1;
      if (!a.metadata?.isUIFile && b.metadata?.isUIFile) return 1;
      
      // Then by score
      return (b.score || 0) - (a.score || 0);
    });

    // Take enough files to answer the question, prioritizing the most relevant ones
    const selectedMatches = sortedMatches.slice(0, 8);
    
    // Format context with limited content (to reduce token count)
    const contextItems = selectedMatches.map((match, index) => {
      const meta = match.metadata;
      // Limit content length to reduce token count
      const content = meta?.content || meta?.preview || 'No content available';
      const truncatedContent = typeof content === 'string' && content.length > 1000 ? 
                               content.substring(0, 1000) + '...' : 
                               content;
      
      // Format with more file info
      return `[${index + 1}] File: ${meta?.path || 'unknown'} (score: ${match.score?.toFixed(2) || 'n/a'})
Type: ${meta?.extension || 'unknown'} file${meta?.isUIFile ? ', UI Component' : ''}${meta?.isDocumentation ? ', Documentation' : ''}
${truncatedContent}`;
    });

    // Create a more targeted system prompt based on the query
    let systemPromptPrefix = `You are a Senior Software Engineer which 10 years of programming and working with github experience. You are an expert analyzing the "${owner}/${repo}" repository. `;
    
    if (potentialFiles.length > 0) {
      systemPromptPrefix += `The user is asking specifically about the '${potentialFiles[0]}' file. Focus your answer on explaining what this file does, its purpose in the codebase, and its functionality.`;
    } else if (containsFileReference) {
      systemPromptPrefix += `The user is asking about code structure, files, or implementation details. Focus on explaining how the code is organized, what the key files do, and how they work together.`;
    } else {
      systemPromptPrefix += `Your task is to analyze the repository's code and documentation to answer questions about its purpose, architecture, and implementation details.`;
    }

    let systemPrompt = `You are a helpful AI assistant that helps users understand code in GitHub repositories.

    Available context from the repository files:
    ${contextItems.join('\n\n')}

    Guidelines:
    1. Focus on the specific details from the provided file contents
    2. Answer questions about code structure, entry points, and implementation details using the context
    3. If asked about specific files, reference them by name and explain their purpose and location
    4. If the context doesn't contain the specific information needed, say so clearly
    5. Prioritize information from documentation files, but also use code context when appropriate
    6. Be precise about file paths and function names
    7. Remember previous messages in the conversation for context
    8. Only reference files that actually exist in the repository
    9. If you're unsure about a file's existence, check the provided context first
    10. When making suggestions, only suggest files that are present in the context`;

    // Add file references to context if available
    if (enhancedContext.fileReferences?.length) {
      const fileContext = enhancedContext.fileReferences
        .map(file => `- ${file}`)
        .join('\n');
      systemPrompt += `\nRelevant files:\n${fileContext}`;
    }

    // Add intent to context if available
    if (enhancedContext.intent) {
      systemPrompt += `\nUser intent: ${enhancedContext.intent}`;
    }

    // Build the messages array with conversation history
    const conversationMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];
    
    // Add previous conversation messages if available
    if (previousMessages && previousMessages.length > 0) {
      // Filter to include only the last 4 messages to avoid token limits
      const recentMessages = previousMessages.slice(-4);
      conversationMessages.push(...recentMessages as ChatMessage[]);
    }
    
    // Add the current user message
    conversationMessages.push({ role: "user", content: message });

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: conversationMessages,
      temperature: 0.2, // Lower temperature for more precise answers
      max_tokens: 1000  // Reduced token limit to ensure response fits
    });

    return response.choices[0]?.message.content || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Error while processing query:", error);
    return "An error occurred while processing your question. Please try again.";
  }
}

// Function to check if a repository is already indexed in Pinecone
async function isRepositoryIndexed(owner: string, repo: string): Promise<boolean> {
  try {
    const namespace = `${owner}/${repo}`;
    console.log(`Checking if repository ${namespace} is already indexed...`);
    
    // Try to fetch repository metadata
    const metadataResult = await vectorStore.queryDocuments('repository metadata', 1, namespace);
    
    // If we find documents in this namespace, consider it indexed
    if (metadataResult.documents.length > 0) {
      return true;
    }
    
    // As a fallback, try to search for common files that should be indexed
    // This helps when the metadata file wasn't properly saved
    const commonFiles = ['README.md', 'package.json', 'page.tsx', 'index.js', 'index.tsx'];
    
    for (const filename of commonFiles) {
      const fileResult = await vectorStore.queryDocuments(`filename:${filename}`, 1, namespace);
      if (fileResult.documents.length > 0) {
        console.log(`Found ${filename} in the repository, considering it indexed`);
        return true;
      }
    }
    
    console.log(`No documents found in namespace ${namespace}, repository not indexed`);
    return false;
  } catch (error) {
    console.error(`Error checking if repository is indexed:`, error);
    return false;
  }
}

// Add function to index a repository
export async function indexRepository(owner: string, repo: string) {
  try {
    // Check if already indexed
    const alreadyIndexed = await isRepositoryIndexed(owner, repo);
    if (alreadyIndexed) {
      console.log(`Repository ${owner}/${repo} is already indexed, skipping...`);
      return {
        success: true,
        alreadyIndexed: true,
        stats: {
          total: 0,
          indexed: 0,
          errors: 0
        }
      };
    }
    
    // Continue with indexing if not already indexed
    const github = new GitHubClient();
  
    const RELEVANT_EXTENSIONS = new Set([
      '.md', '.txt', '.rst', '.adoc', // Documentation files
      '.py', '.js', '.tsx', '.jsx', '.ipynb', '.java', '.cpp', '.ts', 
      '.go', '.rs', '.vue', '.swift', '.c', '.h', '.json',
      '.yaml', '.yml', '.sh', '.bash', '.zsh', '.fish', '.rb', '.php'
    ]);

    const DOCUMENTATION_FILES = new Set([
      'README.md', 'README', 'CONTRIBUTING.md', 'CONTRIBUTING',
      'LICENSE', 'LICENSE.md', 'CHANGELOG.md', 'CHANGELOG',
      'docs/README.md', 'docs/index.md'
    ]);

    const IMPORTANT_FILES = new Set([
      'package.json', 'setup.py', 'Cargo.toml', 'go.mod',
      'Gemfile', 'requirements.txt', 'composer.json', 'build.gradle',
      'pom.xml', 'Dockerfile', 'docker-compose.yml', '.env.example',
      'Makefile', 'CMakeLists.txt', 'tsconfig.json', 'webpack.config.js',
      'vite.config.js', 'next.config.js', 'app.py', 'main.py',
      'index.js', 'main.ts', 'index.tsx', 'main.rs', 'main.go', 'Main.java',
      'page.tsx', 'app.tsx', 'index.html'
    ]);

    const UI_FILES = new Set([
      'page.tsx', 'Page.tsx', 'index.tsx', 'Index.tsx',
      'app.tsx', 'App.tsx', 'layout.tsx', 'Layout.tsx'
    ]);

    const IGNORED_DIRS = new Set([
      'node_modules', 'venv', 'env', 'dist', 'build', '.git', '__pycache__',
      '.next', '.vscode', 'vendor', 'coverage', '.circleci',
      '.travis', 'test', 'tests', 'spec', 'specs'
    ]);

    // Track files that might be entry points
    interface EntryPointCandidate {
      path: string;
      isImportant: boolean;
      extension: string | undefined;
    }
    
    const entryPointCandidates: EntryPointCandidate[] = [];
    const pageFiles: string[] = [];
    
    // Statistics for logging
    let totalFiles = 0;
    let indexedFiles = 0;
    let errors = 0;

    // Process the repository recursively
    async function processContent(path: string = '') {
      try {
        const content = await github.getRepositoryContent(owner, repo, path);
        
        for (const item of content) {
          if (item.type === 'file') {
            totalFiles++;
            const fileName = item.path.split('/').pop() || '';
            const ext = item.path.split('.').pop()?.toLowerCase();
            
            const isDocumentation = DOCUMENTATION_FILES.has(fileName);
            const isImportant = IMPORTANT_FILES.has(fileName);
            const isUIFile = UI_FILES.has(fileName);
            const hasRelevantExt = ext && RELEVANT_EXTENSIONS.has(`.${ext}`);
            
            // Track UI files specifically
            if (fileName === 'page.tsx' || isUIFile) {
              pageFiles.push(item.path);
              console.log(`Found UI file: ${item.path}`);
            }
            
            // Process all documentation, important files, and files with relevant extensions
            if (isDocumentation || isImportant || isUIFile || hasRelevantExt) {
              try {
                const fileContent = await github.getFileContent(owner, repo, item.path);
                
                // Track potential entry points
                if (isImportant || fileName.match(/^(index|main|app|page)\.(js|py|ts|tsx|go|java|rs)$/i)) {
                  entryPointCandidates.push({
                    path: item.path,
                    isImportant: isImportant,
                    extension: ext
                  });
                }
                
                // Store file with enhanced metadata
                await vectorStore.storeDocument(fileContent, {
                  path: item.path,
                  filename: fileName,
                  owner,
                  repo,
                  type: 'file',
                  extension: ext,
                  isDocumentation,
                  isImportant,
                  isUIFile,
                  directoryPath: item.path.replace(fileName, '')
                });
                
                indexedFiles++;
              } catch (error) {
                console.error(`Error processing file ${item.path}:`, error);
                errors++;
              }
            }
          } else if (item.type === 'dir' && !IGNORED_DIRS.has(item.name)) {
            // Don't ignore docs directory since it may contain important documentation
            if (item.name === 'docs' || item.name === 'app' || item.name === 'pages' || !item.name.startsWith('.')) {
              await processContent(item.path);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing directory ${path}:`, error);
        errors++;
      }
    }

    console.log(`Indexing repository ${owner}/${repo}...`);
    await processContent();
    
    console.log(`Repository indexed: ${indexedFiles}/${totalFiles} files processed, ${errors} errors`);
    console.log(`Entry point candidates: ${entryPointCandidates.map(e => e.path).join(', ')}`);
    console.log(`Page/UI files found: ${pageFiles.join(', ')}`);
    
    // Store repo metadata with entry point candidates and UI files
    await vectorStore.storeDocument(
      `Repository: ${owner}/${repo}\n` +
      `Entry Point Candidates: ${entryPointCandidates.map(e => e.path).join(', ')}\n` +
      `UI Files: ${pageFiles.join(', ')}`,
      {
        path: '_repo_metadata',
        filename: '_repo_metadata',
        owner,
        repo,
        type: 'metadata',
        isDocumentation: true,
        isImportant: true,
        entryPoints: entryPointCandidates,
        uiFiles: pageFiles
      }
    );
    
    return {
      success: true,
      stats: {
        total: totalFiles,
        indexed: indexedFiles,
        errors
      },
      entryPointCandidates,
      pageFiles
    };
  } catch (error) {
    console.error('Error indexing repository:', error);
    throw error;
  }
}



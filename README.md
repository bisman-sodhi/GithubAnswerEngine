# GitHub Repository Answer Engine

A powerful AI-powered chat application for exploring and understanding GitHub repositories. This tool allows users to ask questions about any GitHub repository and receive detailed, context-aware answers based on the repository's code and documentation.

## Features

- **Repository Indexing**: Automatically indexes GitHub repositories to understand their structure and content
- **Semantic Search**: Uses vector embeddings to find the most relevant files and code snippets
- **Smart Context Selection**: Prioritizes relevant files based on the query's intent
- **File-Aware Responses**: Specialized handling for queries about specific files or code structures
- **Context Persistence**: Maintains conversation history for better follow-up questions
- **Advanced LLM Integration**: Uses Groq's Llama-3.3-70b-versatile model for high-quality responses

## How It Works

1. **Repository Analysis**: When a user mentions a GitHub repository, the system automatically indexes it
2. **Vector Storage**: Code and documentation are embedded and stored in Pinecone
3. **Contextual Retrieval**: User queries trigger semantic search to find relevant context
4. **Intelligent Responses**: The LLM receives carefully selected context to generate accurate answers

## Tech Stack

- **Frontend**: Next.js with React and TypeScript
- **Vector Database**: Pinecone for efficient semantic search
- **LLM Provider**: Groq API (Llama-3.3-70b-versatile model)
- **GitHub Integration**: Octokit for repository access
- **Embeddings**: Integration with embedding models for semantic search

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Pinecone - for vector storage
PINECONE_API_KEY=your_pinecone_api_key

# GitHub - for repository access
GITHUB_TOKEN=your_github_personal_access_token

# Groq - for LLM access
GROQ_API_KEY=your_groq_api_key
```

## Deployment Instructions

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- GitHub Personal Access Token
- Pinecone API Key (Free tier works for testing)
- Groq API Key

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/bisman-sodhi/github-answer-engine.git
   cd github-answer-engine
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up your environment variables by creating a `.env` file (see Environment Setup above)

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to see the application

### Production Deployment

#### Deploy on Vercel (Recommended)

1. Push your code to a GitHub repository

2. Visit [Vercel](https://vercel.com/new) and import your GitHub repository

3. Add the environment variables in the Vercel project settings

4. Deploy with the default settings

#### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   # or
   yarn build
   ```

2. Start the production server:
   ```bash
   npm start
   # or
   yarn start
   ```

## Usage

1. Visit the application in your browser
2. Enter a GitHub repository in the format `owner/repo` (e.g., "facebook/react")
3. Ask specific questions about the repository such as:
   - "What is the purpose of this repository?"
   - "How is the code structured?"
   - "What does page.tsx do?"
   - "Show me the main entry point"

The system will automatically index the repository (if needed) and provide detailed answers based on the actual code.

## License

MIT

---

This project was built with [Next.js](https://nextjs.org/) and bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

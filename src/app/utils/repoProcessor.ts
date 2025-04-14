// src/app/utils/repositoryProcessor.ts
import { GitHubClient } from './githubClient';
import { EmbeddingClient } from './embeddingClient';
import { VectorStore } from './vectorStore';
import { RestEndpointMethodTypes } from '@octokit/rest';

type GitHubContent = RestEndpointMethodTypes['repos']['getContent']['response']['data'];

export async function processRepository(owner: string, repo: string) {
  const github = new GitHubClient();
  const embedder = new EmbeddingClient();
  const vectorStore = new VectorStore();

  async function processFile(path: string) {
    const content = await github.getFileContent(owner, repo, path);
    const embedding = await embedder.generateEmbedding(content);
    
    await vectorStore.storeDocument(content, {
      owner,
      repo,
      path,
      content,
    });
  }

  // Get repository structure
  const response = await github.getRepositoryContent(owner, repo);
  const files = Array.isArray(response) ? response : [response];
  
  for (const file of files) {
    if (file.type === 'file') {
      await processFile(file.path);
    }
  }
}
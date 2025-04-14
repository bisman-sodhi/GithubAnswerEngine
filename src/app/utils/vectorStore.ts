import { Pinecone } from '@pinecone-database/pinecone';
import { EmbeddingClient } from './embeddingClient';

const MAX_METADATA_SIZE = 40000; // Slightly under Pinecone's 40KB limit

function truncateContent(content: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(content).length > MAX_METADATA_SIZE) {
    return content.slice(0, Math.floor(MAX_METADATA_SIZE / 2)) + "...";
  }
  return content;
}

export class VectorStore {
  private client: Pinecone;
  private indexName: string;
  private embedder: EmbeddingClient;

  constructor() {
    this.client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
    this.indexName = 'github-repos';
    this.embedder = new EmbeddingClient();
  }

  async storeDocument(document: string, metadata: any) {
    const embeddings = await this.embedder.generateEmbedding(document);
    const index = this.client.Index(this.indexName);

    // Store only essential metadata and truncated content
    const safeMetadata = {
      owner: metadata.owner,
      repo: metadata.repo,
      path: metadata.path,
      preview: truncateContent(document.slice(0, 1000)) // Store just the first 1000 chars as preview
    };

    await index.upsert([{
      id: metadata.path,
      values: embeddings,
      metadata: safeMetadata
    }]);
  }

  async queryDocuments(query: string, topK: number = 5) {
    const queryEmbedding = await this.embedder.generateEmbedding(query);
    const index = this.client.Index(this.indexName);
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });
    
    return {
      documents: results.matches?.map(match => match.metadata?.content || '').filter(Boolean) || []
    };
  }

  // Lower-level methods for direct vector operations if needed
  async upsertVectors(vectors: { id: string; values: number[]; metadata: any }[]) {
    const index = this.client.Index(this.indexName);
    await index.upsert(vectors);
  }

  async queryVectors(queryVector: number[], topK: number = 5) {
    const index = this.client.Index(this.indexName);
    return await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true
    });
  }
} 
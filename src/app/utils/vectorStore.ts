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
  private namespace: string;
  private embedder: EmbeddingClient;

  constructor() {
    this.client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
    this.indexName = 'github-repos';
    this.namespace = '';
    this.embedder = new EmbeddingClient();
  }

  async storeDocument(document: string, metadata: any) {
    const embeddings = await this.embedder.generateEmbedding(document);
    const index = this.client.Index(this.indexName);
    const namespace = this.namespace || `${metadata.owner}/${metadata.repo}`;
    
    // Store only essential metadata and truncated content
    const safeMetadata = {
      owner: metadata.owner,
      repo: metadata.repo,
      path: metadata.path,
      type: metadata.type || 'file',
      extension: metadata.extension || '',
      isDocumentation: metadata.isDocumentation || false,
      content: truncateContent(document), // Store the full content (truncated if needed)
      preview: truncateContent(document.slice(0, 1000)) // Store just the first 1000 chars as preview
    };

    // Upsert using the Pinecone v5 format
    await index.namespace(namespace).upsert([{
      id: `${metadata.path}`,
      values: embeddings,
      metadata: safeMetadata
    }]);
  }

  async queryDocuments(query: string, topK: number = 10, namespace?: string) {
    const queryEmbedding = await this.embedder.generateEmbedding(query);
    const index = this.client.Index(this.indexName);
    
    // Use provided namespace or default namespace
    const nsToUse = namespace || this.namespace || '';
    
    console.log(`Querying namespace: ${nsToUse} for: ${query.substring(0, 50)}...`);
    
    const results = await index.namespace(nsToUse).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });
    
    console.log(`Found ${results.matches?.length || 0} matches`);
    
    return {
      matches: results.matches || [],
      documents: results.matches?.map(match => match.metadata?.content || match.metadata?.preview || '').filter(Boolean) || []
    };
  }

  // Lower-level methods for direct vector operations if needed
  async upsertVectors(vectors: { id: string; values: number[]; metadata: any }[], namespace?: string) {
    const index = this.client.Index(this.indexName);
    const nsToUse = namespace || this.namespace || '';
    
    await index.namespace(nsToUse).upsert(vectors);
  }
  
  async queryVectors(queryVector: number[], topK: number = 5, namespace?: string) {
    const index = this.client.Index(this.indexName);
    const nsToUse = namespace || this.namespace || '';
    
    return await index.namespace(nsToUse).query({
      vector: queryVector,
      topK,
      includeMetadata: true
    });
  }
} 
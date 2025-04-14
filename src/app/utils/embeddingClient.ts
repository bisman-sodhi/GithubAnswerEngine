// src/app/utils/embeddingClient.ts
import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import path from 'path';

export class EmbeddingClient {
  private embedder: FeatureExtractionPipeline | null = null;
  private modelName = 'Xenova/all-mpnet-base-v2';

  private async initializeEmbedder() {
    if (!this.embedder) {
      // Use process.cwd() to get the correct path in Vercel's serverless environment
      const cacheDir = path.join(process.cwd(), 'public', 'models');
      
      this.embedder = await pipeline('feature-extraction', this.modelName, {
        revision: 'main',
        cache_dir: cacheDir,
        local_files_only: false,
        progress_callback: undefined,
      });
    }
    return this.embedder;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embedder = await this.initializeEmbedder();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }
}
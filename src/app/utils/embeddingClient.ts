// src/app/utils/embeddingClient.ts
import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

export class EmbeddingClient {
  private embedder: FeatureExtractionPipeline | null = null;
  private modelName = 'Xenova/all-mpnet-base-v2';

  private async initializeEmbedder() {
    if (!this.embedder) {
      this.embedder = await pipeline('feature-extraction', this.modelName, {
        revision: 'main',
        cache_dir: undefined, // Disable disk caching
        local_files_only: true, // Only use files that are already downloaded
        progress_callback: undefined, // Disable progress callbacks
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
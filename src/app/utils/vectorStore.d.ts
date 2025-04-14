export declare class VectorStore {
    constructor();
    storeDocument(document: string, metadata: any): Promise<void>;
    queryDocuments(query: string, topK?: number): Promise<{ documents: string[] }>;
    upsertVectors(vectors: { id: string; values: number[]; metadata: any }[]): Promise<void>;
    queryVectors(queryVector: number[], topK?: number): Promise<any>;
} 
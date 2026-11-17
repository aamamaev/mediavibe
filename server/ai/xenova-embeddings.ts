import { pipeline, env } from "@xenova/transformers";

env.cacheDir = "./.cache/transformers";
env.allowLocalModels = false;

class XenovaEmbeddingService {
  private embedder: any = null;
  private modelName = "Xenova/multilingual-e5-small";
  private initPromise: Promise<void> | null = null;

  private async ensureInitialized(): Promise<void> {
    if (this.embedder) return;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        console.log(`[XenovaEmbedding] Loading model ${this.modelName}...`);
        this.embedder = await pipeline("feature-extraction", this.modelName, {
          quantized: true
        });
        console.log(`[XenovaEmbedding] Model loaded successfully`);
      })();
    }
    
    await this.initPromise;
  }

  async getEmbedding(text: string): Promise<number[]> {
    await this.ensureInitialized();
    
    const output = await this.embedder(text, {
      pooling: "mean",
      normalize: true
    });
    
    return Array.from(output.data as Float32Array).slice(0, 384);
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await this.getEmbedding(text));
    }
    return embeddings;
  }
}

export const xenovaEmbedding = new XenovaEmbeddingService();

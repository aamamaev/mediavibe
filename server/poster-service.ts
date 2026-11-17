import { getPosterPresignedUrl } from "./s3-client";
import type { Movie } from "@shared/schema";

export interface PosterResult {
  url: string;
  source: 's3' | 'fallback' | 'placeholder';
  expiresAt: Date | null;
}

interface CacheEntry {
  url: string;
  expiresAt: Date;
}

const CACHE_TTL_MS = 55 * 60 * 1000;
const PLACEHOLDER_URL = '/images/poster-placeholder.svg';

class PosterService {
  private urlCache: Map<string, CacheEntry> = new Map();

  async getPosterUrl(movie: Movie): Promise<PosterResult> {
    // Priority 1: Use poster_url from database (fastest)
    if (movie.posterUrl) {
      return { url: movie.posterUrl, source: 'fallback', expiresAt: null };
    }

    // Priority 2: Use S3 presigned URL (with existence check)
    if (movie.s3PosterKey) {
      const cached = this.urlCache.get(movie.fid);
      if (cached && cached.expiresAt > new Date()) {
        return { url: cached.url, source: 's3', expiresAt: cached.expiresAt };
      }

      try {
        const url = await getPosterPresignedUrl(movie.fid);
        if (url) {
          const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
          this.urlCache.set(movie.fid, { url, expiresAt });
          return { url, source: 's3', expiresAt };
        }
      } catch (error) {
        console.warn(`S3 poster not available for ${movie.fid}:`, error);
      }
    }

    // Priority 3: Placeholder with movie title
    return { 
      url: `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`, 
      source: 'placeholder', 
      expiresAt: null 
    };
  }

  async getPosterUrlById(fid: string, posterUrl: string | null, s3PosterKey: string | null, title: string = ''): Promise<PosterResult> {
    // Priority 1: Use poster_url from database (fastest)
    if (posterUrl) {
      return { url: posterUrl, source: 'fallback', expiresAt: null };
    }

    // Priority 2: Use S3 presigned URL (with existence check)
    if (s3PosterKey) {
      const cached = this.urlCache.get(fid);
      if (cached && cached.expiresAt > new Date()) {
        return { url: cached.url, source: 's3', expiresAt: cached.expiresAt };
      }

      try {
        const url = await getPosterPresignedUrl(fid);
        if (url) {
          const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
          this.urlCache.set(fid, { url, expiresAt });
          return { url, source: 's3', expiresAt };
        }
      } catch (error) {
        console.warn(`S3 poster not available for ${fid}:`, error);
      }
    }

    // Priority 3: Placeholder with movie title
    return { 
      url: `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(title || fid)}`, 
      source: 'placeholder', 
      expiresAt: null 
    };
  }

  clearCache(): void {
    this.urlCache.clear();
  }

  getCacheSize(): number {
    return this.urlCache.size;
  }

  pruneExpiredCache(): number {
    const now = new Date();
    let pruned = 0;
    const keys = Array.from(this.urlCache.keys());
    
    for (const key of keys) {
      const entry = this.urlCache.get(key);
      if (entry && entry.expiresAt <= now) {
        this.urlCache.delete(key);
        pruned++;
      }
    }
    
    return pruned;
  }

  async applyPosterUrls<T extends Movie>(movies: T[]): Promise<T[]> {
    return Promise.all(movies.map(async (movie) => {
      const result = await this.getPosterUrl(movie);
      return {
        ...movie,
        posterUrl: result.url,
      };
    }));
  }

  async applyPosterUrl<T extends Movie>(movie: T): Promise<T> {
    const result = await this.getPosterUrl(movie);
    return {
      ...movie,
      posterUrl: result.url,
    };
  }
}

export const posterService = new PosterService();

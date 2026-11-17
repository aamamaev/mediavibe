import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq } from "drizzle-orm";
import { movies, type InsertMovie } from "../shared/schema";
import { listJsonFiles, getJsonContent, checkPosterExists, S3Object } from "../server/s3-client";

const { Pool } = pg;

interface SyncOptions {
  mode: 'full' | 'incremental';
  dryRun: boolean;
  batchSize: number;
  concurrency: number;
}

interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: MovieSyncError[];
  duration: number;
}

interface MovieSyncError {
  fid: string;
  error: string;
  timestamp: Date;
}

interface MovieJson {
  fid: string;
  url?: string;
  parsed_at?: string;
  title?: string;
  kinopoisk_rating?: number;
  votes_count?: string;
  synopsis?: string;
  year?: string;
  country?: string;
  genre?: string;
  slogan?: string;
  director?: string;
  screenplay?: string;
  producer?: string;
  cinematographer?: string;
  composer?: string;
  art_director?: string;
  editor?: string;
  budget?: string;
  box_office_world?: string;
  premiere_russia?: string;
  premiere_world?: string;
  age_rating?: string;
  duration?: string;
  poster_url?: string;
}

function parseCliArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    mode: 'full',
    dryRun: false,
    batchSize: 20,
    concurrency: 5,
  };

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      const mode = arg.split('=')[1];
      if (mode === 'full' || mode === 'incremental') {
        options.mode = mode;
      }
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1], 10) || 20;
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = parseInt(arg.split('=')[1], 10) || 5;
    }
  }

  return options;
}

function extractTitleWithoutYear(rawTitle: string): string {
  const match = rawTitle.match(/^(.+?)\s*\(\d{4}\)$/);
  return match ? match[1].trim() : rawTitle;
}

function parseMinutes(durationText: string): number | null {
  if (!durationText) return null;
  
  let totalMinutes = 0;
  const hoursMatch = durationText.match(/(\d+)\s*ч/);
  const minutesMatch = durationText.match(/(\d+)\s*мин/);
  
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }
  
  return totalMinutes > 0 ? totalMinutes : null;
}

function parseVoteCount(votesText: string): number {
  if (!votesText) return 0;
  const cleaned = votesText.replace(/\s/g, '').replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function parseGenres(genreString: string): string[] {
  if (!genreString) return [];
  return genreString.split(',').map(g => g.trim()).filter(g => g.length > 0);
}

function mapJsonToMovie(json: MovieJson, hasPoster: boolean): InsertMovie {
  const parsedAt = json.parsed_at ? new Date(json.parsed_at.replace(' ', 'T')) : undefined;
  
  return {
    fid: json.fid,
    kinopoiskUrl: json.url || null,
    title: json.title ? extractTitleWithoutYear(json.title) : 'Unknown',
    year: json.year ? parseInt(json.year, 10) : new Date().getFullYear(),
    synopsis: json.synopsis || null,
    country: json.country || null,
    genres: json.genre ? parseGenres(json.genre) : null,
    slogan: json.slogan || null,
    director: json.director || null,
    screenplay: json.screenplay || null,
    producer: json.producer || null,
    cinematographer: json.cinematographer || null,
    composer: json.composer || null,
    artDirector: json.art_director || null,
    editor: json.editor || null,
    rating: json.kinopoisk_rating || null,
    voteCount: json.votes_count ? parseVoteCount(json.votes_count) : 0,
    votesCountText: json.votes_count || null,
    budget: json.budget || null,
    boxOffice: json.box_office_world || null,
    premiereRussia: json.premiere_russia || null,
    premiereWorld: json.premiere_world || null,
    ageRating: json.age_rating || null,
    durationText: json.duration || null,
    runtime: json.duration ? parseMinutes(json.duration) : null,
    posterUrl: json.poster_url || null,
    s3PosterKey: hasPoster ? `${json.fid}.jpg` : null,
    parsedAt: parsedAt || null,
  };
}

async function processMovieBatch(
  db: ReturnType<typeof drizzle>,
  files: S3Object[],
  existingMovies: Map<string, Date | null>,
  options: SyncOptions
): Promise<{ created: number; updated: number; skipped: number; errors: MovieSyncError[] }> {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as MovieSyncError[],
  };

  const promises = files.map(async (file) => {
    const fid = file.key.replace('.json', '');
    
    try {
      const jsonContent = await getJsonContent(file.key);
      const movieJson: MovieJson = JSON.parse(jsonContent);
      
      if (!movieJson.fid) {
        movieJson.fid = fid;
      }

      const existingUpdatedAt = existingMovies.get(movieJson.fid);
      const parsedAt = movieJson.parsed_at ? new Date(movieJson.parsed_at.replace(' ', 'T')) : null;

      if (options.mode === 'incremental' && existingUpdatedAt && parsedAt) {
        if (parsedAt <= existingUpdatedAt) {
          results.skipped++;
          console.log(`[SKIP] ${movieJson.fid}: No updates needed`);
          return;
        }
      }

      const hasPoster = await checkPosterExists(movieJson.fid);
      const movieData = mapJsonToMovie(movieJson, hasPoster);

      if (options.dryRun) {
        const action = existingMovies.has(movieJson.fid) ? 'UPDATE' : 'CREATE';
        console.log(`[DRY-RUN] Would ${action} movie: ${movieData.title} (${movieData.fid})`);
        if (action === 'UPDATE') {
          results.updated++;
        } else {
          results.created++;
        }
        return;
      }

      if (existingMovies.has(movieJson.fid)) {
        await db.update(movies)
          .set({
            ...movieData,
            updatedAt: new Date(),
          })
          .where(eq(movies.fid, movieJson.fid));
        results.updated++;
        console.log(`[UPDATE] ${movieData.title} (${movieData.fid})`);
      } else {
        await db.insert(movies).values(movieData);
        results.created++;
        console.log(`[CREATE] ${movieData.title} (${movieData.fid})`);
      }
    } catch (error: any) {
      results.errors.push({
        fid,
        error: error.message || String(error),
        timestamp: new Date(),
      });
      console.error(`[ERROR] ${fid}: ${error.message}`);
    }
  });

  await Promise.all(promises);
  return results;
}

async function loadExistingMovies(db: ReturnType<typeof drizzle>): Promise<Map<string, Date | null>> {
  const existing = await db.select({ fid: movies.fid, updatedAt: movies.updatedAt }).from(movies);
  const map = new Map<string, Date | null>();
  for (const row of existing) {
    map.set(row.fid, row.updatedAt);
  }
  return map;
}

async function sync(options: SyncOptions): Promise<SyncResult> {
  const startTime = Date.now();
  
  console.log('\n========================================');
  console.log('       MediaVibe Movie Sync Script');
  console.log('========================================\n');
  console.log(`Mode: ${options.mode}`);
  console.log(`Dry Run: ${options.dryRun}`);
  console.log(`Batch Size: ${options.batchSize}`);
  console.log(`Concurrency: ${options.concurrency}`);
  console.log('\n----------------------------------------\n');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!process.env.YANDEX_S3_ACCESS_KEY_ID || !process.env.YANDEX_S3_SECRET_ACCESS_KEY) {
    throw new Error('YANDEX_S3_ACCESS_KEY_ID and YANDEX_S3_SECRET_ACCESS_KEY are required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const result: SyncResult = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    duration: 0,
  };

  try {
    console.log('Loading existing movies from database...');
    const existingMovies = await loadExistingMovies(db);
    console.log(`Found ${existingMovies.size} existing movies\n`);

    console.log('Listing JSON files from S3...');
    const jsonFiles = await listJsonFiles();
    console.log(`Found ${jsonFiles.length} JSON files in bucket\n`);

    if (jsonFiles.length === 0) {
      console.log('No JSON files found. Nothing to sync.');
      return result;
    }

    for (let i = 0; i < jsonFiles.length; i += options.batchSize) {
      const batch = jsonFiles.slice(i, i + options.batchSize);
      const batchNum = Math.floor(i / options.batchSize) + 1;
      const totalBatches = Math.ceil(jsonFiles.length / options.batchSize);
      
      console.log(`\nProcessing batch ${batchNum}/${totalBatches} (${batch.length} files)...`);
      
      const batchResults = await processMovieBatch(db, batch, existingMovies, options);
      
      result.processed += batch.length;
      result.created += batchResults.created;
      result.updated += batchResults.updated;
      result.skipped += batchResults.skipped;
      result.errors.push(...batchResults.errors);
    }

  } finally {
    await pool.end();
  }

  result.duration = (Date.now() - startTime) / 1000;

  console.log('\n========================================');
  console.log('           SYNC COMPLETE');
  console.log('========================================\n');
  console.log(`Processed: ${result.processed}`);
  console.log(`Created:   ${result.created}`);
  console.log(`Updated:   ${result.updated}`);
  console.log(`Skipped:   ${result.skipped}`);
  console.log(`Errors:    ${result.errors.length}`);
  console.log(`Duration:  ${result.duration.toFixed(2)} seconds`);
  
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const err of result.errors) {
      console.log(`  - ${err.fid}: ${err.error}`);
    }
  }

  return result;
}

async function main() {
  try {
    const options = parseCliArgs();
    await sync(options);
    process.exit(0);
  } catch (error: any) {
    console.error('\nFATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();

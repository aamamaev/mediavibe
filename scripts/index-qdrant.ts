import { db } from "../server/db";
import { movies } from "../shared/schema";
import { ragService } from "../server/rag";

async function indexAllMoviesToQdrant() {
  console.log("Starting Qdrant indexing process...");

  try {
    console.log("Fetching all movies from database...");
    const allMovies = await db.select().from(movies);
    console.log(`Found ${allMovies.length} movies`);

    const movieDocuments = allMovies.map((m) => ({
      id: m.fid,
      title: m.title,
      titleEn: m.titleEn,
      synopsis: m.synopsis,
      genres: m.genres,
      director: m.director,
      cast: m.cast,
      year: m.year,
    }));

    console.log("Initializing RAG service...");
    await ragService.initialize();

    console.log("Starting indexing to Qdrant...");
    const startTime = Date.now();
    await ragService.indexMovies(movieDocuments);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`Indexing completed in ${duration.toFixed(2)} seconds`);

    const stats = await ragService.getCollectionStats();
    console.log("Collection stats:", stats);

    console.log("Testing search...");
    const testResults = await ragService.semanticSearch("комедия про семью", 5);
    console.log("Test search results:");
    testResults.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.metadata.title} (score: ${r.score.toFixed(4)})`);
    });

  } catch (error) {
    console.error("Indexing failed:", error);
    process.exit(1);
  }

  console.log("Done!");
  process.exit(0);
}

indexAllMoviesToQdrant();

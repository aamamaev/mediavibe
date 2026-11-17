import { db } from "../server/db";
import { movies } from "../shared/schema";
import { llamaIndexRAG } from "../server/ai/llamaindex-rag";

async function indexAllMovies() {
  console.log("=".repeat(60));
  console.log("Starting LlamaIndex + Qdrant indexing...");
  console.log("=".repeat(60));
  
  try {
    await llamaIndexRAG.initialize();

    const allMovies = await db.select().from(movies);
    console.log(`Found ${allMovies.length} movies in PostgreSQL`);

    if (allMovies.length === 0) {
      console.log("No movies found in database!");
      process.exit(1);
    }

    const startTime = Date.now();
    await llamaIndexRAG.indexMovies(allMovies);
    const duration = (Date.now() - startTime) / 1000;

    console.log("=".repeat(60));
    console.log(`Indexing completed in ${duration.toFixed(2)}s`);
    console.log("=".repeat(60));

    const stats = await llamaIndexRAG.getStats();
    console.log("Collection stats:", stats);

    console.log("\nRunning test search...");
    const testQueries = [
      "комедия про семью",
      "драма о войне",
      "научная фантастика"
    ];

    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`);
      const results = await llamaIndexRAG.semanticSearch(query, 3);
      results.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.metadata.title} (${r.metadata.year}) - score: ${r.score.toFixed(4)}`);
      });
    }

    console.log("\n=".repeat(60));
    console.log("Indexing and testing completed successfully!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("Error during indexing:", error);
    process.exit(1);
  }
}

indexAllMovies()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });

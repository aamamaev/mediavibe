const TEST_QUERIES = [
  "Брат Балабанова",
  "кровавая криминальная комедия",
  "мультики серьезные",
  "человек паук последний",
  "космическая сага",
  "про любовь и вампиров",
  "про вторую мировую войну детектив",
  "черная комедия про негров",
  "фентези лукьяненко",
  "напиши сортировку пузырьком"
];

interface StageDiagnostic {
  name: string;
  durationMs: number;
  details?: any;
}

interface Diagnostics {
  query: string;
  stages: StageDiagnostic[];
  totalDurationMs: number;
  ragResultCount: number;
  ragScores: number[];
  finalResultCount: number;
  reRankSuccess: boolean;
}

interface SearchResult {
  movies: Array<{ fid: string; title: string; aiExplanation?: string }>;
  summary: string;
  query: string;
  searchMethod: string;
  diagnostics: Diagnostics;
}

interface TestResult {
  query: string;
  success: boolean;
  error?: string;
  movieCount: number;
  movieTitles: string[];
  searchMethod: string;
  summary: string;
  diagnostics?: Diagnostics;
}

async function runSearch(query: string): Promise<SearchResult> {
  const response = await fetch("http://localhost:5000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, debug: true })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function printStageTiming(stages: StageDiagnostic[]): void {
  console.log("\n  Stage Timings:");
  for (const stage of stages) {
    const details = stage.details ? ` (${JSON.stringify(stage.details)})` : "";
    console.log(`    - ${stage.name}: ${formatDuration(stage.durationMs)}${details}`);
  }
}

async function runTests(): Promise<void> {
  console.log("=".repeat(80));
  console.log("MediaVibe Search Pipeline Test");
  console.log("=".repeat(80));
  console.log(`Running ${TEST_QUERIES.length} test queries...\n`);
  
  const results: TestResult[] = [];
  
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const query = TEST_QUERIES[i];
    console.log(`\n[${i + 1}/${TEST_QUERIES.length}] Query: "${query}"`);
    console.log("-".repeat(60));
    
    try {
      const searchResult = await runSearch(query);
      
      const result: TestResult = {
        query,
        success: true,
        movieCount: searchResult.movies.length,
        movieTitles: searchResult.movies.map(m => m.title),
        searchMethod: searchResult.searchMethod,
        summary: searchResult.summary,
        diagnostics: searchResult.diagnostics
      };
      
      console.log(`  Status: SUCCESS`);
      console.log(`  Method: ${searchResult.searchMethod}`);
      console.log(`  Results: ${searchResult.movies.length} movies`);
      console.log(`  Total Time: ${formatDuration(searchResult.diagnostics?.totalDurationMs || 0)}`);
      
      if (searchResult.diagnostics) {
        printStageTiming(searchResult.diagnostics.stages);
        console.log(`  Re-rank Success: ${searchResult.diagnostics.reRankSuccess}`);
        if (searchResult.diagnostics.ragScores.length > 0) {
          const avgScore = searchResult.diagnostics.ragScores.reduce((a, b) => a + b, 0) / searchResult.diagnostics.ragScores.length;
          console.log(`  RAG Avg Score: ${avgScore.toFixed(3)}`);
        }
      }
      
      console.log(`\n  Top 5 Movies:`);
      searchResult.movies.slice(0, 5).forEach((m, idx) => {
        console.log(`    ${idx + 1}. ${m.title}`);
      });
      
      if (searchResult.summary) {
        console.log(`\n  Summary: ${searchResult.summary.slice(0, 150)}...`);
      }
      
      results.push(result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  Status: FAILED`);
      console.log(`  Error: ${errorMessage}`);
      
      results.push({
        query,
        success: false,
        error: errorMessage,
        movieCount: 0,
        movieTitles: [],
        searchMethod: "error",
        summary: ""
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    const avgTime = successful
      .filter(r => r.diagnostics?.totalDurationMs)
      .reduce((sum, r) => sum + (r.diagnostics?.totalDurationMs || 0), 0) / successful.length;
    console.log(`Average Time: ${formatDuration(avgTime)}`);
    
    const rerankedCount = successful.filter(r => r.diagnostics?.reRankSuccess).length;
    console.log(`LLM Re-rank Success Rate: ${rerankedCount}/${successful.length} (${((rerankedCount / successful.length) * 100).toFixed(0)}%)`);
  }
  
  console.log("\n" + "-".repeat(80));
  console.log("DETAILED RESULTS TABLE");
  console.log("-".repeat(80));
  
  console.log("\n| # | Query | Status | Movies | Method | Total Time | RAG | AI Expl | Rerank | Summary |");
  console.log("|---|-------|--------|--------|--------|------------|-----|---------|--------|---------|");
  
  results.forEach((r, idx) => {
    if (r.success && r.diagnostics) {
      const d = r.diagnostics;
      const ragStage = d.stages.find(s => s.name === "RAG_SEARCH");
      const aiStage = d.stages.find(s => s.name === "AI_EXPLANATIONS");
      const rerankStage = d.stages.find(s => s.name === "LLM_RERANK");
      const summaryStage = d.stages.find(s => s.name === "SUMMARY_GENERATION");
      
      console.log(`| ${idx + 1} | ${r.query.slice(0, 20)}... | OK | ${r.movieCount} | ${r.searchMethod} | ${formatDuration(d.totalDurationMs)} | ${formatDuration(ragStage?.durationMs || 0)} | ${formatDuration(aiStage?.durationMs || 0)} | ${formatDuration(rerankStage?.durationMs || 0)} | ${formatDuration(summaryStage?.durationMs || 0)} |`);
    } else {
      console.log(`| ${idx + 1} | ${r.query.slice(0, 20)}... | FAIL | - | - | - | - | - | - | - |`);
    }
  });
  
  if (failed.length > 0) {
    console.log("\nFailed Queries:");
    failed.forEach((r, idx) => {
      console.log(`  ${idx + 1}. "${r.query}": ${r.error}`);
    });
  }
  
  console.log("\n" + "=".repeat(80));
}

runTests().catch(console.error);

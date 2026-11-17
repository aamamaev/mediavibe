export interface YandexGPTMessage {
  role: "system" | "user" | "assistant";
  text: string;
}

export interface YandexGPTResponse {
  result: {
    alternatives: Array<{
      message: {
        role: string;
        text: string;
      };
      status: string;
    }>;
    usage: {
      inputTextTokens: string;
      completionTokens: string;
      totalTokens: string;
    };
    modelVersion: string;
  };
}

export class YandexGPTClient {
  private apiUrl = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
  private apiKey: string;
  private catalogId: string;
  private model: string;

  constructor(apiKey: string, catalogId: string, model: string = "yandexgpt-lite") {
    this.apiKey = apiKey;
    this.catalogId = catalogId;
    this.model = model;
  }

  async chat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<{ choices: Array<{ message: { content: string } }> }> {
    const yandexMessages: YandexGPTMessage[] = messages.map((msg) => ({
      role: msg.role,
      text: msg.content,
    }));

    const modelUri = `gpt://${this.catalogId}/${this.model}/latest`;

    const requestBody = {
      modelUri,
      completionOptions: {
        stream: false,
        temperature: options?.temperature ?? 0.3,
        maxTokens: String(options?.maxTokens ?? 2000),
      },
      messages: yandexMessages,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Api-Key ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("YandexGPT authentication failed");
        }
        if (response.status === 429) {
          throw new Error("YandexGPT rate limit exceeded");
        }
        const errorText = await response.text();
        throw new Error(`YandexGPT API error: ${response.status} - ${errorText}`);
      }

      const data: YandexGPTResponse = await response.json();

      const content = data.result?.alternatives?.[0]?.message?.text || "";

      return {
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("YandexGPT request timed out");
      }
      throw error;
    }
  }

  async generateExplanation(
    movieTitle: string,
    movieSynopsis: string,
    userPreferences?: string
  ): Promise<string> {
    const systemPrompt = `Ты — кинокритик-эксперт, который помогает пользователям находить интересные фильмы. 
Твоя задача — объяснить, почему этот фильм может понравиться пользователю, основываясь на его предпочтениях.
Пиши кратко (2-3 предложения), увлекательно и по-русски. Избегай спойлеров.`;

    const userPrompt = userPreferences
      ? `Фильм: "${movieTitle}"\nОписание: ${movieSynopsis}\n\nПредпочтения пользователя: ${userPreferences}\n\nОбъясни, почему этот фильм может понравиться пользователю.`
      : `Фильм: "${movieTitle}"\nОписание: ${movieSynopsis}\n\nОбъясни, чем этот фильм может заинтересовать зрителя.`;

    try {
      const response = await this.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[YandexGPT] Error generating explanation:", error);
      return "";
    }
  }

  async generateListExplanation(movieTitles: string, context: string): Promise<string> {
    const systemPrompt = `Ты — кинокритик-эксперт. Кратко объясни (1-2 предложения), почему эти фильмы рекомендованы пользователю.
Пиши увлекательно и по-русски. Не перечисляй фильмы, а объясни общую тему подборки.`;

    const userPrompt = `Рекомендованные фильмы: ${movieTitles}\n\nКонтекст: ${context}\n\nОбъясни, почему эта подборка подойдёт пользователю.`;

    try {
      const response = await this.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.5, maxTokens: 150 }
      );

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[YandexGPT] Error generating list explanation:", error);
      return "";
    }
  }

  async generateSearchSummary(query: string, movieTitles: string[]): Promise<string> {
    const systemPrompt = `Ты — кинокритик-эксперт. Пользователь ищет фильмы по описанию.
Кратко объясни (2-3 предложения), как найденные фильмы соответствуют запросу пользователя.
Пиши увлекательно и по-русски.`;

    const userPrompt = `Запрос пользователя: "${query}"\n\nНайденные фильмы: ${movieTitles.join(", ")}\n\nОбъясни, как эти фильмы соответствуют запросу.`;

    try {
      const response = await this.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[YandexGPT] Error generating search summary:", error);
      return "";
    }
  }

  async reRankMovies(
    query: string,
    candidates: Array<{
      fid: string;
      ragScore: number;
      documentText: string;
      aiExplanation: string;
    }>
  ): Promise<{ rerankedFids: string[]; success: boolean }> {
    const systemPrompt = `Ты — эксперт по ранжированию фильмов. Твоя задача — переранжировать список фильмов по релевантности запросу пользователя.

ВАЖНО:
- Оцени каждый фильм по соответствию запросу
- Учитывай RAG-оценку, описание фильма и AI-объяснение
- Верни ТОЛЬКО строку с fid фильмов через запятую, от наиболее к наименее релевантному
- Формат ответа: "fid1,fid2,fid3,...,fid10" (без пробелов, только числа через запятую)
- НЕ добавляй никаких пояснений, только строку с fid`;

    const candidatesText = candidates
      .map((c, i) => `${i + 1}. fid: ${c.fid} | RAG-оценка: ${c.ragScore.toFixed(3)} | Описание: ${c.documentText} | Почему подходит: ${c.aiExplanation}`)
      .join("\n\n");

    const userPrompt = `Запрос пользователя: "${query}"

Кандидаты для ранжирования:
${candidatesText}

Переранжируй фильмы по релевантности запросу и верни строку с fid через запятую:`;

    try {
      console.log(`[YandexGPT] Re-ranking ${candidates.length} movies for query: "${query}"`);
      
      const response = await this.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.1, maxTokens: 200 }
      );

      const resultText = response.choices[0]?.message?.content?.trim() || "";
      console.log(`[YandexGPT] Re-ranking raw response: "${resultText}"`);

      const fids = resultText
        .split(",")
        .map(s => s.trim())
        .filter(s => /^\d+$/.test(s));

      const originalFids = new Set(candidates.map(c => c.fid));
      const validFids = fids.filter(fid => originalFids.has(fid));

      if (validFids.length === 0) {
        console.warn("[YandexGPT] Re-ranking returned no valid fids, using original order");
        return { rerankedFids: candidates.map(c => c.fid), success: false };
      }

      const missingFids = candidates
        .map(c => c.fid)
        .filter(fid => !validFids.includes(fid));
      
      const finalFids = [...validFids, ...missingFids];

      console.log(`[YandexGPT] Re-ranking successful: ${validFids.length}/${candidates.length} fids matched`);
      return { rerankedFids: finalFids, success: true };

    } catch (error) {
      console.error("[YandexGPT] Error re-ranking movies:", error);
      return { rerankedFids: candidates.map(c => c.fid), success: false };
    }
  }
}

let yandexGPTClient: YandexGPTClient | null = null;

export function getYandexGPTClient(): YandexGPTClient | null {
  if (yandexGPTClient) return yandexGPTClient;

  const apiKey = process.env.YANDEX_API_KEY;
  const catalogId = process.env.YANDEX_CATALOG_ID;

  if (!apiKey || !catalogId) {
    console.warn("[YandexGPT] Missing YANDEX_API_KEY or YANDEX_CATALOG_ID");
    return null;
  }

  yandexGPTClient = new YandexGPTClient(apiKey, catalogId, "yandexgpt-lite");
  console.log("[YandexGPT] Client initialized successfully");
  return yandexGPTClient;
}

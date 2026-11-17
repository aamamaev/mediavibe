# Техническое задание: EASE-рекомендации и оценка фильмов без авторизации

## 1. Обзор

Данное ТЗ описывает реализацию трёх взаимосвязанных функциональностей:
1. **Замена SVD на EASE** — переход с текущей матричной факторизации (SVD) на модель EASE для генерации персонализированных рекомендаций
2. **Быстрый старт без авторизации** — возможность для неавторизованных пользователей оценить 5 фильмов на главной странице и получить EASE-рекомендации
3. **10-балльная шкала оценок** — унификация всей системы оценок на 10-балльную шкалу

---

## 2. Архитектура системы

### 2.1. Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (React)                          │
│                    http://localhost:5000                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Node.js Backend (Express)                     │
│                    http://localhost:5000                        │
│                                                                 │
│  Workflow: "Start application" (npm run dev)                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                    HTTP запросы к EASE API
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               Python EASE Microservice (FastAPI)                │
│                    http://localhost:6333                        │
│                                                                 │
│  Workflow: "EASE Python Service" (uvicorn main:app)             │
│                                                                 │
│  Загружает:                                                     │
│  - attached_assets/EASE/EASE.pickle                             │
│  - attached_assets/EASE/dict_fid2efid.pickle                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Исходные данные EASE-модели

| Файл | Описание |
|------|----------|
| `attached_assets/EASE/EASE.pickle` | Предобученная EASE-модель (матрица B размером N x N) |
| `attached_assets/EASE/dict_fid2efid.pickle` | Словарь отображения fid → efid (внутренний ID EASE) |

---

## 3. Python EASE Microservice (FastAPI)

### 3.1. Структура файлов

```
server/
├── ease_service/
│   ├── __init__.py
│   ├── main.py              # FastAPI приложение
│   ├── models.py            # Pydantic модели
│   ├── ease_predictor.py    # Класс EASE предиктора
│   └── requirements.txt     # Python зависимости
```

### 3.2. Файл: `server/ease_service/requirements.txt`

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
numpy==1.26.3
scipy==1.12.0
pydantic==2.5.3
```

### 3.3. Файл: `server/ease_service/models.py`

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class RatingItem(BaseModel):
    """Одна оценка фильма от пользователя"""
    movie_id: str = Field(..., description="fid фильма из базы CineFeels")
    rating: int = Field(..., ge=1, le=10, description="Оценка от 1 до 10")

class PredictRequest(BaseModel):
    """Запрос на получение рекомендаций"""
    ratings: List[RatingItem] = Field(..., min_length=1, max_length=50)
    top: int = Field(default=10, ge=1, le=50, description="Количество рекомендаций")
    
class PredictResponse(BaseModel):
    """Ответ с рекомендациями"""
    recommendations: List[str] = Field(..., description="Список fid рекомендованных фильмов")
    scores: List[float] = Field(..., description="Scores для каждой рекомендации")
    method: str = Field(default="ease", description="Метод рекомендаций")

class HealthResponse(BaseModel):
    """Статус сервиса"""
    status: str
    model_loaded: bool
    movies_count: int
    matrix_shape: Optional[List[int]] = None
```

### 3.4. Файл: `server/ease_service/ease_predictor.py`

```python
import pickle
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional

class User:
    """Класс пользователя для EASE модели"""
    def __init__(self, uid: str, indices: List[int], values: List[int]):
        self._uid = uid
        self._indices = indices
        self._values = values
    
    @property
    def uid(self) -> str:
        return self._uid
    
    @property
    def indices(self) -> List[int]:
        return self._indices
    
    @property
    def values(self) -> List[int]:
        return self._values

class EASE:
    """EASE модель рекомендаций"""
    def __init__(self):
        self.B: Optional[np.ndarray] = None
        self.n: int = 0
    
    def load(self, path: str) -> None:
        """Загрузка предобученной модели из pickle"""
        with open(path, 'rb') as f:
            model_data = pickle.load(f)
        
        # Модель может быть сохранена как объект EASE или как матрица B
        if hasattr(model_data, 'B'):
            self.B = np.array(model_data.B)
            self.n = model_data.n
        else:
            # Если это напрямую матрица
            self.B = np.array(model_data)
            self.n = self.B.shape[0]
    
    def predict(self, user: User, top: int = 10) -> Tuple[List[int], List[float]]:
        """
        Получение top-N рекомендаций для пользователя
        
        Returns:
            Tuple[List[int], List[float]]: (индексы фильмов, scores)
        """
        if self.B is None:
            return [], []
        
        if not user.indices:
            return [], []
        
        # Создаем вектор пользователя
        x_user = np.zeros(self.n)
        x_user[user.indices] = user.values
        
        # Умножаем на матрицу B
        prediction = np.array(x_user.dot(self.B)).flatten()
        
        # Исключаем уже оцененные фильмы
        prediction[user.indices] = -np.inf
        
        # Получаем top-N индексов
        top_indices = np.argpartition(prediction, -top)[-top:]
        top_indices = top_indices[np.argsort(prediction[top_indices])[::-1]]
        
        scores = prediction[top_indices].tolist()
        
        return top_indices.tolist(), scores

class EASEPredictor:
    """Класс-обёртка для работы с EASE моделью"""
    
    def __init__(self, model_path: str, fid2efid_path: str):
        self.model = EASE()
        self.fid2efid: Dict[str, int] = {}
        self.efid2fid: Dict[int, str] = {}
        self.is_loaded = False
        
        self._load(model_path, fid2efid_path)
    
    def _load(self, model_path: str, fid2efid_path: str) -> None:
        """Загрузка модели и словарей"""
        try:
            # Загрузка EASE модели
            self.model.load(model_path)
            
            # Загрузка словаря fid -> efid
            with open(fid2efid_path, 'rb') as f:
                self.fid2efid = pickle.load(f)
            
            # Создаем обратный словарь
            self.efid2fid = {v: k for k, v in self.fid2efid.items()}
            
            self.is_loaded = True
            print(f"[EASE] Model loaded: {self.model.n} movies, {len(self.fid2efid)} fid mappings")
        except Exception as e:
            print(f"[EASE] Error loading model: {e}")
            self.is_loaded = False
    
    def predict(
        self, 
        ratings: List[Tuple[str, int]], 
        top: int = 10
    ) -> Tuple[List[str], List[float]]:
        """
        Получение рекомендаций на основе оценок пользователя
        
        Args:
            ratings: Список кортежей (fid, rating) где rating от 1 до 10
            top: Количество рекомендаций
            
        Returns:
            Tuple[List[str], List[float]]: (список fid рекомендаций, scores)
        """
        if not self.is_loaded:
            return [], []
        
        # Преобразуем fid в efid
        transformed = []
        for fid, rating in ratings:
            fid_str = str(fid)
            if fid_str in self.fid2efid:
                transformed.append((self.fid2efid[fid_str], rating))
        
        if not transformed:
            print(f"[EASE] No valid fid mappings found for ratings")
            return [], []
        
        indices, values = zip(*transformed)
        user = User("anonymous", list(indices), list(values))
        
        # Получаем рекомендации
        result_indices, scores = self.model.predict(user, top=top)
        
        # Преобразуем efid обратно в fid
        recommendations = []
        valid_scores = []
        for idx, score in zip(result_indices, scores):
            if idx in self.efid2fid:
                recommendations.append(self.efid2fid[idx])
                valid_scores.append(score)
        
        return recommendations, valid_scores
    
    def get_stats(self) -> dict:
        """Статистика модели"""
        return {
            "model_loaded": self.is_loaded,
            "movies_count": len(self.fid2efid),
            "matrix_shape": list(self.model.B.shape) if self.model.B is not None else None
        }
    
    def has_movie(self, fid: str) -> bool:
        """Проверка наличия фильма в модели"""
        return str(fid) in self.fid2efid
```

### 3.5. Файл: `server/ease_service/main.py`

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
import os

from .models import PredictRequest, PredictResponse, HealthResponse, RatingItem
from .ease_predictor import EASEPredictor

# Пути к файлам модели
BASE_DIR = Path(__file__).parent.parent.parent
MODEL_PATH = BASE_DIR / "attached_assets" / "EASE" / "EASE.pickle"
FID2EFID_PATH = BASE_DIR / "attached_assets" / "EASE" / "dict_fid2efid.pickle"

# Глобальный предиктор
predictor: EASEPredictor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Загрузка модели при старте приложения"""
    global predictor
    print(f"[EASE Service] Starting...")
    print(f"[EASE Service] Model path: {MODEL_PATH}")
    print(f"[EASE Service] FID2EFID path: {FID2EFID_PATH}")
    
    predictor = EASEPredictor(str(MODEL_PATH), str(FID2EFID_PATH))
    
    if predictor.is_loaded:
        print("[EASE Service] Model loaded successfully!")
    else:
        print("[EASE Service] WARNING: Model failed to load!")
    
    yield
    
    print("[EASE Service] Shutting down...")

app = FastAPI(
    title="EASE Recommendation Service",
    description="FastAPI микросервис для EASE-рекомендаций фильмов",
    version="1.0.0",
    lifespan=lifespan
)

# CORS для локального взаимодействия
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Проверка состояния сервиса"""
    if predictor is None:
        return HealthResponse(
            status="error",
            model_loaded=False,
            movies_count=0
        )
    
    stats = predictor.get_stats()
    return HealthResponse(
        status="ok" if stats["model_loaded"] else "error",
        model_loaded=stats["model_loaded"],
        movies_count=stats["movies_count"],
        matrix_shape=stats["matrix_shape"]
    )

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Получение EASE-рекомендаций на основе оценок пользователя
    
    - **ratings**: Список оценок [{movie_id: "fid", rating: 1-10}]
    - **top**: Количество рекомендаций (по умолчанию 10)
    """
    if predictor is None or not predictor.is_loaded:
        raise HTTPException(
            status_code=503, 
            detail="EASE model is not loaded"
        )
    
    # Преобразуем в формат для предиктора
    ratings_list = [(r.movie_id, r.rating) for r in request.ratings]
    
    recommendations, scores = predictor.predict(ratings_list, top=request.top)
    
    if not recommendations:
        # Fallback: возвращаем пустой результат
        # Node.js бэкенд должен обработать это и вернуть популярные фильмы
        return PredictResponse(
            recommendations=[],
            scores=[],
            method="ease_fallback"
        )
    
    return PredictResponse(
        recommendations=recommendations,
        scores=scores,
        method="ease"
    )

@app.get("/movies/{fid}/exists")
async def check_movie_exists(fid: str):
    """Проверка наличия фильма в EASE модели"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    return {"fid": fid, "exists": predictor.has_movie(fid)}

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "service": "EASE Recommendation Service",
        "version": "1.0.0",
        "endpoints": ["/health", "/predict", "/movies/{fid}/exists"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=6333)
```

### 3.6. Workflow конфигурация

**Workflow: "EASE Python Service"**
- **Команда:** `cd server/ease_service && python -m uvicorn main:app --host 0.0.0.0 --port 6333 --reload`
- **Порт:** 6333
- **Автозапуск:** Нет (запускается вручную или через зависимости)

---

## 4. Node.js Backend: EASE-клиент

### 4.1. Новый файл: `server/ease-client.ts`

```typescript
/**
 * Клиент для взаимодействия с Python EASE микросервисом
 */

const EASE_SERVICE_URL = process.env.EASE_SERVICE_URL || "http://localhost:6333";

interface RatingItem {
  movie_id: string;
  rating: number;  // 1-10
}

interface PredictResponse {
  recommendations: string[];
  scores: number[];
  method: string;
}

interface HealthResponse {
  status: string;
  model_loaded: boolean;
  movies_count: number;
  matrix_shape: number[] | null;
}

class EASEClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = EASE_SERVICE_URL, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async healthCheck(): Promise<HealthResponse | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[EASE Client] Health check failed: ${response.status}`);
        return null;
      }

      return response.json();
    } catch (error) {
      console.error("[EASE Client] Health check error:", error);
      return null;
    }
  }

  async isReady(): Promise<boolean> {
    const health = await this.healthCheck();
    return health?.model_loaded === true;
  }

  async predict(
    ratings: { movieId: string; rating: number }[],
    top: number = 10
  ): Promise<{ recommendations: string[]; scores: number[] } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const requestBody = {
        ratings: ratings.map((r) => ({
          movie_id: r.movieId,
          rating: r.rating,
        })),
        top,
      };

      const response = await fetch(`${this.baseUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[EASE Client] Predict failed: ${response.status}`);
        return null;
      }

      const data: PredictResponse = await response.json();
      return {
        recommendations: data.recommendations,
        scores: data.scores,
      };
    } catch (error) {
      console.error("[EASE Client] Predict error:", error);
      return null;
    }
  }

  async hasMovie(fid: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/movies/${fid}/exists`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.exists === true;
    } catch {
      return false;
    }
  }
}

export const easeClient = new EASEClient();
export { EASEClient };
```

### 4.2. Модификация: `server/routes.ts`

**Изменения в `/api/recommendations/personalized`:**

```typescript
import { easeClient } from "./ease-client";

// В обработчике /api/recommendations/personalized:

// Проверяем доступность EASE сервиса
const easeReady = await easeClient.isReady();

if (easeReady && userRatings.length > 0) {
  // Формируем оценки для EASE
  const ratingsForEase = userRatings.map(r => ({
    movieId: r.movieId,
    rating: r.rating  // Уже 1-10
  }));
  
  const easeResult = await easeClient.predict(ratingsForEase, 10);
  
  if (easeResult && easeResult.recommendations.length > 0) {
    const movieMap = new Map(allMovies.map(m => [m.fid, m]));
    recommendations = easeResult.recommendations
      .map(fid => movieMap.get(fid))
      .filter((m): m is typeof allMovies[0] => m !== undefined);
    recommendationMethod = "ease";
    console.log(`[Recommendations] Using EASE, found ${recommendations.length} recommendations`);
  }
}

// Fallback на genre-based если EASE недоступен
if (recommendations.length === 0) {
  // ... существующая genre-based логика
}
```

### 4.3. Новый эндпоинт: `POST /api/recommendations/anonymous`

```typescript
app.post("/api/recommendations/anonymous", async (req, res) => {
  try {
    const { ratings } = req.body;
    
    // Валидация
    if (!Array.isArray(ratings) || ratings.length < 3) {
      return res.status(400).json({ 
        message: "Необходимо минимум 3 оценки" 
      });
    }
    
    if (ratings.length > 20) {
      return res.status(400).json({ 
        message: "Максимум 20 оценок" 
      });
    }
    
    // Валидация каждой оценки (1-10)
    for (const r of ratings) {
      if (!r.movieId || typeof r.rating !== "number" || r.rating < 1 || r.rating > 10) {
        return res.status(400).json({ 
          message: "Оценки должны быть от 1 до 10" 
        });
      }
    }
    
    // Вызов EASE сервиса
    const easeResult = await easeClient.predict(ratings, 10);
    
    let movies: MovieWithRating[] = [];
    let method = "popular";
    
    if (easeResult && easeResult.recommendations.length > 0) {
      movies = await storage.getMoviesWithRatings(easeResult.recommendations);
      method = "ease";
    } else {
      // Fallback: популярные фильмы
      const popular = await storage.getPopularMovies(10);
      movies = await storage.getMoviesWithRatings(popular.map(m => m.fid));
    }
    
    // Генерация AI-объяснений (опционально)
    const yandexGPT = getYandexGPTClient();
    if (yandexGPT && movies.length > 0) {
      for (const movie of movies.slice(0, 5)) {
        if (movie.synopsis) {
          movie.aiExplanation = await yandexGPT.generateExplanation(
            movie.title,
            movie.synopsis,
            "Персональные рекомендации на основе ваших оценок"
          );
        }
      }
    }
    
    res.json({
      movies,
      method,
      count: movies.length
    });
  } catch (error) {
    console.error("[API] Error in anonymous recommendations:", error);
    res.status(500).json({ message: "Ошибка получения рекомендаций" });
  }
});
```

### 4.4. Новый эндпоинт: `GET /api/movies/for-rating`

```typescript
app.get("/api/movies/for-rating", async (req, res) => {
  try {
    // Получаем популярные фильмы с разнообразием жанров
    const allPopular = await storage.getPopularMovies(50);
    
    // Фильтруем только те, что есть в EASE модели
    const easeReady = await easeClient.isReady();
    
    let selectedMovies = allPopular;
    
    if (easeReady) {
      // Проверяем наличие в EASE (можно оптимизировать батч-запросом)
      const validMovies = [];
      for (const movie of allPopular) {
        if (await easeClient.hasMovie(movie.fid)) {
          validMovies.push(movie);
        }
        if (validMovies.length >= 20) break;
      }
      selectedMovies = validMovies;
    }
    
    // Выбираем 15 фильмов с разнообразием жанров
    const genreCounts: Record<string, number> = {};
    const diverseMovies: typeof allPopular = [];
    
    for (const movie of selectedMovies) {
      if (diverseMovies.length >= 15) break;
      
      // Проверяем, не перебор ли по жанрам
      const dominated = movie.genres?.some(g => (genreCounts[g] || 0) >= 3);
      if (dominated && diverseMovies.length > 5) continue;
      
      diverseMovies.push(movie);
      movie.genres?.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    }
    
    res.json({ movies: diverseMovies });
  } catch (error) {
    console.error("[API] Error getting movies for rating:", error);
    res.status(500).json({ message: "Ошибка загрузки фильмов" });
  }
});
```

---

## 5. Миграция на 10-балльную шкалу

### 5.1. Изменения в схеме данных

**Файл: `shared/schema.ts`**

```typescript
// Изменить ограничение для поля rating
export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id),
  movieId: text("movie_id").notNull(),
  rating: integer("rating").notNull(),  // 1-10 (ранее 1-5)
  createdAt: timestamp("created_at").defaultNow(),
});

// Обновить insertRatingSchema
export const insertRatingSchema = createInsertSchema(ratings)
  .omit({ id: true, createdAt: true })
  .extend({
    rating: z.number().min(1).max(10),  // Валидация 1-10
  });
```

### 5.2. Миграция существующих данных

**SQL миграция (если есть оценки на 5-балльной шкале):**

```sql
-- Преобразование 5-балльной шкалы в 10-балльную
UPDATE ratings SET rating = rating * 2 WHERE rating <= 5;
```

### 5.3. Изменения в Frontend

**Файл: `client/src/components/rating-widget.tsx`**

- Изменить максимальное значение с 5 на 10
- Обновить UI для отображения 10 звёзд/кнопок
- Вариант: использовать слайдер 1-10 вместо звёзд

```typescript
interface RatingWidgetProps {
  value?: number;
  onChange: (rating: number) => void;
  max?: number;  // По умолчанию 10
  size?: "sm" | "md" | "lg";
}

// Визуализация: 10 кнопок или слайдер 1-10
```

---

## 6. Frontend: Компонент быстрого старта

### 6.1. Новый компонент: `client/src/components/quick-rating.tsx`

**Функциональность:**
1. Загрузка фильмов для оценки через `GET /api/movies/for-rating`
2. Карусель с карточками фильмов
3. 10-балльная шкала оценки для каждого фильма
4. Прогресс-бар (0/5 → 5/5)
5. Кнопка "Получить рекомендации" (активна после 5 оценок)
6. Сохранение оценок в localStorage
7. Отображение результатов после запроса к `/api/recommendations/anonymous`

### 6.2. Модификация: `client/src/pages/home.tsx`

```typescript
import { QuickRating } from "@/components/quick-rating";

export default function Home() {
  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/user"],
  });
  
  const isAuthenticated = !!user;
  
  return (
    <div className="min-h-screen">
      {/* Hero section */}
      
      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Для неавторизованных: QuickRating */}
        {!isAuthenticated && (
          <QuickRating />
        )}
        
        {/* Для авторизованных: персональные рекомендации */}
        {isAuthenticated && personalizedMovies.length > 0 && (
          <MovieCarousel
            title="Для вас сегодня"
            subtitle="Персональные EASE-рекомендации"
            movies={personalizedMovies}
            onRate={handleRate}
            showExplanations
          />
        )}
        
        {/* Популярное и Новинки - для всех */}
        <MovieCarousel title="Популярное" movies={popularMovies} />
        <MovieGrid title="Новинки" movies={recentMovies} />
      </div>
    </div>
  );
}
```

---

## 7. Порядок реализации

### Этап 1: Python EASE микросервис (1-2 дня)
1. Создать структуру `server/ease_service/`
2. Реализовать `ease_predictor.py` с загрузкой pickle
3. Реализовать `main.py` FastAPI приложение
4. Создать workflow "EASE Python Service"
5. Тестирование через curl/Postman

### Этап 2: Node.js интеграция (1 день)
1. Создать `server/ease-client.ts`
2. Добавить эндпоинт `POST /api/recommendations/anonymous`
3. Добавить эндпоинт `GET /api/movies/for-rating`
4. Модифицировать `/api/recommendations/personalized`
5. Удалить SVD-код из `server/recommender.ts`

### Этап 3: Миграция на 10-балльную шкалу (0.5 дня)
1. Обновить схему в `shared/schema.ts`
2. Миграция данных в БД
3. Обновить `rating-widget.tsx`
4. Обновить все места использования рейтингов

### Этап 4: Frontend QuickRating (1-2 дня)
1. Создать компонент `quick-rating.tsx`
2. Интегрировать в `home.tsx`
3. Добавить localStorage-персистенцию
4. Тестирование UX

### Этап 5: Полировка (0.5 дня)
1. AI-объяснения для рекомендаций
2. Обработка ошибок и fallback
3. Логирование и мониторинг

---

## 8. Конфигурация запуска

### 8.1. Workflows

| Workflow | Команда | Порт | Описание |
|----------|---------|------|----------|
| Start application | `npm run dev` | 5000 | Основное Node.js приложение |
| EASE Python Service | `cd server/ease_service && python -m uvicorn main:app --host 0.0.0.0 --port 6333` | 6333 | Python EASE микросервис |

### 8.2. Environment Variables

```env
EASE_SERVICE_URL=http://localhost:6333
```

### 8.3. Порядок запуска

1. Запустить "EASE Python Service" (порт 6333)
2. Запустить "Start application" (порт 5000)
3. Node.js будет обращаться к Python сервису по `http://localhost:6333`

---

## 9. API Reference

### Python EASE Service (порт 6333)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/health` | Проверка состояния сервиса |
| POST | `/predict` | Получение EASE-рекомендаций |
| GET | `/movies/{fid}/exists` | Проверка наличия фильма в модели |

### Node.js Backend (порт 5000)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/recommendations/anonymous` | Рекомендации для неавторизованных |
| GET | `/api/recommendations/personalized` | Рекомендации для авторизованных (EASE) |
| GET | `/api/movies/for-rating` | Фильмы для начальной оценки |

---

## 10. Тестирование

### 10.1. Тест Python EASE Service

```bash
# Health check
curl http://localhost:6333/health

# Predict
curl -X POST http://localhost:6333/predict \
  -H "Content-Type: application/json" \
  -d '{
    "ratings": [
      {"movie_id": "893361", "rating": 8},
      {"movie_id": "470689", "rating": 7},
      {"movie_id": "4321512", "rating": 9}
    ],
    "top": 10
  }'
```

### 10.2. Тест Node.js API

```bash
# Фильмы для оценки
curl http://localhost:5000/api/movies/for-rating

# Анонимные рекомендации
curl -X POST http://localhost:5000/api/recommendations/anonymous \
  -H "Content-Type: application/json" \
  -d '{
    "ratings": [
      {"movieId": "893361", "rating": 8},
      {"movieId": "470689", "rating": 7},
      {"movieId": "4321512", "rating": 9},
      {"movieId": "505827", "rating": 6},
      {"movieId": "840821", "rating": 8}
    ]
  }'
```

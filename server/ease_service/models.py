from pydantic import BaseModel, Field
from typing import List, Optional

class RatingItem(BaseModel):
    movie_id: str = Field(..., description="fid фильма из базы MediaVibe")
    rating: int = Field(..., ge=1, le=10, description="Оценка от 1 до 10")

class PredictRequest(BaseModel):
    ratings: List[RatingItem] = Field(..., min_length=1, max_length=50)
    top: int = Field(default=10, ge=1, le=50, description="Количество рекомендаций")
    
class PredictResponse(BaseModel):
    recommendations: List[str] = Field(..., description="Список fid рекомендованных фильмов")
    scores: List[float] = Field(..., description="Scores для каждой рекомендации")
    method: str = Field(default="ease", description="Метод рекомендаций")

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    movies_count: int
    matrix_shape: Optional[List[int]] = None

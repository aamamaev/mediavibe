from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
import os
import sys

sys.path.insert(0, str(Path(__file__).parent))

from models import PredictRequest, PredictResponse, HealthResponse, RatingItem
from ease_predictor import EASEPredictor

BASE_DIR = Path(__file__).parent.parent.parent
MODEL_PATH = BASE_DIR / "attached_assets" / "EASE" / "EASE.pickle"
FID2EFID_PATH = BASE_DIR / "attached_assets" / "EASE" / "dict_fid2efid.pickle"

predictor: EASEPredictor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
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
    if predictor is None or not predictor.is_loaded:
        raise HTTPException(
            status_code=503, 
            detail="EASE model is not loaded"
        )
    
    ratings_list = [(r.movie_id, r.rating) for r in request.ratings]
    
    recommendations, scores = predictor.predict(ratings_list, top=request.top)
    
    if not recommendations:
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
    if predictor is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    return {"fid": fid, "exists": predictor.has_movie(fid)}

@app.get("/")
async def root():
    return {
        "service": "EASE Recommendation Service",
        "version": "1.0.0",
        "endpoints": ["/health", "/predict", "/movies/{fid}/exists"]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("EASE_PORT", 6334))
    uvicorn.run(app, host="0.0.0.0", port=port)

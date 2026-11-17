import pickle
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional

class User:
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
    def __init__(self, reg_weight=100):
        self.reg_weight = reg_weight
        self.B: Optional[np.ndarray] = None
        self.n: Optional[int] = None
    
    def predict(self, user: User, top: int = 10) -> Tuple[List[int], List[float]]:
        if self.B is None:
            return [], []
        
        if not user.indices:
            return [], []
        
        x_user = np.zeros(self.n)
        x_user[user.indices] = user.values
        
        prediction = np.array(x_user.dot(self.B)).flatten()
        
        prediction[user.indices] = -np.inf
        
        top_indices = np.argpartition(prediction, -top)[-top:]
        top_indices = top_indices[np.argsort(prediction[top_indices])[::-1]]
        scores = prediction[top_indices].tolist()
        
        return top_indices.tolist(), scores

class CustomUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if name == 'EASE':
            return EASE
        if name == 'User':
            return User
        return super().find_class(module, name)

class EASEPredictor:
    def __init__(self, model_path: str, fid2efid_path: str):
        self.model: Optional[EASE] = None
        self.fid2efid: Dict[str, int] = {}
        self.efid2fid: Dict[int, str] = {}
        self.is_loaded = False
        
        self._load(model_path, fid2efid_path)
    
    def _load(self, model_path: str, fid2efid_path: str) -> None:
        try:
            with open(model_path, 'rb') as f:
                self.model = CustomUnpickler(f).load()
            
            with open(fid2efid_path, 'rb') as f:
                raw_mapping = pickle.load(f)
            
            self.fid2efid = {str(k): v for k, v in raw_mapping.items()}
            
            self.efid2fid = {v: str(k) for k, v in raw_mapping.items()}
            
            self.is_loaded = True
            print(f"[EASE] Model loaded: {self.model.n} movies, {len(self.fid2efid)} fid mappings")
        except Exception as e:
            print(f"[EASE] Error loading model: {e}")
            import traceback
            traceback.print_exc()
            self.is_loaded = False
    
    def predict(
        self, 
        ratings: List[Tuple[str, int]], 
        top: int = 10
    ) -> Tuple[List[str], List[float]]:
        if not self.is_loaded or self.model is None:
            return [], []
        
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
        
        result_indices, scores = self.model.predict(user, top=top)
        
        recommendations = []
        valid_scores = []
        for idx, score in zip(result_indices, scores):
            if idx in self.efid2fid:
                recommendations.append(self.efid2fid[idx])
                valid_scores.append(score)
        
        return recommendations, valid_scores
    
    def get_stats(self) -> dict:
        return {
            "model_loaded": self.is_loaded,
            "movies_count": len(self.fid2efid),
            "matrix_shape": list(self.model.B.shape) if self.model is not None and self.model.B is not None else None
        }
    
    def has_movie(self, fid: str) -> bool:
        return str(fid) in self.fid2efid

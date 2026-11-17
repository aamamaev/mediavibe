interface Rating {
  userId: string;
  movieId: string;
  rating: number;
}

interface RecommendationResult {
  movieId: string;
  predictedRating: number;
}

class MatrixFactorization {
  private userFactors: Map<string, number[]> = new Map();
  private movieFactors: Map<string, number[]> = new Map();
  private globalMean = 0;
  private userBias: Map<string, number> = new Map();
  private movieBias: Map<string, number> = new Map();
  
  private numFactors = 20;
  private learningRate = 0.01;
  private regularization = 0.02;
  private epochs = 50;
  
  private isTrained = false;

  private initializeFactors(id: string, factorMap: Map<string, number[]>): number[] {
    if (factorMap.has(id)) {
      return factorMap.get(id)!;
    }
    
    const factors = Array.from({ length: this.numFactors }, () => 
      (Math.random() - 0.5) * 0.1
    );
    factorMap.set(id, factors);
    return factors;
  }

  async train(ratings: Rating[]): Promise<void> {
    if (ratings.length === 0) {
      console.log("[SVD] No ratings to train on");
      return;
    }

    console.log(`[SVD] Training on ${ratings.length} ratings...`);

    this.globalMean = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    for (const rating of ratings) {
      this.initializeFactors(rating.userId, this.userFactors);
      this.initializeFactors(rating.movieId, this.movieFactors);
      
      if (!this.userBias.has(rating.userId)) {
        this.userBias.set(rating.userId, 0);
      }
      if (!this.movieBias.has(rating.movieId)) {
        this.movieBias.set(rating.movieId, 0);
      }
    }

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      let totalError = 0;
      
      const shuffled = [...ratings].sort(() => Math.random() - 0.5);
      
      for (const rating of shuffled) {
        const prediction = this.predict(rating.userId, rating.movieId);
        const error = rating.rating - prediction;
        totalError += error * error;
        
        const userFactors = this.userFactors.get(rating.userId)!;
        const movieFactors = this.movieFactors.get(rating.movieId)!;
        const userBias = this.userBias.get(rating.userId)!;
        const movieBias = this.movieBias.get(rating.movieId)!;
        
        this.userBias.set(
          rating.userId,
          userBias + this.learningRate * (error - this.regularization * userBias)
        );
        this.movieBias.set(
          rating.movieId,
          movieBias + this.learningRate * (error - this.regularization * movieBias)
        );
        
        for (let k = 0; k < this.numFactors; k++) {
          const userFactor = userFactors[k];
          const movieFactor = movieFactors[k];
          
          userFactors[k] += this.learningRate * (
            error * movieFactor - this.regularization * userFactor
          );
          movieFactors[k] += this.learningRate * (
            error * userFactor - this.regularization * movieFactor
          );
        }
      }
      
      const rmse = Math.sqrt(totalError / ratings.length);
      
      if (epoch % 10 === 0 || epoch === this.epochs - 1) {
        console.log(`[SVD] Epoch ${epoch + 1}/${this.epochs}, RMSE: ${rmse.toFixed(4)}`);
      }
    }
    
    this.isTrained = true;
    console.log("[SVD] Training complete");
  }

  predict(userId: string, movieId: string): number {
    let prediction = this.globalMean;
    
    prediction += this.userBias.get(userId) || 0;
    prediction += this.movieBias.get(movieId) || 0;
    
    const userFactors = this.userFactors.get(userId);
    const movieFactors = this.movieFactors.get(movieId);
    
    if (userFactors && movieFactors) {
      for (let k = 0; k < this.numFactors; k++) {
        prediction += userFactors[k] * movieFactors[k];
      }
    }
    
    return Math.max(1, Math.min(5, prediction));
  }

  getRecommendations(
    userId: string,
    allMovieIds: string[],
    ratedMovieIds: Set<string>,
    limit: number = 10
  ): RecommendationResult[] {
    if (!this.isTrained) {
      return [];
    }

    const unratedMovies = allMovieIds.filter(id => !ratedMovieIds.has(id));
    
    const predictions = unratedMovies.map(movieId => ({
      movieId,
      predictedRating: this.predict(userId, movieId),
    }));
    
    return predictions
      .sort((a, b) => b.predictedRating - a.predictedRating)
      .slice(0, limit);
  }

  addNewUserRating(userId: string, movieId: string, rating: number): void {
    if (!this.userFactors.has(userId)) {
      this.initializeFactors(userId, this.userFactors);
      this.userBias.set(userId, 0);
    }
    
    if (!this.movieFactors.has(movieId)) {
      this.initializeFactors(movieId, this.movieFactors);
      this.movieBias.set(movieId, 0);
    }
    
    const numIterations = 10;
    
    for (let i = 0; i < numIterations; i++) {
      const prediction = this.predict(userId, movieId);
      const error = rating - prediction;
      
      const userFactors = this.userFactors.get(userId)!;
      const movieFactors = this.movieFactors.get(movieId)!;
      const userBias = this.userBias.get(userId)!;
      
      this.userBias.set(
        userId,
        userBias + this.learningRate * 2 * (error - this.regularization * userBias)
      );
      
      for (let k = 0; k < this.numFactors; k++) {
        const userFactor = userFactors[k];
        const movieFactor = movieFactors[k];
        
        userFactors[k] += this.learningRate * 2 * (
          error * movieFactor - this.regularization * userFactor
        );
      }
    }
  }

  getSimilarMovies(movieId: string, allMovieIds: string[], limit: number = 6): string[] {
    const targetFactors = this.movieFactors.get(movieId);
    
    if (!targetFactors) {
      return [];
    }
    
    const similarities = allMovieIds
      .filter(id => id !== movieId)
      .map(id => {
        const factors = this.movieFactors.get(id);
        if (!factors) return { id, similarity: 0 };
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let k = 0; k < this.numFactors; k++) {
          dotProduct += targetFactors[k] * factors[k];
          normA += targetFactors[k] * targetFactors[k];
          normB += factors[k] * factors[k];
        }
        
        const similarity = normA > 0 && normB > 0
          ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
          : 0;
        
        return { id, similarity };
      });
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.id);
  }

  isModelTrained(): boolean {
    return this.isTrained;
  }

  getStats(): { users: number; movies: number; trained: boolean } {
    return {
      users: this.userFactors.size,
      movies: this.movieFactors.size,
      trained: this.isTrained,
    };
  }
}

class RecommenderService {
  private model: MatrixFactorization;
  private lastTrainingTime: Date | null = null;
  private isTraining = false;

  constructor() {
    this.model = new MatrixFactorization();
  }

  async trainModel(ratings: Rating[]): Promise<void> {
    if (this.isTraining) {
      console.log("[Recommender] Training already in progress");
      return;
    }
    
    this.isTraining = true;
    
    try {
      await this.model.train(ratings);
      this.lastTrainingTime = new Date();
    } finally {
      this.isTraining = false;
    }
  }

  getRecommendations(
    userId: string,
    allMovieIds: string[],
    ratedMovieIds: Set<string>,
    limit: number = 10
  ): RecommendationResult[] {
    return this.model.getRecommendations(userId, allMovieIds, ratedMovieIds, limit);
  }

  updateWithNewRating(userId: string, movieId: string, rating: number): void {
    this.model.addNewUserRating(userId, movieId, rating);
  }

  getSimilarMovies(movieId: string, allMovieIds: string[], limit: number = 6): string[] {
    return this.model.getSimilarMovies(movieId, allMovieIds, limit);
  }

  isReady(): boolean {
    return this.model.isModelTrained();
  }

  getStats(): { users: number; movies: number; trained: boolean; lastTraining: Date | null } {
    return {
      ...this.model.getStats(),
      lastTraining: this.lastTrainingTime,
    };
  }
}

export const recommenderService = new RecommenderService();

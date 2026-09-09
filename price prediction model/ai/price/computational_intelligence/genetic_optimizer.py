"""
Genetic Algorithm (GA) Optimizer for Feature Selection and Ensemble Weights
Strict Staging:
  Stage 2: GA Feature Subset Optimization
  Stage 3: GA Ensemble Weight Optimization
  Strict Anti-Leakage: All fitness calculations evaluated exclusively on Validation set.
"""

import logging
import random
from typing import List, Tuple, Dict, Any
import numpy as np
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class GeneticOptimizer:
    """Genetic Algorithm for staged multi-objective optimization."""

    def __init__(
        self,
        population_size: int = 20,
        generations: int = 8,
        mutation_rate: float = 0.15,
        crossover_rate: float = 0.8,
        lambda_rmse: float = 0.05,
        lambda_dir: float = 0.10,
        random_seed: int = 42
    ):
        self.pop_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.lambda_rmse = lambda_rmse
        self.lambda_dir = lambda_dir
        random.seed(random_seed)
        np.random.seed(random_seed)

    def _calculate_fitness(self, y_true: np.ndarray, y_pred: np.ndarray) -> float:
        """
        Fitness = - Val_MAE - lambda1 * RMSE + lambda2 * directional_accuracy
        """
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))

        if len(y_true) > 1:
            actual_dir = np.sign(np.diff(y_true))
            pred_dir = np.sign(np.diff(y_pred))
            dir_acc = np.mean(actual_dir == pred_dir) * 100.0
        else:
            dir_acc = 100.0

        fitness = - mae - (self.lambda_rmse * rmse) + (self.lambda_dir * dir_acc)
        return float(fitness)

    # -------------------------------------------------------------
    # Stage 2: GA Feature Subset Selection
    # -------------------------------------------------------------
    def optimize_feature_subset(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        feature_names: List[str],
        xgb_params: Dict[str, Any],
        min_features: int = 5
    ) -> Tuple[List[str], List[int]]:
        """
        Evolve binary chromosomes representing feature inclusion masks.
        """
        num_features = len(feature_names)
        logger.info(f"Starting Stage 2: GA Feature Subset Selection across {num_features} candidates...")

        # Initialize population
        population = []
        for _ in range(self.pop_size):
            # Ensure at least min_features active
            chrom = [1 if random.random() > 0.4 else 0 for _ in range(num_features)]
            if sum(chrom) < min_features:
                indices = random.sample(range(num_features), min_features)
                for idx in indices:
                    chrom[idx] = 1
            population.append(chrom)

        best_chromosome = None
        best_fitness = -float("inf")

        for gen in range(self.generations):
            fitness_scores = []
            for chrom in population:
                active_indices = [i for i, bit in enumerate(chrom) if bit == 1]
                if len(active_indices) < min_features:
                    fitness_scores.append(-999999.0)
                    continue

                X_tr_sub = X_train[:, active_indices]
                X_val_sub = X_val[:, active_indices]

                model = xgb.XGBRegressor(**xgb_params)
                model.fit(X_tr_sub, y_train, verbose=False)
                preds = model.predict(X_val_sub)

                fitness = self._calculate_fitness(y_val, preds)
                fitness_scores.append(fitness)

                if fitness > best_fitness:
                    best_fitness = fitness
                    best_chromosome = list(chrom)

            logger.info(f"GA Feature Gen {gen+1}/{self.generations} | Best Fitness: {best_fitness:.4f} | Features selected: {sum(best_chromosome)}")

            # Selection (Tournament)
            selected = []
            for _ in range(self.pop_size):
                i1, i2 = random.sample(range(self.pop_size), 2)
                winner = population[i1] if fitness_scores[i1] > fitness_scores[i2] else population[i2]
                selected.append(list(winner))

            # Crossover & Mutation
            next_pop = []
            for i in range(0, self.pop_size, 2):
                p1 = selected[i]
                p2 = selected[(i + 1) % self.pop_size]
                if random.random() < self.crossover_rate:
                    point = random.randint(1, num_features - 1)
                    c1 = p1[:point] + p2[point:]
                    c2 = p2[:point] + p1[point:]
                else:
                    c1, c2 = list(p1), list(p2)

                # Mutation
                for c in [c1, c2]:
                    for bit_idx in range(num_features):
                        if random.random() < self.mutation_rate:
                            c[bit_idx] = 1 - c[bit_idx]
                    if sum(c) < min_features:
                        for idx in random.sample(range(num_features), min_features):
                            c[idx] = 1

                next_pop.extend([c1, c2])

            population = next_pop[:self.pop_size]

        selected_indices = [i for i, bit in enumerate(best_chromosome) if bit == 1]
        selected_features = [feature_names[i] for i in selected_indices]
        logger.info(f"Stage 2 GA Complete. Selected {len(selected_features)} optimal features.")
        return selected_features, selected_indices

    # -------------------------------------------------------------
    # Stage 3: GA Ensemble Weight Optimization
    # -------------------------------------------------------------
    def optimize_ensemble_weights(
        self,
        val_predictions: Dict[str, np.ndarray],
        y_val: np.ndarray
    ) -> Dict[str, float]:
        """
        Evolve real-valued ensemble weight vectors to maximize validation fitness.
        """
        model_names = list(val_predictions.keys())
        k = len(model_names)
        logger.info(f"Starting Stage 3: GA Ensemble Weight Optimization for {model_names}...")

        if k <= 1:
            return {model_names[0]: 1.0}

        pred_matrix = np.column_stack([val_predictions[m] for m in model_names])

        # Population of simplex weights
        population = []
        for _ in range(self.pop_size):
            raw = np.random.uniform(0.1, 1.0, size=k)
            population.append(raw / np.sum(raw))

        best_weights = population[0]
        best_fitness = -float("inf")

        for gen in range(self.generations):
            fitness_scores = []
            for w in population:
                combined_preds = pred_matrix @ w
                fitness = self._calculate_fitness(y_val, combined_preds)
                fitness_scores.append(fitness)
                if fitness > best_fitness:
                    best_fitness = fitness
                    best_weights = np.array(w)

            # Selection
            selected = []
            for _ in range(self.pop_size):
                i1, i2 = random.sample(range(self.pop_size), 2)
                winner = population[i1] if fitness_scores[i1] > fitness_scores[i2] else population[i2]
                selected.append(winner.copy())

            # Crossover (Arithmetic blending) & Mutation (Gaussian perturbation)
            next_pop = []
            for i in range(0, self.pop_size, 2):
                p1 = selected[i]
                p2 = selected[(i + 1) % self.pop_size]
                alpha = random.random()
                c1 = alpha * p1 + (1 - alpha) * p2
                c2 = (1 - alpha) * p1 + alpha * p2

                for c in [c1, c2]:
                    if random.random() < self.mutation_rate:
                        noise = np.random.normal(0, 0.1, size=k)
                        c = np.clip(c + noise, 0.01, None)
                    c = c / np.sum(c)
                    next_pop.append(c)

            population = next_pop[:self.pop_size]

        opt_dict = {model_names[i]: float(round(best_weights[i], 4)) for i in range(k)}
        logger.info(f"Stage 3 GA Complete. Optimized Ensemble Weights: {opt_dict} (Fitness: {best_fitness:.4f})")
        return opt_dict

"""
Hybrid Weighted Stacking Ensemble Model
Combines tabular gradient-boosted trees, deep recurrent sequence forecasters,
dilated causal convolutions, and deep tabular representations.
"""

import os
import json
import logging
from typing import Dict, List, Optional
import numpy as np
from scipy.optimize import minimize

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class HybridEnsembleModel:
    """Combines XGBoost, LSTM, TCN, and MLP predictions with constrained learned weights."""

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or {
            "xgboost": 0.40,
            "lstm": 0.25,
            "tcn": 0.20,
            "mlp": 0.15
        }
        self.model_names = list(self.weights.keys())

    def fit_weights(self, val_preds: Dict[str, np.ndarray], y_val: np.ndarray):
        """
        Optimize ensemble weights using SciPy/GA on validation data to minimize validation MAE.
        Enforces w_i >= 0 and sum(w_i) = 1.0.
        """
        keys = [k for k in self.model_names if k in val_preds]
        num_models = len(keys)
        if num_models == 0:
            return

        pred_matrix = np.column_stack([val_preds[k] for k in keys])
        y_true = np.asarray(y_val)

        def objective(w):
            w = np.array(w)
            combined = pred_matrix @ w
            return np.mean(np.abs(combined - y_true))

        init_weights = np.ones(num_models) / num_models
        bounds = [(0.0, 1.0) for _ in range(num_models)]
        constraints = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}

        res = minimize(objective, init_weights, method="SLSQP", bounds=bounds, constraints=constraints)
        if res.success:
            opt_weights = res.x
            self.weights = {k: float(opt_weights[i]) for i, k in enumerate(keys)}
            logger.info(f"Optimized Ensemble Weights: {self.weights} (Val MAE: {res.fun:.4f})")
        else:
            logger.warning("SLSQP optimization did not converge; keeping default weights.")

    def set_weights(self, weights: Dict[str, float]):
        total = sum(weights.values())
        self.weights = {k: v / total for k, v in weights.items()}
        logger.info(f"Ensemble weights set to: {self.weights}")

    def predict(self, model_predictions: Dict[str, np.ndarray]) -> np.ndarray:
        """Calculate weighted sum prediction."""
        available_models = [k for k in self.weights if k in model_predictions]
        if not available_models:
            raise ValueError("No matching model predictions provided to ensemble.")

        total_weight = sum(self.weights[k] for k in available_models)
        normalized_weights = {k: self.weights[k] / total_weight for k in available_models}

        final_pred = np.zeros_like(model_predictions[available_models[0]], dtype=np.float64)
        for k in available_models:
            final_pred += normalized_weights[k] * model_predictions[k]

        return final_pred

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.weights, f, indent=2)
        logger.info(f"Saved Ensemble weights to {filepath}")

    def load(self, filepath: str):
        with open(filepath, "r", encoding="utf-8") as f:
            self.weights = json.load(f)
        self.model_names = list(self.weights.keys())
        logger.info(f"Loaded Ensemble weights from {filepath}")
        return self

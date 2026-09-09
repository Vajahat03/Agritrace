"""
XGBoost Price Prediction Model with Optuna Hyperparameter Optimization
"""

import os
import json
import logging
from typing import Dict, Any, Optional
import numpy as np
import xgboost as xgb
import optuna
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)
optuna.logging.set_verbosity(optuna.logging.WARNING)


class XGBoostPriceModel:
    """XGBoost regression forecaster for mandi commodity prices."""

    def __init__(self, params: Optional[Dict[str, Any]] = None):
        self.params = params or {
            "n_estimators": 200,
            "max_depth": 6,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "min_child_weight": 3,
            "reg_alpha": 0.1,
            "reg_lambda": 1.0,
            "random_state": 42,
            "n_jobs": -1
        }
        self.model = xgb.XGBRegressor(**self.params)
        self.is_fitted = False

    def fit(self, X_train: np.ndarray, y_train: np.ndarray, X_val: Optional[np.ndarray] = None, y_val: Optional[np.ndarray] = None):
        eval_set = [(X_val, y_val)] if X_val is not None and y_val is not None else None
        self.model.fit(
            X_train, y_train,
            eval_set=eval_set,
            verbose=False
        )
        self.is_fitted = True
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        if filepath.endswith(".json"):
            self.model.save_model(filepath)
        else:
            joblib.dump(self.model, filepath)
        logger.info(f"Saved XGBoost model to {filepath}")

    def load(self, filepath: str):
        if filepath.endswith(".json"):
            self.model.load_model(filepath)
        else:
            self.model = joblib.load(filepath)
        self.is_fitted = True
        logger.info(f"Loaded XGBoost model from {filepath}")
        return self


def tune_xgboost_optuna(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    n_trials: int = 25
) -> Dict[str, Any]:
    """
    Tune XGBoost hyperparameters strictly using training and validation sets.
    Objective: Minimize validation MAE. Never exposes the test set.
    """
    logger.info(f"Starting Stage 1: Optuna Hyperparameter Tuning ({n_trials} trials)...")

    def objective(trial: optuna.Trial) -> float:
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 80, 300, step=20),
            "max_depth": trial.suggest_int("max_depth", 3, 10),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-3, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-3, 10.0, log=True),
            "random_state": 42,
            "n_jobs": -1
        }
        model = xgb.XGBRegressor(**params)
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
        preds = model.predict(X_val)
        val_mae = float(np.mean(np.abs(preds - y_val)))
        return val_mae

    study = optuna.create_study(direction="minimize")
    study.optimize(objective, n_trials=n_trials)

    best_params = study.best_params
    best_params["random_state"] = 42
    best_params["n_jobs"] = -1
    logger.info(f"Optuna Optimization complete. Best Val MAE: {study.best_value:.4f}")
    return best_params

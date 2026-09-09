"""
AgriTrace Price Prediction Baselines
Implements Naive Persistence, Moving Average, Linear Regression, and Random Forest baselines.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculate MAE, RMSE, R², sMAPE, and Directional Accuracy."""
    y_true = np.asarray(y_true, dtype=np.float64)
    y_pred = np.asarray(y_pred, dtype=np.float64)

    # Filter out NaNs if any
    mask = ~(np.isnan(y_true) | np.isnan(y_pred))
    y_true = y_true[mask]
    y_pred = y_pred[mask]

    if len(y_true) == 0:
        return {"mae": np.nan, "rmse": np.nan, "r2": np.nan, "smape": np.nan, "directional_accuracy": np.nan}

    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))

    # sMAPE
    denominator = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    denominator[denominator == 0] = 1e-5
    smape = float(np.mean(np.abs(y_pred - y_true) / denominator) * 100.0)

    # Directional Accuracy (relative to previous day price if sequence, or sign match)
    if len(y_true) > 1:
        actual_direction = np.sign(np.diff(y_true))
        pred_direction = np.sign(np.diff(y_pred))
        directional_accuracy = float(np.mean(actual_direction == pred_direction) * 100.0)
    else:
        directional_accuracy = 100.0

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "smape": round(smape, 4),
        "directional_accuracy": round(directional_accuracy, 2)
    }


class NaivePersistenceBaseline:
    """Tomorrow's price = today's price."""
    def fit(self, X: pd.DataFrame, y: pd.Series):
        pass

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if "price_current" in X.columns:
            return X["price_current"].values
        elif "modal_price" in X.columns:
            return X["modal_price"].values
        elif "rolling_mean_3" in X.columns:
            return X["rolling_mean_3"].values
        return np.zeros(len(X))


class MovingAverageBaseline:
    """Predicts rolling mean price."""
    def __init__(self, window: int = 7):
        self.window = window

    def fit(self, X: pd.DataFrame, y: pd.Series):
        pass

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        col = f"rolling_mean_{self.window}"
        if col in X.columns:
            return X[col].values
        elif "price_current" in X.columns:
            return X["price_current"].values
        return np.zeros(len(X))


class LinearRegressionBaseline:
    """Linear Regression with L2 regularization (Ridge)."""
    def __init__(self, alpha: float = 1.0):
        self.model = Ridge(alpha=alpha)

    def fit(self, X: np.ndarray, y: np.ndarray):
        self.model.fit(X, y)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)


class RandomForestBaseline:
    """Random Forest Regressor baseline."""
    def __init__(self, n_estimators: int = 100, max_depth: int = 10, random_state: int = 42):
        self.model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=random_state,
            n_jobs=-1
        )

    def fit(self, X: np.ndarray, y: np.ndarray):
        self.model.fit(X, y)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)

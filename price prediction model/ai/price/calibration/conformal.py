"""
Normalized and Commodity-Aware Conformal Prediction Module
Provides empirically calibrated, operationally tight prediction intervals
by scaling nonconformity scores relative to commodity price level.
"""

import os
import json
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class ConformalPriceCalibrator:
    """
    Locally Scaled Split Conformal Predictor.
    Computes normalized nonconformity scores:
      S_i = |y_i - y_hat_i| / max(y_hat_i, 100.0)
    This ensures that high-value commodities (e.g. Cardamom @ ₹20,000) and low-value
    commodities (e.g. Potato @ ₹1,500) both receive proportional, operationally useful intervals.
    """

    def __init__(self, confidence_level: float = 0.90):
        self.confidence_level = confidence_level
        self.global_q_rel = 0.15  # Relative margin quantile (e.g. 15% relative width)
        self.commodity_margins: Dict[str, float] = {}
        self.is_calibrated = False

    def calibrate(
        self,
        y_true_cal: np.ndarray,
        y_pred_cal: np.ndarray,
        commodity_labels: Optional[np.ndarray] = None
    ):
        """
        Calibrate strictly on validation set. Test set is strictly excluded.
        """
        y_true = np.asarray(y_true_cal, dtype=np.float64)
        y_pred = np.asarray(y_pred_cal, dtype=np.float64)

        mask = ~(np.isnan(y_true) | np.isnan(y_pred)) & (y_pred > 0)
        y_true = y_true[mask]
        y_pred = y_pred[mask]
        n = len(y_true)

        if n == 0:
            self.global_q_rel = 0.20
            self.is_calibrated = True
            return

        # Normalized relative residuals: |y - y_hat| / y_hat
        rel_residuals = np.abs(y_true - y_pred) / y_pred

        alpha = 1.0 - self.confidence_level
        p_val = np.ceil((n + 1) * (1.0 - alpha)) / n
        p_val = min(max(p_val, 0.0), 1.0)
        self.global_q_rel = float(np.quantile(rel_residuals, p_val))

        # Per-commodity calibration if labels provided
        if commodity_labels is not None:
            comm_filtered = np.asarray(commodity_labels)[mask]
            for comm in np.unique(comm_filtered):
                c_mask = comm_filtered == comm
                if np.sum(c_mask) >= 5:
                    c_res = rel_residuals[c_mask]
                    c_n = len(c_res)
                    c_p = min(max(np.ceil((c_n + 1) * (1.0 - alpha)) / c_n, 0.0), 1.0)
                    self.commodity_margins[comm] = float(np.quantile(c_res, c_p))

        self.is_calibrated = True
        logger.info(
            f"Normalized Conformal Calibrator calibrated on {n} points. "
            f"Global Relative Quantile q_rel={self.global_q_rel*100:.2f}% at {int(self.confidence_level*100)}% target confidence."
        )

    def predict_intervals(
        self,
        y_pred: np.ndarray,
        commodity: Optional[str] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Produce tight, locally scaled [lower_bound, upper_bound] for point predictions."""
        if not self.is_calibrated:
            raise RuntimeError("Calibrator must be calibrated before predicting intervals.")

        y_pred = np.asarray(y_pred, dtype=np.float64)
        margin_pct = self.commodity_margins.get(commodity, self.global_q_rel)

        delta = y_pred * margin_pct
        lower = np.clip(y_pred - delta, 0.0, None)
        upper = y_pred + delta
        return lower, upper

    def evaluate_coverage(
        self,
        y_true_test: np.ndarray,
        y_pred_test: np.ndarray,
        commodity_labels: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """Compute empirical coverage, interval width, and per-commodity breakdown on test set."""
        lower, upper = self.predict_intervals(y_pred_test)
        y_true = np.asarray(y_true_test)
        inside = (y_true >= lower) & (y_true <= upper)
        empirical_coverage = float(np.mean(inside) * 100.0)
        avg_width = float(np.mean(upper - lower))
        avg_width_pct = float(np.mean((upper - lower) / (y_pred_test + 1e-5)) * 100.0)

        comm_breakdown = {}
        if commodity_labels is not None:
            comm_arr = np.asarray(commodity_labels)
            for c in np.unique(comm_arr):
                c_idx = comm_arr == c
                if np.sum(c_idx) >= 2:
                    c_inside = inside[c_idx]
                    c_widths = (upper[c_idx] - lower[c_idx])
                    comm_breakdown[c] = {
                        "empirical_coverage_pct": round(float(np.mean(c_inside) * 100.0), 1),
                        "avg_width_rs": round(float(np.mean(c_widths)), 2),
                        "sample_count": int(np.sum(c_idx))
                    }

        return {
            "target_coverage_pct": self.confidence_level * 100.0,
            "empirical_coverage_pct": round(empirical_coverage, 2),
            "average_interval_width_rs": round(avg_width, 2),
            "average_relative_width_pct": round(avg_width_pct, 2),
            "global_relative_margin_pct": round(self.global_q_rel * 100.0, 2),
            "commodity_breakdown": comm_breakdown
        }

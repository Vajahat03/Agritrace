"""
TreeSHAP and Feature Attribution Driver Analysis Module
"""

import logging
from typing import Dict, List, Any
import numpy as np
import pandas as pd
import shap

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class PriceExplainabilityAnalyzer:
    """Computes SHAP explanations and factor contributions for price predictions."""

    def __init__(self, xgb_model, feature_names: List[str]):
        self.xgb_model = xgb_model
        self.feature_names = feature_names
        try:
            self.explainer = shap.TreeExplainer(self.xgb_model)
        except Exception as e:
            logger.warning(f"Failed to initialize TreeExplainer: {e}")
            self.explainer = None

    def explain_instance(self, sample_features: np.ndarray, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Explain why the model predicted price for an observation.
        Returns list of top driving factors with signed price impacts.
        """
        if self.explainer is None:
            return [{"factor": "Model Baseline", "impact_rs": 0.0}]

        sample = np.asarray(sample_features).reshape(1, -1)
        shap_values = self.explainer.shap_values(sample)[0]

        factors = []
        for i, val in enumerate(shap_values):
            feat_name = self.feature_names[i] if i < len(self.feature_names) else f"feature_{i}"
            factors.append({
                "factor": feat_name,
                "impact_rs": round(float(val), 2),
                "abs_impact": abs(float(val))
            })

        factors.sort(key=lambda x: x["abs_impact"], reverse=True)
        top_factors = factors[:top_k]
        return top_factors

    def get_global_importance(self, X_sample: np.ndarray, top_k: int = 10) -> Dict[str, float]:
        """Compute mean absolute SHAP value across a dataset sample."""
        if self.explainer is None:
            return {}

        sample = np.asarray(X_sample)[:200]
        shap_values = self.explainer.shap_values(sample)
        mean_abs_shap = np.mean(np.abs(shap_values), axis=0)

        importance_dict = {}
        for i, val in enumerate(mean_abs_shap):
            feat_name = self.feature_names[i] if i < len(self.feature_names) else f"feature_{i}"
            importance_dict[feat_name] = round(float(val), 4)

        sorted_importance = dict(sorted(importance_dict.items(), key=lambda item: item[1], reverse=True)[:top_k])
        return sorted_importance

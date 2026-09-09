"""
AgriTrace Unified Price Prediction and Decision Integration Engine
Provides dedicated multi-horizon forecasting (T+1, T+3, T+7),
tight normalized conformal prediction intervals, fuzzy market pressure analysis,
TreeSHAP explainability, and AgriTrace Decision Engine actions.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

from ai.price.models.xgboost_price import XGBoostPriceModel
from ai.price.models.lstm_price import LSTMModelManager
from ai.price.models.tcn_price import TCNModelManager
from ai.price.models.mlp_price import MLPModelManager
from ai.price.models.ensemble import HybridEnsembleModel
from ai.price.computational_intelligence.fuzzy_price import FuzzyMarketPressureEngine
from ai.price.calibration.conformal import ConformalPriceCalibrator
from ai.price.explainability.shap_analysis import PriceExplainabilityAnalyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODELS_GLOBAL_DIR = os.path.join(os.getcwd(), "models", "price", "global")


class AgriTracePricePredictor:
    """Production Inference Engine for Agricultural Commodity Price Forecasting."""

    def __init__(self, models_dir: str = MODELS_GLOBAL_DIR):
        self.models_dir = models_dir
        # Multi-Horizon Dedicated XGBoost Models
        self.xgb_h1 = None
        self.xgb_h3 = None
        self.xgb_h7 = None
        self.lstm_mgr = None
        self.tcn_mgr = None
        self.mlp_mgr = None
        self.ensemble = None
        self.calibrator = None
        self.fuzzy_engine = FuzzyMarketPressureEngine()
        self.explainability = None
        self.feature_cols: List[str] = []
        self.champion_model_name: str = "XGBoost"
        self.is_loaded = False

    def load_artifacts(self, config_file: Optional[str] = None):
        """Load trained model weights, multi-horizon regressors, and conformal calibrator."""
        config_path = config_file or os.path.join(self.models_dir, "model_config.json")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Model config not found at {config_path}. Train models first.")

        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        self.feature_cols = config.get("feature_cols", [])
        self.champion_model_name = config.get("champion_model", "XGBoost")
        input_dim = len(self.feature_cols)

        # 1. Multi-Horizon XGBoost Models
        h1_path = os.path.join(self.models_dir, "xgboost_h1.json")
        h3_path = os.path.join(self.models_dir, "xgboost_h3.json")
        h7_path = os.path.join(self.models_dir, "xgboost_h7.json")
        default_xgb = os.path.join(self.models_dir, "xgboost.json")

        self.xgb_h1 = XGBoostPriceModel()
        self.xgb_h1.load(h1_path if os.path.exists(h1_path) else default_xgb)

        self.xgb_h3 = XGBoostPriceModel()
        if os.path.exists(h3_path):
            self.xgb_h3.load(h3_path)
        else:
            self.xgb_h3 = self.xgb_h1

        self.xgb_h7 = XGBoostPriceModel()
        if os.path.exists(h7_path):
            self.xgb_h7.load(h7_path)
        else:
            self.xgb_h7 = self.xgb_h1

        # 2. LSTM
        lstm_path = os.path.join(self.models_dir, "lstm.pt")
        self.lstm_mgr = LSTMModelManager(input_dim=input_dim)
        if os.path.exists(lstm_path):
            self.lstm_mgr.load(lstm_path)

        # 3. TCN
        tcn_path = os.path.join(self.models_dir, "tcn.pt")
        self.tcn_mgr = TCNModelManager(input_dim=input_dim)
        if os.path.exists(tcn_path):
            self.tcn_mgr.load(tcn_path)

        # 4. Tabular MLP
        mlp_path = os.path.join(self.models_dir, "mlp.pt")
        self.mlp_mgr = MLPModelManager(input_dim=input_dim)
        if os.path.exists(mlp_path):
            self.mlp_mgr.load(mlp_path)

        # 5. Hybrid Ensemble
        ens_path = os.path.join(self.models_dir, "ensemble.json")
        self.ensemble = HybridEnsembleModel()
        if os.path.exists(ens_path):
            self.ensemble.load(ens_path)

        # 6. Conformal Calibrator
        self.calibrator = ConformalPriceCalibrator(confidence_level=0.90)
        self.calibrator.global_q_rel = config.get("conformal_global_q_rel", 0.12)
        self.calibrator.commodity_margins = config.get("conformal_commodity_margins", {})
        self.calibrator.is_calibrated = True

        # 7. Explainability
        self.explainability = PriceExplainabilityAnalyzer(self.xgb_h1.model, self.feature_cols)

        self.is_loaded = True
        logger.info(f"AgriTrace Price Predictor successfully loaded all models (Champion: {self.champion_model_name}) from {self.models_dir}")

    def predict_commodity(
        self,
        features_row: pd.Series,
        commodity: str,
        market: str,
        state: Optional[str] = None,
        district: Optional[str] = None,
        weather_scenario: Optional[Dict[str, float]] = None,
        forecast_date: Optional[str] = None,
        remaining_shelf_life_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate complete production forecast with dedicated multi-horizon forecasts,
        conformal bounds, fuzzy market pressure, explainability, and shelf-life decisions.
        Supports scenario-aware meteorological features (temperature, humidity, rainfall).
        """
        if not self.is_loaded:
            self.load_artifacts()

        # Build complete scenario feature dictionary
        scenario_features = features_row.to_dict() if isinstance(features_row, pd.Series) else dict(features_row)

        # Incorporate weather scenario if provided, or verify availability
        weather_status = {"weather_available": False, "source": "None"}
        if weather_scenario and isinstance(weather_scenario, dict):
            for k, v in weather_scenario.items():
                scenario_features[k] = v
            scenario_features["weather_available"] = 1.0
            weather_status = {
                "weather_available": True,
                "temp_mean_c": weather_scenario.get("temp_mean_c"),
                "humidity_mean_pct": weather_scenario.get("humidity_mean_pct"),
                "rainfall_mm": weather_scenario.get("rainfall_mm")
            }
        elif "weather_available" in scenario_features and scenario_features["weather_available"] == 1.0:
            weather_status = {
                "weather_available": True,
                "temp_mean_c": scenario_features.get("temp_mean_c"),
                "humidity_mean_pct": scenario_features.get("humidity_mean_pct"),
                "rainfall_mm": scenario_features.get("rainfall_mm")
            }
        else:
            scenario_features["weather_available"] = 0.0

        # Prepare feature vector matching exact trained feature columns
        feat_vector = np.array([scenario_features.get(c, 0.0) for c in self.feature_cols], dtype=np.float32).reshape(1, -1)

        # 1. Dedicated Multi-Horizon Forecasts
        pred_h1 = float(self.xgb_h1.predict(feat_vector)[0])
        pred_h3 = float(self.xgb_h3.predict(feat_vector)[0])
        pred_h7 = float(self.xgb_h7.predict(feat_vector)[0])

        current_price = float(scenario_features.get("price_current", scenario_features.get("modal_price", pred_h1)))

        # 2. Conformal Interval (Proportional & Locally Scaled)
        lower_bound, upper_bound = self.calibrator.predict_intervals(np.array([pred_h1]), commodity=commodity)

        # 3. Dynamic Fuzzy Market Pressure
        pct_change_7d = float(scenario_features.get("price_pct_change_7d", (pred_h1 - current_price) / (current_price + 1e-5)))
        volatility_7d = float(scenario_features.get("volatility_7d", 0.05))
        arr_change_7d = float(scenario_features.get("arrival_change_7d", 0.0))
        fuzzy_result = self.fuzzy_engine.evaluate_pressure(pct_change_7d, volatility_7d, arr_change_7d)

        # 4. TreeSHAP Factor Drivers (strictly from active input features)
        top_drivers = self.explainability.explain_instance(feat_vector, top_k=4)

        # 5. AgriTrace Logistics Decision Integration
        decision = self._generate_agritrace_decision(
            current_price=current_price,
            predicted_h1=pred_h1,
            predicted_h3=pred_h3,
            trend_signal=fuzzy_result["trend_signal"],
            remaining_shelf_life=remaining_shelf_life_days
        )

        return {
            "commodity": commodity,
            "market": market,
            "forecast_date": forecast_date or "Next Mandi Day",
            "current_price": {
                "value": round(current_price, 2),
                "unit": "Rs/Quintal",
                "normalized_value_rs_kg": round(current_price / 100.0, 2),
                "normalized_unit": "Rs/kg"
            },
            "primary_forecast_h1": {
                "expected_price": round(pred_h1, 2),
                "unit": "Rs/Quintal",
                "normalized_price_rs_kg": round(pred_h1 / 100.0, 2),
                "normalized_unit": "Rs/kg",
                "lower_bound": round(float(lower_bound[0]), 2),
                "upper_bound": round(float(upper_bound[0]), 2),
                "confidence_level": "90% Empirical Conformal Interval",
                "relative_margin_pct": round((float(upper_bound[0]) - pred_h1) / (pred_h1 + 1e-5) * 100.0, 1)
            },
            "multi_horizon_forecast": {
                "T+1_day": {"price_rs_quintal": round(pred_h1, 2), "price_rs_kg": round(pred_h1 / 100.0, 2)},
                "T+3_days": {"price_rs_quintal": round(pred_h3, 2), "price_rs_kg": round(pred_h3 / 100.0, 2)},
                "T+7_days": {"price_rs_quintal": round(pred_h7, 2), "price_rs_kg": round(pred_h7 / 100.0, 2)}
            },
            "market_intelligence": {
                "trend": fuzzy_result["trend_signal"],
                "market_pressure_score": fuzzy_result["market_pressure_score"],
                "market_regime": fuzzy_result["regime"],
                "top_drivers": top_drivers
            },
            "scenario_context": {
                "weather": weather_status,
                "feature_vector_size": len(self.feature_cols)
            },
            "agritrace_decision": {
                "action": decision["action"],
                "reason": decision["reason"],
                "remaining_shelf_life_days": remaining_shelf_life_days
            },
            "champion_model": self.champion_model_name,
            "model_version": "AGRITRACE-PRICE-v1.0"
        }

    def _generate_agritrace_decision(
        self,
        current_price: float,
        predicted_h1: float,
        predicted_h3: float,
        trend_signal: str,
        remaining_shelf_life: Optional[int] = None
    ) -> Dict[str, str]:
        """Formulate logistics/sales recommendations combining shelf-life and price momentum."""
        if remaining_shelf_life is not None:
            if remaining_shelf_life <= 2:
                return {
                    "action": "SELL_NOW",
                    "reason": f"Critical remaining shelf-life ({remaining_shelf_life} days). Prioritize sale over market speculation."
                }
            elif remaining_shelf_life <= 4 and trend_signal == "DOWN":
                return {
                    "action": "SELL_SOON",
                    "reason": "Moderate shelf life remaining with falling price trend. Sell within 24-48 hours."
                }
            elif remaining_shelf_life >= 5 and predicted_h3 > current_price * 1.05:
                return {
                    "action": "HOLD_OR_STORE",
                    "reason": f"High shelf life ({remaining_shelf_life} days) and rising price forecast (+{round((predicted_h3/current_price - 1)*100, 1)}% by T+3)."
                }

        if trend_signal == "UP" and predicted_h1 > current_price:
            return {"action": "HOLD", "reason": "Upward price momentum forecasted across near-term horizon."}
        elif trend_signal == "DOWN":
            return {"action": "SELL_NOW", "reason": "Downward price pressure detected in regional mandi."}
        else:
            return {"action": "REGULAR_SALE", "reason": "Market conditions steady within typical volatility bounds."}

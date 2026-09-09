"""
AgriTrace Shelf-Life Agent
Predicts usable remaining shelf life, 90% prediction intervals, and multi-horizon spoilage curves.
"""

from typing import Dict, Any
from agents.base_agent import BaseAgent
from ai.version_registry import MODEL_VERSIONS
from ai.shelf_life.xgboost_model import predict_shelf_life

class ShelfLifeAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Shelf-Life Agent",
            goal="Predict remaining usable shelf life and temporal spoilage risks using multi-modal feature intelligence.",
            version=MODEL_VERSIONS["shelf_life_model"]
        )

    def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        vision_output = state.get("vision_agent_output", {})
        produce_type = vision_output.get("produce_type", state.get("produce_type", "tomato"))
        quality_score = vision_output.get("quality_score", state.get("quality_score", 75.0))
        defect_probability = vision_output.get("defect_probability", 0.15)
        
        telemetry = state.get("telemetry", {})
        temperature_c = telemetry.get("temperature_c", state.get("temperature_c", 22.0))
        humidity_rh = telemetry.get("humidity_rh", state.get("humidity_rh", 75.0))
        storage_type = telemetry.get("storage_type", state.get("storage_type", "ambient"))
        harvest_age_days = state.get("harvest_age_days", 1.5)

        prediction_res = predict_shelf_life(
            produce_type=produce_type,
            freshness_score=quality_score,
            quality_score=quality_score,
            defect_probability=defect_probability,
            temperature_c=temperature_c,
            humidity_rh=humidity_rh,
            harvest_age_days=harvest_age_days,
            storage_type=storage_type
        )

        return {
            "output": prediction_res,
            "confidence": 0.92,
            "evidence": [
                prediction_res.get("explanation", "Shelf-life predicted."),
                f"90% Prediction Interval: {prediction_res['prediction_interval_90']['min_days']}–{prediction_res['prediction_interval_90']['max_days']} days."
            ]
        }

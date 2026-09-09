"""
Model Registry & Version Management Module
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.getcwd(), "models", "price")
REGISTRY_FILE = os.path.join(MODELS_DIR, "registry.json")


class ModelRegistry:
    """Manages versioned storage and provenance for AgriTrace price models."""

    def __init__(self):
        os.makedirs(MODELS_DIR, exist_ok=True)
        os.makedirs(os.path.join(MODELS_DIR, "global"), exist_ok=True)
        os.makedirs(os.path.join(MODELS_DIR, "commodity"), exist_ok=True)
        self.registry_data = self._load_registry()

    def _load_registry(self) -> Dict[str, Any]:
        if os.path.exists(REGISTRY_FILE):
            try:
                with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to read registry: {e}. Starting fresh.")
        return {"models": [], "champion": None, "last_updated": None}

    def register_model(
        self,
        model_id: str,
        model_type: str,
        dataset_meta: Dict[str, Any],
        validation_metrics: Dict[str, float],
        test_metrics: Dict[str, float],
        hyperparameters: Dict[str, Any],
        artifacts: Dict[str, str],
        is_champion: bool = True
    ) -> Dict[str, Any]:
        """Record model metadata and update champion pointer."""
        # Multi-source dataset provenance extraction
        if "agmarknet_mandi_data" in dataset_meta:
            primary_source = dataset_meta["agmarknet_mandi_data"].get("source", "Government of India AGMARKNET")
            checksum = dataset_meta["agmarknet_mandi_data"].get("checksum_sha256")
        else:
            primary_source = dataset_meta.get("source", "Government of India AGMARKNET")
            checksum = dataset_meta.get("checksum")

        record = {
            "model_id": model_id,
            "version": "1.0.0",
            "model_type": model_type,
            "target": "next_day_modal_price",
            "training_source": primary_source,
            "dataset_checksum": checksum,
            "dataset_metadata": dataset_meta,
            "registered_at": datetime.now().isoformat(),
            "validation_metrics": validation_metrics,
            "test_metrics": test_metrics,
            "hyperparameters": hyperparameters,
            "artifacts": artifacts
        }

        self.registry_data["models"].append(record)
        if is_champion:
            self.registry_data["champion"] = model_id
        self.registry_data["last_updated"] = datetime.now().isoformat()

        with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
            json.dump(self.registry_data, f, indent=2)

        logger.info(f"Successfully registered model '{model_id}' (Champion={is_champion}) in registry.")
        return record

    def get_champion_metadata(self) -> Optional[Dict[str, Any]]:
        champion_id = self.registry_data.get("champion")
        if not champion_id:
            return None
        for m in reversed(self.registry_data.get("models", [])):
            if m.get("model_id") == champion_id:
                return m
        return None

"""
Dynamic Schema Inspection and Canonical Field Mapping Module
Implements adaptive schema mapping without hardcoding assumptions.
"""

import json
import logging
from typing import Dict, Any, List, Optional
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Canonical target field names used across AgriTrace
CANONICAL_FIELDS = [
    "state",
    "district",
    "market",
    "commodity",
    "variety",
    "grade",
    "arrival_date",
    "min_price",
    "max_price",
    "modal_price",
    "arrival_quantity"
]

# Known field variations in AGMARKNET & OGD datasets
FIELD_SYNONYMS: Dict[str, List[str]] = {
    "state": ["state", "state_name", "state_id", "statename"],
    "district": ["district", "district_name", "districtname"],
    "market": ["market", "market_name", "market_center", "mandi", "marketname"],
    "commodity": ["commodity", "commodity_name", "crop", "item", "commodityname"],
    "variety": ["variety", "variety_name", "commodity_variety"],
    "grade": ["grade", "grade_name", "quality_grade"],
    "arrival_date": ["arrival_date", "date", "price_date", "reported_date", "arrivaldate"],
    "min_price": ["min_price", "min_x0020_price", "minimum_price", "minprice", "min_rate"],
    "max_price": ["max_price", "max_x0020_price", "maximum_price", "maxprice", "max_rate"],
    "modal_price": ["modal_price", "modal_x0020_price", "modalprice", "modal_rate", "price"],
    "arrival_quantity": ["arrival_quantity", "arrivals", "arrival_tonnes", "quantity", "volume"]
}


class SchemaInspector:
    """Inspects raw dataset schema and dynamically creates canonical mapping."""

    @staticmethod
    def inspect_and_map(raw_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Inspect actual field names in records, resolve mapping to canonical fields,
        and generate a schema report.
        """
        if not raw_records:
            raise ValueError("No records provided for schema inspection.")

        # Aggregate all detected keys across records
        detected_keys = set()
        for r in raw_records[:100]:
            detected_keys.update(r.keys())

        detected_keys_normalized = {k: k.strip().lower().replace(" ", "_") for k in detected_keys}

        mapping: Dict[str, str] = {}
        used_raw_keys = set()
        missing_canonical: List[str] = []

        for canonical_name, synonyms in FIELD_SYNONYMS.items():
            matched_key = None
            # Exact match first
            for raw_key, norm_key in detected_keys_normalized.items():
                if raw_key in used_raw_keys:
                    continue
                if norm_key == canonical_name or norm_key in synonyms:
                    matched_key = raw_key
                    break
            # Substring match second
            if not matched_key:
                for raw_key, norm_key in detected_keys_normalized.items():
                    if raw_key in used_raw_keys:
                        continue
                    if any(syn in norm_key for syn in synonyms):
                        matched_key = raw_key
                        break

            if matched_key:
                mapping[matched_key] = canonical_name
                used_raw_keys.add(matched_key)
            else:
                missing_canonical.append(canonical_name)


        # Build schema report
        report = {
            "total_detected_fields": len(detected_keys),
            "detected_raw_fields": sorted(list(detected_keys)),
            "mapped_canonical_fields": {k: v for k, v in mapping.items()},
            "unmapped_canonical_fields": missing_canonical,
            "has_modal_price": "modal_price" in mapping.values(),
            "has_arrival_date": "arrival_date" in mapping.values(),
            "has_market": "market" in mapping.values(),
            "has_commodity": "commodity" in mapping.values()
        }

        logger.info(f"Schema inspection complete. Mapped {len(mapping)} fields to canonical schema.")
        if "modal_price" not in mapping.values():
            logger.error("Critical target field 'modal_price' not found in detected fields!")
            raise ValueError("Schema validation failed: 'modal_price' could not be resolved from raw fields.")

        return {
            "mapping": mapping,
            "report": report
        }

    @staticmethod
    def apply_mapping(df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
        """Apply dynamic field mapping to a pandas DataFrame."""
        renamed_df = df.rename(columns=mapping)
        return renamed_df

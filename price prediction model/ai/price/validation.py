"""
Data Validation & Quality Reporting Module
"""

import os
import json
import logging
from typing import Dict, Any
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

REPORTS_DIR = os.path.join(os.getcwd(), "data", "reports")


def generate_quality_reports(
    df: pd.DataFrame,
    clean_report: Dict[str, Any],
    provenance_meta: Dict[str, Any]
) -> Dict[str, str]:
    """Generate and write comprehensive JSON data quality and price reports."""
    os.makedirs(REPORTS_DIR, exist_ok=True)

    # 1. Price Quality Report
    price_quality_report = {
        "dataset_source": provenance_meta.get("source", "Government of India AGMARKNET"),
        "resource_id": provenance_meta.get("resource_id", "9ef84268-d588-465a-a308-a864a43d0070"),
        "retrieval_timestamp": provenance_meta.get("retrieved_at"),
        "checksum": provenance_meta.get("checksum"),
        "total_rows": clean_report.get("total_records", len(df)),
        "valid_rows": clean_report.get("valid_training_records", 0),
        "invalid_rows": clean_report.get("invalid_or_flagged_records", 0),
        "duplicate_rows": clean_report.get("exact_duplicates", 0),
        "price_order_violations": clean_report.get("price_order_violations", 0),
        "missing_date_rows": clean_report.get("missing_date_records", 0),
        "outlier_rows": clean_report.get("statistical_outliers_flagged", 0),
        "date_min": clean_report.get("date_range", {}).get("min_date"),
        "date_max": clean_report.get("date_range", {}).get("max_date")
    }

    price_report_path = os.path.join(REPORTS_DIR, "price_quality_report.json")
    with open(price_report_path, "w", encoding="utf-8") as f:
        json.dump(price_quality_report, f, indent=2)

    # 2. Comprehensive Data Quality Dashboard Report
    commodity_counts = df["commodity"].value_counts().head(20).to_dict()
    market_counts = df["market"].value_counts().head(20).to_dict()
    state_counts = df["state"].value_counts().to_dict()

    data_quality_report = {
        "provenance": provenance_meta,
        "metrics": clean_report,
        "breakdown": {
            "top_commodities": commodity_counts,
            "top_markets": market_counts,
            "states": state_counts
        }
    }

    data_report_path = os.path.join(REPORTS_DIR, "data_quality_report.json")
    with open(data_report_path, "w", encoding="utf-8") as f:
        json.dump(data_quality_report, f, indent=2)

    logger.info(f"Price quality report saved: {price_report_path}")
    logger.info(f"Data quality report saved: {data_report_path}")

    return {
        "price_report_path": price_report_path,
        "data_report_path": data_report_path
    }

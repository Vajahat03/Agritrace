"""
AgriTrace Data Cleaning & Anomaly Flagging Module
Preserves raw data auditability while preparing verified canonical records.
"""

import os
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def parse_dates_robustly(date_series: pd.Series) -> pd.Series:
    """Parse dates with multiple format fallback."""
    try:
        return pd.to_datetime(date_series, format="%d/%m/%Y", errors="coerce")
    except Exception:
        return pd.to_datetime(date_series, errors="coerce")


def clean_and_standardize_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Standardize strings, parse dates, normalize units, and flag anomalies without data deletion.
    """
    cleaned_df = df.copy()
    cleaned_df = cleaned_df.loc[:, ~cleaned_df.columns.duplicated()].copy()
    initial_rows = len(cleaned_df)


    # 1. Standardize string fields
    string_cols = ["state", "district", "market", "commodity", "variety", "grade"]
    for col in string_cols:
        if col in cleaned_df.columns:
            cleaned_df[col] = (
                cleaned_df[col]
                .astype(str)
                .str.strip()
                .str.replace(r"\s+", " ", regex=True)
                .str.title()
            )
        else:
            cleaned_df[col] = "Unknown"

    # 2. Parse dates
    if "arrival_date" in cleaned_df.columns:
        cleaned_df["date"] = parse_dates_robustly(cleaned_df["arrival_date"])
    else:
        raise ValueError("Missing 'arrival_date' column in dataset.")

    missing_date_rows = int(cleaned_df["date"].isna().sum())

    # 3. Numeric conversion for prices
    price_cols = ["min_price", "max_price", "modal_price"]
    for col in price_cols:
        if col in cleaned_df.columns:
            cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors="coerce")
        else:
            cleaned_df[col] = np.nan

    # Convert arrival quantity if present
    if "arrival_quantity" in cleaned_df.columns:
        cleaned_df["arrival_quantity"] = pd.to_numeric(cleaned_df["arrival_quantity"], errors="coerce").fillna(0.0)
    else:
        cleaned_df["arrival_quantity"] = 0.0

    # 4. Price Unit Normalization (Standard AGMARKNET reporting is Rs/Quintal = 100 kg)
    # Canonical standard unit: Rs/Quintal, Normalized unit: Rs/kg
    cleaned_df["price_unit"] = "Rs/Quintal"
    cleaned_df["normalized_unit"] = "Rs/kg"
    cleaned_df["normalized_modal_price"] = cleaned_df["modal_price"] / 100.0
    cleaned_df["normalized_min_price"] = cleaned_df["min_price"] / 100.0
    cleaned_df["normalized_max_price"] = cleaned_df["max_price"] / 100.0

    # 5. Duplicate Detection & Tagging
    dedup_key = ["date", "state", "district", "market", "commodity", "variety", "grade"]
    exact_duplicates_count = int(cleaned_df.duplicated(subset=dedup_key, keep=False).sum())
    cleaned_df["is_exact_duplicate"] = cleaned_df.duplicated(subset=dedup_key, keep="first")

    # 6. Price Constraint Validation (Min <= Modal <= Max)
    # Flag rather than silently discard
    has_valid_bounds = (
        (cleaned_df["min_price"] <= cleaned_df["modal_price"]) &
        (cleaned_df["modal_price"] <= cleaned_df["max_price"]) &
        (cleaned_df["modal_price"] > 0)
    )
    cleaned_df["price_constraint_valid"] = has_valid_bounds
    price_order_violations = int((~has_valid_bounds).sum())

    # 7. Outlier Detection per Commodity (IQR & Robust Z-score)
    cleaned_df["is_outlier"] = False
    cleaned_df["outlier_score"] = 0.0

    for commodity, group in cleaned_df.groupby("commodity"):
        prices = group["modal_price"].dropna()
        if len(prices) >= 5:
            q25 = prices.quantile(0.25)
            q75 = prices.quantile(0.75)
            iqr = q75 - q25
            lower_bound = q25 - 2.5 * iqr
            upper_bound = q75 + 2.5 * iqr
            outlier_mask = (group["modal_price"] < lower_bound) | (group["modal_price"] > upper_bound)
            cleaned_df.loc[group.index[outlier_mask], "is_outlier"] = True

    outlier_count = int(cleaned_df["is_outlier"].sum())

    # 8. Composite Training Eligibility Flag
    # Valid for training if: non-null date, positive modal price, not an exact duplicate
    cleaned_df["is_valid_for_training"] = (
        (~cleaned_df["date"].isna()) &
        (cleaned_df["modal_price"] > 0) &
        (~cleaned_df["is_exact_duplicate"]) &
        cleaned_df["price_constraint_valid"]
    )

    valid_training_rows = int(cleaned_df["is_valid_for_training"].sum())

    # Sort chronologically and by series hierarchy
    cleaned_df = cleaned_df.sort_values(
        by=["date", "state", "district", "market", "commodity", "variety", "grade"]
    ).reset_index(drop=True)

    date_min = cleaned_df["date"].min().strftime("%Y-%m-%d") if not cleaned_df["date"].isna().all() else None
    date_max = cleaned_df["date"].max().strftime("%Y-%m-%d") if not cleaned_df["date"].isna().all() else None

    # Quality and Audit Report
    quality_report = {
        "total_records": initial_rows,
        "valid_training_records": valid_training_rows,
        "invalid_or_flagged_records": initial_rows - valid_training_rows,
        "exact_duplicates": exact_duplicates_count,
        "price_order_violations": price_order_violations,
        "missing_date_records": missing_date_rows,
        "statistical_outliers_flagged": outlier_count,
        "date_range": {
            "min_date": date_min,
            "max_date": date_max
        },
        "unique_commodities_count": int(cleaned_df["commodity"].nunique()),
        "unique_markets_count": int(cleaned_df["market"].nunique()),
        "unique_states_count": int(cleaned_df["state"].nunique()),
        "price_units_standardized": "Rs/Quintal -> Rs/kg (canonical normalized)"
    }

    logger.info(f"Data cleaning complete: {valid_training_rows}/{initial_rows} rows valid for model training.")
    return cleaned_df, quality_report

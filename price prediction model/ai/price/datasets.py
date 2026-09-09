"""
Chronological Time-Series Splitting and Walk-Forward Validation Module
"""

import os
import logging
from typing import Dict, Any, Tuple, Generator
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SPLITS_DIR = os.path.join(os.getcwd(), "data", "splits")


def create_chronological_splits(
    df: pd.DataFrame,
    target_col: str = "target",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    save_splits: bool = True
) -> Dict[str, pd.DataFrame]:
    """
    Split time series strictly chronologically:
    Train (first 70%), Validation (next 15%), Test (final untouched 15%).
    Filters rows where target is NaN (e.g. final observation per series where t+1 is unobserved).
    """
    os.makedirs(SPLITS_DIR, exist_ok=True)

    # Filter to rows with valid target
    valid_df = df[~df[target_col].isna()].copy()
    valid_df = valid_df.sort_values("date").reset_index(drop=True)

    total_len = len(valid_df)
    if total_len < 20:
        logger.warning(f"Dataset has only {total_len} samples. Using scaled minimal partitions.")

    train_end = int(total_len * train_ratio)
    val_end = int(total_len * (train_ratio + val_ratio))

    train_df = valid_df.iloc[:train_end].copy()
    val_df = valid_df.iloc[train_end:val_end].copy()
    test_df = valid_df.iloc[val_end:].copy()

    logger.info(
        f"Chronological Split: "
        f"Train={len(train_df)} ({train_df['date'].min().strftime('%Y-%m-%d')} to {train_df['date'].max().strftime('%Y-%m-%d')}), "
        f"Val={len(val_df)} ({val_df['date'].min().strftime('%Y-%m-%d')} to {val_df['date'].max().strftime('%Y-%m-%d')}), "
        f"Test={len(test_df)} ({test_df['date'].min().strftime('%Y-%m-%d')} to {test_df['date'].max().strftime('%Y-%m-%d')})"
    )

    if save_splits:
        train_df.to_parquet(os.path.join(SPLITS_DIR, "train.parquet"), index=False)
        val_df.to_parquet(os.path.join(SPLITS_DIR, "validation.parquet"), index=False)
        test_df.to_parquet(os.path.join(SPLITS_DIR, "test.parquet"), index=False)
        logger.info(f"Splits saved to {SPLITS_DIR}")

    return {
        "train": train_df,
        "val": val_df,
        "test": test_df
    }


def walk_forward_cv_splits(
    df: pd.DataFrame,
    n_splits: int = 3,
    min_train_ratio: float = 0.50
) -> Generator[Tuple[pd.DataFrame, pd.DataFrame], None, None]:
    """
    Generate walk-forward expanding window time-series CV splits.
    """
    valid_df = df.sort_values("date").reset_index(drop=True)
    total_len = len(valid_df)
    start_idx = int(total_len * min_train_ratio)
    step_size = (total_len - start_idx) // (n_splits + 1)

    for i in range(n_splits):
        train_cutoff = start_idx + (i * step_size)
        val_cutoff = train_cutoff + step_size
        train_fold = valid_df.iloc[:train_cutoff]
        val_fold = valid_df.iloc[train_cutoff:val_cutoff]
        yield train_fold, val_fold

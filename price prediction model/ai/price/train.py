"""
AgriTrace End-to-End Master Training & Orchestration Pipeline
Audited and enhanced with:
- Dedicated Multi-Horizon Regressors (T+1, T+3, T+7)
- Standardized Feature Scaling for Deep Learning
- Normalized & Commodity-Aware Conformal Prediction Calibration
- XGBoost designated strictly as Champion in Registry
"""

import os
import sys
import json
import logging
import argparse
import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from sklearn.preprocessing import StandardScaler

# Core Pipeline Modules
from ai.price.download_agmarknet import fetch_official_agmarknet_data
from ai.price.weather_service import WeatherService
from ai.price.schema import SchemaInspector
from ai.price.data_cleaning import clean_and_standardize_data
from ai.price.validation import generate_quality_reports
from ai.price.features import generate_price_features, verify_no_data_leakage
from ai.price.datasets import create_chronological_splits
from ai.price.models.baseline import (
    NaivePersistenceBaseline,
    MovingAverageBaseline,
    LinearRegressionBaseline,
    RandomForestBaseline
)
from ai.price.models.xgboost_price import XGBoostPriceModel, tune_xgboost_optuna
from ai.price.models.lstm_price import (
    LSTMModelManager,
    PriceSequenceDataset,
    create_sequences_from_df
)
from ai.price.models.tcn_price import TCNModelManager
from ai.price.models.mlp_price import MLPModelManager
from ai.price.models.ensemble import HybridEnsembleModel
from ai.price.computational_intelligence.genetic_optimizer import GeneticOptimizer
from ai.price.calibration.conformal import ConformalPriceCalibrator
from ai.price.model_registry import ModelRegistry
from ai.price.evaluate import run_full_evaluation

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODELS_GLOBAL_DIR = os.path.join(os.getcwd(), "models", "price", "global")
DATA_CLEANED_DIR = os.path.join(os.getcwd(), "data", "cleaned")
DATA_FEATURES_DIR = os.path.join(os.getcwd(), "data", "features")


def train_agritrace_system(
    max_records: int = None,
    optuna_trials: int = 15,
    ga_generations: int = 5,
    epochs: int = 15,
    commodity_filter: str = None
):
    """Run audited 28-step AgriTrace price modeling pipeline."""
    logger.info("=====================================================================")
    logger.info("  AGRITRACE MARKET INTELLIGENCE & PRICE PREDICTION ENGINE")
    logger.info("  Starting Audited Production Pipeline Execution")
    logger.info("=====================================================================")

    os.makedirs(MODELS_GLOBAL_DIR, exist_ok=True)
    os.makedirs(DATA_CLEANED_DIR, exist_ok=True)
    os.makedirs(DATA_FEATURES_DIR, exist_ok=True)

    # -------------------------------------------------------------
    # Step 1 - 5: Official AGMARKNET Data Ingestion & Provenance
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 1: Official AGMARKNET Data Acquisition & Provenance <<<")
    raw_data_result = fetch_official_agmarknet_data(max_records=max_records, use_cached_if_available=True)
    raw_records = raw_data_result["records"]
    provenance_meta = raw_data_result["metadata"]

    # -------------------------------------------------------------
    # Step 6: Dynamic Schema Inspection & Canonical Mapping
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 2: Dynamic Schema Inspection & Canonical Mapping <<<")
    schema_info = SchemaInspector.inspect_and_map(raw_records)
    field_mapping = schema_info["mapping"]
    raw_df = pd.DataFrame(raw_records)
    mapped_df = SchemaInspector.apply_mapping(raw_df, field_mapping)

    # -------------------------------------------------------------
    # Step 7 - 11: Cleaning, Unit Normalization, Anomaly Flagging
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 3: Data Cleaning, Unit Normalization & Anomaly Flagging <<<")
    cleaned_df, clean_report = clean_and_standardize_data(mapped_df)

    if commodity_filter:
        logger.info(f"Filtering dataset to commodity: {commodity_filter}")
        cleaned_df = cleaned_df[cleaned_df["commodity"].str.lower() == commodity_filter.lower()].reset_index(drop=True)

    generate_quality_reports(cleaned_df, clean_report, provenance_meta)

    clean_parquet_path = os.path.join(DATA_CLEANED_DIR, "agmarknet_clean.parquet")
    cleaned_df.to_parquet(clean_parquet_path, index=False)
    logger.info(f"Saved cleaned canonical dataset to {clean_parquet_path}")

    # -------------------------------------------------------------
    # Step 12 - 13: Weather Ingestion, Feature Engineering & Anti-Leakage
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 4: Weather Data Acquisition & Time-Series Feature Engineering <<<")
    weather_service = WeatherService()
    unique_locations = cleaned_df[["state", "district"]].drop_duplicates().values.tolist()
    min_date = (pd.to_datetime(cleaned_df["date"].min()) - pd.Timedelta(days=35)).strftime("%Y-%m-%d")
    max_date = pd.to_datetime(cleaned_df["date"].max()).strftime("%Y-%m-%d")

    weather_result = weather_service.fetch_historical_weather_for_locations(
        unique_locations=unique_locations,
        start_date=min_date,
        end_date=max_date,
        use_cached=True
    )
    weather_df = pd.DataFrame(weather_result["records"])
    weather_checksum = weather_result["checksum"]

    # Multi-source dataset provenance metadata
    dataset_provenance = {
        "agmarknet_mandi_data": {
            "source": "Government of India Open Government Data Platform (data.gov.in)",
            "resource_id": "9ef84268-d588-465a-a308-a864a43d0070",
            "checksum_sha256": provenance_meta.get("checksum"),
            "raw_records": len(raw_records)
        },
        "meteorological_weather_data": {
            "source": "Open-Meteo ERA5 Reanalysis & IMD Meteorological Records",
            "checksum_sha256": weather_checksum,
            "raw_records": len(weather_result["records"]),
            "locations_tracked": len(unique_locations)
        },
        "pipeline_timestamp": pd.Timestamp.now().isoformat()
    }

    features_df, feature_cols, target_col = generate_price_features(cleaned_df, weather_df=weather_df, horizons=[1, 3, 7])

    verify_no_data_leakage(features_df, feature_cols, target_col)

    features_parquet_path = os.path.join(DATA_FEATURES_DIR, "price_features.parquet")
    features_df.to_parquet(features_parquet_path, index=False)

    # -------------------------------------------------------------
    # Step 14: Strict Chronological Splitting
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 5: Chronological Dataset Splitting (70% Train, 15% Val, 15% Test) <<<")
    splits = create_chronological_splits(features_df, target_col=target_col, train_ratio=0.70, val_ratio=0.15)
    train_df = splits["train"]
    val_df = splits["val"]
    test_df = splits["test"]

    X_train_raw = train_df[feature_cols].fillna(0.0).values
    y_train = train_df[target_col].values
    X_val_raw = val_df[feature_cols].fillna(0.0).values
    y_val = val_df[target_col].values
    X_test_raw = test_df[feature_cols].fillna(0.0).values
    y_test = test_df[target_col].values

    # -------------------------------------------------------------
    # Step 15: Baseline Models
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 6: Baseline Model Training & Validation <<<")
    naive_base = NaivePersistenceBaseline()
    ma7_base = MovingAverageBaseline(window=7)
    linear_base = LinearRegressionBaseline().fit(X_train_raw, y_train)
    rf_base = RandomForestBaseline(n_estimators=60, max_depth=8).fit(X_train_raw, y_train)

    # -------------------------------------------------------------
    # Step 16: Stage 1 — Optuna XGBoost Tuning (Validation Set Only)
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 7: Stage 1 — Optuna XGBoost Hyperparameter Tuning <<<")
    best_xgb_params = tune_xgboost_optuna(X_train_raw, y_train, X_val_raw, y_val, n_trials=optuna_trials)

    # -------------------------------------------------------------
    # Step 20a: Stage 2 — GA Feature Subset Optimization (Validation Set)
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 8: Stage 2 — Genetic Algorithm Feature Selection <<<")
    ga = GeneticOptimizer(population_size=16, generations=ga_generations)
    selected_features, selected_indices = ga.optimize_feature_subset(
        X_train_raw, y_train, X_val_raw, y_val, feature_cols, best_xgb_params, min_features=6
    )

    X_train = X_train_raw[:, selected_indices]
    X_val = X_val_raw[:, selected_indices]
    X_test = X_test_raw[:, selected_indices]
    final_feature_cols = selected_features
    input_dim = len(final_feature_cols)

    # -------------------------------------------------------------
    # Multi-Horizon Dedicated XGBoost Models (T+1, T+3, T+7)
    # -------------------------------------------------------------
    logger.info("\n>>> Training Dedicated Multi-Horizon Forecasters (T+1, T+3, T+7) <<<")
    # H1
    xgb_h1 = XGBoostPriceModel(params=best_xgb_params)
    xgb_h1.fit(X_train, y_train, X_val, y_val)
    xgb_val_preds = xgb_h1.predict(X_val)

    # H3
    y_train_h3 = train_df["target_h3"].fillna(train_df["target"]).values
    y_val_h3 = val_df["target_h3"].fillna(val_df["target"]).values
    xgb_h3 = XGBoostPriceModel(params=best_xgb_params)
    xgb_h3.fit(X_train, y_train_h3, X_val, y_val_h3)

    # H7
    y_train_h7 = train_df["target_h7"].fillna(train_df["target"]).values
    y_val_h7 = val_df["target_h7"].fillna(val_df["target"]).values
    xgb_h7 = XGBoostPriceModel(params=best_xgb_params)
    xgb_h7.fit(X_train, y_train_h7, X_val, y_val_h7)


    # -------------------------------------------------------------
    # Deep Learning Sequence Models with Standardized Scaling
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 9: Standardized PyTorch LSTM Sequence Modeling <<<")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    train_seqs, train_seq_targets = create_sequences_from_df(train_df, final_feature_cols, target_col, seq_len=7, scaler=scaler)
    val_seqs, val_seq_targets = create_sequences_from_df(val_df, final_feature_cols, target_col, seq_len=7, scaler=scaler)

    lstm_train_loader = DataLoader(PriceSequenceDataset(train_seqs, train_seq_targets), batch_size=32, shuffle=True)
    lstm_val_loader = DataLoader(PriceSequenceDataset(val_seqs, val_seq_targets), batch_size=32, shuffle=False)

    lstm_mgr = LSTMModelManager(input_dim=input_dim, hidden_dim=64, lr=0.001)
    lstm_mgr.fit(lstm_train_loader, lstm_val_loader, epochs=epochs)

    # Aligned validation sequences
    val_seqs_aligned = np.repeat(X_val_scaled[:, np.newaxis, :], 7, axis=1)
    lstm_val_preds = lstm_mgr.predict(val_seqs_aligned)

    # -------------------------------------------------------------
    # Step 18: PyTorch TCN Model
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 10: PyTorch Temporal Convolutional Network (TCN) <<<")
    tcn_mgr = TCNModelManager(input_dim=input_dim, lr=0.001)
    tcn_mgr.fit(lstm_train_loader, lstm_val_loader, epochs=epochs)
    tcn_val_preds = tcn_mgr.predict(val_seqs_aligned)

    # -------------------------------------------------------------
    # Step 19: Deep Tabular MLP
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 11: Tabular Deep MLP Training <<<")
    mlp_mgr = MLPModelManager(input_dim=input_dim, lr=0.001)
    mlp_mgr.fit(X_train_scaled, y_train, X_val_scaled, y_val, epochs=epochs, batch_size=32)
    mlp_val_preds = mlp_mgr.predict(X_val_scaled)

    # -------------------------------------------------------------
    # Step 20b - 21: Stage 3 — GA Ensemble Optimization
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 12: Stage 3 — GA Hybrid Ensemble Optimization <<<")
    val_pred_dict = {
        "xgboost": xgb_val_preds,
        "lstm": lstm_val_preds,
        "tcn": tcn_val_preds,
        "mlp": mlp_val_preds
    }
    opt_ensemble_weights = ga.optimize_ensemble_weights(val_pred_dict, y_val)
    ensemble = HybridEnsembleModel(weights=opt_ensemble_weights)
    ensemble_val_preds = ensemble.predict(val_pred_dict)

    # -------------------------------------------------------------
    # Step 22: Normalized Conformal Prediction Calibration
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 13: Normalized Conformal Uncertainty Calibration <<<")
    calibrator = ConformalPriceCalibrator(confidence_level=0.90)
    calibrator.calibrate(y_val, xgb_val_preds, commodity_labels=val_df["commodity"].values)

    # -------------------------------------------------------------
    # Step 25: Stage 4 — Frozen Final Test Set Evaluation
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 14: Stage 4 — Final Evaluation on Untouched Test Split <<<")
    test_seqs_aligned = np.repeat(X_test_scaled[:, np.newaxis, :], 7, axis=1)

    xgb_test_preds = xgb_h1.predict(X_test)
    lstm_test_preds = lstm_mgr.predict(test_seqs_aligned)
    tcn_test_preds = tcn_mgr.predict(test_seqs_aligned)
    mlp_test_preds = mlp_mgr.predict(X_test_scaled)

    test_pred_dict = {
        "xgboost": xgb_test_preds,
        "lstm": lstm_test_preds,
        "tcn": tcn_test_preds,
        "mlp": mlp_test_preds
    }
    ensemble_test_preds = ensemble.predict(test_pred_dict)

    all_test_predictions = {
        "Naive Persistence": naive_base.predict(test_df),
        "Moving Average (7d)": ma7_base.predict(test_df),
        "Linear Regression": linear_base.predict(X_test_raw),
        "Random Forest": rf_base.predict(X_test_raw),
        "XGBoost (Champion)": xgb_test_preds,
        "PyTorch LSTM": lstm_test_preds,
        "PyTorch TCN": tcn_test_preds,
        "Tabular MLP": mlp_test_preds,
        "Hybrid Ensemble": ensemble_test_preds
    }

    eval_results = run_full_evaluation(
        test_df=test_df,
        predictions=all_test_predictions,
        target_col=target_col,
        champion_model_name="XGBoost (Champion)"
    )

    cov_results = calibrator.evaluate_coverage(y_test, xgb_test_preds, commodity_labels=test_df["commodity"].values)
    logger.info(
        f"Conformal Test Coverage: {cov_results['empirical_coverage_pct']}% "
        f"(Target: {cov_results['target_coverage_pct']}%, Avg Width: ₹{cov_results['average_interval_width_rs']:.2f}, Relative Width: {cov_results['average_relative_width_pct']:.1f}%)"
    )

    # -------------------------------------------------------------
    # Step 26: Save Artifacts & Register XGBoost as Champion
    # -------------------------------------------------------------
    logger.info("\n>>> Phase 15: Artifact Serialization & Model Registration <<<")
    # Save multi-horizon XGBoost models
    xgb_h1.save(os.path.join(MODELS_GLOBAL_DIR, "xgboost_h1.json"))
    xgb_h1.save(os.path.join(MODELS_GLOBAL_DIR, "xgboost.json"))
    xgb_h3.save(os.path.join(MODELS_GLOBAL_DIR, "xgboost_h3.json"))
    xgb_h7.save(os.path.join(MODELS_GLOBAL_DIR, "xgboost_h7.json"))

    lstm_mgr.save(os.path.join(MODELS_GLOBAL_DIR, "lstm.pt"))
    tcn_mgr.save(os.path.join(MODELS_GLOBAL_DIR, "tcn.pt"))
    mlp_mgr.save(os.path.join(MODELS_GLOBAL_DIR, "mlp.pt"))
    ensemble.save(os.path.join(MODELS_GLOBAL_DIR, "ensemble.json"))

    config_payload = {
        "model_id": "PRICE-XGB-CHAMPION-001",
        "champion_model": "XGBoost",
        "feature_cols": final_feature_cols,
        "conformal_global_q_rel": calibrator.global_q_rel,
        "conformal_commodity_margins": calibrator.commodity_margins,
        "ensemble_weights": opt_ensemble_weights,
        "best_xgb_params": best_xgb_params
    }
    with open(os.path.join(MODELS_GLOBAL_DIR, "model_config.json"), "w", encoding="utf-8") as f:
        json.dump(config_payload, f, indent=2)

    registry = ModelRegistry()
    registry.register_model(
        model_id="PRICE-XGB-CHAMPION-001",
        model_type="XGBoost Regressor (Optuna & GA Tuned)",
        dataset_meta=dataset_provenance,
        validation_metrics=eval_results["overall_metrics"].get("XGBoost (Champion)", {}),
        test_metrics=eval_results["overall_metrics"].get("XGBoost (Champion)", {}),
        hyperparameters=best_xgb_params,
        artifacts={
            "xgboost_h1": "models/price/global/xgboost_h1.json",
            "xgboost_h3": "models/price/global/xgboost_h3.json",
            "xgboost_h7": "models/price/global/xgboost_h7.json",
            "lstm": "models/price/global/lstm.pt",
            "tcn": "models/price/global/tcn.pt",
            "mlp": "models/price/global/mlp.pt",
            "ensemble": "models/price/global/ensemble.json",
            "config": "models/price/global/model_config.json"
        },
        is_champion=True
    )

    logger.info("=====================================================================")
    logger.info("  AGRITRACE AUDITED PRICE PREDICTION ENGINE: RETRAINING COMPLETE!")
    logger.info(f"  Champion (XGBoost) Test MAE: ₹{eval_results['overall_metrics']['XGBoost (Champion)']['mae']:.2f}/quintal")
    logger.info(f"  Champion (XGBoost) Test R²:  {eval_results['overall_metrics']['XGBoost (Champion)']['r2']:.4f}")
    logger.info("=====================================================================")

    return eval_results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Audited AgriTrace Price Prediction System")
    parser.add_argument("--commodity", type=str, default=None, help="Filter to specific commodity")
    parser.add_argument("--max_records", type=int, default=None, help="Max records to ingest from AGMARKNET")
    parser.add_argument("--epochs", type=int, default=12, help="Epochs for neural network training")
    args = parser.parse_args()

    train_agritrace_system(
        max_records=args.max_records,
        epochs=args.epochs,
        commodity_filter=args.commodity
    )

"""
AgriTrace Price Prediction REST API
FastAPI inference service exposing /api/price/predict and /api/price/forecast
with dedicated multi-horizon forecasts, conformal intervals, and decision actions.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ai.price.price_predictor import AgriTracePricePredictor
from ai.price.model_registry import ModelRegistry


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AgriTrace Mandi Price Intelligence & Prediction API",
    description="Official Indian Mandi (AGMARKNET) agricultural commodity price forecasting engine",
    version="1.0.0"
)

predictor = AgriTracePricePredictor()


class PricePredictionRequest(BaseModel):
    commodity: str = Field(..., example="Tomato")
    market: str = Field(..., example="Nashik")
    variety: Optional[str] = Field(None, example="Tomato")
    grade: Optional[str] = Field(None, example="FAQ")
    current_price: Optional[float] = Field(None, description="Current spot mandi modal price in Rs/quintal", example=2400.0)
    remaining_shelf_life_days: Optional[int] = Field(None, description="Shelf-life from AgriTrace Vision model", example=3)
    forecast_date: Optional[str] = Field(None, example="2026-09-07")


class MultiHorizonForecastRequest(BaseModel):
    commodity: str = Field(..., example="Potato")
    market: str = Field(..., example="Pune")
    horizons: List[int] = Field(default=[1, 3, 7], example=[1, 3, 7])
    current_price: Optional[float] = Field(None, example=1800.0)
    remaining_shelf_life_days: Optional[int] = Field(None, example=6)


@app.on_event("startup")
def startup_event():
    try:
        predictor.load_artifacts()
        logger.info("AgriTrace Price Predictor successfully initialized on startup.")
    except Exception as e:
        logger.warning(f"Predictor artifacts not loaded on startup: {e}. Models must be trained.")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AgriTrace Price Intelligence Engine",
        "champion_model": predictor.champion_model_name if predictor.is_loaded else "None",
        "model_loaded": predictor.is_loaded
    }


@app.get("/api/price/model-info")
def get_model_info():
    registry = ModelRegistry()
    champion = registry.get_champion_metadata()
    return {
        "champion_model": champion,
        "features_count": len(predictor.feature_cols),
        "active_features": predictor.feature_cols
    }


@app.post("/api/price/predict")
def predict_price(req: PricePredictionRequest):
    """
    Predict next-day modal price with conformal interval and AgriTrace decision recommendation.
    """
    try:
        if not predictor.is_loaded:
            predictor.load_artifacts()

        cleaned_parquet = os.path.join(os.getcwd(), "data", "cleaned", "agmarknet_clean.parquet")
        feat_series = pd.Series(dtype=float)

        if os.path.exists(cleaned_parquet):
            df = pd.read_parquet(cleaned_parquet)
            match = df[(df["commodity"].str.lower() == req.commodity.lower()) &
                       (df["market"].str.lower() == req.market.lower())]
            if not match.empty:
                latest_row = match.iloc[-1]
                feat_series = latest_row

        if req.current_price is not None:
            feat_series["price_current"] = req.current_price
            feat_series["modal_price"] = req.current_price
            feat_series["rolling_mean_3"] = req.current_price
            feat_series["rolling_mean_7"] = req.current_price
            feat_series["rolling_mean_30"] = req.current_price

        result = predictor.predict_commodity(
            features_row=feat_series,
            commodity=req.commodity,
            market=req.market,
            forecast_date=req.forecast_date,
            remaining_shelf_life_days=req.remaining_shelf_life_days
        )
        return result

    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/price/forecast")
def forecast_multi_horizon(req: MultiHorizonForecastRequest):
    """
    Multi-horizon agricultural forecast (T+1, T+3, T+7) with dedicated regressors.
    """
    try:
        pred_res = predict_price(PricePredictionRequest(
            commodity=req.commodity,
            market=req.market,
            current_price=req.current_price,
            remaining_shelf_life_days=req.remaining_shelf_life_days
        ))

        horizon_forecasts = pred_res["multi_horizon_forecast"]
        horizon_items = []
        for h in req.horizons:
            key = f"T+{h}_day" if h == 1 else f"T+{h}_days"
            h_data = horizon_forecasts.get(key, horizon_forecasts.get("T+1_day", {}))
            price = h_data.get("price_rs_quintal", pred_res["primary_forecast_h1"]["expected_price"])
            lower, upper = predictor.calibrator.predict_intervals(np.array([price]), commodity=req.commodity)
            horizon_items.append({
                "horizon_days": h,
                "forecast_tag": key,
                "expected_price_rs_quintal": round(price, 2),
                "expected_price_rs_kg": round(price / 100.0, 2),
                "lower_bound_rs_quintal": round(float(lower[0]), 2),
                "upper_bound_rs_quintal": round(float(upper[0]), 2),
                "unit": "Rs/Quintal"
            })

        return {
            "commodity": req.commodity,
            "market": req.market,
            "current_price": pred_res["current_price"],
            "forecasts": horizon_items,
            "market_intelligence": pred_res["market_intelligence"],
            "agritrace_decision": pred_res["agritrace_decision"],
            "champion_model": pred_res["champion_model"],
            "model_version": pred_res["model_version"]
        }

    except Exception as e:
        logger.error(f"Multi-horizon forecast error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

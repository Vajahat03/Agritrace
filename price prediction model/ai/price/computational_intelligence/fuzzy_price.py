"""
Fuzzy Logic Market Pressure Engine
Translates quantitative market signals (trend, volatility, arrival pressure, seasonality)
into an interpretable qualitative and continuous market pressure indicator [-1.0, +1.0].
"""

import logging
from typing import Dict, Any, Tuple
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def triangular_membership(x: float, a: float, b: float, c: float) -> float:
    """Standard triangular membership function."""
    if x <= a or x >= c:
        return 0.0
    elif a < x <= b:
        return (x - a) / (b - a) if b > a else 1.0
    elif b < x < c:
        return (c - x) / (c - b) if c > b else 1.0
    return 0.0


def trapezoidal_membership(x: float, a: float, b: float, c: float, d: float) -> float:
    """Standard trapezoidal membership function."""
    if x <= a or x >= d:
        return 0.0
    elif a < x < b:
        return (x - a) / (b - a) if b > a else 1.0
    elif b <= x <= c:
        return 1.0
    elif c < x < d:
        return (d - x) / (d - c) if d > c else 1.0
    return 0.0


class FuzzyMarketPressureEngine:
    """Fuzzy Inference System calculating Mandi Market Pressure."""

    def evaluate_pressure(
        self,
        pct_change_7d: float,
        volatility_7d: float,
        arrival_change_7d: float = 0.0,
        month: int = 9
    ) -> Dict[str, Any]:
        """
        Evaluate fuzzy rules and defuzzify via Center of Gravity / weighted sum.
        Input params:
          - pct_change_7d: 7-day price percent change (-0.30 to +0.30)
          - volatility_7d: Coefficient of variation (0.0 to 0.40)
          - arrival_change_7d: Percentage change in mandi arrivals (-0.50 to +0.50)
          - month: Calendar month (1 to 12)
        """
        # 1. Fuzzify Price Trend (-0.25 to +0.25)
        trend_falling = trapezoidal_membership(pct_change_7d, -1.0, -0.5, -0.08, -0.01)
        trend_steady = triangular_membership(pct_change_7d, -0.04, 0.0, 0.04)
        trend_rising = trapezoidal_membership(pct_change_7d, 0.01, 0.08, 0.5, 1.0)

        # 2. Fuzzify Volatility (0.0 to 0.3)
        vol_low = trapezoidal_membership(volatility_7d, 0.0, 0.0, 0.03, 0.08)
        vol_med = triangular_membership(volatility_7d, 0.04, 0.10, 0.18)
        vol_high = trapezoidal_membership(volatility_7d, 0.12, 0.20, 1.0, 1.0)

        # 3. Fuzzify Arrival Pressure (-0.5 to +0.5)
        arr_deficit = trapezoidal_membership(arrival_change_7d, -1.0, -0.5, -0.15, -0.02)
        arr_normal = triangular_membership(arrival_change_7d, -0.05, 0.0, 0.05)
        arr_glut = trapezoidal_membership(arrival_change_7d, 0.02, 0.15, 0.5, 1.0)

        # 4. Fuzzy Rule Base Evaluations (Consequent weights between -1.0 and +1.0)
        rules = [
            # Rule 1: Strong Bullish: Rising price + Supply Deficit
            (min(trend_rising, arr_deficit if arr_deficit > 0 else 1.0), +0.90),
            # Rule 2: Strong Bearish: Falling price + Market Glut
            (min(trend_falling, arr_glut if arr_glut > 0 else 1.0), -0.90),
            # Rule 3: Steady market
            (trend_steady, 0.0),
            # Rule 4: Moderate Bullish: Rising price with normal arrivals
            (min(trend_rising, arr_normal if arr_normal > 0 else 1.0), +0.50),
            # Rule 5: Moderate Bearish: Falling price with normal arrivals
            (min(trend_falling, arr_normal if arr_normal > 0 else 1.0), -0.50),
            # Rule 6: High Volatility Shock with Rising
            (min(vol_high, trend_rising), +0.70),
            # Rule 7: High Volatility Shock with Falling
            (min(vol_high, trend_falling), -0.70)
        ]

        # Defuzzification (Weighted average of activated rules)
        total_weight = sum(w for w, _ in rules)
        if total_weight > 0:
            pressure_score = sum(w * c for w, c in rules) / total_weight
        else:
            # Fallback to direct scaled trend
            pressure_score = float(np.clip(pct_change_7d * 5.0, -1.0, 1.0))

        pressure_score = float(np.clip(pressure_score, -1.0, 1.0))

        # Categorical regime
        if pressure_score >= 0.5:
            regime = "STRONG_BULLISH"
            trend_signal = "UP"
        elif pressure_score >= 0.15:
            regime = "MODERATE_BULLISH"
            trend_signal = "UP"
        elif pressure_score <= -0.5:
            regime = "STRONG_BEARISH"
            trend_signal = "DOWN"
        elif pressure_score <= -0.15:
            regime = "MODERATE_BEARISH"
            trend_signal = "DOWN"
        else:
            regime = "NEUTRAL"
            trend_signal = "STABLE"

        return {
            "market_pressure_score": round(pressure_score, 4),
            "regime": regime,
            "trend_signal": trend_signal,
            "membership_degrees": {
                "trend_rising": round(float(trend_rising), 3),
                "trend_falling": round(float(trend_falling), 3),
                "volatility_high": round(float(vol_high), 3)
            }
        }

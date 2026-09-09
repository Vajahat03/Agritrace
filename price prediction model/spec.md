# AgriTrace Price Prediction System

official Government of India dataset link into Antigravity:

AGMARKNET — Current Daily Price of Various Commodities from Various Markets (Mandi)

Direct link:
https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi

It is the official OGD/AGMARKNET resource, has daily granularity, and provides wholesale minimum, maximum and modal prices. The resource was updated September 4, 2026

## 1. Project Name

**AgriTrace Market Intelligence & Price Prediction Engine**

### Purpose

Build a production-grade agricultural commodity price forecasting system for AgriTrace using **real official Indian mandi data from AGMARKNET**, combining:

* Classical statistical regression
* Gradient-boosted machine learning
* Neural networks
* Deep learning time-series forecasting
* Computational intelligence
* Feature engineering
* Hyperparameter optimization
* Ensemble learning
* Uncertainty estimation
* Continuous model evaluation
* Real-time market data ingestion

The system must predict future mandi prices for agricultural commodities and provide those predictions to the AgriTrace Decision Engine.

---

# 2. Core Objective

The system must answer:

> **"Given the commodity, market, historical prices, arrivals, seasonality and other available market information, what is the expected mandi price in the future?"**

Primary prediction:

```text
Next-day modal mandi price
```

Additional forecasts:

```text
1-day ahead
3-day ahead
7-day ahead
```

Where sufficient historical data exists.

The system must never fabricate historical prices or synthetic training records.

---

# 3. Official Data Source

## Primary source

Use the Government of India's Open Government Data Platform resource:

**Current Daily Price of Various Commodities from Various Markets (Mandi)**

The dataset is generated through AGMARKNET and is maintained by the Ministry of Agriculture & Farmers Welfare / Directorate of Marketing & Inspection. It has daily granularity and provides wholesale price information.

Official source:

[Government of India — AGMARKNET Mandi Price Dataset](https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi?utm_source=chatgpt.com)

Official AGMARKNET portal:

[AGMARKNET](https://agmarknet.gov.in/?utm_source=chatgpt.com)

The official platform also exposes daily price and arrival reporting.

---

# 4. Data Acquisition Requirements

The system must obtain data through:

1. Official Government OGD API where available
2. Official downloadable CSV/resource
3. Official AGMARKNET source where necessary

Do NOT use:

* Synthetic prices
* Randomly generated market data
* Manually invented historical records
* LLM-generated data
* Fake weather data
* Fake arrivals
* Fake prices

Third-party mirrors such as Kaggle may only be used for debugging or comparison.

The final training dataset must be traceable to the official government source.

---

# 5. Data Provenance

Every downloaded dataset must store:

```text
source_name
source_url
resource_id
download_timestamp
dataset_version
retrieval_timestamp
date_min
date_max
row_count
checksum
```

Example:

```json
{
  "source": "Government of India OGD / AGMARKNET",
  "resource": "Current Daily Price of Various Commodities from Various Markets",
  "retrieved_at": "2026-09-06T10:00:00",
  "row_count": 0,
  "date_min": null,
  "date_max": null,
  "checksum": null
}
```

The actual values must be generated from the downloaded data.

---

# 6. No-Fabrication Rule

This is a critical requirement.

The system must never claim:

```text
5 years of data
10 million records
95% accuracy
₹50 prediction
```

unless these values actually exist in the downloaded/evaluated data.

All dataset statistics must be calculated programmatically.

---

# 7. Raw Dataset Layer

Create:

```text
data/
├── raw/
│   └── agmarknet/
├── cleaned/
├── processed/
├── features/
├── splits/
└── external/
```

Raw data must never be overwritten.

Example:

```text
data/raw/agmarknet/
├── agmarknet_YYYY_MM.csv
├── agmarknet_YYYY_MM.csv.sha256
└── metadata.json
```

---

# 8. Data Schema

The ingestion system must first inspect the actual official schema.

Expected/usable fields may include:

```text
Arrival_Date
State
District
Market
Commodity
Variety
Grade
Min_Price
Max_Price
Modal_Price
Arrival_Quantity
```

However:

> The implementation must not assume a field exists simply because it is expected.

The ingestion script must inspect the actual API/CSV response and create a schema report.

If a field is unavailable, the model must not invent it.

---

# 9. Target Variable

## Primary target

Use:

```text
Next-day Modal Price
```

For each:

```text
Commodity + Market + Variety + Grade
```

time series.

Example:

```text
2026-01-01 → ₹2200
2026-01-02 → ₹2250
2026-01-03 → ₹2380
```

Training example:

```text
Features through 2026-01-02
             ↓
Target = 2026-01-03 modal price
```

---

# 10. Forecast Horizons

The system should support:

### H1

```text
T + 1 day
```

### H3

```text
T + 3 days
```

### H7

```text
T + 7 days
```

Initially prioritize:

```text
T + 1
```

Then add:

```text
T + 3
T + 7
```

after validating sufficient historical continuity.

---

# 11. Price Definition

The primary target is:

```text
Modal_Price
```

because it represents the central/most typical wholesale market price reported for the observation.

The system may additionally predict:

```text
Expected_Min_Price
Expected_Max_Price
Expected_Modal_Price
```

but modal price remains the primary forecasting target.

---

# 12. Data Cleaning

Implement:

```text
ai/price/data_cleaning.py
```

Responsibilities:

* Remove exact duplicate records
* Standardize column names
* Parse dates
* Normalize commodity names
* Normalize state names
* Normalize market names
* Normalize variety names
* Normalize grade
* Convert prices to numeric
* Convert arrivals to numeric where available
* Detect impossible values
* Handle missing values
* Detect suspicious records
* Sort chronologically

---

# 13. Duplicate Handling

Exact duplicates must be removed using a deterministic key.

Possible key:

```text
date
state
district
market
commodity
variety
grade
```

If multiple legitimate observations exist for the same key, they must not automatically be deleted.

The ingestion report must distinguish:

```text
exact duplicates
legitimate repeated records
conflicting records
missing records
```

---

# 14. Price Validation

Validate:

```text
Min_Price <= Modal_Price <= Max_Price
```

where applicable.

Invalid records must be flagged.

Do not silently modify them.

Create:

```text
data/reports/price_quality_report.json
```

containing:

```text
total_rows
valid_rows
invalid_rows
duplicate_rows
missing_price_rows
missing_date_rows
negative_price_rows
outlier_rows
```

---

# 15. Outlier Detection

Outliers must not automatically be deleted.

Use:

* IQR
* Rolling median deviation
* Robust Z-score
* Percentage-change thresholds

Flag observations such as:

```text
price_change > configurable threshold
```

But retain legitimate agricultural price shocks.

The model should learn genuine market volatility.

---

# 16. Missing Dates

Mandi time series can contain missing days.

Do NOT automatically interpolate prices.

Create a calendar-aware representation:

```text
date
day_of_week
days_since_previous_observation
```

For short gaps, optionally use carefully validated imputation for features.

The target itself must not be fabricated.

---

# 17. Market-Level Time Series

The fundamental series should be:

```text
Commodity
+
Market
+
Variety
+
Grade
```

Example:

```text
Tomato
Maharashtra
Nashik
Tomato
FAQ
```

Each unique market series should be treated as a temporal sequence.

---

# 18. Feature Engineering

Create:

```text
ai/price/features.py
```

Features should include only information available at prediction time.

---

## 18.1 Price Lag Features

For each market/commodity series:

```text
price_lag_1
price_lag_2
price_lag_3
price_lag_7
price_lag_14
price_lag_21
price_lag_30
```

---

# 19. Rolling Features

Calculate:

```text
rolling_mean_3
rolling_mean_7
rolling_mean_14
rolling_mean_30

rolling_std_7
rolling_std_14
rolling_std_30

rolling_min_7
rolling_max_7
```

All rolling features must use historical observations only.

Never use future values.

---

# 20. Momentum Features

Calculate:

```text
price_change_1d
price_change_3d
price_change_7d
price_change_14d

price_pct_change_1d
price_pct_change_7d
price_pct_change_30d
```

---

# 21. Trend Features

Calculate:

```text
short_term_trend
medium_term_trend
long_term_trend
```

Possible implementation:

```text
3-day moving average slope
7-day moving average slope
30-day moving average slope
```

---

# 22. Volatility Features

Calculate:

```text
7-day volatility
14-day volatility
30-day volatility
price_range
coefficient_of_variation
```

---

# 23. Seasonal Features

Create:

```text
day_of_week
day_of_month
week_of_year
month
quarter
year
```

Use cyclic encoding:

```text
sin(day_of_year)
cos(day_of_year)

sin(month)
cos(month)
```

---

# 24. Commodity Features

Encode:

```text
commodity
variety
grade
```

Use:

* Target encoding where appropriate
* One-hot encoding for small cardinality
* Embeddings for neural networks

Never use target leakage.

---

# 25. Market Features

Encode:

```text
state
district
market
```

For high-cardinality markets:

```text
learned embeddings
```

may be used by neural models.

---

# 26. Arrival Features

If the official source provides arrival quantity, include:

```text
arrival_current
arrival_lag_1
arrival_lag_3
arrival_lag_7
arrival_rolling_mean_7
arrival_rolling_mean_30
arrival_change_7d
```

AGMARKNET's official documentation describes daily collection of arrivals and prices.

If arrival quantity is not available in the downloaded resource:

```text
DO NOT FABRICATE IT.
```

The model should train without it.

---

# 27. External Features

External data may optionally be added later:

```text
Weather
Rainfall
Temperature
Humidity
Festival calendar
Market holidays
Supply indicators
```

These must come from real APIs/datasets.

External features must be timestamp-aligned.

They are optional.

The first production model should work using official market data alone.

---

# 28. Model Architecture

AgriTrace will use a **hybrid ensemble architecture**.

```text
                    AGMARKNET
                       │
                       ↓
                Data Pipeline
                       │
                       ↓
              Feature Engineering
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       XGBoost       LSTM/TCN       MLP
          │            │            │
          └────────────┼────────────┘
                       ↓
              Ensemble / Stacking
                       ↓
             Computational Intelligence
                       ↓
             Final Price Prediction
                       ↓
             Prediction Interval
```

---

# 29. Model 1 — XGBoost Regression

File:

```text
ai/price/models/xgboost_price.py
```

XGBoost is the primary tabular regression model.

Input:

```text
lag features
rolling features
trend
volatility
seasonality
market
commodity
arrival features
```

Output:

```text
predicted price
```

---

# 30. XGBoost Objective

Use:

```text
reg:squarederror
```

Initially.

Also experiment with robust objectives if the data contains strong price shocks.

Candidate parameters:

```text
n_estimators
max_depth
learning_rate
subsample
colsample_bytree
min_child_weight
reg_alpha
reg_lambda
gamma
```

---

# 31. XGBoost Hyperparameter Optimization

Do not manually claim optimal parameters.

Use:

```text
Optuna
```

or another reproducible optimization framework.

Optimization objective:

```text
validation MAE
```

subject to:

```text
time-series validation
```

Never randomly shuffle time-series data during validation.

---

# 32. Model 2 — Deep Learning Time-Series Model

Use:

```text
LSTM
```

or preferably:

```text
TCN / LSTM hybrid
```

for the first deep-learning implementation.

File:

```text
ai/price/models/lstm_price.py
```

Input sequence:

```text
previous N days
```

Example:

```text
30-day window
```

Each timestep contains:

```text
price
arrival
rolling features
seasonal features
```

where available.

---

# 33. Neural Network Architecture

Initial architecture:

```text
Input Sequence
      ↓
Feature Projection
      ↓
LSTM
      ↓
LSTM
      ↓
Dropout
      ↓
Dense
      ↓
Price Output
```

Example:

```text
Input: 30 × F
LSTM: 128
LSTM: 64
Dropout: 0.2
Dense: 64
Dense: 1
```

These are initial values, not final fixed values.

Hyperparameter tuning must determine the final configuration.

---

# 34. Deep Learning Fine-Tuning

The neural model must follow:

```text
Stage 1
Train global model
        ↓
Stage 2
Validate on unseen time period
        ↓
Stage 3
Fine-tune on sufficiently large commodity/market series
        ↓
Stage 4
Re-evaluate on future holdout
```

Fine-tuning must never use the test set.

---

# 35. Global vs Commodity-Specific Models

Do not immediately create hundreds of models.

Use a hierarchical strategy.

### Global model

Train one model using:

```text
all commodities
all eligible markets
```

with categorical/embedding information.

### Commodity-specific model

Create a specialized model only when enough historical observations exist.

Example:

```text
models/price/
├── global/
│   ├── xgboost.json
│   └── lstm.pt
│
├── tomato/
│   ├── xgboost.json
│   └── lstm.pt
│
├── onion/
│   ├── xgboost.json
│   └── lstm.pt
│
└── potato/
    ├── xgboost.json
    └── lstm.pt
```

---

# 36. Model Selection

For each commodity:

```text
Global XGBoost
Global LSTM
Commodity XGBoost
Commodity LSTM
```

Evaluate all eligible candidates.

Select the champion based on:

```text
MAE
RMSE
MAPE / sMAPE
R²
directional accuracy
```

with time-series validation.

---

# 37. Computational Intelligence Layer

The computational-intelligence layer should not blindly replace the forecasting models.

It should improve optimization and decision-making.

Use:

```text
Genetic Algorithm
+
Fuzzy Logic
```

---

# 38. Genetic Algorithm

File:

```text
ai/price/computational_intelligence/genetic_optimizer.py
```

Use GA for:

* Feature subset optimization
* XGBoost hyperparameter optimization
* Ensemble-weight optimization

Example chromosome:

```text
[
  learning_rate,
  max_depth,
  subsample,
  colsample,
  lag_1,
  lag_7,
  lag_14,
  rolling_7,
  rolling_30
]
```

Fitness:

```text
Fitness =
    - validation_MAE
    - λ1 * RMSE
    + λ2 * directional_accuracy
```

All optimization must use training/validation data only.

---

# 39. Fuzzy Intelligence Layer

File:

```text
ai/price/computational_intelligence/fuzzy_price.py
```

Fuzzy logic is used for **market trend interpretation**, not as a replacement for the regression model.

Inputs:

```text
Price Trend
Price Volatility
Arrival Change
Seasonal Pressure
```

Membership functions:

```text
Low
Medium
High
```

Example rules:

```text
IF price trend is rising
AND arrival pressure is low
THEN upward price pressure is high

IF price trend is falling
AND arrival pressure is high
THEN downward price pressure is high
```

Output:

```text
market_pressure_score
```

Range:

```text
-1 → strong downward pressure
 0 → neutral
+1 → strong upward pressure
```

---

# 40. Ensemble Layer

Combine:

```text
XGBoost prediction
LSTM prediction
MLP prediction
```

with optimized weights.

Example:

```text
Final Prediction =
w1 * XGBoost
+
w2 * LSTM
+
w3 * MLP
```

where:

```text
w1 + w2 + w3 = 1
```

Weights must be learned from validation data.

Do not hard-code:

```text
0.5 / 0.3 / 0.2
```

without evaluation.

---

# 41. MLP Model

Optional but recommended.

File:

```text
ai/price/models/mlp_price.py
```

Inputs:

```text
engineered tabular features
```

Architecture:

```text
Input
 ↓
Dense
 ↓
BatchNorm
 ↓
ReLU
 ↓
Dropout
 ↓
Dense
 ↓
ReLU
 ↓
Dense
 ↓
Price
```

The MLP provides a second neural perspective on the same structured information.

---

# 42. Final Forecast Engine

File:

```text
ai/price/price_predictor.py
```

Pipeline:

```text
Input
 ↓
Validation
 ↓
Feature generation
 ↓
XGBoost
 ↓
LSTM
 ↓
MLP
 ↓
Ensemble
 ↓
Fuzzy market-pressure analysis
 ↓
Prediction interval
 ↓
Final forecast
```

Output:

```json
{
  "commodity": "Tomato",
  "market": "Nashik",
  "forecast_date": "2026-09-07",
  "predicted_price": 2450,
  "lower_bound": 2250,
  "upper_bound": 2700,
  "trend": "UP",
  "market_pressure": 0.71,
  "horizon_days": 1,
  "model_version": "PRICE-ENSEMBLE-v1"
}
```

The actual values must come from the trained model.

---

# 43. Uncertainty Estimation

The system must not output a single price as absolute truth.

Provide:

```text
point prediction
lower prediction bound
upper prediction bound
```

Possible approaches:

* Quantile regression
* Conformal prediction
* Ensemble dispersion
* Validation residual distribution

Preferred production method:

```text
Conformal prediction
```

because it can provide empirically calibrated prediction intervals without pretending the forecast is certain.

---

# 44. Prediction Example

Instead of:

```text
Tomorrow's price = ₹2,450
```

return:

```text
Expected:
₹2,450/quintal

Prediction interval:
₹2,250–₹2,700/quintal

Trend:
UP

Confidence:
Use calibrated interval coverage rather than arbitrary confidence percentage.
```

---

# 45. Data Splitting

NEVER randomly split time-series observations.

Use chronological splitting.

Example:

```text
Historical data
│
├── 70% Training
├── 15% Validation
└── 15% Test
```

But the exact percentages are configurable.

Example:

```text
2019 ───────── 2023 | 2024 | 2025
       TRAIN          VAL     TEST
```

The test set must represent a genuinely future period.

---

# 46. Rolling Time-Series Validation

Use:

```text
Walk-forward validation
```

Example:

```text
Train: 2019 → 2021
Validate: 2022

Train: 2019 → 2022
Validate: 2023

Train: 2019 → 2023
Validate: 2024

Final Test: 2025+
```

Actual dates depend on the real downloaded dataset.

---

# 47. Data Leakage Prevention

Absolutely prohibited:

```text
future price
future rolling average
future arrival
future target
future-derived features
```

For prediction at:

```text T
```

every feature must be available at:

```text T or earlier
```

Target:

```text T + 1
```

---

# 48. Evaluation Metrics

Calculate:

### MAE

Mean Absolute Error.

Primary metric.

```text
MAE = average(|actual - predicted|)
```

### RMSE

Penalizes larger errors.

### R²

Measures explained variance.

Do NOT clip negative R² to zero.

If:

```text
R² = -0.25
```

report:

```text
R² = -0.25
```

because it is an important failure signal.

### sMAPE

Use where appropriate.

### Directional Accuracy

Measure whether the model correctly predicts:

```text
price ↑
price ↓
price ≈
```

---

# 49. Baseline Models

Before claiming the hybrid system works, compare against:

```text
Naive Last Price
Moving Average
Linear Regression
Random Forest
XGBoost
LSTM
Hybrid Ensemble
```

The hybrid system must demonstrate that it actually improves over simple baselines.

---

# 50. Critical Baseline

Implement:

```text
Tomorrow's price = today's price
```

This is the naive persistence baseline.

If the sophisticated model cannot beat it consistently, the model is not production-ready.

---

# 51. Commodity-Level Evaluation

Generate separate reports for:

```text
Tomato
Onion
Potato
Brinjal
Cauliflower
Cabbage
etc.
```

where enough data exists.

Example:

```text
reports/price/
├── tomato_report.json
├── onion_report.json
├── potato_report.json
└── global_report.json
```

---

# 52. Market-Level Evaluation

Also evaluate major markets separately.

Example:

```text
Nashik
Pune
Mumbai
Delhi
Bengaluru
```

Only include markets actually represented in the dataset.

---

# 53. Error Analysis

For every model, identify:

```text
largest overpredictions
largest underpredictions
high-volatility periods
seasonal failures
market-specific failures
commodity-specific failures
```

Generate:

```text
reports/price/error_analysis.md
```

---

# 54. Stress Testing

Test the model under:

```text
high volatility
sharp price increase
sharp price decrease
missing observations
market data gaps
unusual arrival volume
season transitions
```

Do not fabricate stress-test training data.

Stress testing is evaluation, not training.

---

# 55. Explainability

Use:

```text
SHAP
```

for XGBoost.

Explain:

```text
Why did the model predict ₹X?
```

Example:

```text
Top factors:

7-day price trend       +₹120
30-day average          +₹80
arrival decrease        +₹95
seasonal factor         +₹40
market effect            -₹20
```

Actual contributions must come from SHAP.

---

# 56. Deep Learning Explainability

For neural models, use suitable feature-attribution methods such as:

```text
Integrated Gradients
Permutation Importance
Attention/temporal attribution
```

where technically appropriate.

---

# 57. Model Registry

Create:

```text
models/price/
├── registry.json
├── global/
├── commodity/
└── experiments/
```

Registry example:

```json
{
  "model_id": "PRICE-ENSEMBLE-001",
  "model_type": "XGBoost-LSTM-MLP-Ensemble",
  "target": "next_day_modal_price",
  "training_data": "AGMARKNET",
  "training_start": null,
  "training_end": null,
  "validation_mae": null,
  "test_mae": null,
  "version": "1.0.0"
}
```

No metric should be manually entered.

---

# 58. Experiment Tracking

Every training experiment must record:

```text
experiment_id
timestamp
dataset version
dataset checksum
feature version
model architecture
hyperparameters
training duration
validation metrics
test metrics
model path
git commit
random seed
```

Recommended:

```text
MLflow
```

or a lightweight JSON-based registry if MLflow is unnecessary.

---

# 59. Reproducibility

Set seeds for:

```text
Python
NumPy
PyTorch
XGBoost
```

Record:

```text
random_seed
```

Training should be reproducible as far as hardware/framework nondeterminism permits.

---

# 60. GPU Support

Deep-learning models should support:

```text
CUDA
```

when available.

Automatically select:

```python
cuda
```

otherwise:

```python
cpu
```

XGBoost should use GPU acceleration when supported and configured.

---

# 61. Training Pipeline

Create:

```text
ai/price/train.py
```

Pipeline:

```text
1. Download official data
2. Validate source
3. Generate checksum
4. Inspect schema
5. Clean data
6. Remove exact duplicates
7. Validate prices
8. Sort chronologically
9. Create time-series groups
10. Generate features
11. Generate train/validation/test splits
12. Train baselines
13. Train XGBoost
14. Tune XGBoost
15. Train LSTM/TCN
16. Fine-tune neural model
17. Train MLP
18. Optimize ensemble
19. Optimize GA parameters
20. Calculate fuzzy market-pressure layer
21. Calibrate prediction intervals
22. Evaluate
23. Generate reports
24. Save champion model
25. Register model
```

---

# 62. Training Command

Provide:

```bash
python -m ai.price.train
```

Optional:

```bash
python -m ai.price.train --commodity Tomato
```

```bash
python -m ai.price.train --commodity Onion
```

```bash
python -m ai.price.train --all
```

---

# 63. Data Download Command

Create:

```text
ai/price/download_agmarknet.py
```

Command:

```bash
python -m ai.price.download_agmarknet
```

Requirements:

* Download official source
* Save raw response
* Validate HTTP response
* Record timestamp
* Record checksum
* Avoid duplicate downloads
* Support incremental updates

---

# 64. Feature Generation Command

```bash
python -m ai.price.features
```

Output:

```text
data/features/price_features.parquet
```

Use Parquet for large datasets.

---

# 65. Evaluation Command

```bash
python -m ai.price.evaluate
```

Output:

```text
reports/price/
├── overall_metrics.json
├── overall_report.md
├── commodity_metrics.json
├── market_metrics.json
├── error_analysis.md
├── predictions.csv
└── plots/
```

---

# 66. Inference API

FastAPI endpoint:

```text
POST /api/price/predict
```

Input:

```json
{
  "commodity": "Tomato",
  "market": "Nashik",
  "variety": null,
  "grade": null,
  "horizon_days": 1
}
```

The backend should retrieve the latest eligible historical observations and construct features automatically.

---

# 67. API Response

Example structure:

```json
{
  "commodity": "Tomato",
  "market": "Nashik",
  "horizon_days": 1,
  "predicted_price": 0,
  "lower_bound": 0,
  "upper_bound": 0,
  "trend": "UP",
  "market_pressure": 0,
  "model_version": "PRICE-ENSEMBLE-001"
}
```

Actual values must be generated by inference.

---

# 68. Multi-Horizon API

Support:

```text
/api/price/predict
```

and:

```text
/api/price/forecast
```

Example:

```json
{
  "commodity": "Tomato",
  "market": "Nashik",
  "horizons": [1, 3, 7]
}
```

Output:

```text
T+1
T+3
T+7
```

---

# 69. Integration With AgriTrace Shelf-Life

Price prediction must connect to the existing shelf-life engine.

Architecture:

```text
Vision-D121
     ↓
Freshness / Quality / Defect
     ↓
Shelf-Life Model
     ↓
Remaining Shelf Life
     ↓
Price Prediction
     ↓
Decision Engine
```

---

# 70. Decision Example

Suppose:

```text
Remaining shelf life = 2 days
Current price = ₹2,200
Tomorrow forecast = ₹2,500
Day 2 forecast = ₹2,700
```

Decision Agent may recommend:

```text
SELL_SOON
```

If:

```text
Remaining shelf life = 5 days
Tomorrow forecast = ₹2,300
Day 3 forecast = ₹2,800
```

the system may recommend:

```text
HOLD
```

subject to food-safety, logistics and storage constraints.

The price model must NOT make the final business decision by itself.

---

# 71. Integration With Genetic Decision Engine

Price prediction becomes one input to the existing AgriTrace optimization system.

Example:

```text
Predicted Price
+
Shelf Life
+
Transport Cost
+
Storage Cost
+
Spoilage Risk
+
Buyer Demand
```

Then:

```text
Decision Engine
```

can determine:

```text
SELL_NOW
SELL_SOON
STORE
MOVE
COOL
REINSPECT
DISCARD
```

Hard food-safety rules always override optimization.

---

# 72. Real-Time Updating

The system should periodically retrieve new official market data.

Pipeline:

```text
AGMARKNET
   ↓
New records
   ↓
Validation
   ↓
Feature update
   ↓
Inference
```

Do not automatically retrain after every new record.

---

# 73. Retraining Strategy

Recommended:

```text
Daily:
    update data

Weekly:
    evaluate drift

Monthly:
    retrain candidate models

Major drift:
    trigger earlier retraining
```

Actual frequency should be configurable.

---

# 74. Model Drift Detection

Monitor:

```text
price distribution
feature distribution
prediction error
market coverage
commodity coverage
```

Use:

```text
PSI
KS test
rolling MAE
rolling RMSE
```

where appropriate.

---

# 75. Retraining Rules

Do not replace the production model automatically.

Use:

```text
Candidate Model
      ↓
Validation
      ↓
Test
      ↓
Champion Comparison
      ↓
Approval
      ↓
Production
```

A new model must beat the existing model according to predefined thresholds.

---

# 76. No Continuous Self-Learning Without Validation

The model must NOT:

```text
observe prediction
assume prediction was correct
retrain automatically
```

Instead:

```text
Prediction
 ↓
Actual observed price
 ↓
Evaluation
 ↓
Stored feedback
 ↓
Periodic retraining
 ↓
Validation
 ↓
Deployment
```

---

# 77. Price Feedback Dataset

Store:

```text
prediction_date
commodity
market
forecast_horizon
predicted_price
lower_bound
upper_bound
actual_price
absolute_error
percentage_error
model_version
```

This allows real-world performance tracking.

---

# 78. Database

Store price predictions in MongoDB Atlas.

Collection:

```text
price_predictions
```

Example:

```text
{
  commodity,
  market,
  prediction_date,
  horizon,
  predicted_price,
  lower_bound,
  upper_bound,
  actual_price,
  model_version,
  created_at
}
```

---

# 79. Model Versioning

Every prediction must contain:

```text
model_version
feature_version
dataset_version
```

Example:

```text
PRICE-ENSEMBLE-v1.2
FEATURES-v1.1
AGMARKNET-DATA-v2026-09
```

---

# 80. Dashboard

Create a Price Intelligence dashboard.

Show:

```text
Current price
Predicted price
1-day forecast
3-day forecast
7-day forecast
Prediction interval
Price trend
Historical chart
Market comparison
Commodity comparison
Model accuracy
```

---

# 81. Market Comparison

Example:

```text
Tomato

Nashik      ₹2,450
Pune        ₹2,620
Mumbai      ₹2,780
```

Then show predicted movement.

This can support AgriTrace logistics decisions.

---

# 82. Forecast Chart

The dashboard should display:

```text
Historical price
       │
       │     actual
       │    /
       │   /
       │  /
       │ /       forecast
       │/       /
       └───────/────────────
              T+1 T+3 T+7
```

Prediction intervals should be shown around the forecast.

---

# 83. Data Quality Dashboard

Show:

```text
Records downloaded
Records valid
Records rejected
Markets
Commodities
Date range
Missing dates
Duplicate records
```

This proves the model is actually trained on real data.

---

# 84. Training Report

Generate:

```text
reports/price/training_report.md
```

Must include:

```text
Dataset source
Dataset version
Date range
Number of rows
Number of commodities
Number of markets
Training period
Validation period
Test period

Model architectures
Hyperparameters
Training time

MAE
RMSE
R²
sMAPE
Directional Accuracy

Baseline comparison
XGBoost performance
LSTM performance
MLP performance
Ensemble performance

Best model
```

---

# 85. No Fabricated Metrics

The report must never contain manually written values such as:

```text
Accuracy = 96.4%
MAE = 3.4
R² = 0.98
```

unless generated by the actual evaluation pipeline.

---

# 86. Recommended Project Structure

```text
ai/
└── price/
    ├── __init__.py
    │
    ├── download_agmarknet.py
    ├── ingestion.py
    ├── schema.py
    ├── data_cleaning.py
    ├── validation.py
    ├── features.py
    ├── datasets.py
    │
    ├── models/
    │   ├── baseline.py
    │   ├── xgboost_price.py
    │   ├── lstm_price.py
    │   ├── tcn_price.py
    │   ├── mlp_price.py
    │   └── ensemble.py
    │
    ├── computational_intelligence/
    │   ├── genetic_optimizer.py
    │   └── fuzzy_price.py
    │
    ├── calibration/
    │   └── conformal.py
    │
    ├── explainability/
    │   └── shap_analysis.py
    │
    ├── train.py
    ├── evaluate.py
    ├── inference.py
    ├── price_predictor.py
    └── model_registry.py
```

---

# 87. Data Structure

```text
data/
├── raw/
│   └── agmarknet/
│
├── cleaned/
│   └── agmarknet_clean.parquet
│
├── processed/
│   └── price_series.parquet
│
├── features/
│   └── price_features.parquet
│
├── splits/
│   ├── train.parquet
│   ├── validation.parquet
│   └── test.parquet
│
└── reports/
    └── data_quality_report.json
```

---

# 88. Model Storage

```text
models/
└── price/
    ├── global/
    │   ├── xgboost.json
    │   ├── lstm.pt
    │   ├── mlp.pt
    │   └── ensemble.json
    │
    ├── tomato/
    ├── onion/
    ├── potato/
    │
    └── registry.json
```

Only create commodity-specific directories when sufficient data exists.

---

# 89. Required Python Libraries

Core:

```text
Python 3.11+
pandas
numpy
scikit-learn
xgboost
optuna
scipy
pyarrow
joblib
```

Deep learning:

```text
torch
torchvision
```

Explainability:

```text
shap
```

API:

```text
fastapi
uvicorn
pydantic
```

Database:

```text
pymongo
```

Visualization:

```text
matplotlib
plotly
```

Experiment tracking:

```text
mlflow
```

Optional:

```text
statsmodels
```

for statistical baselines.

---

# 90. Hardware

Minimum:

```text
CPU
16 GB RAM
```

Recommended:

```text
NVIDIA GPU
8 GB+ VRAM
32 GB RAM
```

Deep learning training should automatically fall back to CPU.

---

# 91. Training Phases

## Phase 1 — Official Data

```text
Download AGMARKNET
↓
Validate
↓
Clean
↓
Generate dataset report
```

---

## Phase 2 — Baselines

Train:

```text
Naive
Moving Average
Linear Regression
Random Forest
```

---

## Phase 3 — XGBoost

```text
Feature engineering
↓
XGBoost
↓
Optuna optimization
↓
Validation
```

---

## Phase 4 — Deep Learning

```text
Sequence construction
↓
LSTM/TCN
↓
Training
↓
Fine-tuning
↓
Validation
```

---

## Phase 5 — MLP

```text
Structured features
↓
MLP
↓
Validation
```

---

## Phase 6 — Computational Intelligence

```text
GA
↓
Hyperparameter / ensemble optimization

Fuzzy engine
↓
Market pressure
```

---

## Phase 7 — Ensemble

```text
XGBoost
+
LSTM/TCN
+
MLP
↓
Optimized ensemble
```

---

## Phase 8 — Uncertainty

```text
Conformal calibration
↓
Prediction intervals
```

---

## Phase 9 — Final Evaluation

Use a completely untouched future test period.

---

## Phase 10 — Deployment

Deploy only the validated champion model.

---

# 92. Acceptance Criteria

The system is considered complete only when:

### Data

* [ ] Official AGMARKNET/OGD source used
* [ ] Raw data preserved
* [ ] Dataset checksum recorded
* [ ] No synthetic training records
* [ ] No fabricated labels
* [ ] Data quality report generated
* [ ] Date range calculated automatically

### ML

* [ ] Naive baseline implemented
* [ ] XGBoost implemented
* [ ] Hyperparameter tuning implemented
* [ ] Time-series validation implemented
* [ ] Deep-learning model implemented
* [ ] Neural model fine-tuned
* [ ] MLP implemented
* [ ] Ensemble implemented

### Computational Intelligence

* [ ] Genetic optimization implemented
* [ ] Fuzzy market-pressure engine implemented
* [ ] Ensemble weights optimized

### Evaluation

* [ ] MAE
* [ ] RMSE
* [ ] R²
* [ ] sMAPE
* [ ] Directional Accuracy
* [ ] Commodity-level metrics
* [ ] Market-level metrics
* [ ] Baseline comparison
* [ ] Error analysis
* [ ] Prediction intervals

### Engineering

* [ ] Model registry
* [ ] Version tracking
* [ ] FastAPI endpoint
* [ ] MongoDB storage
* [ ] Dashboard
* [ ] Prediction logging
* [ ] Actual-vs-predicted feedback
* [ ] Drift monitoring

---

# 93. Final AgriTrace Architecture

```text
                 OFFICIAL AGMARKNET
                        │
                        ↓
                Data Acquisition
                        │
                        ↓
                 Data Validation
                        │
                        ↓
                 Feature Engine
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
       XGBoost         LSTM           MLP
          │             │             │
          └─────────────┼─────────────┘
                        ↓
                  GA Optimizer
                        ↓
                  Ensemble Model
                        ↓
              Conformal Prediction
                        ↓
                Price Forecast
                        │
                        ↓
               Fuzzy Market Signal
                        │
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
   Shelf-Life Model                 Market Data
        ↓                               ↓
        └───────────────┬───────────────┘
                        ↓
                 AgriTrace Agents
                        ↓
                 Decision Engine
                        ↓
      SELL / STORE / MOVE / COOL / HOLD
```

# 94. Final Design Principle

AgriTrace must not claim:

> "AI knows the future price."

It should provide:

> **A data-driven forecast with measurable historical performance and an uncertainty range.**

The system's intelligence comes from combining:

```text
Real AGMARKNET data
        +
Time-series ML
        +
Deep Learning
        +
Regression
        +
Computational Intelligence
        +
Uncertainty estimation
        +
AgriTrace shelf-life information
        +
Decision optimization
```

This makes the price prediction component a genuine part of the AgriTrace decision system rather than an isolated price-prediction demo.

# AgriTrace Price Prediction Error Analysis Report

## Champion Model: XGBoost (Champion)

### Residual Summary
- **Mean Absolute Error (MAE)**: ₹930.72/quintal
- **Root Mean Squared Error (RMSE)**: ₹1238.26/quintal
- **Mean Bias**: ₹204.32/quintal
- **Max Overprediction**: +₹3305.85/quintal
- **Max Underprediction**: -₹4544.74/quintal

### Largest Overprediction Instances
| Index | Commodity | Market | Actual Price (₹) | Predicted Price (₹) | Error (₹) |
|---|---|---|---|---|---|
| 10 | Cucumbar(Kheera) | Pennagaram(Uzhavar Sandhai ) | ₹1500.00 | ₹4805.85 | +₹3305.85 |
| 3 | Cowpea(Veg) | Palacode(Uzhavar Sandhai ) | ₹1750.00 | ₹5037.15 | +₹3287.15 |
| 1 | Cowpea(Veg) | Krishnagiri(Uzhavar Sandhai ) | ₹3250.00 | ₹5708.60 | +₹2458.60 |
| 27 | Capsicum | Palanganatham(Uzhavar Sandhai ) | ₹4600.00 | ₹6985.45 | +₹2385.45 |
| 43 | Carrot | Paramathivelur(Uzhavar Sandhai ) | ₹4250.00 | ₹6390.65 | +₹2140.65 |

### Largest Underprediction Instances
| Index | Commodity | Market | Actual Price (₹) | Predicted Price (₹) | Error (₹) |
|---|---|---|---|---|---|
| 9 | Cucumbar(Kheera) | Myladi(Uzhavar Sandhai ) | ₹8000.00 | ₹3455.26 | -₹4544.74 |
| 123 | Cauliflower | Periyakulam(Uzhavar Sandhai ) | ₹6250.00 | ₹3437.66 | -₹2812.34 |
| 13 | Custard Apple(Sharifa) | Thathakapatti(Uzhavar Sandhai ) | ₹7500.00 | ₹4764.01 | -₹2735.99 |
| 75 | Capsicum | Ammapet(Uzhavar Sandhai ) | ₹7750.00 | ₹5020.14 | -₹2729.86 |
| 44 | Carrot | Perampet(Uzhavar Sandhai) | ₹8500.00 | ₹5953.71 | -₹2546.29 |

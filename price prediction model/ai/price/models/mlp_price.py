"""
Tabular Deep Multi-Layer Perceptron (MLP) Model
"""

import os
import logging
from typing import Dict, List, Optional
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class TabularMLP(nn.Module):
    """Deep Tabular MLP with Batch Normalization and Dropout."""

    def __init__(self, input_dim: int, hidden_dim_1: int = 128, hidden_dim_2: int = 64, dropout: float = 0.2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim_1),
            nn.BatchNorm1d(hidden_dim_1),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim_1, hidden_dim_2),
            nn.ReLU(),
            nn.Linear(hidden_dim_2, 1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class MLPModelManager:
    """Manager for training and inference of the Tabular MLP."""

    def __init__(self, input_dim: int, lr: float = 0.001):
        self.model = TabularMLP(input_dim=input_dim).to(DEVICE)
        self.criterion = nn.L1Loss()
        self.optimizer = torch.optim.AdamW(self.model.parameters(), lr=lr, weight_decay=1e-4)

    def fit(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
        epochs: int = 20,
        batch_size: int = 64
    ) -> Dict[str, List[float]]:
        # Replace NaNs with 0
        X_train_clean = np.nan_to_num(X_train, 0.0)
        train_ds = TensorDataset(
            torch.tensor(X_train_clean, dtype=torch.float32),
            torch.tensor(y_train, dtype=torch.float32).unsqueeze(-1)
        )
        train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

        val_loader = None
        if X_val is not None and y_val is not None:
            X_val_clean = np.nan_to_num(X_val, 0.0)
            val_ds = TensorDataset(
                torch.tensor(X_val_clean, dtype=torch.float32),
                torch.tensor(y_val, dtype=torch.float32).unsqueeze(-1)
            )
            val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

        history = {"train_loss": [], "val_loss": []}
        self.model.train()

        for epoch in range(epochs):
            total_train = 0.0
            for bx, by in train_loader:
                bx, by = bx.to(DEVICE), by.to(DEVICE)
                self.optimizer.zero_grad()
                preds = self.model(bx)
                loss = self.criterion(preds, by)
                loss.backward()
                self.optimizer.step()
                total_train += loss.item() * len(by)

            train_loss = total_train / len(X_train)
            history["train_loss"].append(train_loss)

            val_loss = train_loss
            if val_loader:
                self.model.eval()
                total_val = 0.0
                with torch.no_grad():
                    for bx, by in val_loader:
                        bx, by = bx.to(DEVICE), by.to(DEVICE)
                        loss = self.criterion(self.model(bx), by)
                        total_val += loss.item() * len(by)
                val_loss = total_val / len(X_val)
                self.model.train()
            history["val_loss"].append(val_loss)

        return history

    def predict(self, X: np.ndarray) -> np.ndarray:
        self.model.eval()
        X_clean = np.nan_to_num(X, 0.0)
        bx = torch.tensor(X_clean, dtype=torch.float32).to(DEVICE)
        with torch.no_grad():
            preds = self.model(bx).cpu().numpy().squeeze(-1)
        return preds

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save(self.model.state_dict(), filepath)
        logger.info(f"Saved PyTorch MLP model to {filepath}")

    def load(self, filepath: str):
        self.model.load_state_dict(torch.load(filepath, map_location=DEVICE))
        self.model.eval()
        logger.info(f"Loaded PyTorch MLP model from {filepath}")
        return self

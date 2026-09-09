"""
PyTorch LSTM Deep Learning Sequence Model for Agricultural Commodity Prices
Includes standardized feature scaling to ensure numerical stability and gradient convergence.
"""

import os
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class PriceSequenceDataset(Dataset):
    """Dataset creating sequence windows (seq_len x features) to predict future target."""

    def __init__(self, sequences: np.ndarray, targets: np.ndarray):
        self.sequences = torch.tensor(sequences, dtype=torch.float32)
        self.targets = torch.tensor(targets, dtype=torch.float32).unsqueeze(-1)

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        return self.sequences[idx], self.targets[idx]


class LSTMPriceForecaster(nn.Module):
    """Two-layer LSTM with linear projection and dense regression head."""

    def __init__(self, input_dim: int, hidden_dim_1: int = 128, hidden_dim_2: int = 64, dropout: float = 0.2):
        super().__init__()
        self.projection = nn.Linear(input_dim, hidden_dim_1)
        self.lstm = nn.LSTM(
            input_size=hidden_dim_1,
            hidden_size=hidden_dim_2,
            num_layers=2,
            batch_first=True,
            dropout=dropout if dropout > 0 else 0.0
        )
        self.dropout = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_dim_2, 32)
        self.relu = nn.ReLU()
        self.fc_out = nn.Linear(32, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch, seq_len, input_dim]
        proj = self.relu(self.projection(x))
        lstm_out, _ = self.lstm(proj)
        last_step = lstm_out[:, -1, :]
        out = self.dropout(last_step)
        out = self.relu(self.fc1(out))
        price = self.fc_out(out)
        return price


def create_sequences_from_df(
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str = "target",
    seq_len: int = 7,
    scaler: Optional[StandardScaler] = None
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Build sequence windows per series with optional feature scaling.
    Guarantees homogeneous array shape: (N, seq_len, len(feature_cols)).
    """
    all_seqs = []
    all_targets = []
    feat_matrix = df[feature_cols].fillna(0.0).values
    if scaler is not None:
        feat_matrix = scaler.transform(feat_matrix)

    df_scaled = df.copy()
    df_scaled[feature_cols] = feat_matrix

    for _, group in df_scaled.groupby("series_id"):
        group = group.sort_values("date").reset_index(drop=True)
        feat_vals = group[feature_cols].values
        target_vals = group[target_col].values

        n_samples = len(group)
        for i in range(n_samples):
            if np.isnan(target_vals[i]):
                continue

            hist_slice = feat_vals[:i + 1]
            if len(hist_slice) < seq_len:
                pad_width = ((seq_len - len(hist_slice), 0), (0, 0))
                seq = np.pad(hist_slice, pad_width, mode="edge")
            else:
                seq = hist_slice[-seq_len:]

            all_seqs.append(seq)
            all_targets.append(target_vals[i])

    if not all_seqs:
        valid_mask = ~df[target_col].isna()
        valid_feats = feat_matrix[valid_mask]
        valid_targets = df[target_col].values[valid_mask]
        seqs = np.repeat(valid_feats[:, np.newaxis, :], seq_len, axis=1)
        return seqs.astype(np.float32), valid_targets.astype(np.float32)

    return np.array(all_seqs, dtype=np.float32), np.array(all_targets, dtype=np.float32)


class LSTMModelManager:
    """Manager for training, fine-tuning, and inference of the LSTM price model."""

    def __init__(self, input_dim: int, hidden_dim: int = 64, lr: float = 0.001):
        self.input_dim = input_dim
        self.model = LSTMPriceForecaster(input_dim=input_dim, hidden_dim_1=128, hidden_dim_2=hidden_dim).to(DEVICE)
        self.criterion = nn.HuberLoss(delta=100.0)  # Robust loss against price shocks
        self.optimizer = torch.optim.AdamW(self.model.parameters(), lr=lr, weight_decay=1e-4)

    def fit(
        self,
        train_loader: DataLoader,
        val_loader: Optional[DataLoader] = None,
        epochs: int = 20,
        early_stopping_patience: int = 5
    ) -> Dict[str, List[float]]:
        history = {"train_loss": [], "val_loss": []}
        best_val_loss = float("inf")
        patience_counter = 0

        self.model.train()
        for epoch in range(epochs):
            total_train_loss = 0.0
            for seqs, targets in train_loader:
                seqs, targets = seqs.to(DEVICE), targets.to(DEVICE)
                self.optimizer.zero_grad()
                outputs = self.model(seqs)
                loss = self.criterion(outputs, targets)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=5.0)
                self.optimizer.step()
                total_train_loss += loss.item() * len(targets)

            train_loss = total_train_loss / len(train_loader.dataset)
            history["train_loss"].append(train_loss)

            val_loss = train_loss
            if val_loader:
                self.model.eval()
                total_val_loss = 0.0
                with torch.no_grad():
                    for seqs, targets in val_loader:
                        seqs, targets = seqs.to(DEVICE), targets.to(DEVICE)
                        outputs = self.model(seqs)
                        loss = self.criterion(outputs, targets)
                        total_val_loss += loss.item() * len(targets)
                val_loss = total_val_loss / len(val_loader.dataset)
                self.model.train()

            history["val_loss"].append(val_loss)

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= early_stopping_patience:
                    logger.info(f"LSTM Early stopping at epoch {epoch+1}")
                    break

        return history

    def fine_tune(self, commodity_loader: DataLoader, epochs: int = 5, lr: float = 1e-4):
        """Fine-tune global neural representation on specific commodity groups."""
        self.model.train()
        ft_optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        for _ in range(epochs):
            for seqs, targets in commodity_loader:
                seqs, targets = seqs.to(DEVICE), targets.to(DEVICE)
                ft_optimizer.zero_grad()
                loss = self.criterion(self.model(seqs), targets)
                loss.backward()
                ft_optimizer.step()

    def predict(self, seqs: np.ndarray) -> np.ndarray:
        self.model.eval()
        tensor_seqs = torch.tensor(seqs, dtype=torch.float32).to(DEVICE)
        with torch.no_grad():
            preds = self.model(tensor_seqs).cpu().numpy().squeeze(-1)
        return preds

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save(self.model.state_dict(), filepath)
        logger.info(f"Saved PyTorch LSTM model to {filepath}")

    def load(self, filepath: str):
        self.model.load_state_dict(torch.load(filepath, map_location=DEVICE))
        self.model.eval()
        logger.info(f"Loaded PyTorch LSTM model from {filepath}")
        return self

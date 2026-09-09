"""
PyTorch Temporal Convolutional Network (TCN) Model for Agricultural Price Series
Uses causal dilated 1D convolutions with residual connections.
"""

import os
import logging
from typing import Optional, Dict, List
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class ChausalConv1dBlock(nn.Module):
    """Causal dilated conv block with weight norm, ReLU, dropout, and residual skip."""

    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 2, dilation: int = 1, dropout: float = 0.2):
        super().__init__()
        self.padding = (kernel_size - 1) * dilation
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size, padding=self.padding, dilation=dilation)
        self.relu1 = nn.ReLU()
        self.dropout1 = nn.Dropout(dropout)
        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size, padding=self.padding, dilation=dilation)
        self.relu2 = nn.ReLU()
        self.dropout2 = nn.Dropout(dropout)
        self.downsample = nn.Conv1d(in_channels, out_channels, 1) if in_channels != out_channels else None
        self.relu = nn.ReLU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch, channels, seq_len]
        res = x if self.downsample is None else self.downsample(x)

        out = self.conv1(x)
        out = out[:, :, :-self.padding] if self.padding > 0 else out
        out = self.dropout1(self.relu1(out))

        out = self.conv2(out)
        out = out[:, :, :-self.padding] if self.padding > 0 else out
        out = self.dropout2(self.relu2(out))

        return self.relu(out + res)


class TCNPriceModel(nn.Module):
    """Temporal Convolutional Network Forecaster."""

    def __init__(self, input_dim: int, num_channels: List[int] = [64, 64, 32], kernel_size: int = 2, dropout: float = 0.2):
        super().__init__()
        layers = []
        num_levels = len(num_channels)
        for i in range(num_levels):
            dilation_size = 2 ** i
            in_ch = input_dim if i == 0 else num_channels[i - 1]
            out_ch = num_channels[i]
            layers.append(ChausalConv1dBlock(in_ch, out_ch, kernel_size=kernel_size, dilation=dilation_size, dropout=dropout))

        self.network = nn.Sequential(*layers)
        self.fc = nn.Linear(num_channels[-1], 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Input: [batch, seq_len, input_dim] -> transpose to [batch, input_dim, seq_len]
        x_trans = x.transpose(1, 2)
        feat_maps = self.network(x_trans)
        # Take the latest timestep representation
        last_timestep = feat_maps[:, :, -1]
        out = self.fc(last_timestep)
        return out


class TCNModelManager:
    """Manager for training and inference of the TCN price model."""

    def __init__(self, input_dim: int, lr: float = 0.001):
        self.model = TCNPriceModel(input_dim=input_dim).to(DEVICE)
        self.criterion = nn.L1Loss()
        self.optimizer = torch.optim.AdamW(self.model.parameters(), lr=lr, weight_decay=1e-4)

    def fit(self, train_loader: DataLoader, val_loader: Optional[DataLoader] = None, epochs: int = 15) -> Dict[str, List[float]]:
        history = {"train_loss": [], "val_loss": []}
        self.model.train()

        for epoch in range(epochs):
            total_train = 0.0
            for seqs, targets in train_loader:
                seqs, targets = seqs.to(DEVICE), targets.to(DEVICE)
                self.optimizer.zero_grad()
                preds = self.model(seqs)
                loss = self.criterion(preds, targets)
                loss.backward()
                self.optimizer.step()
                total_train += loss.item() * len(targets)

            train_loss = total_train / len(train_loader.dataset)
            history["train_loss"].append(train_loss)

            val_loss = train_loss
            if val_loader:
                self.model.eval()
                total_val = 0.0
                with torch.no_grad():
                    for seqs, targets in val_loader:
                        seqs, targets = seqs.to(DEVICE), targets.to(DEVICE)
                        loss = self.criterion(self.model(seqs), targets)
                        total_val += loss.item() * len(targets)
                val_loss = total_val / len(val_loader.dataset)
                self.model.train()
            history["val_loss"].append(val_loss)

        return history

    def predict(self, seqs: np.ndarray) -> np.ndarray:
        self.model.eval()
        tensor_seqs = torch.tensor(seqs, dtype=torch.float32).to(DEVICE)
        with torch.no_grad():
            preds = self.model(tensor_seqs).cpu().numpy().squeeze(-1)
        return preds

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save(self.model.state_dict(), filepath)
        logger.info(f"Saved PyTorch TCN model to {filepath}")

    def load(self, filepath: str):
        self.model.load_state_dict(torch.load(filepath, map_location=DEVICE))
        self.model.eval()
        logger.info(f"Loaded PyTorch TCN model from {filepath}")
        return self

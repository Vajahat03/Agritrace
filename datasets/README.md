# Dataset setup

The AgriTrace image datasets are intentionally not stored in Git because of their size.

Place the dataset locally under `agritrace - agents/data/` and follow the dataset manifest and project documentation for the expected metadata, splits, and directory layout.

Keep raw images, generated normalized images, archives, and trained model binaries out of the repository. Use the existing verification scripts after restoring a local dataset.
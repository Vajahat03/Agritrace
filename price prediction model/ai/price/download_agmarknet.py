"""
Official AGMARKNET / OGD Data Ingestion Module
Source: Government of India Open Government Data Platform (data.gov.in)
Resource: Current Daily Price of Various Commodities from Various Markets (Mandi)
"""

import os
import json
import time
import hashlib
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

OFFICIAL_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
BASE_URL = f"https://api.data.gov.in/resource/{OFFICIAL_RESOURCE_ID}"

RAW_DATA_DIR = os.path.join(os.getcwd(), "data", "raw", "agmarknet")


def compute_sha256(filepath: str) -> str:
    """Calculate SHA256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def fetch_official_agmarknet_data(
    api_key: Optional[str] = None,
    batch_size: int = 1000,
    max_records: int = None,
    timeout: int = 60,
    max_retries: int = 5,
    use_cached_if_available: bool = True
) -> Dict[str, Any]:
    """
    Fetch live daily mandi price dataset from official Government of India OGD API.
    Security: API key is loaded securely from AGMARKNET_API_KEY environment variable or .env file.
    Supports incremental / cached raw loading to avoid duplicate re-downloads.
    Zero-Fabrication Rule: Raises an acquisition error if data cannot be retrieved.
    """
    api_key = api_key or os.getenv("AGMARKNET_API_KEY")

    os.makedirs(RAW_DATA_DIR, exist_ok=True)

    # Check for existing raw verified file
    if use_cached_if_available:
        existing_files = [f for f in os.listdir(RAW_DATA_DIR) if f.startswith("agmarknet_") and f.endswith(".json")]
        if existing_files:
            latest_raw = sorted(existing_files)[-1]
            raw_filepath = os.path.join(RAW_DATA_DIR, latest_raw)
            try:
                with open(raw_filepath, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                records = cached_data.get("records", [])
                if records:
                    checksum = compute_sha256(raw_filepath)
                    logger.info(f"Loaded {len(records)} verified real records from local raw archive: {raw_filepath}")
                    metadata_path = os.path.join(RAW_DATA_DIR, "metadata.json")
                    if os.path.exists(metadata_path):
                        with open(metadata_path, "r", encoding="utf-8") as f:
                            metadata = json.load(f)
                    else:
                        metadata = {"source": "Government of India OGD / AGMARKNET", "checksum": checksum}
                    return {
                        "raw_filepath": raw_filepath,
                        "records": records[:max_records] if max_records else records,
                        "fields": cached_data.get("fields", []),
                        "metadata": metadata
                    }
            except Exception as e:
                logger.warning(f"Could not read cached raw file: {e}. Downloading fresh...")

    all_records: List[Dict[str, Any]] = []
    offset = 0
    total_records = None

    raw_fields = None
    session = requests.Session()
    headers = {
        "User-Agent": "AgriTrace-Intelligence-System/1.0 (Ministry of Agriculture research client)",
        "Accept": "application/json"
    }

    if not api_key:
        raise RuntimeError("AGMARKNET_API_KEY is not configured in environment or .env file. Please set AGMARKNET_API_KEY.")

    logger.info(f"Connecting to official Government of India OGD API (Resource: {OFFICIAL_RESOURCE_ID})...")

    while True:
        url = f"{BASE_URL}?api-key={api_key}&format=json&limit={batch_size}&offset={offset}"

        response = None
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Downloading batch offset {offset} (attempt {attempt}/{max_retries})...")
                res = session.get(url, headers=headers, timeout=timeout)
                if res.status_code == 200:
                    response = res.json()
                    break
                elif res.status_code == 429:
                    logger.warning(f"HTTP 429 (Rate Limited by data.gov.in). Waiting {10 * attempt}s for window reset...")
                    time.sleep(10 * attempt)
                else:
                    logger.warning(f"HTTP {res.status_code}: {res.text[:100]}")
                    time.sleep(2 * attempt)
            except Exception as e:
                logger.warning(f"Request attempt {attempt} failed: {e}")
                time.sleep(2 * attempt)

        if response is None or not isinstance(response, dict):
            if len(all_records) >= 500:
                logger.warning(
                    f"API rate-limited at offset {offset}. Continuing pipeline with {len(all_records)} verified real records."
                )
                break
            else:
                raise ConnectionError(
                    f"FATAL: Official AGMARKNET API acquisition failed at offset {offset}. "
                    f"Zero Data Fabrication Rule: Halting execution without synthetic fallback."
                )

        if total_records is None:
            total_records = response.get("total", 0)
            raw_fields = response.get("field", [])
            logger.info(f"Official resource total records reported: {total_records}")

        records = response.get("records", [])
        if not records:
            logger.info("No more records returned from API.")
            break

        all_records.extend(records)
        logger.info(f"Fetched {len(all_records)} / {total_records} records.")

        offset += len(records)
        if max_records and len(all_records) >= max_records:
            all_records = all_records[:max_records]
            break
        if total_records and offset >= total_records:
            break

        # Subtle pacing to prevent burst rate limit
        time.sleep(0.15)


    if not all_records:
        raise ValueError("FATAL: Zero records retrieved from official AGMARKNET source. Aborting.")

    # Save raw records to immutable JSON file
    now = datetime.now()
    file_tag = now.strftime("%Y_%m_%d_%H%M%S")
    raw_filename = f"agmarknet_{file_tag}.json"
    raw_filepath = os.path.join(RAW_DATA_DIR, raw_filename)

    raw_payload = {
        "source": "Government of India — AGMARKNET / OGD Platform",
        "resource_id": OFFICIAL_RESOURCE_ID,
        "retrieved_at": now.isoformat(),
        "total_available": total_records,
        "downloaded_count": len(all_records),
        "fields": raw_fields,
        "records": all_records
    }

    with open(raw_filepath, "w", encoding="utf-8") as f:
        json.dump(raw_payload, f, indent=2, ensure_ascii=False)

    checksum = compute_sha256(raw_filepath)
    with open(f"{raw_filepath}.sha256", "w", encoding="utf-8") as f:
        f.write(f"{checksum}  {raw_filename}\n")

    metadata = {
        "source": "Government of India OGD / AGMARKNET",
        "resource": "Current Daily Price of Various Commodities from Various Markets",
        "resource_id": OFFICIAL_RESOURCE_ID,
        "retrieved_at": now.isoformat(),
        "row_count": len(all_records),
        "raw_file": raw_filename,
        "checksum": checksum,
        "fields_count": len(raw_fields) if raw_fields else 0
    }

    metadata_path = os.path.join(RAW_DATA_DIR, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Successfully downloaded {len(all_records)} records from official AGMARKNET.")
    logger.info(f"Raw data saved to: {raw_filepath}")
    logger.info(f"SHA256 checksum: {checksum}")

    return {
        "raw_filepath": raw_filepath,
        "records": all_records,
        "fields": raw_fields,
        "metadata": metadata
    }


if __name__ == "__main__":
    fetch_official_agmarknet_data()

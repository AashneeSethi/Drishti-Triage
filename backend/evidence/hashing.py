import hashlib
from pathlib import Path
from typing import Union

def compute_file_sha256(filepath: Union[str, Path], chunk_size: int = 65536) -> str:
    """
    Computes streaming SHA-256 hash of a file.
    Reads in 64KB chunks to efficiently handle large files without memory spikes.
    """
    path = Path(filepath)
    if not path.is_file():
        raise FileNotFoundError(f"Evidence file not found: {filepath}")

    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(chunk_size):
            hasher.update(chunk)
    return hasher.hexdigest().lower()

def compute_bytes_sha256(data: bytes) -> str:
    """Computes SHA-256 hash of a byte sequence."""
    return hashlib.sha256(data).hexdigest().lower()

def verify_file_integrity(filepath: Union[str, Path], expected_hash: str) -> bool:
    """
    Compares the current SHA-256 of the file against expected_hash.
    Returns True if intact, False if tampered or missing.
    """
    try:
        actual_hash = compute_file_sha256(filepath)
        return actual_hash.lower() == expected_hash.lower()
    except Exception:
        return False

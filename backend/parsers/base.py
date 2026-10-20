import csv
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Union
from backend.normalization.schema import UnifiedEvent

class BaseParser(ABC):
    """
    Abstract Base Class for all Evidence Parser Plugins.
    New evidence sources (WhatsApp, PCAP, EVTX) only need to subclass BaseParser
    and emit UnifiedEvent objects.
    """
    source_type: str

    @abstractmethod
    def can_parse(
        self,
        headers: List[str],
        sample_rows: List[Dict[str, str]]
    ) -> Tuple[bool, float, Dict[str, str]]:
        """
        Determines if this parser handles the given file structure.
        Returns:
            (handles_file: bool, confidence: float, column_mapping: Dict[str, str])
        """
        pass

    @abstractmethod
    def parse(
        self,
        filepath: Union[str, Path],
        artifact_id: str,
        case_id: str,
        case_default_timezone: str = "Asia/Kolkata",
        column_overrides: Optional[Dict[str, str]] = None
    ) -> List[UnifiedEvent]:
        """
        Parses evidence file into canonical UnifiedEvent objects.
        Must strictly preserve 1-indexed row numbers in event.locator.
        """
        pass

    @staticmethod
    def sniff_csv(filepath: Union[str, Path]) -> Tuple[List[str], List[Dict[str, str]], str]:
        """
        Sniffs delimiter and returns headers and initial sample rows.
        """
        path = Path(filepath)
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            sample_text = "".join(f.readline() for _ in range(10))

        # Sniff delimiter: prefer standard comma, then tab, semicolon, pipe
        try:
            dialect = csv.Sniffer().sniff(sample_text, delimiters=",\t;|")
            delimiter = dialect.delimiter
        except Exception:
            delimiter = ","

        headers = []
        sample_rows = []
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f, delimiter=delimiter)
            headers = [h.strip() for h in (reader.fieldnames or [])]
            for idx, row in enumerate(reader):
                sample_rows.append({k.strip(): (v.strip() if v else "") for k, v in row.items()})
                if idx >= 4:
                    break

        return headers, sample_rows, delimiter

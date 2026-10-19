from pathlib import Path
from typing import List, Dict, Tuple, Optional, Union, Type

from backend.parsers.base import BaseParser
from backend.parsers.calls import CallLogCSVParser
from backend.parsers.upi import BankStatementCSVParser
from backend.normalization.schema import UnifiedEvent

class ParserRegistry:
    """
    Central registry and auto-dispatch engine for evidence parsers.
    Selects the optimal parser for any uploaded file using heuristic schema matching.
    """

    def __init__(self):
        self._parsers: List[BaseParser] = [
            CallLogCSVParser(),
            BankStatementCSVParser(),
        ]

    def register_parser(self, parser: BaseParser) -> None:
        self._parsers.append(parser)

    def detect_parser(
        self,
        filepath: Union[str, Path]
    ) -> Tuple[Optional[BaseParser], float, Dict[str, str]]:
        """
        Inspects headers and returns (best_parser, confidence_score, column_mapping).
        """
        path = Path(filepath)
        if not path.is_file():
            raise FileNotFoundError(f"File not found: {filepath}")

        # Check CSV parsers
        try:
            headers, sample_rows, _ = BaseParser.sniff_csv(path)
        except Exception:
            return None, 0.0, {}

        best_parser = None
        best_confidence = 0.0
        best_mapping = {}

        for parser in self._parsers:
            can_handle, confidence, mapping = parser.can_parse(headers, sample_rows)
            if can_handle and confidence > best_confidence:
                best_confidence = confidence
                best_parser = parser
                best_mapping = mapping

        return best_parser, best_confidence, best_mapping

    def parse_file(
        self,
        filepath: Union[str, Path],
        artifact_id: str,
        case_id: str,
        case_default_timezone: str = "Asia/Kolkata",
        forced_source_type: Optional[str] = None,
        column_overrides: Optional[Dict[str, str]] = None
    ) -> Tuple[BaseParser, List[UnifiedEvent], float]:
        """
        Auto-detects and parses any evidence file into canonical UnifiedEvent objects.
        """
        path = Path(filepath)

        parser = None
        confidence = 1.0

        if forced_source_type:
            for p in self._parsers:
                if p.source_type == forced_source_type:
                    parser = p
                    break
            if not parser:
                raise ValueError(f"No registered parser found for source type: '{forced_source_type}'")
        else:
            parser, confidence, _ = self.detect_parser(path)
            if not parser or confidence < 0.50:
                raise ValueError(
                    f"Unable to auto-detect a matching parser for evidence file: '{path.name}'. "
                    f"Confidence score: {confidence:.2f}"
                )

        events = parser.parse(
            filepath=path,
            artifact_id=artifact_id,
            case_id=case_id,
            case_default_timezone=case_default_timezone,
            column_overrides=column_overrides
        )

        return parser, events, confidence

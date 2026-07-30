from dataclasses import dataclass
from typing import Any


@dataclass
class ServiceResult:
    payload: Any
    status_code: int = 200

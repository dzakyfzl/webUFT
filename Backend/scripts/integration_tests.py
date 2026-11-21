"""Run the explicitly approved rollback tests against the configured target."""

import os
from pathlib import Path
import sys
import unittest

root = Path(__file__).resolve().parents[1]
os.chdir(root)
sys.path.insert(0, str(root))
sys.path.insert(0, str(root / "tests"))
os.environ["ERP_INTEGRATION_TEST"] = "1"

if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromNames(sys.argv[1:]) if sys.argv[1:] else unittest.defaultTestLoader.discover("tests")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)

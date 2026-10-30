import sys
from pathlib import Path

# Add project root to sys.path so 'import backend' works seamlessly whether running
# pytest from workspace root or from inside the backend directory.
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import sys
from pathlib import Path

# Add the project root directory to Python path
root_dir = str(Path(__file__).parent)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

if __name__ == "__main__":
    import streamlit as st
    import home
    home.main() 
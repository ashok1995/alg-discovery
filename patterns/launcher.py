# launcher.py
import subprocess
import sys
import os

# Import and set up paths first thing
import path_manager
path_manager.setup_paths()

def launch_app():
    """Launch the Streamlit app"""
    app_path = path_manager.PATHS["app"]
    
    # Pass the PYTHONPATH environment to ensure imports work in the subprocess
    env = os.environ.copy()
    env["PYTHONPATH"] = path_manager.PROJECT_ROOT
    
    subprocess.run(["streamlit", "run", app_path], env=env)

def launch_background():
    """Launch background tasks"""
    subprocess.run([sys.executable, "main.py"])

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Launch Market Analyzer")
    parser.add_argument("--mode", choices=["app", "background", "both"], 
                        default="app", help="Launch mode")
    
    args = parser.parse_args()
    
    if args.mode == "app" or args.mode == "both":
        # Start Streamlit app
        launch_app()
    
    if args.mode == "background" or args.mode == "both":
        # Start background tasks
        launch_background()
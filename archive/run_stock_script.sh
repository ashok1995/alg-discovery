#!/bin/bash
# Activate the virtual environment
source /Users/ashokkumar/Desktop/test/.venv/bin/activate

# Run the Python script and redirect both stdout and stderr to a log file
/Users/ashokkumar/Desktop/test/.venv/bin/python /Users/ashokkumar/Desktop/test/stock_work/fetch_and_store_stock_data.py >> /Users/ashokkumar/Desktop/test/stock_work/cron_output.log 2>&1

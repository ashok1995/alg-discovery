import requests
from bs4 import BeautifulSoup as bs
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
import logging

# Get current date for log file naming
today = datetime.now().strftime('%Y-%m-%d')
log_file_path = f'/Users/ashokkumar/Desktop/test/stock_work/logfile_{today}.log'

# Configure logging
logging.basicConfig(filename=log_file_path,
                    level=logging.INFO,
                    format='%(asctime)s - %(message)s')

def get_stocks_data(query2):
    data = {
        'scan_clause': query2
    }

    try:
        with requests.Session() as s:
            r = s.get('https://chartink.com/screener/alg-test-1')
            soup = bs(r.content, 'html.parser')
            s.headers['X-CSRF-TOKEN'] = soup.select_one('[name=csrf-token]')['content']
            r = s.post('https://chartink.com/screener/process', data=data).json()
            
            df = pd.DataFrame(r['data'])
            df = df.sort_values(by=['per_chg'], ascending=False)
            return df
    except Exception as e:
        logging.error(f"Error fetching stock data: {e}")
        return pd.DataFrame()  # Return an empty DataFrame in case of error

def insert_data_to_mongodb(df):
    if df.empty:
        logging.warning("DataFrame is empty, nothing to insert.")
        return

    try:
        current_datetime = datetime.now()
        df["datetime"] = current_datetime.strftime('%Y-%m-%d %H:%M')
        
        client = MongoClient('mongodb://localhost:27017/')
        db = client['stocks_raw']
        collection = db['stocks_price_at_5min']
        records = df[["nsecode", "datetime", "close", "volume", "per_chg"]].to_dict(orient='records')
        result = collection.insert_many(records)
        num_records_inserted = len(result.inserted_ids)
        logging.info(f"Data inserted successfully. Number of records inserted: {num_records_inserted}.")
    except Exception as e:
        logging.error(f"Error inserting data into MongoDB: {e}")

def main():
    query2 = '( {cash} (latest close > 0))'
    df = get_stocks_data(query2)
    insert_data_to_mongodb(df)
    logging.info("Job completed.")

if __name__ == "__main__":
    main()

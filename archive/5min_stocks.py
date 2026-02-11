import requests
from bs4 import BeautifulSoup as bs
import pandas as pd
import logging

import pandas as pd
from collections import Counter, deque
import time
# Get current date for log file naming
# = datetime.now().strftime('%Y-%m-%d')
#log_file_path = f'/Users/ashokkumar/Desktop/test/stock_work/logfile_{today}.log'

# Configure logging
#logging.basicConfig(filename=log_file_path,
#                    level=logging.INFO,
#                    format='%(asctime)s - %(message)s')

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



from collections import deque, Counter

def rank_stocks(recent_nsecode_list):
    # Flatten the deque to get a single list of all nsecodes
    flat_list = [item for sublist in recent_nsecode_list for item in sublist]
    
    # Rank based on frequency
    frequency = Counter(flat_list)
    
    # Rank based on recency (higher index in deque = more recent)
    recency_rank = {}
    for recency_score, nsecode_list in enumerate(reversed(recent_nsecode_list)):
        for nsecode in nsecode_list:
            recency_rank[nsecode] = recency_score
    
    # Combine frequency and recency (higher frequency and recency = higher rank)
    ranked_stocks = []
    for nsecode in frequency:
        rank_score = frequency[nsecode] + recency_rank.get(nsecode, 0)
        ranked_stocks.append((nsecode, rank_score))
    
    # Sort by rank score
    ranked_stocks.sort(key=lambda x: x[1], reverse=True)
    
    return ranked_stocks

# Example usage in the main function
def main():
    query2 = '( {cash} ( [0] 5 minute close > [0] 5 minute ema ( close,100 ) and [0] 5 minute close > [0] 5 minute ema ( close,8 ) and [0] 5 minute close > [0] 5 minute ema ( close,34 ) and latest volume > 20 and [0] 5 minute ema ( close,8 ) > [0] 5 minute ema ( close,34 ) and [0] 5 minute ema ( close,34 ) > [0] 5 minute ema ( close,100 ) and [0] 5 minute volume > [0] 5 minute sma ( close,20 ) and [0] 5 minute close > [-1] 5 minute close and [-1] 5 minute close > [-2] 5 minute close and latest "ema( latest volume, 10 )" * latest close > 100000000 and latest close > latest sma ( close,7 ) and [0] 5 minute macd line ( 26 , 12 , 9 ) > [-1] 5 minute macd signal ( 26 , 12 , 9 ) ) ) '

    recent_nsecode_list = deque(maxlen=5)  # Keep the last 15 lists of nsecode
    
    while True:
        df = get_stocks_data(query2)
        #print(df.head(25).nsecode.values.tolist())
        recent_nsecode_list.append(df.head(25).nsecode.values.tolist())  # Append the list of nsecodes from this run
        
        ranked_stocks = rank_stocks(recent_nsecode_list)
        
        # Print top 10 stocks based on rank score
        print("Top 10 Stocks by Rank Score:")
        for stock in ranked_stocks[:10]:
            print(f"{stock[0]}: Rank Score = {stock[1]}")
        
        time.sleep(60)  # Sleep for 60 seconds

if __name__ == "__main__":
    main()




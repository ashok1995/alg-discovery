import streamlit as st
import requests
import pandas as pd
from bs4 import BeautifulSoup as bs
import altair as alt
from config import *  # Import all configuration variables

st.set_page_config(layout="wide")

st.markdown(
    """
    <style>
    body {
        background-color: #eaeaea;  /* Light gray for overall background */
    }
    .main {
        background-color: #ffffff;  /* White for main area */
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .left-column {
        background-color: #f8f9fa;  /* Very light gray for left column */
        color: #000000;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
    }
    .right-column {
        background-color: #e9ecef;  /* Light gray for right column */
        color: #000000;  /* Black text color */
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
    }
    h1, h2, h3, h4, h5, h6, p {
        color: #000000;  /* Set all header and paragraph text to black */
    }
    .dataframe th, .dataframe td {
        text-align: left;
        color: black;  /* Set text color to black */
    }
    .scrollable-table {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: white; /* Background color for the scrollable table */
        padding: 10px;
    }
    .stButton button {
        background-color: #007bff; /* Button background (blue) */
        color: white !important; /* Button text color */
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
    }
    .sortable-header {
        cursor: pointer;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# Function definitions first
def read_stocks():
    try:
        with open(STOCKS_WATCHLIST, "r") as f:
            stocks = [line.strip().split(",") for line in f.readlines()]
        return stocks
    except FileNotFoundError:
        return []

def get_stocks_data(query2):
    data = {
        'scan_clause': query2
    }

    with requests.Session() as s:
        r = s.get('https://chartink.com/screener/alg-test-1')
        soup = bs(r.content, 'html.parser')
        s.headers['X-CSRF-TOKEN'] = soup.select_one('[name=csrf-token]')['content']
        r = s.post('https://chartink.com/screener/process', data=data).json()
        
        df = pd.DataFrame(r['data'])
        return df

@st.cache_data(ttl=300)
def get_morning_swing_candidates():
    from config import BASE_QUERY, VOLUME_QUERY, MOMENTUM_QUERY_1, COMBINED_QUERY_1, COMBINED_QUERY_2
    
    # Define our waterfall of queries in order of preference (most selective first)
    waterfall_queries = [
        ("Combined query 2", COMBINED_QUERY_2),  # Most selective with trend strength
        ("Combined query 1", COMBINED_QUERY_1),  # Combined volume and momentum
        ("Volume filter", VOLUME_QUERY),         # Volume-based filter
        ("Momentum filter", MOMENTUM_QUERY_1),   # Momentum-based filter
        ("Base query", BASE_QUERY)               # Fallback query
    ]
    
    # Try each query in the waterfall until one works
    selected_df = None
    selected_name = None
    
    for name, query in waterfall_queries:
        try:
            df = get_stocks_data(query)
            print(f"{name}: {df.shape}")
            
            if not df.empty:
                selected_df = df
                selected_name = name
                break
        except Exception as e:
            print(f"{name} error: {e}")
    
    # If all queries failed, create an empty DataFrame
    if selected_df is None:
        print("All queries failed, returning empty DataFrame")
        return pd.DataFrame()
    
    print(f"Selected {selected_name} as best query")
    
    # Sort by percentage change (descending) to get the most promising stocks
    if 'per_chg' in selected_df.columns:
        selected_df = selected_df.sort_values(by=['per_chg'], ascending=False)
    
    # Take only the top 200 stocks
    if len(selected_df) > 200:
        print(f"Limiting results to top 200 stocks (from {len(selected_df)})")
        selected_df = selected_df.head(200)
    
    # Add a column for the source
    selected_df['source'] = selected_name
    
    # Add a column for the rank
    selected_df['rank'] = range(1, len(selected_df) + 1)
    
    # Reorder columns to put rank and source first
    cols = selected_df.columns.tolist()
    cols = ['rank', 'source'] + [col for col in cols if col not in ['rank', 'source']]
    selected_df = selected_df[cols]
    
    return selected_df

def make_clickable(symbol):
    return f'<a href="https://chartink.com/stocks-new?symbol={symbol}" target="_blank">{symbol}</a>'

# Main code starts here
col1, col2 = st.columns([0.7, 0.3])

# Right Column: Display Swing Trading Candidates
with col1:
    st.markdown('<div class="right-column">', unsafe_allow_html=True)

    st.markdown("## Swing Trading Candidates")
    st.markdown("*Stocks showing momentum with volume support*")
    morning_candidates = get_morning_swing_candidates()

    if not morning_candidates.empty:
        # Make nsecode clickable
        morning_candidates['nsecode'] = morning_candidates['nsecode'].apply(make_clickable)
        
        sort_col, filter_col = st.columns([0.5, 0.5])

        with sort_col:
            # Sorting options
            sort_by = st.selectbox("Sort by:", morning_candidates.columns, key='sort_select')

        sort_direction = st.radio("Sort Direction", ("Ascending", "Descending"))
        ascending = sort_direction == "Ascending"

        # Sort and display DataFrame
        if st.button("Sort"):
            morning_candidates = morning_candidates.sort_values(by=sort_by, ascending=ascending)

        st.markdown("""
        **Metrics:**
        - strength_score: Combined momentum and volume strength
        """)
        
        st.markdown(
            f'<div class="scrollable-table">{morning_candidates.to_html(escape=False, index=False)}</div>',
            unsafe_allow_html=True
        )
    else:
        st.write("No candidates found. Please check market conditions.")
    
    st.markdown('</div>', unsafe_allow_html=True)

# Left Column: Watchlist Operations
with col2:
    st.markdown('<div class="left-column">', unsafe_allow_html=True)
    st.header("Watchlist Operations")

    # Select source identifier
    view_source_identifier = st.selectbox("Select Watchlist", SOURCE_IDENTIFIERS)

    # Read and filter stocks
      # Assume this function reads stocks from a file
    
    stocks = read_stocks()
    filtered_stocks = [stock[0] for stock in stocks if len(stock) == 2 and stock[1] == view_source_identifier]

    # Display filtered stocks with clickable links in a single scrollable box
    st.subheader(f"Filtered Stocks for {view_source_identifier}")

    if filtered_stocks:
        # Create a scrollable box using HTML and CSS
        scrollable_box_style = """
        <div style='overflow-y: scroll; height: 200px; border: 1px solid #ccc; padding: 10px;'>
        """
        
        links = ""
        for stock in filtered_stocks:
            # Create a clickable hyperlink for each stock
            stock_link = f"<a href='https://chartink.com/stocks-new?symbol={stock}' target='_blank'>{stock}</a><br>"
            links += stock_link

        # Close the div tag after concatenating all stock links
        scrollable_box_style += links + "</div>"
        
        # Display the scrollable box with clickable stock links
        st.markdown(scrollable_box_style, unsafe_allow_html=True)
    else:
        st.write(f"No stock symbols found for '{view_source_identifier}'.")

    st.markdown("<br>", unsafe_allow_html=True)

    # Stock symbol input to insert into the file
    st.subheader("Insert Stock Symbol")
    new_stock = st.text_input("Enter new stock symbol to add")
    new_stock = new_stock.upper()
    if st.button("Add Stock Symbol"):
        stocks = read_stocks()
        #print(stocks, [new_stock, view_source_identifier])
        if new_stock and [new_stock, view_source_identifier] not in stocks:
            #print("yes")
            with open(STOCKS_WATCHLIST, "a") as f:
                f.write(f"{new_stock},{view_source_identifier}\n")
            st.success(f"Added {new_stock} with {view_source_identifier}")
        else:
            st.warning("Stock symbol already exists or input is empty.")

    st.markdown("<br><br>", unsafe_allow_html=True)

    # Delete stock symbol
    st.subheader("Delete Stock Symbol")
    delete_stock = st.text_input("Enter stock symbol to delete")
    if st.button("Delete Stock Symbol"):
        found = False
        for stock in stocks:
            if stock[0] == delete_stock and stock[1] == view_source_identifier:
                found = True
                stocks.remove(stock)  # Remove the stock from the list
                break

        if found:
            with open(STOCKS_WATCHLIST, "w") as f:
                for stock in stocks:
                    f.write(f"{stock[0]},{stock[1]}\n")
            st.success(f"Deleted {delete_stock} from {view_source_identifier}")
        else:
            st.warning(f"Stock symbol '{delete_stock}' not found for '{view_source_identifier}'.")
    st.markdown('</div>', unsafe_allow_html=True)

    
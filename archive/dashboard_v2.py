import streamlit as st
import requests
import pandas as pd
from bs4 import BeautifulSoup as bs
import altair as alt

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



stocks_watchlist = "stocks_v1_1.txt"

# Function to read the stocks from the text file
def read_stocks():
    try:
        with open(stocks_watchlist, "r") as f:
            stocks = [line.strip().split(",") for line in f.readlines()]
        return stocks
    except FileNotFoundError:
        return []


# Function to fetch stock data
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
        #df = df.sort_values(by=['per_chg'], ascending=False)
        return df

@st.cache_data(ttl=300)
def get_all_stocks_level():
    p_y_0_s2   = '( {cash} ( latest close < yearly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_y_s2_s1  = '( {cash} ( latest close < yearly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" and latest close >= yearly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_y_s1_pp  = '( {cash} ( latest close < yearly "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" and latest close >= yearly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" ) ) '
    p_y_pp_r1  = '( {cash} ( latest close < yearly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" and latest close >= yearly "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" ) ) '
    p_y_r1_r2  = '( {cash} ( latest close < yearly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" and latest close >= yearly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" ) ) '
    p_y_r2_h   = '( {cash} ( latest close >= yearly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" ) ) '

    p_q_0_s2   = '( {cash} ( latest close < quarterly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_q_s2_s1  = '( {cash} ( latest close < quarterly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" and latest close >= quarterly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_q_s1_pp  = '( {cash} ( latest close < quarterly "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" and latest close >= quarterly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" ) ) '
    p_q_pp_r1  = '( {cash} ( latest close < quarterly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" and latest close >= quarterly "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" ) ) '
    p_q_r1_r2  = '( {cash} ( latest close < quarterly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" and latest close >= quarterly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" ) ) '
    p_q_r2_h   = '( {cash} ( latest close >= quarterly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" ) ) '

    p_m_0_s2   = '( {cash} ( latest close < monthly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_m_s2_s1  = '( {cash} ( latest close < monthly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" and latest close >= monthly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_m_s1_pp  = '( {cash} ( latest close < monthly "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" and latest close >= monthly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" ) ) '
    p_m_pp_r1  = '( {cash} ( latest close < monthly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" and latest close >= monthly "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" ) ) '
    p_m_r1_r2  = '( {cash} ( latest close < monthly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" and latest close >= monthly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" ) ) '
    p_m_r2_h   = '( {cash} ( latest close >= monthly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" ) ) '

    p_w_0_s2   = '( {cash} ( latest close < weekly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_w_s2_s1  = '( {cash} ( latest close < weekly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" and latest close >= weekly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_w_s1_pp  = '( {cash} ( latest close < weekly "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" and latest close >= weekly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" ) ) '
    p_w_pp_r1  = '( {cash} ( latest close < weekly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" and latest close >= weekly "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" ) ) '
    p_w_r1_r2  = '( {cash} ( latest close < weekly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" and latest close >= weekly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" ) ) '
    p_w_r2_h   = '( {cash} ( latest close >= weekly "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" ) ) '

    p_d_0_s2   = '( {cash} ( latest close < latest "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_d_s2_s1  = '( {cash} ( latest close < latest "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" and latest close >= latest "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) - ( 1 candle ago high - 1 candle ago low ) )" ) ) '
    p_d_s1_pp  = '( {cash} ( latest close < latest "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" and latest close >= latest "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago high)" ) ) '
    p_d_pp_r1  = '( {cash} ( latest close < latest "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" and latest close >= latest "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" ) ) '
    p_d_r1_r2  = '( {cash} ( latest close < latest "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" and latest close >= latest "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) * 2 - 1 candle ago low )" ) ) '
    p_d_r2_h   = '( {cash} ( latest close >= latest "( (1 candle ago high + 1 candle ago low + 1 candle ago close / 3 ) + ( 1 candle ago high - 1 candle ago low ) )" ) ) '

    pos_mom = '( {cash} ( [0] 30 minute close > [-1] 30 minute close and [0] 30 minute open > [-1] 30 minute open and [0] 30 minute close > [-1] 30 minute high ) ) '

    y_leval_qs = [p_y_0_s2, p_y_s2_s1, p_y_s1_pp, p_y_pp_r1, p_y_r1_r2, p_y_r2_h]
    q_leval_qs = [p_q_0_s2, p_q_s2_s1, p_q_s1_pp, p_q_pp_r1, p_q_r1_r2, p_q_r2_h]
    m_leval_qs = [p_m_0_s2, p_m_s2_s1, p_m_s1_pp, p_m_pp_r1, p_m_r1_r2, p_m_r2_h]
    w_leval_qs = [p_w_0_s2, p_w_s2_s1, p_w_s1_pp, p_w_pp_r1, p_w_r1_r2, p_w_r2_h]
    d_leval_qs = [p_d_0_s2, p_d_s2_s1, p_d_s1_pp, p_d_pp_r1, p_d_r1_r2, p_d_r2_h]

    scores = [-5,-3,-1,1,3,5]

    Positional_y = pd.DataFrame() 
    Positional_q = pd.DataFrame() 
    Positional_m = pd.DataFrame() 
    Positional_w = pd.DataFrame() 
    Positional_d = pd.DataFrame() 


    for i in range(len(y_leval_qs)):

        query_y = y_leval_qs[i]
        query_q = q_leval_qs[i]
        query_m = m_leval_qs[i]
        query_w = w_leval_qs[i]
        query_d = d_leval_qs[i]
        score = scores[i]



        df = get_stocks_data(query_y)
        if len(df) > 0 :
            df["y_level"] = score
            Positional_y = pd.concat([Positional_y, df[["nsecode", "y_level"]]])
            #print("Positional_y 1: ", len(Positional_y))

        df = get_stocks_data(query_q)
        if len(df) > 0 :
            df["q_level"] = score
            Positional_q = pd.concat([Positional_q, df[["nsecode", "q_level"]]])
            #print("Positional_q 2: ", len(Positional_q))

        df = get_stocks_data(query_m)
        if len(df) > 0 :
            df["m_level"] = score
            Positional_m = pd.concat([Positional_m, df[["nsecode", "m_level"]]])
            #print("Positional_m 3: ", len(Positional_m))

        df = get_stocks_data(query_w)
        if len(df) > 0 :
            df["w_level"] = score
            Positional_w = pd.concat([Positional_w, df[["nsecode", "w_level"]]])
            #print("Positional_w 4: ", len(Positional_w))

        df = get_stocks_data(query_d)
        if len(df) > 0 :
            df["d_level"] = score
            Positional_d = pd.concat([Positional_d, df[["nsecode", "close", "per_chg", "volume", "d_level"]]])
            #print("Positional_d 5: ", len(Positional_d))


    Positional = Positional_d.merge(Positional_w, on='nsecode', how='left')
    Positional = Positional.merge(Positional_m, on='nsecode', how='left')
    Positional = Positional.merge(Positional_q, on='nsecode', how='left')
    Positional = Positional.merge(Positional_y, on='nsecode', how='left')
    Positional = Positional.fillna(0)
    Positional["p_score"] = Positional["per_chg"]*.5 + Positional["w_level"]*-0.35 + Positional["m_level"]*-0.15 #+ Positional["w_level"]*0.25 + Positional["d_level"]*0.1 
    Positional["TVolCr"] = (Positional["close"]*Positional["volume"]/10000000).round(2)
    #Positional.sort_values(by="p_score", ascending=False)


    #all_stocks_level= Positional[ Positional["TVolCr"]>= 10 ] 
    all_stocks_level = Positional.reset_index(drop=True)
    return all_stocks_level


def filter_by_tvolcr(data, tvolcr_value, condition):
    if condition == ">":
        return data[data["TVolCr"] >= tvolcr_value]
    elif condition == "<":
        return data[data["TVolCr"] <= tvolcr_value]
    return data

# Define the list of watchlist names
source_identifiers = [
    "investing_long_term",
    "investing_yr_term",
    "investing_6month_term",
    "investing_3month_term",
    "trading_1month_term",
    "trading_15day_term",
    "trading_1week_term",
    "trading_short_term",
    "trading_intraday_buy",
    "trading_intraday_sell",
    "trading_swing_buy",
    "new_stocks",
    "penny",
    "my_holdings"
]

# Create columns with specified widths
col1, col2 = st.columns([0.7, 0.3])

# Stock Data Fetching Function
stock_data = get_all_stocks_level()

# Right Column: Display All Stocks
with col1:
    st.markdown('<div class="right-column">', unsafe_allow_html=True)

    # Function to create clickable nsecode links
    def make_clickable(symbol):
        return f'<a href="https://chartink.com/stocks-new?symbol={symbol}" target="_blank">{symbol}</a>'

    # Make nsecode clickable
    stock_data['nsecode'] = stock_data['nsecode'].apply(make_clickable)

    # Sorting functionality
    def sort_dataframe(df, sort_column, ascending):
        return df.sort_values(by=sort_column, ascending=ascending)

    # Render sortable headers
    def render_sortable_header(col_name):
        return f"""
        <span class="sortable-header">{col_name}</span>
        <span>&#8593;</span><span>&#8595;</span>
        """

    sort_col, filter_col = st.columns([0.5, 0.5])

    with sort_col:
        # Sorting options
        sort_by = st.selectbox("Sort by:", stock_data.columns, key='sort_select')

    with filter_col:
        # Select condition for filtering
        tvolcr_condition = st.selectbox("Select condition for TVolCr filter:", options=[">", "<"], key='tvolcr_condition')
        
        # Input for filtering TVolCr based on selected condition
        tvolcr_input = st.number_input("Enter TVolCr value:", min_value=0, value=0, key='tvolcr_input')

    # Apply the filter based on the selected condition and input value
    if tvolcr_input > 0:
        filtered_df = filter_by_tvolcr(stock_data, tvolcr_input, tvolcr_condition)
    else:
        filtered_df = stock_data

    sort_direction = st.radio("Sort Direction", ("Ascending", "Descending"))
    ascending = sort_direction == "Ascending"

    # Sort and display DataFrame
    if st.button("Sort"):
        filtered_df = sort_dataframe(filtered_df, sort_by, ascending)

    # Generate HTML for the DataFrame with clickable nsecode
    html_df = filtered_df.to_html(escape=False, index=False)
    for col in filtered_df.columns:
        html_df = html_df.replace(f'<th>{col}</th>', f'<th>{render_sortable_header(col)}</th>')

    # Wrap in a scrollable div
    st.markdown(
        f'<div class="scrollable-table">{html_df}</div>',
        unsafe_allow_html=True
    )

# Left Column: Watchlist Operations
with col2:
    st.markdown('<div class="left-column">', unsafe_allow_html=True)
    st.header("Watchlist Operations")

    # Select source identifier
    view_source_identifier = st.selectbox("Select Watchlist", source_identifiers)

    # Read and filter stocks
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
        if new_stock and [new_stock, view_source_identifier] not in stocks:
            with open(stocks_watchlist, "a") as f:
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
            with open(stocks_watchlist, "w") as f:
                for stock in stocks:
                    f.write(f"{stock[0]},{stock[1]}\n")
            st.success(f"Deleted {delete_stock} from {view_source_identifier}")
        else:
            st.warning(f"Stock symbol '{delete_stock}' not found for '{view_source_identifier}'.")
    st.markdown('</div>', unsafe_allow_html=True)

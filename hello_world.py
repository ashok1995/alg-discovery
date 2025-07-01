import streamlit as st
import requests
import pandas as pd
from bs4 import BeautifulSoup as bs
import altair as alt


# File path to store stock symbols
file_path = 'stocks.txt'

# Function to read stock symbols from the text file
def read_stocks():
    try:
        with open(file_path, 'r') as file:
            stocks = file.read().splitlines()  # Read each line as a stock symbol
        return stocks
    except FileNotFoundError:
        return []

# Function to write stock symbols to the text file
def write_stocks(stocks):
    with open(file_path, 'w') as file:
        for stock in stocks:
            file.write(stock + '\n')

# Function to add a stock symbol if not present
def add_stock(symbol):
    stocks = read_stocks()
    if symbol not in stocks:
        stocks.append(symbol)
        write_stocks(stocks)
        return True  # Stock added
    return False  # Stock already exists

# Function to delete a stock symbol if present
def delete_stock(symbol):
    stocks = read_stocks()
    if symbol in stocks:
        stocks.remove(symbol)
        write_stocks(stocks)
        return True  # Stock deleted
    return False  # Stock not found

# Streamlit interface
st.title("Stock Symbol Management")

# Input for stock symbol
symbol = st.text_input("Enter a stock symbol (e.g., AAPL, MSFT)").upper()

# Add or Delete options
action = st.radio("Choose an action", ('Insert', 'Delete'))

# Submit button to perform the action
if st.button("Submit"):
    if symbol:
        if action == 'Insert':
            if add_stock(symbol):
                st.success(f"Stock symbol '{symbol}' added.")
            else:
                st.warning(f"Stock symbol '{symbol}' already exists.")
        elif action == 'Delete':
            if delete_stock(symbol):
                st.success(f"Stock symbol '{symbol}' deleted.")
            else:
                st.warning(f"Stock symbol '{symbol}' not found.")
    else:
        st.error("Please enter a valid stock symbol.")

# Display the current list of stock symbols
st.subheader("Current stock symbols in the file:")
current_stocks = read_stocks()
st.write(current_stocks if current_stocks else "No stock symbols available.")


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
        print("Positional_y 1: ", len(Positional_y))

    df = get_stocks_data(query_q)
    if len(df) > 0 :
        df["q_level"] = score
        Positional_q = pd.concat([Positional_q, df[["nsecode", "q_level"]]])
        print("Positional_q 2: ", len(Positional_q))

    df = get_stocks_data(query_m)
    if len(df) > 0 :
        df["m_level"] = score
        Positional_m = pd.concat([Positional_m, df[["nsecode", "m_level"]]])
        print("Positional_m 3: ", len(Positional_m))

    df = get_stocks_data(query_w)
    if len(df) > 0 :
        df["w_level"] = score
        Positional_w = pd.concat([Positional_w, df[["nsecode", "w_level"]]])
        print("Positional_w 4: ", len(Positional_w))

    df = get_stocks_data(query_d)
    if len(df) > 0 :
        df["d_level"] = score
        Positional_d = pd.concat([Positional_d, df[["nsecode", "close", "per_chg", "volume", "d_level"]]])
        print("Positional_d 5: ", len(Positional_d))


Positional = Positional_d.merge(Positional_w, on='nsecode', how='left')
Positional = Positional.merge(Positional_m, on='nsecode', how='left')
Positional = Positional.merge(Positional_q, on='nsecode', how='left')
Positional = Positional.merge(Positional_y, on='nsecode', how='left')
Positional = Positional.fillna(0)
Positional["p_score"] = Positional["y_level"]*.2 + Positional["q_level"]*.2 + Positional["m_level"]*0.25 + Positional["w_level"]*0.25 + Positional["d_level"]*0.1 
Positional["TVolCr"] = (Positional["close"]*Positional["volume"]/10000000).round(2)
Positional.sort_values(by="p_score", ascending=False)


all_stocks_level= Positional[ Positional["TVolCr"]>= 10 ] 
all_stocks_level = all_stocks_level.reset_index(drop=True)
st.write("### ALL STOCKS LEVEL-----------")
st.dataframe(all_stocks_level)

pos_mom_df = get_stocks_data(pos_mom) 

temp_df= Positional[ (Positional["TVolCr"]>= 10) & ( Positional["nsecode"].isin(pos_mom_df.nsecode.values.tolist()))].sort_values(by="p_score", ascending=False)


st.write("### Final Stock Scores")
st.dataframe(temp_df)

# Visualization using Altair
st.write("### Stock Scores Visualization")
chart = alt.Chart(temp_df[:20]).mark_bar().encode(
    x='nsecode:N',
    y='score:Q',
    color='score:Q',
    tooltip=['nsecode', 'p_score']
).properties(
    width=800,
    height=400
)
st.altair_chart(chart)


# Streamlit app
st.title("Top 20 Stocks by Percentage Change and Volume * Close with Links")

#below pivit point
query1 = '( {cash} ( latest sma ( latest volume , 5 ) * latest close > 20000000 and latest "(1 candle ago high + 1 candle ago low + 1 candle ago close / 3)" > latest close ) ) '

# Query to use in the function
query3 = '( {cash} ( [0] 30 minute close > [-1] 30 minute close and [0] 30 minute open > [-1] 30 minute open and [0] 30 minute close > [-1] 30 minute high and latest volume * latest close > 10000000 ) ) '

# Fetch the stock data
df2 = get_stocks_data(query1)

# Display the top 20 results in separate bar charts
if not df2.empty:
    # Sort DataFrame by percentage change and select the top 20
    df_top20_per_chg = df2.head(20)
    
    # Sort DataFrame by volume * close and select the top 20
    df2['volume_close'] = df2['volume'] * df2['close']/10000000
    df_top20_volume_close = df2.sort_values(by=['volume_close'], ascending=False).head(20)
    
    # Generate URLs based on bsecode
    df_top20_per_chg['url'] = 'https://chartink.com/stocks-new?symbol=' + df_top20_per_chg['nsecode']
    df_top20_volume_close['url'] = 'https://chartink.com/stocks-new?symbol=' + df_top20_volume_close['nsecode']
    
    # Create a bar chart for percentage change with hyperlinks
    bar_per_chg = alt.Chart(df_top20_per_chg).mark_bar(color='blue').encode(
        x=alt.X('nsecode:N', title='Stock Name', sort=None),
        y=alt.Y('per_chg:Q', title='% Change', axis=alt.Axis(grid=False)),
        href='url:N'
    ).properties(
        title='Top 20 Stocks by % Change',
        width=600,
        height=400
    ).configure_axis(
        labelFontSize=12,
        titleFontSize=14
    )

    # Create a bar chart for volume * close with hyperlinks
    bar_volume_close = alt.Chart(df_top20_volume_close).mark_bar(color='orange').encode(
        x=alt.X('nsecode:N', title='Stock Name', sort=None),
        y=alt.Y('volume_close:Q', title='Volume * Close', axis=alt.Axis(grid=False)),
        href='url:N'
    ).properties(
        title='Top 20 Stocks by Volume * Close',
        width=600,
        height=400
    ).configure_axis(
        labelFontSize=12,
        titleFontSize=14
    )

    # Display the charts in Streamlit
    st.altair_chart(bar_per_chg, use_container_width=True)
    st.altair_chart(bar_volume_close, use_container_width=True)

else:
    st.write("No data available.")

# Display the DataFrame for reference
st.write("Top 20 Stocks DataFrame by % Change", df_top20_per_chg)
st.write("Top 20 Stocks DataFrame by Volume * Close", df_top20_volume_close)

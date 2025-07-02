import pandas as pd

columns = ['Open', 'High', 'Low', 'Close', 'Volume']

df = pd.read_csv('data.csv', names=columns)


df['Date'] = pd.to_datetime(df['Date'])
df.set_index('Date', inplace=True)
df.groupby([])
print(df)
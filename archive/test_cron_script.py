import datetime

# Get the current date and time
now = datetime.datetime.now()

# Write the date and time to a log file
with open("/Users/ashokkumar/Desktop/test/stock_work/cron_test_output.txt", "a") as file:
    file.write(f"Script executed at: {now}\n")

#################################################################
# Load Lotex collars from Excel (converted to CSV) file sent to us
##################################################################

import csv
import psycopg2


cur = conn.cursor()

#####################################################################
# A copy of this file is in the project 'json csv sample data' folder
#####################################################################

with open('C:/Users/paulp/Desktop/Cariboo Project/Caribou Data/bctw_collars_testpilot/20200415_bctw_Lotek_collar reg '
          'request.csv', 'r') as f:
    reader = csv.reader(f)
    next(reader)  # skip the header
    for row in reader:
        print(row)
        cur.execute(
            "INSERT INTO api_lotex_collar_data VALUES (%s, %s, %s, %s, %s, %s)",
            row
        )
    conn.commit()
    conn.close()

#################################################################
# Load Lotex collars from Excel (converted to CSV) file sent to us
##################################################################

import csv
import psycopg2

# conn = psycopg2.connect(dbname="sample_caribou_data",
#                         user="postgres",
#                         host="127.0.0.1",
#                         password="Ch3k@v88",
#                         port=5433)

conn = psycopg2.connect(dbname="bctw",
                        user="bctw",
                        host="127.0.0.1",
                        password="data4Me",
                        port=5432)

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

import os
import psycopg2

# conn = psycopg2.connect(
#     dbname="bctw",
#     user="bctw",
#     host="127.0.0.1",
#     password="data4Me",
#     port=5432)

conn = psycopg2.connect(
    dbname="sample_caribou_data",
    user="postgres",
    host="127.0.0.1",
    password="Ch3k@v88",
    port=5433)

cur = conn.cursor()

#####################################################################
# A copy of this data is in the project 'json csv sample data' folder
#####################################################################

directory = "C:/Users/paulp/Desktop/Cariboo Project/Caribou Data/bctw_collars_testpilot/keys_vectronic/"

for filename in os.listdir(directory):
    if filename.endswith(".keyx"):
        tree = ET.parse(directory + filename)
        root = tree.getroot()

        for collarKey in root.findall("./collar"):
            for i in collarKey.attrib:
                collar_id = collarKey.attrib.get('ID')
            for comID in root.iter("comID"):
                com_type = "'" + comID.attrib.get('comType') + "'"
                com_id = "'" + comID.text + "'"
            for key in root.iter("key"):
                collar_key = "'" + key.text + "'"
            for collarType in root.iter("collarType"):
                collar_type = collarType.text
            sql_string = """INSERT INTO api_vectronics_collar_data (idcollar, comtype, idcom, collarkey, collartype) 
            VALUES (%s, %s, %s, %s, %s)""" % (
                collar_id, com_type, com_id, collar_key, collar_type)
            cur.execute(sql_string)

    else:
        continue

conn.commit()
conn.close()

from database import CursorFromConnectionFromPool


def transfer_lotex_data():
    with CursorFromConnectionFromPool() as cursor:
        # only attempt to execute SQL if cursor is valid
        if cursor:
            param = "'Lotex'"
            sql_string = 'INSERT INTO api_vendor_data_merge ' \
                         'SELECT deviceid, ' \
                         '%s, ' \
                         'deviceid, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'latitude, ' \
                         'longitude, ' \
                         'ST_MakePoint(longitude, latitude) , ' \
                         'temperature, ' \
                         'mainv, ' \
                         'bkupv, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'pdop, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'fixtype, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'ecefx, ' \
                         'ecefy, ' \
                         'ecefz, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'altitude, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL   ' \
                         'FROM api_lotex_device_position_data; ' % param
            try:
                cursor.execute(sql_string)
            except(Exception, Error) as error:
                print("\nexecute_sql() error: ", error)
        return

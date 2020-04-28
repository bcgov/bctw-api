from database import CursorFromConnectionFromPool


def transfer_vectronic_data():
    with CursorFromConnectionFromPool() as cursor:
        # only attempt to execute SQL if cursor is valid
        if cursor:
            param = "'Vectronic'"
            sql_string = 'INSERT INTO api_vendor_data_merge ' \
                         'SELECT idcollar, ' \
                         '%s,  ' \
                         'idcollar,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'longitude,  ' \
                         'latitude,  ' \
                         'ST_MakePoint(longitude, latitude),  ' \
                         'temperature,  ' \
                         'mainvoltage,  ' \
                         'NULL,  ' \
                         'backupvoltage,  ' \
                         'activity,  ' \
                         'dop,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'scts,  ' \
                         'NULL,  ' \
                         'ecefx,  ' \
                         'ecefy,  ' \
                         'ecefz,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'height, ' \
                         'NULL, ' \
                         'NULL, ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'origincode,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL, ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL,  ' \
                         'NULL  ' \
                         'FROM api_gpsplusx_device_gps_data;' % param
            print(sql_string)
            try:
                cursor.execute(sql_string)
            except(Exception, Error) as error:
                print("\nexecute_sql() error: ", error)
        return

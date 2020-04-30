from psycopg2 import Error
from database import CursorFromConnectionFromPool


def truncate_vendor_merge_table():
    # Create cursor
    with CursorFromConnectionFromPool() as cursor:
        # only attempt to execute SQL if cursor is valid
        if cursor:
            sql_string = 'TRUNCATE TABLE api_vendor_data_merge;'

            try:
                cursor.execute(sql_string)
            except(Exception, Error) as error:
                print("\nexecute_sql() error: ", error)
        return


def vectronic_truncate_tables():
    # Create cursor
    with CursorFromConnectionFromPool() as cursor:
        # only attempt to execute SQL if cursor is valid
        if cursor:
            sql_string = 'TRUNCATE TABLE api_gpsplusx_device_activity_data,' \
                         'api_gpsplusx_device_gps_data, api_gpsplusx_device_mortality_data,' \
                         'api_gpsplusx_device_mortality_implant_data, api_gpsplusx_device_proximity_data,' \
                         'api_gpsplusx_device_separation_data;'

            try:
                cursor.execute(sql_string)
            except(Exception, Error) as error:
                print("\nexecute_sql() error: ", error)
        return


def lotex_truncate_tables():
    # Create cursor
    with CursorFromConnectionFromPool() as cursor:
        # only attempt to execute SQL if cursor is valid
        if cursor:
            sql_string = 'TRUNCATE TABLE api_lotex_device_info,' \
                         'api_lotex_device_position_data,' \
                         'api_lotex_devices_by_user;'
            try:
                cursor.execute(sql_string)
            except(Exception, Error) as error:
                print("\nexecute_sql() error: ", error)
    return

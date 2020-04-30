from bearerauth import BearerAuth, requests
from login import lotex_login, refresh_token
import constants
import build_query
from psycopg2 import Error
from database import CursorFromConnectionFromPool
import gc


def lotex_api_calls():
    for name in dir():
        if not name.startswith('_'):
            del globals()[name]

    for name in dir():
        if not name.startswith('_'):
            del locals()[name]

    gc.collect()

    login_dict = lotex_login()

    if type(login_dict) == dict:

        bearer_token = login_dict['access_token']

        # refresh_token_refresh_dict = refresh_token

        with CursorFromConnectionFromPool() as cursor:
            # only attempt to execute SQL if cursor is valid
            if cursor:
                sql_string = 'SELECT device_id FROM api_lotex_collar_data;'

                try:
                    cursor.execute(sql_string)
                    rs = cursor.fetchall()
                except(Exception, Error) as error:
                    print("\nexecute_sql() error: ", error)

        if rs:
            for i in rs:
                lotex_device_id = i[0]
                print('Lotex ID:', device_id)
                a = []
                try:
                    device_position_info = requests.get(constants.LOTEX_URL + '/gps?deviceId=' + str(lotex_device_id),
                                                        auth=BearerAuth(bearer_token))
                    if not device_position_info.status_code == 400 and device_position_info.json():
                        device_info_dict = device_position_info.json()
                        a.append(["api_lotex_device_position_data", device_info_dict])
                    if device_position_info.status_code == 400:
                        print('This device was not found:', lotex_device_id)
                    if not device_position_info.json():
                        # a device may exist in the system but not have position data
                        print('This device exists but has no position data:', lotex_device_id)
                except requests.exceptions.RequestException as e:
                    print(str(e))

                ############################################################################
                # This will be an API call to the database to get a particular users devices
                # Out of scope for this iteration
                ############################################################################
                # try:
                # list_of_current_devices = requests.get(constants.LOTEX_URL + '/devices',
                # auth=BearerAuth(bearer_token))
                # a.append(["api_lotex_devices_by_user", list_of_current_devices_dict])
                #    except requests.exceptions.RequestException as e:
                #         print(str(e))
                ############################################################################

                try:
                    list_of_specific_device_information = requests.get(
                        constants.LOTEX_URL + '/devices/' + str(lotex_device_id),
                        auth=BearerAuth(bearer_token))
                    if not list_of_specific_device_information.status_code == 400 and list_of_specific_device_information.json():
                        list_of_specific_device_information_dict = list_of_specific_device_information.json()
                        a.append(["api_lotex_device_info", list_of_specific_device_information_dict])
                    if device_position_info.status_code == 400:
                        print('This device was not found:', lotex_device_id)
                    if not list_of_specific_device_information.json():
                        print('Device found but there is no device information:', lotex_device_id)
                except requests.exceptions.RequestException as e:
                    print(str(e))

                if len(a) > 0:
                    for ii in range(len(a)):
                        table_name = a[ii][0]
                        info_dict = a[ii][1]

                        build_query.build_query(table_name, info_dict)
                else:
                    print('Lotex calls failed for ID:', lotex_device_id)
        # return

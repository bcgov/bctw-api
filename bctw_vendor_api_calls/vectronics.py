from bearerauth import BearerAuth, requests
import constants
from database import CursorFromConnectionFromPool
import build_query
from psycopg2 import Error


def vectronics_api_calls():
    # Create cursor
    with CursorFromConnectionFromPool() as cursor:
        # only attempt to execute SQL if cursor is valid
        if cursor:
            sql_string = 'SELECT idcollar, collarkey from api_vectronics_collar_data;'

            try:
                cursor.execute(sql_string)
                rs = cursor.fetchall()
            except(Exception, Error) as error:
                print("\nexecute_sql() error: ", error)

    if rs:
        for i in rs:
            device_id = i[0]
            key = i[1]

            print(device_id)
            print(key)

            a = []

            try:
                device_mortality_implant_data = requests.get(
                    constants.VECTRONICS_URL + str(device_id) + '/mit?collarkey=' + str(key))
                if not device_mortality_implant_data.status_code == 400 and device_mortality_implant_data.json():
                    device_mortality_implant_data_dict = device_mortality_implant_data.json()
                    a.append(["api_gpsplusx_device_mortality_implant_data", device_mortality_implant_data_dict])
                if device_mortality_implant_data.status_code == 400:
                    print('This device was not found:', device_id)
                if not device_mortality_implant_data.json():
                    print('This device exists but has no mortality implant data', device_id)
            except requests.exceptions.RequestException as e:
                print(str(e))

            try:
                device_vaginal_implant_data = requests.get(
                    constants.VECTRONICS_URL + str(device_id) + '/vit?collarkey=' + str(key))
                if not device_vaginal_implant_data.status_code == 400 and device_vaginal_implant_data.json():
                    device_vaginal_implant_data_dict = device_vaginal_implant_data.json()
                    a.append(["api_gpsplusx_device_vaginal_implant_data", device_vaginal_implant_data_dict])
                if device_vaginal_implant_data.status_code == 400:
                    print('This device was not found:', device_id)
                if not device_vaginal_implant_data.json():
                    print('This device exists but has no vaginal implant data', device_id)
            except requests.exceptions.RequestException as e:
                print(str(e))

            try:
                device_separation_data = requests.get(
                    constants.VECTRONICS_URL + str(device_id) + '/sep?collarkey=' + str(key))
                if not device_separation_data.status_code == 400 and device_separation_data.json():
                    device_separation_data_dict = device_separation_data.json()
                    a.append(["api_gpsplusx_device_separation_data", device_separation_data_dict])
                if device_separation_data.status_code == 400:
                    print('This device was not found:', device_id)
                if not device_separation_data.json():
                    print('This device exists but has no separation data', device_id)
            except requests.exceptions.RequestException as e:
                print(str(e))

            try:
                device_proximity_data = requests.get(
                    constants.VECTRONICS_URL + str(device_id) + '/prx?collarkey=' + str(key))
                if not device_proximity_data.status_code == 400 and device_proximity_data.json():
                    device_proximity_data_dict = device_proximity_data.json()
                    a.append(["api_gpsplusx_device_proximity_data", device_proximity_data_dict])
                if device_proximity_data.status_code == 400:
                    print('This device was not found:', device_id)
                if not device_proximity_data.json():
                    print('This device exists but has no proximity data', device_id)
            except requests.exceptions.RequestException as e:
                print(str(e))

            try:
                device_activity_data = requests.get(
                    constants.VECTRONICS_URL + str(device_id) + '/act?collarkey=' + str(key))
                if not device_activity_data.status_code == 400 and device_activity_data.json():
                    device_activity_data_dict = device_activity_data.json()
                    a.append(["api_gpsplusx_device_activity_data", device_activity_data_dict])
                if device_activity_data.status_code == 400:
                    print('This device was not found:', device_id)
                if not device_activity_data.json():
                    print('This device exists but has no activity data:', device_id)
            except requests.exceptions.RequestException as e:
                print(str(e))

            try:
                device_gps_data = requests.get(
                    constants.VECTRONICS_URL + str(device_id) + '/gps?collarkey=' + str(key))
                if not device_gps_data.status_code == 400 and device_gps_data.json():
                    device_gps_data_dict = device_gps_data.json()
                    a.append(["api_gpsplusx_device_gps_data", device_gps_data_dict])
                if device_gps_data.status_code == 400:
                    print('This device was not found:', device_id)
                if not device_gps_data.json():
                    print('This device exists but has no GPS data:', device_id)
            except requests.exceptions.RequestException as e:
                print(str(e))

            try:
                device_mortality_data = requests.get(
                    constants.VECTRONICS_URL + str(device_id) + '/mor?collarkey=' + str(key))
                if not device_mortality_data.status_code == 400 and device_mortality_data.json():
                    device_mortality_data_dict = device_mortality_data.json()
                    a.append(["api_gpsplusx_device_mortality_data", device_mortality_data_dict])
                if device_mortality_data.status_code == 400:
                    print('This device was not found:', device_id)
                if not device_mortality_data.json():
                    # a device may exist in the system but has no mortality data
                    print('This device exists but has no mortality data')
            except requests.exceptions.RequestException as e:
                print(str(e))

            print('Length of array:', len(a))
            print(a)
            if len(a) > 0:

                for ii in range(len(a)):
                    table_name = a[ii][0]
                    info_dict = a[ii][1]

                    build_query.build_query(table_name, info_dict)
            else:
                print('All Vectronic calls failed')
    return

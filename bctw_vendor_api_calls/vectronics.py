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

            #################################################################################
            # print out API string to make sure it is working once Vectronic fixes their API
            #################################################################################
            # print((constants.VECTRONICS_URL + str(device_id) + '/gps?collarkey=' + str(key)))

            a = []
            try:
                device_gps_data = requests.get(
                    # constants.VECTRONICS_URL + '/1000001/gps?collarkey=6484B8CA88E2B996421AB903D0B215AFAE285CAAE932F35F448154398398CF33AC40D37D9E37CEEA9DFCBD89353C3CCF8628A4DB4523F2324A83ADA5D091FB396DAC72773ED8CE1571D5C254FABBA0FBDEE2E1883694B8D18148168B205ED5BFA96ACEC30B7B99E045B8AE145B2A83948BAECD54CAB80A7676360B74CD1DEF7DDB50293E36B1C900EA853E19F808F745D85610F68609F233E294FA1C84700A80F1C257E062CAF4B2467E518A010A59E636091BAB905E50ED300BADF9F90440F7B85BBE14DD864BBB2F77A0A50BE5E14623D1B8FB0C2A3069207F4BFBF6CFEBC152F072D27B3CE88F844ED0197A56AF5114DE7B3BA544DB880850507FEB046684')
                    constants.VECTRONICS_URL + str(device_id) + '/gps?collarkey=' + str(key))
                print(device_gps_data.json())
                device_gps_data_dict = device_gps_data.json()
                a = ["api_gpsplusx_device_gps_data", device_gps_data_dict]
            except requests.exceptions.RequestException as e:
                print(str(e))

            # try:
            #     device_activity_data = requests.get(
            #         constants.VECTRONICS_URL + '/1000001/act?collarkey=6484B8CA88E2B996421AB903D0B215AFAE285CAAE932F35F448154398398CF33AC40D37D9E37CEEA9DFCBD89353C3CCF8628A4DB4523F2324A83ADA5D091FB396DAC72773ED8CE1571D5C254FABBA0FBDEE2E1883694B8D18148168B205ED5BFA96ACEC30B7B99E045B8AE145B2A83948BAECD54CAB80A7676360B74CD1DEF7DDB50293E36B1C900EA853E19F808F745D85610F68609F233E294FA1C84700A80F1C257E062CAF4B2467E518A010A59E636091BAB905E50ED300BADF9F90440F7B85BBE14DD864BBB2F77A0A50BE5E14623D1B8FB0C2A3069207F4BFBF6CFEBC152F072D27B3CE88F844ED0197A56AF5114DE7B3BA544DB880850507FEB046684')
            #     device_activity_data_dict = device_activity_data.json()
            #     a.append(["api_gpsplusx_device_activity_data", device_activity_data_dict])
            # except requests.exceptions.RequestException as e:
            #     print(str(e))
            #
            # try:
            #     device_proximity_data = requests.get(
            #         constants.VECTRONICS_URL + '/1000001/prx?collarkey=6484B8CA88E2B996421AB903D0B215AFAE285CAAE932F35F448154398398CF33AC40D37D9E37CEEA9DFCBD89353C3CCF8628A4DB4523F2324A83ADA5D091FB396DAC72773ED8CE1571D5C254FABBA0FBDEE2E1883694B8D18148168B205ED5BFA96ACEC30B7B99E045B8AE145B2A83948BAECD54CAB80A7676360B74CD1DEF7DDB50293E36B1C900EA853E19F808F745D85610F68609F233E294FA1C84700A80F1C257E062CAF4B2467E518A010A59E636091BAB905E50ED300BADF9F90440F7B85BBE14DD864BBB2F77A0A50BE5E14623D1B8FB0C2A3069207F4BFBF6CFEBC152F072D27B3CE88F844ED0197A56AF5114DE7B3BA544DB880850507FEB046684')
            #     device_proximity_data_dict = device_proximity_data.json()
            #     a.append(["api_gpsplusx_device_proximity_data", device_proximity_data_dict])
            # except requests.exceptions.RequestException as e:
            #     print(str(e))
            #
            # try:
            #     device_separation_data = requests.get(
            #         constants.VECTRONICS_URL + '/1000001/sep?collarkey=6484B8CA88E2B996421AB903D0B215AFAE285CAAE932F35F448154398398CF33AC40D37D9E37CEEA9DFCBD89353C3CCF8628A4DB4523F2324A83ADA5D091FB396DAC72773ED8CE1571D5C254FABBA0FBDEE2E1883694B8D18148168B205ED5BFA96ACEC30B7B99E045B8AE145B2A83948BAECD54CAB80A7676360B74CD1DEF7DDB50293E36B1C900EA853E19F808F745D85610F68609F233E294FA1C84700A80F1C257E062CAF4B2467E518A010A59E636091BAB905E50ED300BADF9F90440F7B85BBE14DD864BBB2F77A0A50BE5E14623D1B8FB0C2A3069207F4BFBF6CFEBC152F072D27B3CE88F844ED0197A56AF5114DE7B3BA544DB880850507FEB046684')
            #     device_separation_data_dict = device_separation_data.json()
            #     a.append(["api_gpsplusx_device_separation_data", device_separation_data_dict])
            # except requests.exceptions.RequestException as e:
            #     print(str(e))
            #
            # try:
            #     device_vaginal_implant_data = requests.get(
            #         constants.VECTRONICS_URL + '/1000001/vit?collarkey=6484B8CA88E2B996421AB903D0B215AFAE285CAAE932F35F448154398398CF33AC40D37D9E37CEEA9DFCBD89353C3CCF8628A4DB4523F2324A83ADA5D091FB396DAC72773ED8CE1571D5C254FABBA0FBDEE2E1883694B8D18148168B205ED5BFA96ACEC30B7B99E045B8AE145B2A83948BAECD54CAB80A7676360B74CD1DEF7DDB50293E36B1C900EA853E19F808F745D85610F68609F233E294FA1C84700A80F1C257E062CAF4B2467E518A010A59E636091BAB905E50ED300BADF9F90440F7B85BBE14DD864BBB2F77A0A50BE5E14623D1B8FB0C2A3069207F4BFBF6CFEBC152F072D27B3CE88F844ED0197A56AF5114DE7B3BA544DB880850507FEB046684')
            #     device_vaginal_implant_data_dict = device_vaginal_implant_data.json()
            #     a.append(["api_gpsplusx_device_vaginal_implant_data", device_vaginal_implant_data_dict])
            # except requests.exceptions.RequestException as e:
            #     print(str(e))
            #
            # try:
            #     device_mortality_data = requests.get(
            #         constants.VECTRONICS_URL + '/1000001/mor?collarkey=6484B8CA88E2B996421AB903D0B215AFAE285CAAE932F35F448154398398CF33AC40D37D9E37CEEA9DFCBD89353C3CCF8628A4DB4523F2324A83ADA5D091FB396DAC72773ED8CE1571D5C254FABBA0FBDEE2E1883694B8D18148168B205ED5BFA96ACEC30B7B99E045B8AE145B2A83948BAECD54CAB80A7676360B74CD1DEF7DDB50293E36B1C900EA853E19F808F745D85610F68609F233E294FA1C84700A80F1C257E062CAF4B2467E518A010A59E636091BAB905E50ED300BADF9F90440F7B85BBE14DD864BBB2F77A0A50BE5E14623D1B8FB0C2A3069207F4BFBF6CFEBC152F072D27B3CE88F844ED0197A56AF5114DE7B3BA544DB880850507FEB046684')
            #     if not device_mortality_data.status_code == 400 and device_mortality_data.json():
            #         device_mortality_data_dict = device_mortality_data.json()
            #         a.append(["api_gpsplusx_device_mortality_data", device_mortality_data_dict])
            #     # only need to record/print this once for an ID as it must not exist anywhere in their system
            #     # if device_mortality_data.status_code == 400:
            #     #     print('This device was not found:', vectronic_ids[i])
            #     # if not device_mortality_data.json()
            #     # a device may exist in the system but has no mortality data
            #     # print('This device exists but has no mortality data')
            # except requests.exceptions.RequestException as e:
            #     print(str(e))
            #
            # try:
            #     device_mortality_implant_data = requests.get(
            #         constants.VECTRONICS_URL + '/1000001/mit?collarkey=6484B8CA88E2B996421AB903D0B215AFAE285CAAE932F35F448154398398CF33AC40D37D9E37CEEA9DFCBD89353C3CCF8628A4DB4523F2324A83ADA5D091FB396DAC72773ED8CE1571D5C254FABBA0FBDEE2E1883694B8D18148168B205ED5BFA96ACEC30B7B99E045B8AE145B2A83948BAECD54CAB80A7676360B74CD1DEF7DDB50293E36B1C900EA853E19F808F745D85610F68609F233E294FA1C84700A80F1C257E062CAF4B2467E518A010A59E636091BAB905E50ED300BADF9F90440F7B85BBE14DD864BBB2F77A0A50BE5E14623D1B8FB0C2A3069207F4BFBF6CFEBC152F072D27B3CE88F844ED0197A56AF5114DE7B3BA544DB880850507FEB046684')
            #     device_mortality_implant_data_dict = device_mortality_implant_data.json()
            #     a.append(["api_gpsplusx_device_mortality_implant_data", device_mortality_implant_data_dict])
            # except requests.exceptions.RequestException as e:
            #     print(str(e))

            if len(a) > 0:

                for ii in range(len(a)):
                    table_name = a[ii][0]
                    info_dict = a[ii][1]

                    build_query.build_query(table_name, info_dict)
            else:
                print('All Vectronic calls failed')
            return

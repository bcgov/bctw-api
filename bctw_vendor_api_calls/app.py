from lotex import lotex_api_calls
from vectronic import vectronic_api_calls
from vectronic_data_transfer import transfer_vectronic_data
from lotex_data_transfer import transfer_lotex_data
from truncate_tables import truncate_vendor_merge_table, vectronic_truncate_tables, lotex_truncate_tables
from database import Database
from flask import Flask
import gc

app = Flask(__name__)


@app.route("/")
def main():
    for name in dir():
        if not name.startswith('_'):
            del globals()[name]

    for name in dir():
        if not name.startswith('_'):
            del locals()[name]

    gc.collect()

    #############################
    # Local machine test database
    #############################



    ########################################
    # At the time of writing, ATS has no API
    ########################################

    vectronic_truncate_tables()
    print('Vectronics tables truncated')

    vectronic_api_calls()
    print('Vectronic data pulled')

    lotex_truncate_tables()
    print('Lotex tables truncated')

    lotex_api_calls()
    print('Lotex data pulled')

    truncate_vendor_merge_table()
    print('vendor_merge_table truncated')

    transfer_vectronic_data()
    print('Vectronic data transfered')

    transfer_lotex_data()
    print('Lotex data transfered')

    for name in dir():
        if not name.startswith('_'):
            del globals()[name]

    for name in dir():
        if not name.startswith('_'):
            del locals()[name]

    gc.collect()

    return 'Database Loaded'


if __name__ == '__main__':
    ############################################
    # Use this version when pushing to OpenShift
    ############################################
    app.run(host="0.0.0.0", port=8080)

    ########################################
    # Use this version when running locally
    ########################################
    # app.run()

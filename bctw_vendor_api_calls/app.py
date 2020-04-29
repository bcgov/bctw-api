from lotex import lotex_api_calls
from vectronics import vectronics_api_calls
from vectronic_data_transfer import transfer_vectronic_data
from lotex_data_transfer import transfer_lotex_data
from database import Database
from flask import Flask

app = Flask(__name__)


@app.route("/")
def main():
    #############################
    # Local machine test database
    #############################

    # Database.initialise(
    #     dbname="sample_caribou_data",
    #     user="postgres",
    #     host="127.0.0.1",
    #     password="Ch3k@v88",
    #     port=5433)

    ######################################
    # Connect to database inside OpenShift
    ######################################

    Database.initialise(
        dbname="bctw",
        user="bctw",
        host="bctw-db",
        password="data4Me",
        port=5432)

    ##################################################
    # Connect to OpenShift database from local machine
    # Make sure to run the port forward command
    # E.g. oc port-forward bctw-db-9-m7hx7 5432:5432
    ##################################################

    # Database.initialise(
    #     dbname="bctw",
    #     user="bctw",
    #     host="127.0.0.1",
    #     password="data4Me",
    #     port=5432)

    ########################################
    # At the time of writing, ATS has no API
    ########################################

    vectronics_api_calls()
    print('Vectronic data pulled')

    lotex_api_calls()
    print('Lotex data pulled')

    transfer_vectronic_data()
    print('Vectronic data transfered')

    transfer_lotex_data()
    print('Lotex data transfered')

    return "Database Loaded"


if __name__ == '__main__':
    ############################################
    # Use this version when pushing to OpenShift
    ############################################
    app.run(host="0.0.0.0", port=8080)

    ########################################
    # Use this version when running locally
    ########################################
    # app.run()

import requests
import constants
from database import CursorFromConnectionFromPool
from psycopg2 import Error


def lotex_login():

    with CursorFromConnectionFromPool() as cursor:
        # only attempt to execute SQL if cursor is valid
        if cursor:
            sql_string = 'SELECT username, pw from api_lotex_lp;'

            try:
                cursor.execute(sql_string)
                rs = cursor.fetchone()
            except(Exception, Error) as error:
                print("\nexecute_sql() error: ", error)

    if rs:
        login_payload = {'grant_type': 'password',
                         'username': rs[0],
                         'password': rs[1]}

        login = requests.get('https://webservice.lotek.com/API/user/login', data=login_payload,
                             headers=constants.X_WWW_HEADERS,
                             timeout=3)

        return login.json()


def refresh_token(token):
    with CursorFromConnectionFromPool() as cursor:
        # only attempt to execute SQL if cursor is valid
        if cursor:
            sql_string = 'SELECT username FROM api_lotex_lp;'

            try:
                cursor.execute(sql_string)
                rs = cursor.fetchone()
            except(Exception, Error) as error:
                print("\nexecute_sql() error: ", error)

    if rs:
        refresh_token_payload = {'grant_type': 'refresh_token',
                                 'username': rs[0],
                                 'refresh_token': token}

        refresh = refresh_token_refresh = requests.get('https://webservice.lotek.com/API/user/login',
                                                       data=refresh_token_payload,
                                                       timeout=3,
                                                       headers=constants.X_WWW_HEADERS)

    return refresh.json()

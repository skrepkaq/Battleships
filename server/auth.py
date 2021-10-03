import hashlib
import re
import wst
import database


SALT = 'SaltySaltySalt'  # ur salt

if SALT == 'SaltySaltySalt':
    print('[WARNING] Please change the default salt in auth.py file')


async def authorization(users, user, rc):
    login_result = auth(users, user, rc["method"], rc.get("login"), rc.get("password"), rc.get("token"))
    await wst.send(user.ws, {'type': 'login_result', 'data': login_result[0]})
    if login_result[0] == 2:
        await wst.send(user.ws, {'type': 'state', 'data': -1})
        await wst.send(user.ws, {'type': 'token', 'data': login_result[1]})
        await wst.send(user.ws, {'type': 'top', 'data': database.get_top(user.get_nickname())})


def auth(users, user, method, login, password, token):
    if method == 'token':
        return user.token_login(users, token)
    elif method == 'login':
        hash = hashlib.sha256((SALT+login+password).encode()).hexdigest()
        return user.login(hash, users)
    elif method == 'register':
        if 20 >= len(login) > 3 and 50 >= len(password) > 5 and re.match("^[A-Za-z0-9_-]*$", login):
            hash = hashlib.sha256((SALT+login+password).encode()).hexdigest()
            return user.register(login, hash)
        return [0]

import hashlib
import re
import wst
import database
import config


if config.SALT == 'SaltySaltySalt':
    print('[WARNING] Please change the default salt in config.py file')


async def authorization(users, user, rc) -> None:
    login, password = rc.get("login"), rc.get("password")
    if rc["method"] == 'token':
        login_result = await user.token_login(users, rc.get("token"))
    elif rc["method"] == 'login':
        hash = hashlib.sha256((config.SALT+login+password).encode()).hexdigest()
        login_result = await user.login(hash, users)
    elif rc["method"] == 'register':
        if 20 >= len(login) > 3 and 50 >= len(password) > 5 and re.match("^[A-Za-z0-9_-]*$", login):
            hash = hashlib.sha256((config.SALT+login+password).encode()).hexdigest()
            login_result = await user.register(login, hash)
        else:
            login_result = 0
    '''
    login_result
    0-Wrong login or password
    1-Account with this login already exist
    2-OK
    3-Account is already online
    4-Wrong token
    5-Too many accounts
    '''
    await wst.send(user.ws, {'type': 'login_result', 'data': login_result})
    if login_result == 2:
        await wst.send(user.ws, {'type': 'state', 'data': -1})
        await wst.send(user.ws, {'type': 'top', 'data': database.get_top(user.get_nickname())})

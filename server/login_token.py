import time
from random import choice
import database
import wst
abc = 'abcdefghjklmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789'


async def create(user_id, ws):
    # creates and sends new token
    database.expire_tokens('userId', user_id, -1)
    token = ""
    for _ in range(30):
        token += choice(abc)
    database.insert('tokens', 'token,userId,ip,time,state', (token, user_id, ws.remote_address[0], int(time.time()), 1))
    await wst.send(ws, {'type': 'token', 'data': token})


def use(token, ws):
    # checks if token is valid. Returns userID
    sql_token = database.check_token(ws.remote_address[0], token)
    if not sql_token: return False
    database.expire_tokens('tokenId', sql_token[0], 0)
    return sql_token[2]

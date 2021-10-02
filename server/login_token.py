import time
from random import choice
import database
abc = 'abcdefghjklmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789'


def create(user_id, ip):
    database.expire_tokens('userId', user_id, -1)
    token = ""
    for _ in range(30):
        token += choice(abc)
    database.insert('tokens', 'token,userId,ip,time,state', (token,user_id,ip,int(time.time()),1))
    return token


def use(ip, token):
    sql_token = database.check_token(ip, token)
    if sql_token:
        database.expire_tokens('tokenId', sql_token[0], 0)
        return create(sql_token[2], ip), sql_token[2]
    return False
import time
import os


if not os.path.exists("log"):
    os.makedirs("log")


def authorization(type, nick, id, address, by_token=False):
    method = " by password"
    if by_token: method = " by token"
    if type == "Register": method = ''
    with open('log/server.log', 'a') as log:
        log.write(f"[{type}: {get_time()}] {nick}({id}) from {str(address[0])}:{address[1]}{method}\n")


def startup():
    with open('log/server.log', 'a') as log:
        log.write(f"[Start: {get_time()}] Server started!\n")


def exception(exc):
    with open('log/errors.log', 'a') as err_log:
        err_log.write(f"[Exception: {get_time()}] {exc}\n")


def get_time():
    return time.strftime("%d-%m-%Y %H:%M:%S", time.gmtime(time.time())) + '.' + str(int(time.time()%1*10000000))

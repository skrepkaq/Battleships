import database
import login_token
import log


class User:
    def __init__(self, websocket):
        self.ws = websocket
        self.state = 0  # 0-pre login 1-login 2-in game
        self.id = None
        self.nickname = None

    async def register(self, login, hash):
        if database.find('users', 'login', login): return 1
        # check if account with this login already exist
        if len(database.find('users', 'ip', self.ws.remote_address[0])) >= 5: return 5
        # check if too many accounts with this ip
        database.insert('users', 'login, password, ip', (login, hash, self.ws.remote_address[0]))
        log.authorization('Register', login, ' ', self.ws.remote_address)
        return await self.login(hash)

    async def login(self, hash=None, users=[], tok_user_id=None):
        if tok_user_id:
            # login by token
            sql_user = database.find('users', 'userId', tok_user_id)
        else:
            # login by password
            sql_user = database.find('users', 'password', hash)
        if not sql_user: return 0
        for user in users:
            # check if account is already online
            if user.id == sql_user[0][0]: return 3
        self.id = sql_user[0][0]
        self.nickname = sql_user[0][1]
        self.state = 1
        log.authorization('Login', self.nickname, self.id, self.ws.remote_address, tok_user_id)
        await login_token.create(self.id, self.ws)
        return 2

    async def token_login(self, users, tok):
        token_res = login_token.use(tok, self.ws)
        if not token_res: return 4
        return await self.login(users=users, tok_user_id=token_res)

    def set_state(self, state):
        self.state = state

    def get_state(self):
        return self.state

    def get_id(self):
        return self.id

    def get_ws(self):
        return self.ws

    def get_nickname(self):
        return self.nickname

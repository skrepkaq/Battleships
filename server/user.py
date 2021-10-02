import database
import login_token
import log

class User:
    def __init__(self, websocket):
        self.ws = websocket
        self.state = 0 #0 - pre login 1-login 2-in game
        self.id = None
        self.nickname = None

    def register(self, login, hash):
        if database.find('users', 'login', login): return [1]
        database.insert('users', 'login,password', (login, hash))
        log.authorization('Register', login, ' ', self.ws.remote_address)
        return self.login(hash) #OK


    def login(self, hash = None, users = [], tok_user_id = None):
        if tok_user_id:
            sql_user = database.find('users', 'userId', tok_user_id)
        else:
            sql_user = database.find('users', 'password', hash)
        if not sql_user: return [0] #wrong pass or log
        for user in users:
            if user.id == sql_user[0]: return [3] #alr login
        self.id = sql_user[0]
        self.nickname = sql_user[1]
        self.state = 1
        log.authorization('Login', self.nickname, self.id, self.ws.remote_address, tok_user_id)
        if tok_user_id: return 2
        return (2, login_token.create(self.id, self.ws.remote_address[0]))


    def token_login(self, users, tok):
        token_res = login_token.use(self.ws.remote_address[0], tok)
        if not token_res: return [4] #wrong token
        log_res = self.login(users = users, tok_user_id = token_res[1])
        if log_res == [3]: return log_res
        return (log_res, token_res[0])


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
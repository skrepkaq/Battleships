import sqlite3
import time


db = sqlite3.connect('data.db')
sql = db.cursor()


def tables_create():
    sql.execute("""CREATE TABLE IF NOT EXISTS users (
    userId INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT,
    password TEXT,
    ip TEXT)""")

    sql.execute("""CREATE TABLE IF NOT EXISTS games (
    gameId INTEGER PRIMARY KEY AUTOINCREMENT,
    shots INTEGER,
    time INTEGER)""")

    sql.execute("""CREATE TABLE IF NOT EXISTS players (
    playerId INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    gameId INTEGER,
    board TEXT,
    result INTEGER,
    FOREIGN KEY (userId) REFERENCES user (userId),
    FOREIGN KEY (gameId) REFERENCES games (gameId))""")

    sql.execute("""CREATE TABLE IF NOT EXISTS tokens (
    tokenId INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT,
    userId INTEGER,
    ip TEXT,
    time INTEGER,
    state INTEGER,
    FOREIGN KEY (userId) REFERENCES user (userId))""")

    sql.execute("PRAGMA table_info(users);")
    if len(sql.fetchall()) < 4:
        sql.execute("ALTER TABLE users ADD ip TEXT;")
    db.commit()


def find(table, col, val):
    sql.execute(F"SELECT * FROM {table} WHERE {col} = '{val}'")
    return sql.fetchall()


def check_token(ip, token):
    sql.execute(F"SELECT * FROM tokens WHERE ip = '{ip}' AND token = '{token}' AND state = 1")
    return sql.fetchone()


def expire_tokens(check_col, check_val, state):
    sql.execute(f"UPDATE tokens SET state = '{state}' WHERE {check_col} = '{check_val}' AND state = 1")
    db.commit()


def insert(table, cols, vals):
    vals_str = ''
    for _ in range(len(vals) - 1):
        vals_str += '?, '
    vals_str += '?'
    sql.execute(f"INSERT INTO {table}({cols}) VALUES({vals_str});", vals)
    db.commit()


def game_log(game, loser, winner=None):
    insert('games', 'shots,time', (game.get_shots(), int(time.time())))
    sql.execute("SELECT last_insert_rowid();")
    game_id = sql.fetchone()[0]
    for player in game.get_players():
        if player == loser:
            insert('players', 'userId,gameId,board,result',
                   (player.user.get_id(), game_id, player.board.get_base_board(), 0))
        elif player == winner:
            insert('players', 'userId,gameId,board,result',
                   (player.user.get_id(), game_id, player.board.get_base_board(), 1))
        else:
            insert('players', 'userId,gameId,board', (player.user.get_id(), game_id, player.board.get_base_board()))


def get_top(nick):
    sql.execute("""
    SELECT users.login,
    (SELECT COUNT(*)
    FROM 'players'
    JOIN games ON games.gameId = players.gameId
    WHERE users.userId = players.userId
        AND players.result = 1
        AND games.shots > 40) AS 'wins',
    (SELECT COUNT(*)
    FROM 'players'
    JOIN games ON games.gameId = players.gameId
    WHERE users.userId = players.userId
        AND players.result = 0) AS 'loses'
    FROM 'users'
    ORDER BY wins DESC,
            loses ASC;
    """)
    users = sql.fetchall()
    place = ''
    for i, user in enumerate(users):
        if nick == user[0]:
            place = ("Your place:", '', i + 1)
    users = users[:10]
    if place:
        users.append(place)
    return users

import database
import wst
from player import Player
from random import randint, choice


abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'


class Round():
    def __init__(self, game_type):
        self.type = game_type  # 1-random  0-code
        self.players_list = []
        self.state = 0  # 0-wait for players #1-place (#2-wait_for_second place) #3-game #4-end
        self.turn_index = 0
        self.shots = 0
        self.code = None
        if self.type == 0:
            self.code = ''
            for _ in range(6):
                self.code += choice(abc)

    async def add_player(self, user):
        self.players_list.append(Player(user))
        if len(self.players_list) == 2:
            await self.start()
        else:
            await wst.send(user.ws, {'type': 'state', 'data': 0})

    async def finish_place(self, player, opponent):
        if (self.state != 1 or player.get_placed() or player.board.count_ships()
            or player.board.get_ships() != [4, 3, 2, 1]): return
        player.placed = True
        if opponent.get_placed():  # placing is complete
            self.state = 3
            self.turn_index = randint(0, 1)
            for pl in self.players_list:
                await wst.send(pl.user.ws, {'type': 'state', 'data': 3})
            await wst.send_turn(self)
        else:
            await wst.send(player.user.ws, {'type': 'state', 'data': 2})

    async def place(self, player, num, state):
        if self.state != 1 or player.get_placed() or state not in (0, 1): return
        await wst.send(player.user.ws, {"type": 'board', "my": 1, "data": player.board.place(num, state)})
        await wst.send(player.user.ws, {'type': 'ships', 'data': player.board.get_ships()})

    async def auto_place(self, player):
        if self.state != 1 or player.get_placed(): return False
        await wst.send(player.user.ws, {"type": 'board', "my": 1, "data": player.board.auto_place()})
        await wst.send(player.user.ws, {'type': 'ships', 'data': [4, 3, 2, 1]})

    async def shot(self, player, opponent, num):
        if player != self.players_list[self.turn_index] or self.state != 3: return
        shot_result = opponent.board.shot(num)
        if not shot_result: return
        self.shots += 1
        send_brd, change_turn = shot_result
        if change_turn:
            if self.turn_index == 1: self.turn_index = 0
            else: self.turn_index = 1
        await wst.send(player.user.ws, {"type": 'board', "my": 0, "data": send_brd})
        await wst.send(opponent.user.ws, {"type": 'board', "my": 1, "data": send_brd})
        await wst.send_turn(self)
        if opponent.board.count_all() == 0:
            self.state = 4
            database.game_log(self, opponent, player)
            await wst.send(player.user.ws, {'type': 'end', 'data': 1})
            await wst.send(opponent.user.ws, {'type': 'end', 'data': 0})

    async def start(self):
        self.state = 1
        self.shots = 0
        for player in self.players_list:
            player.reset()
            player.user.set_state(2)
            await wst.send(player.user.ws, {'type': 'state', 'data': 1})
            await wst.send(player.user.ws, {'type': 'top', 'data': database.get_top(player.user.get_nickname())})
            for opp in self.players_list:
                if opp != player:
                    await wst.send(opp.user.ws, {'type': 'op_nick', 'data': player.user.get_nickname()})

    def get_turn(self):
        return self.turn_index

    def get_state(self):
        return self.state

    def get_players(self):
        return self.players_list

    def get_type(self):
        return self.type

    def get_code(self):
        return self.code

    def get_shots(self):
        return self.shots

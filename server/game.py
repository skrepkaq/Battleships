import wst
import database
from round import Round


rounds = set()


async def join(user, type, code=None):  # 0-join random 1-join by code 2-create
    if type == 0:
        fnd = False
        for round in rounds:
            if round.get_type() and round.get_state() == 0:  # found round(random) with 1 player
                await round.add_player(user)
                fnd = True
                break
        if fnd: return
        round = Round(1)
        rounds.add(round)                                    # nefound, create
        await round.add_player(user)
    elif type == 1:
        for round in rounds:
            if code.upper() == round.get_code() and round.get_state() == 0:
                await round.add_player(user)
    elif type == 2:
        round = Round(0)
        rounds.add(round)                                    # create with code
        await wst.send(user.ws, {'type': 'code', 'data': round.get_code()})
        await round.add_player(user)


async def place(user, rc):
    round, player = get_round(user)
    await round.place(player, rc["num"], rc["state"])


async def auto_place(user, _):
    round, player = get_round(user)
    await round.auto_place(player)


async def shot(user, rc):
    round, player = get_round(user)
    opponent = get_opponent(round, player)
    await round.shot(player, opponent, rc["num"])


async def finish_place(user, _):
    round, player = get_round(user)
    opponent = get_opponent(round, player)
    await round.finish_place(player, opponent)


async def restart(user, _):
    round, _ = get_round(user)
    if len(round.get_players()) > 1:
        await round.start()


async def finish(user):
    round, player = get_round(user)
    if not round: return
    opponent = get_opponent(round, player)
    print(f'end game with {round}, {player}, {opponent}, {user.ws}')
    if opponent: await wst.send(opponent.user.ws, {'type': 'end', 'data': 4})
    if round.get_state() == 3: database.game_log(round, player)
    rounds.remove(round)


def get_round(user):
    for round in rounds:
        for player in round.get_players():
            if player.user == user:
                return round, player
    return None, None


def get_opponent(round, player):
    for pl in round.get_players():
        if pl != player:
            return pl
    return None


action = {'place': place,
          'auto_place': auto_place,
          'shot': shot,
          'start': finish_place,
          'restart': restart}

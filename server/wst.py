import json


async def send(ws, message):
    await ws.send(json.dumps(message))


async def send_turn(round):
    players = round.get_players()
    turn_index = round.get_turn()
    for i in range(2):
        if i == turn_index:
            await send(players[i].user.ws, {'type': 'turn', 'data': 1})
        else:
            await send(players[i].user.ws, {'type': 'turn', 'data': 0})

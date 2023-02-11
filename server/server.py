#!/usr/bin/env python

import asyncio
import json
import random
import secrets
import time
import math
import numpy as np

import websockets

# 여기에 연결된 웹소켓들을 저장
connected = {}
map = {
    "type": "map",
    "time": 0,
    "player": {
        
    },
}
isClientConnected = False

player_color = {
    
}

received_input = []

sqRoot2 = 1 / math.sqrt(2)

player_speed = 25

update_frequency = 0.1

async def error(websocket, message):
    """
    Send an error message.

    """
    event = {
        "type": "error",
        "message": message,
    }
    await websocket.send(json.dumps(event))

async def play(websocket, id):
    print('func - play')
    async for message in websocket:
        data = json.loads(message)
        assert data['id'] == id
        assert data['type'] == 'input'
        received_input.append(data)

async def update():
    print('func - update')
    map['time'] = time.time()
    while isClientConnected:
        if len(received_input) == 0:
            await asyncio.sleep(update_frequency)
            continue
        if len(connected) == 0:
            print('func - update return')
            return
        previous_input_time = {}
        for i in range(0, len(received_input)):
            id = received_input[i]['id']
            if id not in previous_input_time:
                previous_input_time[id] = map["time"]
            deltatime = received_input[i]['time'] - map['time']
            if abs(map["player"][id][2]) and abs(map["player"][id][3]):
                map["player"][id][:2] += np.array(map["player"][id][2:]) * player_speed * deltatime * sqRoot2
            else:
                map["player"][id][:2] += np.array(map["player"][id][2:]) * player_speed * deltatime
            map["player"][id][2:] = received_input[i]['input']
            previous_input_time[id] = received_input[i]['time']
        map['time'] += update_frequency
        for i in range(0, len(map["player"])):
            for player in map["player"]:
                deltatime = map['time'] - previous_input_time[player]
                if abs(map["player"][player][2]) and abs(map["player"][player][3]):
                    map["player"][player][:2] += np.array(map["player"][player][2:]) * player_speed * deltatime * sqRoot2
                else:
                    map["player"][player][:2] += np.array(map["player"][player][2:]) * player_speed * deltatime
        try:
            websockets.broadcast(connected, json.dumps(map))
        except:
            pass
        received_input.clear()
        previous_input_time.clear()
        print(map['time'])
        await asyncio.sleep(update_frequency)

async def join(websocket):
    print('join')
    try:
        global isClientConnected
        # message = await websocket.recv()
        # data = json.loads(message)
        rand_color = [random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)]
        rand_id = secrets.token_urlsafe(12)
        connected[rand_id] = websocket
        init_data = {
            "type": "init",
            "id": rand_id,
            "color": rand_color,
        }
        await websocket.send(json.dumps(init_data))
        player_color[rand_id] = rand_color
        map["player"][rand_id] = [100, 100, 0, 0,]   # x y vx vy
        await websocket.send(json.dumps(map)),
        # if not isClientConnected:
        #     isClientConnected = True
        #     Update()
        # await websocket.send(json.dumps(map))
        # await play(websocket, rand_id)
        if not isClientConnected:
            isClientConnected = True
            print('cla connected')
            await asyncio.gather(
                update(),
                # websocket.send(json.dumps(map)),
                play(websocket, rand_id),
            )
        else:
            # await websocket.send(json.dumps(map))
            await play(websocket, rand_id)
    finally:
        print('client - delete')
        del connected[rand_id]
        del map['player'][rand_id]
        del player_color[rand_id]

async def sendTime(websocket):
    time_data = {
        "type": "time_sync",
        "time": time.time(),
    }
    await websocket.send(json.dumps(time_data))


async def init(websocket):
    async for message in websocket:
        data = json.loads(message)
        if data['type'] == 'time_sync':
            await sendTime(websocket)
        elif data['type'] == 'init':
            await join(websocket)
        else:
            print('뭐라는거야')


async def main():
    async with websockets.serve(init, "", 8001):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
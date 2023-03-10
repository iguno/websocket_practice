import * as PIXI from "../pixi/pixi.min.mjs";

const Application = PIXI.Application;

const app = new Application({
    width: document.body.clientWidth,
    height: document.body.clientHeight,
    transparent: true,
    antialias: true,
});

let my_id = "";
let my_color = "";

let input_now = [];
let input_prev = [];

const one = 1;

const move_speed = 10;
let vx = 0;
let vy = 0;

let key_Up = false;
let key_Left = false;
let key_Down = false;
let key_Right = false;

let isMoving = false;

let time_send = [];
let time_receive = [];
let time_gap = [];

// time_server = time_client - time_gap_average;
let time_server = 0;
let time_display = 0;
// let time_client = 0;
let time_gap_average = 0;

let time_try_count = 10;

let data_queue = [];
let prev_gap, late_gap;

document.addEventListener("keydown", (event) => {
    if (event.code == "ArrowUp") {
        key_Up = true;
    }
    if (event.code == "ArrowLeft") {
        key_Left = true;
    }
    if (event.code == "ArrowDown") {
        key_Down = true;
    }
    if (event.code == "ArrowRight") {
        key_Right = true;
    }
});

document.addEventListener("keyup", (event) => {
    if (event.code == "ArrowUp") {
        key_Up = false;
    }
    if (event.code == "ArrowLeft") {
        key_Left = false;
    }
    if (event.code == "ArrowDown") {
        key_Down = false;
    }
    if (event.code == "ArrowRight") {
        key_Right = false;
    }
});

app.renderer.background.color = 0x888888;

app.renderer.resize(document.body.clientWidth, document.body.clientHeight);
app.renderer.autoResize = true;
app.renderer.view.style.position = "absolute";
document.body.appendChild(app.view);

const sqRoot2 = 1 / Math.sqrt(2);

//딕셔너리
let players = {};

class manCharacter {
    constructor(x, y, id) {
        this.id = id;
        this.cnt = 0;
        this.manTexture = [];
        this.texture_count = 0;
        this.isMoving = false;
        this.manTexture.push(PIXI.Texture.from("../nobg/man_stand.png"));
        this.manTexture.push(PIXI.Texture.from("../no/1.png"));
        this.manTexture.push(PIXI.Texture.from("../no/2.png"));
        this.manTexture.push(PIXI.Texture.from("../no/3.png"));
        this.manTexture.push(PIXI.Texture.from("../no/4.png"));
        this.manTexture.push(PIXI.Texture.from("../no/5.png"));
        this.manTexture.push(PIXI.Texture.from("../no/6.png"));
        this.manTexture.push(PIXI.Texture.from("../no/7.png"));
        this.texture_count = this.manTexture.length;
        this.manSprite = new PIXI.Sprite(this.manTexture[0]);
        this.sprite = this.manSprite;
        this.manSprite.position.set(x, y);
        this.manSprite.anchor.set(0.5, 0.5);
        this.manSprite.scale.set(1);
        app.stage.addChild(this.manSprite);
        console.log("constructed");
    }
}

// 유니티의 Update같은거
// app.ticker.add(delta => loop(delta));

let loop = (delta, websocket) => {
    // console.log("loop");
    updateserverTime();
    // console.log(time_server);
    // for (let id in players){
    //     if (key_Up || key_Down || key_Left || key_Right){
    //         players[id].isMoving = true;
    //     }else{
    //         players[id].isMoving = false;
    //     }
    //     if (players[id].isMoving){
    //         if (++players[id].cnt >= 3 * players[id].texture_count){
    //             players[id].cnt = 3;
    //         }
    //     }else{
    //         players[id].cnt = 0;
    //     }
    //     players[id].manSprite.texture = players[id].manTexture[(players[id].cnt/3) | 0];
    // }
    if (key_Up || key_Down || key_Left || key_Right) {
        isMoving = true;
    } else {
        isMoving = false;
    }

    if (isMoving) {
        if ((key_Up && key_Down) || (!key_Up && !key_Down)) {
            vy = 0;
        } else if (key_Up) {
            vy = -one;
        } else {
            vy = one;
        }
        if ((key_Left && key_Right) || (!key_Left && !key_Right)) {
            vx = 0;
        } else if (key_Left) {
            // console.log(players);
            look_Left(players[my_id].manSprite);
            vx = -one;
        } else {
            // console.log(players);
            look_Right(players[my_id].manSprite);
            vx = one;
        }
        input_now = [vx, vy];
        if (input_now[0] != input_prev[0] || input_now[1] != input_prev[1]) {
            updateserverTime();
            let data = {
                type: "input",
                id: my_id,
                time: time_server,
                input: [vx, vy],
            };
            websocket.send(JSON.stringify(data));
        }
        input_prev = input_now;
    }
    // 여기부터 서버에서 데이터받아서 위치조정하는
    time_display = time_server - 0.1;
    // console.log(data_queue.length);
    if (data_queue.length != 0) {
        if (data_queue[0].time < time_display - 0.7) {
            time_sync(websocket);
            return;
        }
        while (data_queue[0].time < time_display - 0.1) {
            // console.log(data_queue[0].time - time_display);
            // console.log(data_queue[0].time);
            // console.log(time_display - 0.1);
            data_queue.shift();
            if (data_queue.length == 0) {
                break;
            }
        }
        if (data_queue.length == 0) {
            return;
        }
        console.log(data_queue.length);
        if (data_queue[0].time > time_server) {
            time_sync(websocket);
        } else if (data_queue.length > 1) {
            for (let id in players) {
                prev_gap = time_display - data_queue[0].time;
                late_gap = data_queue[1].time - time_display;
                // console.log(
                //     data_queue[0].player[id][0] * late_gap +
                //         data_queue[1].player[id][0] * prev_gap
                // );
                players[id].manSprite.position.x =
                    data_queue[0].player[id][0] * late_gap +
                    data_queue[1].player[id][0] * prev_gap;
                players[id].manSprite.position.y =
                    data_queue[0].player[id][1] * late_gap +
                    data_queue[1].player[id][1] * prev_gap;
            }
        }
    }
};

const look_Left = (sprite) => {
    if (sprite.scale.x > 0) {
        sprite.scale.x *= -1;
    }
};
const look_Right = (sprite) => {
    if (sprite.scale.x < 0) {
        sprite.scale.x *= -1;
    }
};

const updatePlayerInfo = (data) => {
    for (let id in data.player) {
        if (id in players) {
            if (data.player[id][2] > 0) {
                look_Right(players[id].sprite);
            } else if (data.player[id][2] < 0) {
                look_Left(players[id].sprite);
            }
        } else {
            //     console.log(id)
            //     console.log(data.player[id][0])
            players[id] = new manCharacter(
                data.player[id][0],
                data.player[id][1],
                id
            );
            players[id].sprite.x = data.player[id][0];
            players[id].sprite.y = data.player[id][1];
        }
    }
};

let unixTime = () => {
    return new Date().getTime() / 1000;
};

let updateserverTime = () => {
    time_server = unixTime() - time_gap_average;
};

// start - 01
window.addEventListener("DOMContentLoaded", () => {
    const websocket = new WebSocket("ws://127.0.0.1:8001/");
    websocketopend(websocket);
});

let websocketopend = (websocket) => {
    websocket.addEventListener("open", () => {
        receiveData(websocket);
        initTime(websocket);
    });
};

// 02
let initGame = (websocket) => {
    let event = {
        type: "init",
    };
    websocket.send(JSON.stringify(event));
};

// 03
let initTime = (websocket) => {
    time_sync(websocket);
};

let time_sync = (websocket) => {
    let event = {
        type: "time_sync",
    };
    if (my_id != "") {
        event.id = my_id;
    }
    for (let i = 0; i < time_try_count; i++) {
        websocket.send(JSON.stringify(event));
        console.log("send time");
        time_send.push(unixTime());
    }
};

let time_sync_received = (t, websocket) => {
    let cl_time = (time_send.shift() + time_receive.shift()) / 2;
    // console.log(cl_time);
    // console.log(t);
    time_gap.push(cl_time - t);
    if (time_gap.length >= time_try_count) {
        let total = 0;
        for (let i = 0; i < time_gap.length; i++) {
            // console.log(time_gap[i]);
            total += time_gap[i];
        }
        time_gap_average = total / time_gap.length;
        updateserverTime();
        console.log("initGame");
        if (my_id == "") {
            initGame(websocket);
        }
    }
};

const receiveData = (websocket) => {
    websocket.addEventListener("message", (received_data) => {
        // console.log(received_data);
        const data = JSON.parse(received_data.data);
        // console.log(data);
        switch (data.type) {
            case "init":
                my_id = data.id;
                my_color = data.color;
                app.ticker.add((delta) => loop(delta, websocket));
                break;
            case "map":
                console.log("push");
                data_queue.push(data);
                updatePlayerInfo(data);
                break;
            case "time_sync":
                time_receive.push(unixTime());
                time_sync_received(data.time, websocket);
                break;
            case "error":
                showMessage(data.message);
                break;
            default:
                throw new Error(`Unsupported event type: ${data.type}.`);
        }
    });
};

function showMessage(message) {
    window.setTimeout(() => window.alert(message), 50);
}

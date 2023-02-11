import * as PIXI from '../node_modules/pixi.js/dist/pixi.mjs'

const Application = PIXI.Application;

const app = new Application({
    width: document.body.clientWidth,
    height: document.body.clientHeight,
    transparent: true,
    antialias: true,
}); 

const move_speed = 10;
let x_speed = 0;
let y_speed = 0;

let key_Up = false;
let key_Left = false;
let key_Down = false;
let key_Right = false;

let isMoving = false;

let isJumping = false;
let gravity = 1;
const jump_power = 30;



document.addEventListener('keydown', (event) => {
    if (event.code == "ArrowUp"){
        key_Up = true;
    }
    if (event.code == "ArrowLeft"){
        key_Left = true;
    }
    if (event.code == "ArrowDown"){
        key_Down = true;
    }
    if (event.code == "ArrowRight"){
        key_Right = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.code == "ArrowUp"){
        key_Up = false;
    }
    if (event.code == "ArrowLeft"){
        key_Left = false;
    }
    if (event.code == "ArrowDown"){
        key_Down = false;
    }
    if (event.code == "ArrowRight"){
        key_Right = false;
    }
});

app.renderer.background.color = 0x888888;

app.renderer.resize(document.body.clientWidth, document.body.clientHeight);
app.renderer.autoResize = true;
app.renderer.view.style.position = 'absolute';

document.body.appendChild(app.view);

const manTexture = []

manTexture.push(PIXI.Texture.from('../nobg/man_stand.png'));
manTexture.push(PIXI.Texture.from('../no/1.png'));
manTexture.push(PIXI.Texture.from('../no/2.png'));
manTexture.push(PIXI.Texture.from('../no/3.png'));
manTexture.push(PIXI.Texture.from('../no/4.png'));
manTexture.push(PIXI.Texture.from('../no/5.png'));
manTexture.push(PIXI.Texture.from('../no/6.png'));
manTexture.push(PIXI.Texture.from('../no/7.png'));
const manSprite = new PIXI.Sprite(manTexture[0]);
app.stage.addChild(manSprite);

manSprite.anchor.set(0.5, 0.5);
manSprite.position.set(300, 300);
manSprite.scale.set(1);
const sqRoot2 = 1 / Math.sqrt(2);

// 유니티의 Update같은거
app.ticker.add(delta => loop(delta));

const texture_count = manTexture.length;
let cnt = 0;

const manBounds = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);

function loop(delta){
    if (key_Up || key_Down || key_Left || key_Right){
        isMoving = true;
    }else{
        isMoving = false;
    }
    if (isMoving){
        if (++cnt >= 3 * texture_count){
            cnt = 3;
        }
    }else{
        cnt = 0;
    }
    manSprite.texture = manTexture[(cnt/3) | 0];
    
    if ((key_Up && key_Down) || (!key_Up && !key_Down)){
        y_speed = 0;
    }else if(key_Up){
        y_speed = -move_speed;
    }else{
        y_speed = move_speed;
    }
    if ((key_Left && key_Right) || (!key_Left && !key_Right)){
        x_speed = 0;
    }else if(key_Left){
        look_Left();
        x_speed = -move_speed;
    }else{
        look_Right();
        x_speed = move_speed;
    }
    if (Math.abs(x_speed) == 10 && Math.abs(y_speed) == 10){
        manSprite.x += x_speed * delta * sqRoot2;
        manSprite.y += y_speed * delta * sqRoot2;
    }else{
        manSprite.x += x_speed * delta;
        manSprite.y += y_speed * delta;
    }
    if (manSprite.x < manBounds.x) {
        manSprite.x += manBounds.width;
    } else if (manSprite.x > manBounds.x + manBounds.width) {
        manSprite.x -= manBounds.width;
    }

    if (manSprite.y < manBounds.y) {
        manSprite.y += manBounds.height;
    } else if (manSprite.y > manBounds.y + manBounds.height) {
        manSprite.y -= manBounds.height;
    }

}


const look_Left = () => {
    if (manSprite.scale.x > 0){
        manSprite.scale.x *= -1;
    }
}
const look_Right = () => {
    if (manSprite.scale.x < 0){
        manSprite.scale.x *= -1;
    }
}
manSprite.interactive = true;
manSprite.on('pointerdown', function() {
    // resetPosition();
    nextText();
});

function resetPosition(){
    manSprite.position.set(Math.random() * window.innerWidth, Math.random() * window.innerHeight);
}

function nextText(){
    if (++cnt > texture_count){
        cnt = 0;
    }
    manSprite.texture = manTexture[cnt];
}

window.addEventListener("DOMContentLoaded", () => {
	const websocket = new WebSocket("ws://180.230.141.138:8001/");
    initGame(websocket);
});

function initGame(websocket) {
	websocket.addEventListener("open", () => {
		let event = { type: "init" };
		websocket.send(JSON.stringify(event));
	});
}

function receiveMoves(board, websocket) {
	websocket.addEventListener("message", ({ data }) => {
		const event = JSON.parse(data);
		switch (event.type) {
            case "init":
                break;
            case "move":
                
                break;
            case "error":
                showMessage(event.message);
                break;
            default:
                throw new Error(`Unsupported event type: ${event.type}.`);
		}
	});
}
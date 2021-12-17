// backend
const ws = require('ws');
const uuid = require('uuid');
const Koa = require('koa');
const fileSystem = require('fs');
const port = process.env.PORT || 7284;​​
const app = new Koa();
const path = './src/db.json';
const wsServer = new ws.Server({ port });​​
const currentClients = [];
const messages = [];
const client = [];​
app.use(async(ctx, next) => {
    const origin = ctx.request.get('Origin');
    if (!origin) {
        return await next();
    }​
    const headers = { 'Access-Control-Allow-Origin': '*' };​
    if (ctx.request.method !== 'OPTIONS') {
        ctx.response.set({...headers });
        try {
            return await next();
        } catch (e) {
            e.headers = {...e.headers, ...headers };
            throw e;
        }
    }​
    if (ctx.request.get('Access-Control-Request-Method')) {
        ctx.response.set({
            ...headers,
            'Access-Control-Allow-Methods': 'GET, POST, DELETE',
        });​
        if (ctx.request.get('Access-Control-Request-Headers')) {
            ctx.response.set(
                'Access-Control-Allow-Headers',
                ctx.request.get('Access-Control-Request-Headers'),
            );
        }
        ctx.response.status = 204;
    }
});​​
wsServer.on('connection', (ws) => {
    const id = uuid.v4();
    client[id] = ws;​
    ws.on('message', (rawMessage) => {
        const { userName } = JSON.parse(rawMessage);
        if (userName) {
            if (currentClients.findIndex(item => item.name === userName) > -1) {
                client[id].send(JSON.stringify({ successName: false }));
                return;
            } else {
                currentClients.push({ id, name: `${userName}` });
                client.push(client[id]);
                client[id].send(JSON.stringify({ successName: true }));
                return;
            }
        }
        const { name, dateTime, message } = JSON.parse(rawMessage);
        messages.push({ name, dateTime, message });
        client.filter(item => item !== client[id]).forEach(item => {
            item.send(JSON.stringify([{ name, dateTime, message }]));
        });
    })
    ws.on('close', () => {
        delete client[id];
        const index = currentClients.findIndex(item => item.id === id);
        currentClients.splice(index, 1);
    })
})


//front
const button = document.getElementsByClassName("btn")[0];
const input = document.getElementsByClassName('txt')[0];
const start = document.getElementsByClassName('start')[0];
const chat = document.getElementsByClassName('chat-input')[0];
const area = document.getElementsByClassName("area")[0];
const openChat = document.getElementsByClassName("chat")[0];
const side = document.getElementsByClassName('side')[0];
const url = 'http://localhost:7284';
let ws = new WebSocket("ws://localhost:7284");
let userName;
const names = [];​​
function crateRecord(name) {
    const div = document.createElement('div');
    const circle = document.createElement('div');
    circle.classList.add('circle');
    div.classList.add('left');
    const p = document.createElement('p');
    p.style.fontSize = '20px';
    p.style.margin = '20px';
    p.innerText = name;
    circle.appendChild(p);
    div.appendChild(circle);
    side.appendChild(div);
}​
function addMessage(name, dateTime, message, className) {
    const element = document.createElement('p')
    element.classList.add(className);
    if (className === 'right') {
        element.classList.add('red');
        name = 'You';
    }
    element.innerText = `${name}  ` + dateTime;
    area.appendChild(element);
    const item = document.createElement('p')
    item.classList.add(className);
    item.innerText = message;
    area.appendChild(item);
}​
input.addEventListener('keypress', () => {
    input.classList.remove('not-valid');
})​
button.addEventListener('click', event => {
    event.preventDefault();
    userName = input.value.trim();
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ userName }));
    else {
        ws = new WebSocket("ws://localhost:7284");
        ws.send(JSON.stringify({ userName }));
    }
    document.body.style.cursor = 'wait';
});​
ws.onmessage = (message) => {
    const messages = JSON.parse(message.data);
    const { successName } = messages;
    document.body.style.cursor = '';
    if (successName) {
        input.value = '';
        start.classList.add('hidden');
        openChat.classList.remove('hidden');
        side.classList.remove('hidden');
        crateRecord('You');
    } else if (successName === undefined) {
        messages.forEach((val) => {
            addMessage(val.name, val.dateTime, val.message, 'left');
            const index = names.findIndex(item => item === val.name);
            if (index < 0) {
                names.push(val.name);
                crateRecord(val.name);
            }
        })
    } else {
        input.classList.add('not-valid');
        input.value = `This ${userName} occupied. Please change your nick`;
        userName = undefined;
    }
}​
chat.addEventListener('keypress', event => {
    if (event.key === 'Enter' && chat.value !== '') {
        const message = chat.value;
        const name = userName;
        const dateTime = new Date().toLocaleTimeString().substr(0, 5) + "  " + new Date().toLocaleDateString();
        chat.value = '';
        ws.send(JSON.stringify({
            name,
            dateTime,
            message
        }))
        if (ws.readyState === WebSocket.OPEN) {
            addMessage('You', dateTime, message, 'right');
        }
    }
})​
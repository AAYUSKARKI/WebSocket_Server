import express, { Request, Response } from "express";
import http from "http";
import WebSocket  from "ws";

const app = express();

// create a http server
const server = http.createServer(app);

// create a websocket server
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("A new client connected");
    ws.send(JSON.stringify({
        message: "welome new client"
    }));
    ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        console.log(message);
    })
})

app.get("/", (req: Request, res: Response) => {
    res.send("hello");
})

server.listen(3000, () => {
    console.log("server started");
})
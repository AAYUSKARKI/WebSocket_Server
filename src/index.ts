import express, { Request, Response } from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

//store online clients
const onlineUsers = new Map<string, WebSocket>();

// Define message data types
interface MessageData {
    type: "send" | "receive";
    message?: string;
    user?: string;
}

// Extend WebSocket to include isAlive property
interface CustomWebSocket extends WebSocket {
    isAlive?: boolean;
}

// Broadcast function to handle different types of messages
const broadcastMessage = (sender: WebSocket, type: "send" | "receive", content: string | undefined) => {
    const payload = JSON.stringify({ type, [type === "send" ? "sent" : "received"]: content });

    Array.from(wss.clients)
        .filter(client => client !== sender && client.readyState === WebSocket.OPEN)
        .forEach(client => client.send(payload));
};

//send private message
const sendPrivateMessage = (sender: WebSocket, receiver: string|undefined, content: string|undefined) => {
    if (!receiver) {
        return;
    }
    const receiverClient = onlineUsers.get(receiver);
    if (receiverClient) {
        broadcastMessage(sender, "send", content);
        broadcastMessage(receiverClient, "receive", content);
    }
}
// Handle a new WebSocket connection
const handleConnection = (ws: CustomWebSocket,req: Request) => {
    // Parse the request URL to extract query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const user = url.searchParams.get("user"); // Get the 'user' parameter

    if (user) {
        onlineUsers.set(user,ws)
    }
    console.log(onlineUsers.size);
    console.log("A new client connected");
    ws.send(JSON.stringify({ message: "Welcome new client" }));

    // Set up heartbeat ping-pong mechanism
    ws.isAlive = true;
    ws.on("pong", () => (ws.isAlive = true));  // Reset the isAlive flag on pong

    ws.on("message", (data: WebSocket.Data) => handleIncomingMessage(ws, data));
    ws.on("error", (error: Error) => console.error("WebSocket error:", error));
    ws.on("close", () => {
        console.log("Client disconnected"); 
        onlineUsers.delete(user||"");
    });
};

// Handle incoming messages from clients
const handleIncomingMessage = (ws: WebSocket, data: WebSocket.Data) => {
    try {
        const message: MessageData = JSON.parse(data.toString());
        console.log("Received message:", message);

        if (message.type === "send") {
            broadcastMessage(ws, "send", message.message);
        } else if (message.type === "receive") {
            broadcastMessage(ws, "receive", message.user);
        }
        else {
            sendPrivateMessage(ws, message.user, message.message);
        }
    } catch (error) {
        console.error("Error processing message:", error);
        ws.send(JSON.stringify({ error: "Invalid message format" }));
    }
};

// Ping-Pong Heartbeat to keep connections alive and remove dead clients
const setupHeartbeat = () => {
    setInterval(() => {
        wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();  // Send ping, expecting pong response
        });
    }, 30000);  // 30-second heartbeat interval
};

// Set up WebSocket server
wss.on("connection", handleConnection);
setupHeartbeat();

app.get("/", (_req: Request, res: Response) => {
    res.send("Hello");
});

server.listen(3000, () => console.log("Server started on port 3000"));

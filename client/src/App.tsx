import React, { useEffect, useState } from 'react';

interface Message {
    type: string;
    message: string;
    user?: string; // Optional user field for chat messages
    content ?: string;
    status?:string;
}

const App: React.FC = () => {
    const randomUserstring = Math.random().toString(36).substring(7);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        const webSocket = new WebSocket(`ws://localhost:3000?user=${randomUserstring}`);
        
        webSocket.onopen = () => {
            console.log('WebSocket connection established.');
        };

        webSocket.onclose = () => {
            console.log('WebSocket connection closed.');
        };

        webSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        setWs(webSocket);

        webSocket.onmessage = (event) => {
            const message: Message = JSON.parse(event.data);
            console.log(message, 'msg from server');
            setMessages((prev) => [...prev, message]);
        };

        return () => webSocket.close();
    }, []);

    const sendMessage = () => {
        if (input && ws) {
            ws.send(JSON.stringify({ message: input, user: "alex", type: 'chat' }));
            setInput('');
        }
    };

    return (
        <div className="chat-app">
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.type}`}>
                        {msg.type === 'acknowledgment' ? (<>
                            <strong>{msg.content}</strong>
                            <p>{msg.status}</p>
                            </>
                        ) : (
                            <span>{msg.user}: {msg.message}</span>
                        )}
                    </div>
                ))}
            </div>
            <input
                className="message-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button className="send-button" onClick={sendMessage}>Send</button>
        </div>
    );
};

export default App;

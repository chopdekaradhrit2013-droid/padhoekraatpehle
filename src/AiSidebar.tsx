import { useState } from 'react';

export default function AiSidebar() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // This automatically grabs your secret key from Vercel
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  async function handleSend() {
    if (!input.trim()) return;

    // 1. Put your message onto the screen
    const userMessage = input;
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      // 2. Send your message to the Gemini AI
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }]
        })
      });

      const data = await response.json();
      const aiAnswer = data.candidates[0].content.parts[0].text;

      // 3. Put the AI's answer onto the screen
      setMessages((prev) => [...prev, { role: 'ai', text: aiAnswer }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Oops! Something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-section">
      <h2>AI Assistant ✨</h2>
      <div className="chat-box">
        {messages.map((msg, index) => (
          <p key={index}>
            <b>{msg.role === 'user' ? 'You: ' : 'AI: '}</b>
            {msg.text}
          </p>
        ))}
        {loading && <p><i>AI is thinking...</i></p>}
      </div>
      
      <div className="input-area">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI anything..." 
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

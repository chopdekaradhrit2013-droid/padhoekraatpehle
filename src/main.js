// 1. Grab the secret API key hid in Vercel
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const chatHistory = document.getElementById('chat-history');

// 2. This function talks to Gemini
async function askGemini(message) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: message }] }]
    })
  });

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// 3. This listens for when the user clicks the "Send" button
sendBtn.addEventListener('click', async () => {
  const text = userInput.value;
  if (!text) return;

  chatHistory.innerHTML += `<p><b>You:</b> ${text}</p>`;
  userInput.value = ''; 

  chatHistory.innerHTML += `<p id="loading"><i>AI is thinking...</i></p>`;

  try {
    const aiAnswer = await askGemini(text);
    document.getElementById('loading').remove();
    chatHistory.innerHTML += `<p><b>AI:</b> ${aiAnswer}</p>`;
  } catch (error) {
    if (document.getElementById('loading')) {
      document.getElementById('loading').remove();
    }
    chatHistory.innerHTML += `<p style="color: red;"><b>Error:</b> Oops, something went wrong.</p>`;
  }
});

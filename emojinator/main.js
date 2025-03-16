let controller;
let reader;
let decoder;
let stream = document.getElementById('stream');
let cursor = document.getElementById('cursor');
let output = document.getElementById('output');
let tDelay = 50;
const micButton = document.getElementById('micBtn');

document.getElementById('sendBtn').addEventListener('click', async () => {
    const input = document.getElementById('input').value;
    stream.textContent = "";
    cursor.style.left = "0px";
    document.getElementById('sendBtn').style.animation = 'bounce 0.3s ease';
    document.getElementById('sendBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    controller = new AbortController();
    const signal = controller.signal;

    try {
        const response = await fetch('http://localhost:1337/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "meta-llama-3.1-8b-instruct",
                messages: [
                    { role: "user", content: input },
                    { role: "system", content: "Respond with emojis only." }
                ],
                stream: true
            }),
            signal
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${error}`);
        }

        reader = response.body.getReader();
        decoder = new TextDecoder("utf-8");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter(line => line.trim() !== "");
            for (const line of lines) {
                if (line.startsWith("data:")) {
                    const jsonString = line.slice(5).trim();

                    if (jsonString !== "[DONE]") {
                        try {
                            const jsonData = JSON.parse(jsonString);
                            const content = jsonData.choices?.[0]?.delta?.content || "";

                            for (const char of content) {
                                await new Promise(resolve => setTimeout(resolve, tDelay));
                                stream.textContent += char;
                                cursor.style.left = `${stream.scrollWidth - 10}px`;
                            }
                        } catch (err) {
                            console.error("JSON parse error:", err, jsonString);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        stream.textContent = `Error: ${error.message}`;
    } finally {
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        console.log('Send button triggered with only Enter key');
        document.getElementById('sendBtn').click();
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    if (controller) {
        controller.abort();
        document.getElementById('stopBtn').disabled = true;
        stream.textContent += "\n\nStreaming stopped.";
    }
});

const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

micButton.addEventListener('click', () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onstart = () => {
        micButton.classList.add('listening');
        micButton.textContent = '🎤 Listening...';
    };

    recognition.onspeechend = () => {
        recognition.stop();
        micButton.classList.remove('listening');
        micButton.textContent = '🎙️';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('input').value = transcript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        micButton.classList.remove('listening');
        micButton.textContent = '🎙️';
    };
});
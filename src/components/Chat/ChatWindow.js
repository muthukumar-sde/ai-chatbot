"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MapPin, Building, Home, Briefcase, User, Bot } from "lucide-react";

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am your Real Estate Assistant. How can I help you find your dream property today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Get user location for "nearest" feature
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => console.log("Geolocation error:", error)
      );
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userLocation,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, data]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <Building className="text-sky-400" size={32} />
        <div>
          <h1>Property Assistant</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Real-time Real Estate Expert
          </p>
        </div>
      </div>

      <div className="messages-list">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.8rem', opacity: 0.7 }}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              <span>{msg.role === 'user' ? 'You' : 'Assistant'}</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message assistant" style={{ fontStyle: 'italic' }}>
            Searching...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="e.g., Show me 3BHK houses in Coimbatore"
          disabled={loading}
        />
        <button className="send-button" onClick={handleSend} disabled={loading || !input.trim()}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MapPin, Building, Home, Briefcase, User, Bot, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function ChatWindow() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am your Real Estate Assistant. How can I help you find your dream property today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationCity, setLocationCity] = useState(""); // Display city name
  const [locationStatus, setLocationStatus] = useState(""); // "granted", "denied", "pending"
  const [threadId, setThreadId] = useState(null);
  const messagesEndRef = useRef(null);

  // ✅ Initialize thread ID only in browser (after mount)
  useEffect(() => {
    let id = sessionStorage.getItem("thread_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("thread_id", id);
    }
    setThreadId(id);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Get user location for "nearest" feature
    if (navigator.geolocation) {
      setLocationStatus("pending");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          setUserLocation({ lat, lon });
          console.log("✅ Location granted:", lat, lon);

          // Reverse geocode to get city name
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
            );
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.village || "Unknown";
            setLocationCity(city);
            console.log("📍 City detected:", city);
          } catch (error) {
            console.warn("⚠️ Could not reverse geocode:", error.message);
            setLocationCity("Location detected");
          }

          setLocationStatus("granted");
        },
        (error) => {
          setLocationStatus("denied");
          console.warn("⚠️ Location access denied:", error.message);
        }
      );
    } else {
      setLocationStatus("denied");
      console.warn("❌ Geolocation not supported by browser");
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
          threadId, // Send thread ID to maintain conversation context
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

  if (!mounted) {
    return null;
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-left">
          <Building className="text-sky-400" size={32} />
          <div className="header-content">
            <h1>Property Assistant</h1>
            <div className="header-subtitle">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Real-time Real Estate Expert
              </p>
              {locationStatus === "granted" && locationCity && (
                <span className="location-badge granted">
                  <MapPin size={12} /> {locationCity}
                </span>
              )}
              {locationStatus === "denied" && (
                <span className="location-badge denied">
                  <MapPin size={12} /> Location OFF
                </span>
              )}
              {locationStatus === "pending" && (
                <span className="location-badge pending">
                  📍 Getting location...
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
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

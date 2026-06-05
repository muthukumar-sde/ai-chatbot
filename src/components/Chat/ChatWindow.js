"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MapPin, Building, Home, Briefcase, User, Bot, Moon, Sun, Mic, Square, Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@/lib/ThemeContext";
import { reverseGeocode } from "@/lib/agent/geocode";
import remarkGfm from "remark-gfm";

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
  const [userMemory, setUserMemory] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isCancelledRef = useRef(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef("");

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const handleSend = () => {
    if (input.trim()) {
      submitMessage(input);
    }
  };

  // ✅ Initialize thread ID only in browser (after mount)
  useEffect(() => {
    let id = sessionStorage.getItem("thread_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("thread_id", id);
    }
    setThreadId(id);

    // Initialize user memory from session
    const memoryCache = sessionStorage.getItem("userMemory");
    if (memoryCache) {
      try {
        setUserMemory(JSON.parse(memoryCache));
      } catch (e) {
        console.error("Failed to parse user session memory", e);
      }
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        
        if (isCancelledRef.current) {
          return; // Discard audio
        }
        
        setLoading(true);
        let transcriptionSuccess = false;
        let transcribedText = "";

        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");
          
          const response = await fetch("/api/voice", {
            method: "POST",
            body: formData,
          });
          
          const data = await response.json();
          if (data.text) {
            transcribedText = data.text;
            transcriptionSuccess = true;
          } else if (data.error) {
            console.error("Transcription error:", data.error);
          }
        } catch (err) {
          console.error("Error sending audio to API:", err);
        }

        if (transcriptionSuccess) {
          const finalText = inputRef.current ? inputRef.current + " " + transcribedText : transcribedText;
          setInput(finalText);
          setLoading(false);
        } else {
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const cancelRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const confirmRecording = () => {
    isCancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

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
          const placeName = await reverseGeocode(lat, lon);
          setUserLocation({ lat, lon, city: placeName });
          console.log("✅ Location granted:", lat, lon);
          // Reverse geocode to get city name (consistent headers)

          setLocationCity(placeName || "Location detected");
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

  const submitMessage = async (textToSubmit) => {
    if (!textToSubmit.trim()) {
      setLoading(false);
      return;
    }

    const userMsg = { role: "user", content: textToSubmit };
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
          userMemory, // Send frontend session memory
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.userMemory) {
        setUserMemory(data.userMemory);
        sessionStorage.setItem("userMemory", JSON.stringify(data.userMemory));
      }

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
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <div style={{ overflowX: "auto", margin: "8px 0" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }} {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th style={{ border: "1px solid var(--border-color, #444)", padding: "8px 12px", background: "var(--table-header-bg, #1e293b)", color: "#ffffff", textAlign: "left", whiteSpace: "nowrap" }} {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td style={{ border: "1px solid var(--border-color, #444)", padding: "7px 12px", color: "var(--text-primary, #cbd5e1)" }} {...props} />
                ),
                tr: ({ node, ...props }) => (
                  <tr style={{ background: "var(--table-row-bg, transparent)" }} {...props} />
                ),
              }}
            >{msg.content}</ReactMarkdown>
          </div>
        ))}
        {loading && (
          <div className="message assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Searching</span>
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <button
          className={`mic-button ${isRecording ? 'is-recording' : ''}`}
          onClick={isRecording ? cancelRecording : startRecording}
          disabled={loading && !isRecording}
          title={isRecording ? "Cancel recording" : "Start recording"}
        >
          {isRecording ? <X size={20} /> : <Mic size={20} />}
        </button>
        
        <div className="input-wrapper">
          <input
            className={`chat-input ${isRecording ? 'is-recording' : ''}`}
            value={isRecording ? "" : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !isRecording && handleSend()}
            placeholder={isRecording ? "Listening..." : "e.g., Show me 1BHK houses in Coimbatore"}
            disabled={loading || isRecording}
          />
          {isRecording && (
            <div className="integrated-wave">
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
            </div>
          )}
        </div>

        <button 
          className={`send-button ${isRecording ? 'is-recording' : ''}`}
          onClick={isRecording ? confirmRecording : handleSend} 
          disabled={(loading && !isRecording) || (!isRecording && !input.trim())}
          title={isRecording ? "Stop & Send" : "Send message"}
        >
          {isRecording ? <Check size={20} /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
}

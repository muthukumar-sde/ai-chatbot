"use client";

import { Mic, X, Send, Check } from "lucide-react";

export default function ChatInput({
  input,
  setInput,
  loading,
  isRecording,
  onStartRecording,
  onCancelRecording,
  onConfirmRecording,
  onSend,
}) {
  return (
    <div className="input-area">
      <div className={`unified-input-container ${isRecording ? "is-recording-mode" : ""}`}>
        <button
          className={`mic-pill-button ${isRecording ? "is-recording" : ""}`}
          onClick={isRecording ? onCancelRecording : onStartRecording}
          disabled={loading && !isRecording}
          title={isRecording ? "Cancel Recording" : "Speak to Search (Voice Assistant)"}
          aria-label="Voice Search"
        >
          {isRecording ? <X size={18} /> : <Mic size={18} />}
        </button>

        {isRecording ? (
          <div className="recording-studio-bar">
            <div className="recording-pulse-dot"></div>
            <span className="recording-status-text">Listening... Speak your requirement</span>
            <div className="live-wave-bars">
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
            </div>
          </div>
        ) : (
          <input
            className="chat-input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Ask anything... e.g. Show 2 BHK apartments in Chennai under 70 Lakhs"
            disabled={loading}
          />
        )}

        {isRecording ? (
          <button
            className="voice-send-button"
            onClick={onConfirmRecording}
            title="Stop & Send Voice Query"
            aria-label="Send Voice Query"
          >
            <Check size={18} />
            <span>Done</span>
          </button>
        ) : (
          <button
            className="send-pill-button"
            onClick={onSend}
            disabled={loading || !input.trim()}
            title="Send Message"
            aria-label="Send Message"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

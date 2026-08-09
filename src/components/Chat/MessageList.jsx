"use client";

import { User, Bot, Heart, Calendar, MapPin } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function getTextFromNode(node) {
  if (!node) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getTextFromNode).join("");
  if (typeof node === "object" && node.props && node.props.children) {
    return getTextFromNode(node.props.children);
  }
  return "";
}

export default function MessageList({
  messages,
  loading,
  userMemory,
  favorites,
  onToggleFavorite,
  onOpenBookingModal,
  messagesEndRef,
}) {
  return (
    <div className="messages-list">
      {messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          <div className="message-header-row">
            <div className={`avatar-pill ${msg.role}`}>
              {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
              <span>{msg.role === "user" ? userMemory.name || "You" : "MK AI Assistant"}</span>
            </div>
          </div>
          <div className="message-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h3: ({ node, children, ...props }) => {
                  const fullText = getTextFromNode(children);
                  const match = fullText.match(/\[ID:\s*([A-Za-z0-9_-]+)\]/i);
                  const propertyId = match ? match[1] : null;
                  const isFav = propertyId && favorites.some((f) => f.id === propertyId);

                  return (
                    <div className="property-card-header-bar">
                      <h3 className="property-card-title" {...props}>
                        {children}
                      </h3>
                      {propertyId && (
                        <div className="prop-header-actions">
                          <button
                            className={`prop-heart-btn ${isFav ? "is-fav" : ""}`}
                            onClick={() => onToggleFavorite(propertyId)}
                            title={isFav ? "Remove from Favorites" : "Save to Favorites"}
                          >
                            <Heart size={14} className={isFav ? "fill-rose-500 text-rose-500" : ""} />
                            <span>{isFav ? "Saved" : "Favorite"}</span>
                          </button>
                          <button
                            className="prop-action-pill primary"
                            onClick={() => onOpenBookingModal(propertyId, fullText)}
                          >
                            <Calendar size={12} /> Book Visit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                },
                code: ({ node, inline, className, children, ...props }) => {
                  const text = String(children || "");
                  if (text.startsWith("ID:")) {
                    return null;
                  }
                  return <code className={className} {...props}>{children}</code>;
                },
                a: ({ node, children, href, ...props }) => {
                  const isGoogleMaps = href && href.includes("google.com/maps");
                  if (isGoogleMaps) return null;
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="custom-markdown-link"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                table: ({ node, ...props }) => (
                  <div className="markdown-table-wrapper">
                    <table className="styled-markdown-table" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => <th className="table-th" {...props} />,
                td: ({ node, ...props }) => <td className="table-td" {...props} />,
                tr: ({ node, ...props }) => <tr className="table-tr" {...props} />,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        </div>
      ))}
      {loading && (
        <div className="message assistant" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontStyle: "italic", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Searching
          </span>
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

"use client";

import { Building, Sparkles, User, MapPin, Heart, Volume2, VolumeX, RotateCcw, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function ChatHeader({
  userMemory,
  locationStatus,
  locationCity,
  favoritesCount,
  onOpenFavorites,
  isTtsEnabled,
  onToggleTts,
  onNewChat,
}) {
  const { theme, toggleTheme } = useTheme();

  const ActionButtons = (
    <div className="header-actions">
      <button
        className={`action-icon-button ${favoritesCount > 0 ? "active-glow" : ""}`}
        onClick={onOpenFavorites}
        title="Saved Favorites (Prisma DB)"
        aria-label="View Favorites"
      >
        <Heart size={16} className={favoritesCount > 0 ? "fill-rose-500 text-rose-500" : ""} />
        {favoritesCount > 0 && <span className="fav-count-badge">{favoritesCount}</span>}
      </button>

      <button
        className={`action-icon-button ${isTtsEnabled ? "active-glow" : ""}`}
        onClick={onToggleTts}
        title={isTtsEnabled ? "Disable Voice Output" : "Enable Voice Output (AI Speech)"}
        aria-label="Toggle Voice Output"
      >
        {isTtsEnabled ? <Volume2 size={16} className="text-sky-400" /> : <VolumeX size={16} />}
      </button>

      <button
        className="action-icon-button"
        onClick={onNewChat}
        title="Start New Chat"
        aria-label="New Chat"
      >
        <RotateCcw size={16} />
      </button>

      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );

  return (
    <div className="chat-header">
      {/* DESKTOP HEADER VIEW (> 640px) */}
      <div className="desktop-header-view">
        <div className="desktop-header-left">
          <div className="header-icon-badge">
            <Building className="text-sky-400" size={22} />
            <span className="online-indicator" title="Live AI Agent Online"></span>
          </div>

          <h1 className="header-gradient-title">Property Assistant</h1>

          <span className="ai-tag" title="AI Powered Assistant">
            <Sparkles size={10} /> AI Powered
          </span>

          <span className="header-divider">|</span>

          {userMemory.name ? (
            <span className="user-profile-badge">
              <User size={12} /> {userMemory.name}{" "}
              {userMemory.search_type ? `(${userMemory.search_type.toUpperCase()})` : ""}
            </span>
          ) : (
            <span className="expert-tag">Real-time Real Estate Expert</span>
          )}

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

        {ActionButtons}
      </div>

      {/* MOBILE HEADER VIEW (<= 640px) */}
      <div className="mobile-header-view">
        <div className="header-main-row">
          <div className="header-brand">
            <div className="header-icon-badge">
              <Building className="text-sky-400" size={20} />
              <span className="online-indicator" title="Live AI Agent Online"></span>
            </div>
            <div className="header-title-wrapper">
              <h1 className="header-gradient-title">Property Assistant</h1>
              <span className="ai-tag" title="AI Powered Assistant">
                <Sparkles size={10} /> AI Powered
              </span>
            </div>
          </div>

          {ActionButtons}
        </div>

        <div className="header-info-ribbon">
          <div className="info-ribbon-left">
            {userMemory.name ? (
              <span className="user-profile-badge">
                <User size={11} /> {userMemory.name}{" "}
                {userMemory.search_type ? `(${userMemory.search_type.toUpperCase()})` : ""}
              </span>
            ) : (
              <span className="expert-tag">Real-time Real Estate Expert</span>
            )}
          </div>
          <div className="info-ribbon-right">
            {locationStatus === "granted" && locationCity && (
              <span className="location-badge granted">
                <MapPin size={11} /> {locationCity}
              </span>
            )}
            {locationStatus === "denied" && (
              <span className="location-badge denied">
                <MapPin size={11} /> Location OFF
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
    </div>
  );
}

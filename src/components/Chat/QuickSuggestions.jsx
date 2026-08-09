"use client";

export default function QuickSuggestions({ suggestions, onSelectSuggestion, disabled }) {
  return (
    <div className="quick-suggestions-bar">
      {suggestions.map((item, idx) => (
        <button
          key={idx}
          className="suggestion-chip"
          onClick={() => onSelectSuggestion(item.query)}
          disabled={disabled}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

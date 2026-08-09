"use client";

import { X, MapPin, Calendar, Trash2 } from "lucide-react";

export default function FavoritesModal({
  favorites,
  onClose,
  onOpenBookingModal,
  onRemoveFavorite,
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="favorites-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>❤️ Saved Favorites ({favorites.length})</h3>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {favorites.length === 0 ? (
            <p className="no-favs-text">
              No saved properties yet. Tap the heart icon or ask the assistant to save properties!
            </p>
          ) : (
            <div className="favorites-grid">
              {favorites.map((p) => (
                <div key={p.id} className="fav-card">
                  <div className="fav-card-header">
                    <h4>{p.name}</h4>
                    <span className="fav-price">
                      ₹ {new Intl.NumberFormat("en-IN").format(p.price)}
                    </span>
                  </div>
                  <p className="fav-location">
                    <MapPin size={12} /> {p.location}, {p.city}
                  </p>
                  <div className="fav-actions">
                    <button
                      className="fav-action-btn primary"
                      onClick={() => {
                        onClose();
                        onOpenBookingModal(p.id, p.name);
                      }}
                    >
                      <Calendar size={13} /> Book Visit
                    </button>
                    <button
                      className="fav-action-btn remove"
                      onClick={() => onRemoveFavorite(p.id)}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

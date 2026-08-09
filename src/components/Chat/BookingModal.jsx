"use client";

import { X, Building } from "lucide-react";

export default function BookingModal({
  bookingProp,
  bookingForm,
  setBookingForm,
  bookingSubmitting,
  onClose,
  onSubmit,
}) {
  if (!bookingProp) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📅 Schedule Site Visit</h3>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="modal-body booking-form">
          <div className="booking-prop-badge">
            <Building size={14} className="text-sky-400" />
            <span>
              {bookingProp.name} ({bookingProp.id})
            </span>
          </div>

          <div className="form-group">
            <label>Your Name *</label>
            <input
              required
              type="text"
              className="modal-input"
              placeholder="e.g. Rahul Sharma"
              value={bookingForm.name}
              onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                required
                type="tel"
                className="modal-input"
                placeholder="e.g. 9876543210"
                value={bookingForm.phone}
                onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="modal-input"
                placeholder="name@example.com"
                value={bookingForm.email}
                onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Visit Date *</label>
              <input
                required
                type="date"
                className="modal-input"
                value={bookingForm.date}
                onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Preferred Time *</label>
              <select
                className="modal-input"
                value={bookingForm.time}
                onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
              >
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="04:30 PM">04:30 PM</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={bookingSubmitting}>
              {bookingSubmitting ? "Booking..." : "Confirm & Save Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

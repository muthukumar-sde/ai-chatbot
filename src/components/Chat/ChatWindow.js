"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { reverseGeocode } from "@/lib/agent/geocode";

import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import QuickSuggestions from "./QuickSuggestions";
import ChatInput from "./ChatInput";
import FavoritesModal from "./FavoritesModal";
import BookingModal from "./BookingModal";

export default function ChatWindow() {
  const { mounted } = useTheme();
  const INITIAL_WELCOME = {
    role: "assistant",
    content:
      "👋 **Welcome to MK Properties!** I am your Real Estate Assistant.\n\nI can help you discover verified properties across Tamil Nadu, compare listings, check nearby amenities, and guide you through home loans & legal processes.\n\nTo get started, **may I know your name** and whether you are looking to **buy** or **rent** a property? *(Or tap one of the quick options below!)*",
  };

  const QUICK_SUGGESTIONS = [
    { label: "🏢 2BHK Buy in Chennai", query: "Show me 2 BHK apartments to buy in Chennai under 70 lakhs" },
    { label: "🔑 Rent under ₹20k in Coimbatore", query: "Show me rental houses in Coimbatore under 20000 per month" },
    { label: "✨ Cheapest Villas in Madurai", query: "Show me the cheapest villas in Madurai" },
    { label: "📍 Near Me Properties", query: "Find properties near my current location" },
    { label: "📋 Home Loan & Documents FAQ", query: "What documents are required to buy a property and how to get a home loan?" },
  ];

  const [messages, setMessages] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("mk_chat_messages");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.error("Failed to parse cached chat messages", e);
        }
      }
    }
    return [INITIAL_WELCOME];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationCity, setLocationCity] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [userMemory, setUserMemory] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);

  const [bookingProp, setBookingProp] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    name: "",
    phone: "",
    email: "",
    date: "",
    time: "10:30 AM",
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isCancelledRef = useRef(false);
  const messagesEndRef = useRef(null);

  // Sync messages to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && messages && messages.length > 0) {
      localStorage.setItem("mk_chat_messages", JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  // Scroll to bottom on new message or loading change
  useEffect(() => {
    scrollToBottom("smooth");
    const timer = setTimeout(() => scrollToBottom("smooth"), 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // Ensure initial mount / refresh scrolls directly to bottom of restored chat
  useEffect(() => {
    if (mounted) {
      scrollToBottom("auto");
      const timer = setTimeout(() => scrollToBottom("smooth"), 250);
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  // Initialize session & geolocation
  useEffect(() => {
    let id = localStorage.getItem("thread_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("thread_id", id);
    }
    setThreadId(id);

    let uk = localStorage.getItem("mk_user_key");
    if (!uk) {
      uk = "user_" + crypto.randomUUID();
      localStorage.setItem("mk_user_key", uk);
    }
    fetchFavorites(uk);

    const memoryCache = localStorage.getItem("userMemory");
    if (memoryCache) {
      try {
        setUserMemory(JSON.parse(memoryCache));
      } catch (e) {
        console.error("Failed to parse user memory", e);
      }
    }

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      setLocationStatus("pending");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = { lat: position.coords.latitude, lon: position.coords.longitude };
          setUserLocation(loc);
          const placeName = await reverseGeocode(loc.lat, loc.lon);
          setLocationCity(placeName || "Location detected");
          setLocationStatus("granted");
        },
        () => setLocationStatus("denied")
      );
    } else {
      setLocationStatus("denied");
    }
  }, []);

  const fetchFavorites = async (tid) => {
    if (!tid) return;
    try {
      const res = await fetch(`/api/favorites?threadId=${tid}`);
      const data = await res.json();
      if (data.favorites) setFavorites(data.favorites);
    } catch (e) {
      console.error("Failed to fetch favorites", e);
    }
  };

  const toggleFavoriteProperty = async (propertyId) => {
    const targetKey = (typeof window !== "undefined" && localStorage.getItem("mk_user_key")) || threadId;
    if (!targetKey) return;
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: targetKey, propertyId }),
      });
      const data = await res.json();
      if (data.action) fetchFavorites(targetKey);
    } catch (e) {
      console.error("Failed to toggle favorite", e);
    }
  };

  const speakText = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`~]|https?:\/\/\S+/g, "").trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleTts = () => {
    if (isTtsEnabled) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsTtsEnabled(false);
    } else {
      setIsTtsEnabled(true);
      speakText("Voice response enabled.");
    }
  };

  const handleNewChat = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    const newId = crypto.randomUUID();
    if (typeof window !== "undefined") {
      localStorage.setItem("thread_id", newId);
      localStorage.removeItem("userMemory");
      localStorage.removeItem("mk_chat_messages");
    }
    setThreadId(newId);
    setUserMemory({});
    setMessages([INITIAL_WELCOME]);
    const uk = localStorage.getItem("mk_user_key");
    if (uk) fetchFavorites(uk);
  };

  const submitMessage = async (textToSubmit) => {
    if (!textToSubmit.trim()) return;

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
          threadId,
          userMemory,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.userMemory) {
        setUserMemory(data.userMemory);
        localStorage.setItem("userMemory", JSON.stringify(data.userMemory));
      }

      setMessages((prev) => [...prev, data]);
      if (isTtsEnabled && data.content) speakText(data.content);
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

  const openBookingModal = (id, name) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    setBookingProp({ id, name });
    setBookingForm({
      name: userMemory.name || "",
      phone: userMemory.phone || "",
      email: userMemory.email || "",
      date: dateStr,
      time: "10:30 AM",
    });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingProp || !bookingForm.name || !bookingForm.phone || !bookingForm.date || !bookingForm.time) {
      alert("Please fill in your Name, Phone Number, Date, and Time.");
      return;
    }

    setBookingSubmitting(true);
    try {
      const res = await fetch("/api/site-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: bookingProp.id,
          userName: bookingForm.name,
          userPhone: bookingForm.phone,
          userEmail: bookingForm.email,
          visitDate: bookingForm.date,
          visitTime: bookingForm.time,
          threadId,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const updatedMem = {
        ...userMemory,
        name: bookingForm.name,
        phone: bookingForm.phone,
        email: bookingForm.email || userMemory.email,
      };
      setUserMemory(updatedMem);
      localStorage.setItem("userMemory", JSON.stringify(updatedMem));

      setBookingProp(null);

      const confirmMsg = {
        role: "assistant",
        content: `🎉 **Site Visit Confirmed!**\n\nYour site visit for **${data.propertyName}** (${data.location}, ${data.city}) has been scheduled for **${bookingForm.date}** at **${bookingForm.time}**.\n\nOur property manager will contact you at **${bookingForm.phone}** prior to your visit. Confirmation ID: \`${data.visitId.slice(0, 8)}\`.`,
      };
      setMessages((prev) => [...prev, confirmMsg]);
      if (isTtsEnabled) speakText(`Site visit confirmed for ${data.propertyName} on ${bookingForm.date}`);
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to schedule site visit: " + err.message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        if (isCancelledRef.current) return;

        setLoading(true);
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "speech.webm");
          const response = await fetch("/api/voice", { method: "POST", body: formData });
          const data = await response.json();
          if (data.text) submitMessage(data.text);
        } catch (err) {
          console.error("Voice transcription failed", err);
        } finally {
          setLoading(false);
        }
      };

      isCancelledRef.current = false;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Microphone access failed", e);
      alert("Could not access microphone.");
    }
  };

  const cancelRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
  };

  const confirmRecording = () => {
    isCancelledRef.current = false;
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
  };

  if (!mounted) return null;

  return (
    <div className="chat-container">
      <ChatHeader
        userMemory={userMemory}
        locationStatus={locationStatus}
        locationCity={locationCity}
        favoritesCount={favorites.length}
        onOpenFavorites={() => setShowFavoritesModal(true)}
        isTtsEnabled={isTtsEnabled}
        onToggleTts={toggleTts}
        onNewChat={handleNewChat}
      />

      <MessageList
        messages={messages}
        loading={loading}
        userMemory={userMemory}
        favorites={favorites}
        onToggleFavorite={toggleFavoriteProperty}
        onOpenBookingModal={openBookingModal}
        messagesEndRef={messagesEndRef}
      />

      <QuickSuggestions
        suggestions={QUICK_SUGGESTIONS}
        onSelectSuggestion={submitMessage}
        disabled={loading || isRecording}
      />

      <ChatInput
        input={input}
        setInput={setInput}
        loading={loading}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onCancelRecording={cancelRecording}
        onConfirmRecording={confirmRecording}
        onSend={() => submitMessage(input)}
      />

      {showFavoritesModal && (
        <FavoritesModal
          favorites={favorites}
          onClose={() => setShowFavoritesModal(false)}
          onOpenBookingModal={openBookingModal}
          onRemoveFavorite={toggleFavoriteProperty}
        />
      )}

      {bookingProp && (
        <BookingModal
          bookingProp={bookingProp}
          bookingForm={bookingForm}
          setBookingForm={setBookingForm}
          bookingSubmitting={bookingSubmitting}
          onClose={() => setBookingProp(null)}
          onSubmit={handleBookingSubmit}
        />
      )}
    </div>
  );
}

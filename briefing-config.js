window.BRIEFING_API_BASE =
  window.BRIEFING_API_BASE ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://briefing-gamma.vercel.app");

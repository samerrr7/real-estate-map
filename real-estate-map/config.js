// --- Lebanon Real Estate Map Configuration ---
// Works 100% locally (no Zapier, no GitHub fetch required)

window.MAP_CONFIG = {
  // --- GOOGLE MAPS API ---
  GOOGLE_MAPS_API_KEY:"AIzaSyBK-HmJIZvrtcve53G9h94C29YbzINw744",
  // ⬆️ Go to https://console.cloud.google.com/apis/credentials
  // Enable “Maps JavaScript API” and paste your key here.

  // --- LOCAL DATA SOURCE ---
  DATA_URL: "./data.json",
  // ⬆️ This assumes data.json is inside the same folder as index.html and script.js.
  // If it’s in a subfolder, for example /real-estate-map/data.json, use:
  // DATA_URL: "real-estate-map/data.json",

  // --- DEFAULT MAP SETTINGS ---
  DEFAULT_CENTER: { lat: 33.9, lng: 35.5 }, // Lebanon center
  DEFAULT_ZOOM: 9,

  // --- UI OPTIONS ---
  ENABLE_DARK_MODE: true,
  ENABLE_FAVORITES: true,
  ENABLE_SEARCH_FILTERS: true,

  // --- ADVANCED OPTIONS ---
  AUTO_FIT_BOUNDS: true,
  SHOW_PRICES_ON_PINS: true,

  // --- DEBUG MODE ---
  DEBUG: false, // Set to true for console logs
};

// --- Inject Google API Key globally ---
window.GOOGLE_MAPS_API_KEY = window.MAP_CONFIG.GOOGLE_MAPS_API_KEY;

// --- Helper: Log config when debugging ---
if (window.MAP_CONFIG.DEBUG) {
  console.log("✅ Local Map Config Loaded:", window.MAP_CONFIG);
}

let map;
let markers = [];
const favorites = new Set();
let darkMode = false;
let currentMarker = null;
let locked = false; // 🟢 prevent hover when locked

// --- NIGHT MODE STYLE ---
const nightStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

// --- LOAD GOOGLE MAPS ---
(function load() {
  const key = window.GOOGLE_MAPS_API_KEY || "";
  if (!key || /REPLACE/.test(key)) {
    alert("Please set your Google Maps API key in config.js.");
    return;
  }
  const s = document.createElement("script");
  s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap&v=weekly`;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
})();

// --- INIT MAP ---
window.initMap = function () {
  const cfg = window.MAP_CONFIG || {};
  map = new google.maps.Map(document.getElementById("map"), {
    center: cfg.DEFAULT_CENTER || { lat: 33.9, lng: 35.5 },
    zoom: cfg.DEFAULT_ZOOM || 9,
    mapTypeControl: false,
    streetViewControl: true,
    zoomControl: true,
    fullscreenControl: true,
  });

  const saved = JSON.parse(localStorage.getItem("favoriteIds") || "[]");
  saved.forEach((id) => favorites.add(id));

  const DATA_URL = cfg.DATA_URL || "./data.json";

  fetch(DATA_URL, { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("Failed to load property data.");
      return r.json();
    })
    .then((data) => {
      const list = Array.isArray(data) ? data : data.properties || [];
      const filtered = filterLebanon(list);
      populateSourceFilter(filtered);
      createMarkers(filtered);
    })
    .catch((err) => {
      console.error("Error loading data:", err);
      alert("⚠️ Could not find local data.json — make sure it's in the same folder as index.html.");
    });

  setupUI();
};

// --- FILTER FOR LEBANON ---
function filterLebanon(list) {
  const LAT_MIN = 32.9,
    LAT_MAX = 34.6;
  const LNG_MIN = 35.0,
    LNG_MAX = 36.8;
  return list.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      p.lat >= LAT_MIN &&
      p.lat <= LAT_MAX &&
      p.lng >= LNG_MIN &&
      p.lng <= LNG_MAX
  );
}

// --- SOURCE FILTER ---
function populateSourceFilter(list) {
  const select = document.getElementById("sourceFilter");
  const sellers = Array.from(new Set(list.map((p) => p.seller).filter((s) => s && s.trim()))).sort();
  sellers.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });
}

// --- CREATE MARKERS ---
function createMarkers(list) {
  markers.forEach((m) => m.setMap(null));
  markers = [];
  const bounds = new google.maps.LatLngBounds();

  list.forEach((p, i) => {
    const hasPrice = p.price && !isNaN(p.price) && Number(p.price) > 0;
    const icon = buildIcon(hasPrice, p.price);
    const marker = new google.maps.Marker({
      position: { lat: p.lat, lng: p.lng },
      map,
      title: p.address || `Property #${i + 1}`,
      icon,
    });
    marker._data = p;
    marker._hasPrice = hasPrice;

    marker.addListener("mouseover", () => {
      if (!locked) showSidebar(marker);
    });
    marker.addListener("click", () => {
      locked = true;
      showSidebar(marker, true);
    });

    markers.push(marker);
    bounds.extend(marker.position);
  });

  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60 });
}

// --- BUILD ICONS ---
function buildIcon(hasPrice, priceValue) {
  const fill = "#e63946";
  if (!hasPrice) {
    const size = 14;
    const stroke = 2;
    const r = (size - stroke * 2) / 2;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><circle cx='${size / 2}' cy='${size / 2}' r='${r}' fill='${fill}' stroke='#fff' stroke-width='${stroke}'/></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      anchor: new google.maps.Point(size / 2, size / 2),
      scaledSize: new google.maps.Size(size, size),
    };
  }
  const text = formatShortPrice(priceValue);
  const baseW = 40,
    extra = Math.max(text.length - 4, 0) * 5;
  const width = baseW + extra,
    height = 20,
    pointerW = 14,
    pointerH = 6;
  const left = width / 2 - pointerW / 2,
    right = width / 2 + pointerW / 2;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height + pointerH}'><rect width='${width}' height='${height}' rx='6' ry='6' fill='${fill}'/><polygon points='${left},${height} ${width / 2},${height + pointerH} ${right},${height}' fill='${fill}'/><text x='${width / 2}' y='${height * 0.68}' font-size='13' font-weight='600' text-anchor='middle' fill='#fff'>${text}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    anchor: new google.maps.Point(width / 2, height + pointerH),
    scaledSize: new google.maps.Size(width, height + pointerH),
  };
}

function formatShortPrice(val) {
  const n = Number(val);
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

// --- SIDEBAR INFO ---
function showSidebar(marker, lockedClick = false) {
  currentMarker = marker;
  const p = marker._data;
  const sidebar = document.getElementById("infoSidebar");
  const content = document.getElementById("infoContent");
  sidebar.classList.remove("hidden");

  const lines = [];
  const add = (lbl, val) => {
    lines.push(`<div><strong>${lbl}:</strong> ${val || ""}</div>`);
  };
  add("Address", p.address);
  add("Seller", p.seller);
  add("Phone", p.phone);
  add("Price", p.price ? `$${Number(p.price).toLocaleString()}` : "");
  add("Price per M²", p.price_per_m || "");
  add("Notes", p.notes ? p.notes.replace(/\n/g, "<br>") : "");
  add("ID", p.id);

  const photosLinks = p.photos
    ? p.photos
        .split(/[,\\s]+/)
        .filter((v) => v.trim())
        .map((link, idx) => {
          const url = link.trim().startsWith("http") ? link.trim() : `assets/photos/${link.trim()}`;
          return `<a href='${url}' target='_blank'>Link ${idx + 1}</a>`;
        })
        .join(", ")
    : "";
  add("Photos", photosLinks);

  const favLabel = favorites.has(p.id) ? "Remove from favorites" : "Add to favorites";
  const accent = darkMode ? "#339af0" : "#0077ff";
  const favBtn = `<button id='fav-${p.id}' style='margin-top:10px;background:${accent};color:white;border:none;padding:7px 12px;border-radius:6px;cursor:pointer;'>${favLabel}</button>`;
  const exitBtn = `<button id='exit-lock' style='margin-left:10px;background:#444;color:white;border:none;padding:7px 12px;border-radius:6px;cursor:pointer;'>Exit</button>`;

  content.innerHTML = lines.join("") + favBtn + exitBtn;

  document.getElementById(`fav-${p.id}`).onclick = () => {
    toggleFavorite(p.id);
    showSidebar(marker, lockedClick);
  };
  document.getElementById("exit-lock").onclick = () => {
    locked = false;
    sidebar.classList.add("hidden");
  };
}

// --- SETUP UI ---
function setupUI() {
  const searchEl = document.getElementById("searchInput");
  const searchFilterEl = document.getElementById("searchFilter");
  const sourceEl = document.getElementById("sourceFilter");
  const priceEl = document.getElementById("priceFilter");

  function applyFilters() {
    const q = searchEl.value.toLowerCase().trim();
    const searchBy = searchFilterEl.value;
    const src = sourceEl.value;
    const pr = priceEl.value;

    markers.forEach((m) => {
      const p = m._data;
      let searchable = "";

      switch (searchBy) {
        case "address": searchable = p.address || ""; break;
        case "seller": searchable = p.seller || ""; break;
        case "price": searchable = String(p.price || ""); break;
        case "lot": searchable = String(p.lot || ""); break;
        case "notes": searchable = p.notes || ""; break;
        case "id": searchable = String(p.id || ""); break;
        default:
          searchable = `${p.address || ""} ${p.seller || ""} ${p.notes || ""} ${p.price || ""} ${p.lot || ""} ${p.id || ""}`;
      }

      let show = !q || searchable.toLowerCase().includes(q);

      if (src !== "all") show = show && p.seller === src;

      if (pr !== "all") {
        const price = Number(p.price || 0);
        if (isNaN(price)) show = false;
        else {
          switch (pr) {
            case "0-99": show = show && price < 100000; break;
            case "100-199": show = show && price >= 100000 && price < 200000; break;
            case "200-499": show = show && price >= 200000 && price < 500000; break;
            case "500-999": show = show && price >= 500000 && price < 1000000; break;
            case "1000+": show = show && price >= 1000000; break;
          }
        }
      }

      m.setVisible(show);
    });
  }

  searchEl.addEventListener("input", applyFilters);
  searchFilterEl.addEventListener("change", applyFilters);
  sourceEl.addEventListener("change", applyFilters);
  priceEl.addEventListener("change", applyFilters);
}

// --- FAVORITES ---
function toggleFavorite(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  localStorage.setItem("favoriteIds", JSON.stringify(Array.from(favorites)));
  renderFavorites();
}

function renderFavorites() {
  const ul = document.getElementById("favList");
  ul.innerHTML = "";
  if (!favorites.size) return (ul.innerHTML = "<li style='font-style:italic;'>No favorites yet.</li>");

  let index = 1;
  favorites.forEach((id) => {
    const marker = markers.find((m) => m._data.id === id);
    if (!marker) return;
    const li = document.createElement("li");
    li.textContent = `${index}. ${marker._data.address || `Property #${marker._data.id}`}`;
    li.onclick = () => {
      map.panTo(marker.getPosition());
      map.setZoom(Math.max(map.getZoom(), 15));
      showSidebar(marker);
    };
    ul.appendChild(li);
    index++;
  });
}

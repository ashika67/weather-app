const WEATHERSTACK_KEY = "2ebecbb0caa0b744d60dde27b41c84a5";
const elements = {
  cityInput: document.getElementById("cityInput"),
  searchBtn: document.getElementById("searchBtn"),
  geoBtn: document.getElementById("geoBtn"),
  cBtn: document.getElementById("cBtn"),
  fBtn: document.getElementById("fBtn"),
  themeToggle: document.getElementById("themeToggle"),
  currentWeather: document.getElementById("currentWeather"),
  forecastContainer: document.getElementById("forecastContainer")
};

let unit = localStorage.getItem("unit") || "C";
let lastData = null;
let isDarkTheme = localStorage.getItem("theme") === "dark";

function init() {
  elements.cBtn.classList.toggle("active", unit === "C");
  elements.fBtn.classList.toggle("active", unit === "F");
  document.body.classList.toggle("dark", isDarkTheme);

  if (localStorage.getItem("lastCity")) {
    fetchWeather(localStorage.getItem("lastCity"));
  }

  setupEventListeners();
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function setupEventListeners() {
  elements.searchBtn.addEventListener("click", handleSearch);
  elements.cityInput.addEventListener("keypress", e => {
    if (e.key === "Enter") handleSearch();
  });
  elements.geoBtn.addEventListener("click", handleGeolocation);
  elements.cBtn.addEventListener("click", () => switchUnit("C"));
  elements.fBtn.addEventListener("click", () => switchUnit("F"));
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.cityInput.addEventListener("input", debounce(() => {
    if (elements.cityInput.value.trim().length >= 3) handleSearch();
  }, 500));
}

function handleSearch() {
  const city = elements.cityInput.value.trim();
  if (city) {
    localStorage.setItem("lastCity", city);
    fetchWeather(city);
  }
}

function handleGeolocation() {
  elements.geoBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    pos => {
      fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`);
      elements.geoBtn.disabled = false;
    },
    () => {
      showError("Geolocation access denied");
      elements.geoBtn.disabled = false;
    }
  );
}

function switchUnit(newUnit) {
  if (unit !== newUnit) {
    unit = newUnit;
    localStorage.setItem("unit", unit);
    elements.cBtn.classList.toggle("active", unit === "C");
    elements.fBtn.classList.toggle("active", unit === "F");
    if (lastData) {
      renderWeather(lastData);
      fetchForecast(lastData.location.lat, lastData.location.lon);
    }
  }
}

function toggleTheme() {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle("dark", isDarkTheme);
  localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
}

async function fetchWeather(query) {
  elements.currentWeather.classList.add("loading");
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`http://api.weatherstack.com/current?access_key=${WEATHERSTACK_KEY}&query=${query}&units=m`)}`);
    if (!res.ok) throw new Error("Failed to fetch weather data");
    const data = await res.json();
    if (data.error) throw new Error(data.error.info);
    lastData = data;
    renderWeather(data);
    await fetchForecast(data.location.lat, data.location.lon);
    setTheme(data.location.localtime);
  } catch (error) {
    showError(error.message);
  } finally {
    elements.currentWeather.classList.remove("loading");
  }
}

function renderWeather(data) {
  const tempC = data.current.temperature;
  const feelsLikeC = data.current.feelslike;
  const temp = unit === "C" ? tempC : Math.round((tempC * 9/5) + 32);
  const feelsLike = unit === "C" ? feelsLikeC : Math.round((feelsLikeC * 9/5) + 32);
  const windSpeed = unit === "C" ? data.current.wind_speed : Math.round(data.current.wind_speed / 1.609);

  document.getElementById("cityName").textContent = `${data.location.name}, ${data.location.country}`;
  document.getElementById("localtime").textContent = `Local Time: ${data.location.localtime}`;
  document.getElementById("description").textContent = data.current.weather_descriptions[0];
  document.getElementById("temperature").textContent = `${temp}°${unit}`;
  document.getElementById("feelsLike").textContent = `${feelsLike}°${unit}`;
  document.getElementById("humidity").textContent = `${data.current.humidity}%`;
  document.getElementById("wind").textContent = `${windSpeed} ${unit === "C" ? "km/h" : "mph"}`;
}

async function fetchForecast(lat, lon) {
  elements.forecastContainer.classList.add("loading");
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`);
    if (!res.ok) throw new Error("Failed to fetch forecast data");
    const data = await res.json();
    renderForecast(data);
  } catch (error) {
    showError(error.message);
  } finally {
    elements.forecastContainer.classList.remove("loading");
  }
}

function renderForecast(data) {
  elements.forecastContainer.innerHTML = "";
  for (let i = 0; i < data.daily.time.length; i++) {
    const day = new Date(data.daily.time[i]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const maxC = data.daily.temperature_2m_max[i];
    const minC = data.daily.temperature_2m_min[i];
    const max = unit === "C" ? maxC : Math.round((maxC * 9/5) + 32);
    const min = unit === "C" ? minC : Math.round((minC * 9/5) + 32);

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `<p>${day}</p><p>${max}° / ${min}°${unit}</p>`;
    elements.forecastContainer.appendChild(card);
  }
}

function setTheme(localtime) {
  if (!localStorage.getItem("theme")) {
    const hour = parseInt(localtime.split(" ")[1].split(":")[0]);
    isDarkTheme = hour < 6 || hour >= 18;
    document.body.classList.toggle("dark", isDarkTheme);
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
  }
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4d4d;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000;
  `;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

init();
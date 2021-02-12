Module.register("MMM-Weather", {
  defaults: {
    location: false,
    locationID: false,
    apiKey: "",
    updateInterval: 10 * 60 * 10000,
    animationSpeed: 1000,
    units: config.units,
    lang: config.language,

    tableClass: "MMM-Weather",

    initialLoadDelay: 0,
    retryDelay: 2500,

    apiVersion: "2.5",
    apiBase: "https://api.openweathermap.org/data/",
    weatherEndpoint: "weather",

    iconTable: {
      "01d": "wi-day-sunny",
      "02d": "wi-day-cloudy",
      "03d": "wi-cloudy",
      "04d": "wi-cloudy-windy",
      "09d": "wi-showers",
      "10d": "wi-rain",
      "11d": "wi-thunderstorm",
      "13d": "wi-snow",
      "50d": "wi-fog",
      "01n": "wi-night-clear",
      "02n": "wi-night-cloudy",
      "03n": "wi-night-cloudy",
      "04n": "wi-night-cloudy",
      "09n": "wi-night-showers",
      "10n": "wi-night-rain",
      "11n": "wi-night-thunderstorm",
      "13n": "wi-night-snow",
      "50n": "wi-night-alt-cloudy-windy"
    }
  },
  firstEvent: false,
  fetchedLocationName: "",

  getScripts: function () {
    return ["moment.js"];
  },

  getStyles: function () {
    return ["weather-icons.css", "MMM-Weather.css"];
  },

  start: function () {
    Log.info("Starting module: " + this.name);

    moment.locale(config.language);

    this.temperature = null;
    this.weatherType = null;
    this.loaded = false;
    this.scheduleUpdate(this.config.initialLoadDelay);
  },

  getDom: function () {
    var wrapper = document.createElement("div");
    wrapper.className = this.config.tableClass;

    if (this.config.apiKey === "") {
      wrapper.innerHTML =
        "Please set the correct openweather <i>apiKey</i> in config.";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (!this.loaded) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    var large = document.createElement("div");
    large.className = "light";

    var weatherIcon = document.createElement("span");
    weatherIcon.className = "wi weathericon " + this.weatherType;
    large.appendChild(weatherIcon);

    var temperature = document.createElement("span");
    temperature.className = "bright";
    temperature.innerHTML = " " + this.temperature + "°";
    large.appendChild(temperature);

    wrapper.appendChild(large);

    return wrapper;
  },

  getHeader: function () {
    return "";
  },

  updateWeather: function () {
    if (this.config.apiKey === "") {
      Log.error("MMM-Weather: API-Key not set!");
      return;
    }

    var url =
      this.config.apiBase +
      this.config.apiVersion +
      "/" +
      this.config.weatherEndpoint +
      this.getParams();
    var self = this;
    var retry = true;

    var weatherRequest = new XMLHttpRequest();
    weatherRequest.open("GET", url, true);
    weatherRequest.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          self.processWeather(JSON.parse(this.response));
        } else if (this.status === 401) {
          self.updateDom(self.config.animationSpeed);

          Log.error(self.name + ": Incorrect API-Key.");
          retry = true;
        } else {
          Log.error(self.name + ": Could not load weather.");
        }

        if (retry) {
          self.scheduleUpdate(self.loaded ? -1 : self.config.retryDelay);
        }
      }
    };

    weatherRequest.send();
  },

  getParams: function () {
    var params = "?";

    if (this.config.locationID) {
      params += "id=" + this.config.locationID;
    } else if (this.config.location) {
      params += "q=" + this.config.location;
    } else if (this.firstEvent && this.firstEvent.geo) {
      params +=
        "lat=" + this.firstEvent.geo.lat + "&lon=" + this.firstEvent.geo.lon;
    } else if (this.firstEvent && this.firstEvent.location) {
      params += "q=" + this.firstEvent.location;
    } else {
      this.hide(this.config.animationSpeed, { lockString: this.identifier });
      return;
    }

    params += "&units=" + this.config.units;
    params += "&lang=" + this.config.lang;
    params += "&APPID=" + this.config.apiKey;

    return params;
  },

  processWeather: function (data) {
    if (!data || !data.main || typeof data.main.temp === "undefined") {
      return;
    }

    this.humidity = parseFloat(data.main.humidity);
    this.temperature = this.roundValue(data.main.temp);
    this.fetchedLocationName = data.name;
    this.weatherType = this.config.iconTable[data.weather[0].icon];

    var now = new Date();

    this.show(this.config.animationSpeed, { lockString: this.identifier });
    this.loaded = true;
    this.updateDom(this.config.animationSpeed);
    this.sendNotification("MMM-WEATHER_DATA", { data: data });
  },

  scheduleUpdate: function (delay) {
    var nextLoad = this.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    var self = this;
    setTimeout(function () {
      self.updateWeather();
    }, nextLoad);
  },

  /* function(temperature)
   * Rounds a temperature to 1 decimal or integer (depending on config.roundTemp).
   *
   * argument temperature number - Temperature.
   *
   * return string - Rounded Temperature.
   */
  roundValue: function (temperature) {
    var decimals = this.config.roundTemp ? 0 : 1;
    return parseFloat(temperature).toFixed(decimals);
  }
});

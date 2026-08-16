/**
 * CalcKit — Unit Converter
 *
 * Registry pattern with base-unit conversion.
 * Each category defines units, a base unit, and toBase/fromBase functions.
 * All conversions are client-side, no API calls.
 */

export class Converter {
  constructor() {
    this.categories = {};
    this.rates = null; // live exchange rates (relative to USD)
    this.ratesTimestamp = null; // API "time_last_update_utc"
    this.ratesStale = false; // true when using cached rates offline
    this._registerCategories();
  }

  _registerCategories() {
    this.categories = {
      length: {
        name: "Length",
        base: "m",
        units: [
          { id: "mm", name: "Millimeter", symbol: "mm" },
          { id: "cm", name: "Centimeter", symbol: "cm" },
          { id: "m", name: "Meter", symbol: "m" },
          { id: "km", name: "Kilometer", symbol: "km" },
          { id: "in", name: "Inch", symbol: "in" },
          { id: "ft", name: "Foot", symbol: "ft" },
          { id: "yd", name: "Yard", symbol: "yd" },
          { id: "mi", name: "Mile", symbol: "mi" },
        ],
        toBase: (v, u) => {
          const f = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 };
          return v / (f[u] ?? 1);
        },
      },

      mass: {
        name: "Mass",
        base: "kg",
        units: [
          { id: "mg", name: "Milligram", symbol: "mg" },
          { id: "g", name: "Gram", symbol: "g" },
          { id: "kg", name: "Kilogram", symbol: "kg" },
          { id: "t", name: "Tonne", symbol: "t" },
          { id: "oz", name: "Ounce", symbol: "oz" },
          { id: "lb", name: "Pound", symbol: "lb" },
          { id: "st", name: "Stone", symbol: "st" },
        ],
        toBase: (v, u) => {
          const f = { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.0283495, lb: 0.453592, st: 6.35029 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.0283495, lb: 0.453592, st: 6.35029 };
          return v / (f[u] ?? 1);
        },
      },

      temperature: {
        name: "Temperature",
        base: "c",
        units: [
          { id: "c", name: "Celsius", symbol: "°C" },
          { id: "f", name: "Fahrenheit", symbol: "°F" },
          { id: "k", name: "Kelvin", symbol: "K" },
        ],
        toBase: (v, u) => {
          if (u === "c") return v;
          if (u === "f") return (v - 32) * 5 / 9;
          if (u === "k") return v - 273.15;
          return v;
        },
        fromBase: (v, u) => {
          if (u === "c") return v;
          if (u === "f") return v * 9 / 5 + 32;
          if (u === "k") return v + 273.15;
          return v;
        },
      },

      volume: {
        name: "Volume",
        base: "l",
        units: [
          { id: "ml", name: "Milliliter", symbol: "mL" },
          { id: "l", name: "Liter", symbol: "L" },
          { id: "gal", name: "Gallon (US)", symbol: "gal" },
          { id: "qt", name: "Quart (US)", symbol: "qt" },
          { id: "pt", name: "Pint (US)", symbol: "pt" },
          { id: "cup", name: "Cup (US)", symbol: "cup" },
          { id: "floz", name: "Fluid Ounce (US)", symbol: "fl oz" },
          { id: "tbsp", name: "Tablespoon", symbol: "tbsp" },
          { id: "tsp", name: "Teaspoon", symbol: "tsp" },
        ],
        toBase: (v, u) => {
          const f = { ml: 0.001, l: 1, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588, floz: 0.0295735, tbsp: 0.0147868, tsp: 0.00492892 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { ml: 0.001, l: 1, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588, floz: 0.0295735, tbsp: 0.0147868, tsp: 0.00492892 };
          return v / (f[u] ?? 1);
        },
      },

      speed: {
        name: "Speed",
        base: "ms",
        units: [
          { id: "ms", name: "Meters/second", symbol: "m/s" },
          { id: "kmh", name: "Kilometers/hour", symbol: "km/h" },
          { id: "mph", name: "Miles/hour", symbol: "mph" },
          { id: "kn", name: "Knots", symbol: "kn" },
        ],
        toBase: (v, u) => {
          const f = { ms: 1, kmh: 0.277778, mph: 0.44704, kn: 0.514444 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { ms: 1, kmh: 0.277778, mph: 0.44704, kn: 0.514444 };
          return v / (f[u] ?? 1);
        },
      },

      area: {
        name: "Area",
        base: "sqm",
        units: [
          { id: "sqmm", name: "Square millimeter", symbol: "mm²" },
          { id: "sqcm", name: "Square centimeter", symbol: "cm²" },
          { id: "sqm", name: "Square meter", symbol: "m²" },
          { id: "ha", name: "Hectare", symbol: "ha" },
          { id: "sqkm", name: "Square kilometer", symbol: "km²" },
          { id: "sqin", name: "Square inch", symbol: "in²" },
          { id: "sqft", name: "Square foot", symbol: "ft²" },
          { id: "sqyd", name: "Square yard", symbol: "yd²" },
          { id: "acre", name: "Acre", symbol: "acre" },
          { id: "sqmi", name: "Square mile", symbol: "mi²" },
        ],
        toBase: (v, u) => {
          const f = { sqmm: 1e-6, sqcm: 0.0001, sqm: 1, ha: 10000, sqkm: 1e6, sqin: 0.00064516, sqft: 0.092903, sqyd: 0.836127, acre: 4046.86, sqmi: 2.59e6 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { sqmm: 1e-6, sqcm: 0.0001, sqm: 1, ha: 10000, sqkm: 1e6, sqin: 0.00064516, sqft: 0.092903, sqyd: 0.836127, acre: 4046.86, sqmi: 2.59e6 };
          return v / (f[u] ?? 1);
        },
      },

      data: {
        name: "Data",
        base: "b",
        units: [
          { id: "b", name: "Bit", symbol: "b" },
          { id: "B", name: "Byte", symbol: "B" },
          { id: "kb", name: "Kilobit", symbol: "kb" },
          { id: "kB", name: "Kilobyte", symbol: "kB" },
          { id: "Mb", name: "Megabit", symbol: "Mb" },
          { id: "MB", name: "Megabyte", symbol: "MB" },
          { id: "Gb", name: "Gigabit", symbol: "Gb" },
          { id: "GB", name: "Gigabyte", symbol: "GB" },
          { id: "Tb", name: "Terabit", symbol: "Tb" },
          { id: "TB", name: "Terabyte", symbol: "TB" },
        ],
        toBase: (v, u) => {
          // Bits use 1000, Bytes use 1024
          const f = {
            b: 1, B: 8,
            kb: 1000, kB: 8 * 1024,
            Mb: 1e6, MB: 8 * 1024 * 1024,
            Gb: 1e9, GB: 8 * 1024 * 1024 * 1024,
            Tb: 1e12, TB: 8 * 1024 * 1024 * 1024 * 1024,
          };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = {
            b: 1, B: 8,
            kb: 1000, kB: 8 * 1024,
            Mb: 1e6, MB: 8 * 1024 * 1024,
            Gb: 1e9, GB: 8 * 1024 * 1024 * 1024,
            Tb: 1e12, TB: 8 * 1024 * 1024 * 1024 * 1024,
          };
          return v / (f[u] ?? 1);
        },
      },

      time: {
        name: "Time",
        base: "s",
        units: [
          { id: "ms", name: "Millisecond", symbol: "ms" },
          { id: "s", name: "Second", symbol: "s" },
          { id: "min", name: "Minute", symbol: "min" },
          { id: "h", name: "Hour", symbol: "h" },
          { id: "day", name: "Day", symbol: "d" },
          { id: "week", name: "Week", symbol: "wk" },
          { id: "month", name: "Month (avg)", symbol: "mo" },
          { id: "year", name: "Year (avg)", symbol: "yr" },
        ],
        toBase: (v, u) => {
          const f = { ms: 0.001, s: 1, min: 60, h: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { ms: 0.001, s: 1, min: 60, h: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 };
          return v / (f[u] ?? 1);
        },
      },

      pressure: {
        name: "Pressure",
        base: "pa",
        units: [
          { id: "pa", name: "Pascal", symbol: "Pa" },
          { id: "kpa", name: "Kilopascal", symbol: "kPa" },
          { id: "mpa", name: "Megapascal", symbol: "MPa" },
          { id: "bar", name: "Bar", symbol: "bar" },
          { id: "atm", name: "Atmosphere", symbol: "atm" },
          { id: "psi", name: "Pound/sq inch", symbol: "psi" },
          { id: "mmhg", name: "Millimeter mercury", symbol: "mmHg" },
          { id: "inhg", name: "Inch mercury", symbol: "inHg" },
          { id: "torr", name: "Torr", symbol: "Torr" },
        ],
        toBase: (v, u) => {
          const f = { pa: 1, kpa: 1000, mpa: 1e6, bar: 1e5, atm: 101325, psi: 6894.76, mmhg: 133.322, inhg: 3386.39, torr: 133.322 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { pa: 1, kpa: 1000, mpa: 1e6, bar: 1e5, atm: 101325, psi: 6894.76, mmhg: 133.322, inhg: 3386.39, torr: 133.322 };
          return v / (f[u] ?? 1);
        },
      },

      energy: {
        name: "Energy",
        base: "j",
        units: [
          { id: "j", name: "Joule", symbol: "J" },
          { id: "kj", name: "Kilojoule", symbol: "kJ" },
          { id: "mj", name: "Megajoule", symbol: "MJ" },
          { id: "cal", name: "Calorie", symbol: "cal" },
          { id: "kcal", name: "Kilocalorie", symbol: "kcal" },
          { id: "wh", name: "Watt-hour", symbol: "Wh" },
          { id: "kwh", name: "Kilowatt-hour", symbol: "kWh" },
          { id: "btu", name: "British thermal unit", symbol: "BTU" },
          { id: "ev", name: "Electronvolt", symbol: "eV" },
        ],
        toBase: (v, u) => {
          const f = { j: 1, kj: 1000, mj: 1e6, cal: 4.184, kcal: 4184, wh: 3600, kwh: 3.6e6, btu: 1055.06, ev: 1.602176634e-19 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { j: 1, kj: 1000, mj: 1e6, cal: 4.184, kcal: 4184, wh: 3600, kwh: 3.6e6, btu: 1055.06, ev: 1.602176634e-19 };
          return v / (f[u] ?? 1);
        },
      },

      power: {
        name: "Power",
        base: "w",
        units: [
          { id: "w", name: "Watt", symbol: "W" },
          { id: "kw", name: "Kilowatt", symbol: "kW" },
          { id: "mw", name: "Megawatt", symbol: "MW" },
          { id: "hp_metric", name: "Horsepower (metric)", symbol: "hp" },
          { id: "hp_imperial", name: "Horsepower (imperial)", symbol: "hp" },
          { id: "btu_hr", name: "BTU/hour", symbol: "BTU/h" },
        ],
        toBase: (v, u) => {
          const f = { w: 1, kw: 1000, mw: 1e6, hp_metric: 735.49875, hp_imperial: 745.7, btu_hr: 0.293071 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { w: 1, kw: 1000, mw: 1e6, hp_metric: 735.49875, hp_imperial: 745.7, btu_hr: 0.293071 };
          return v / (f[u] ?? 1);
        },
      },

      angle: {
        name: "Angle",
        base: "deg",
        units: [
          { id: "deg", name: "Degree", symbol: "°" },
          { id: "rad", name: "Radian", symbol: "rad" },
          { id: "grad", name: "Gradian", symbol: "grad" },
          { id: "arcmin", name: "Arcminute", symbol: "′" },
          { id: "arcsec", name: "Arcsecond", symbol: "″" },
        ],
        toBase: (v, u) => {
          const f = { deg: 1, rad: 180 / Math.PI, grad: 0.9, arcmin: 1 / 60, arcsec: 1 / 3600 };
          return v * (f[u] ?? 1);
        },
        fromBase: (v, u) => {
          const f = { deg: 1, rad: 180 / Math.PI, grad: 0.9, arcmin: 1 / 60, arcsec: 1 / 3600 };
          return v / (f[u] ?? 1);
        },
      },

      fuel: {
        name: "Fuel Economy",
        base: "l100km",
        units: [
          { id: "l100km", name: "Liters/100 km", symbol: "L/100km" },
          { id: "kml", name: "Kilometers/liter", symbol: "km/L" },
          { id: "mpg_us", name: "Miles/gallon (US)", symbol: "mpg" },
          { id: "mpg_uk", name: "Miles/gallon (UK)", symbol: "mpg" },
        ],
        // Non-linear (inverse) relationship: L/100km = 235.215 / mpg(US)
        toBase: (v, u) => {
          if (u === "l100km") return v;
          if (u === "kml") return 100 / v;
          if (u === "mpg_us") return 235.215 / v;
          if (u === "mpg_uk") return 282.481 / v;
          return v;
        },
        fromBase: (v, u) => {
          if (u === "l100km") return v;
          if (u === "kml") return 100 / v;
          if (u === "mpg_us") return 235.215 / v;
          if (u === "mpg_uk") return 282.481 / v;
          return v;
        },
      },

      currency: {
        name: "Currency",
        base: "usd",
        units: [
          { id: "USD", name: "US Dollar", symbol: "$" },
          { id: "EUR", name: "Euro", symbol: "€" },
          { id: "GBP", name: "British Pound", symbol: "£" },
          { id: "JPY", name: "Japanese Yen", symbol: "¥" },
          { id: "AUD", name: "Australian Dollar", symbol: "A$" },
          { id: "CAD", name: "Canadian Dollar", symbol: "C$" },
          { id: "CHF", name: "Swiss Franc", symbol: "Fr" },
          { id: "CNY", name: "Chinese Yuan", symbol: "¥" },
          { id: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
          { id: "INR", name: "Indian Rupee", symbol: "₹" },
          { id: "SGD", name: "Singapore Dollar", symbol: "S$" },
          { id: "THB", name: "Thai Baht", symbol: "฿" },
          { id: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
          { id: "VND", name: "Vietnamese Dong", symbol: "₫" },
          { id: "MMK", name: "Myanmar Kyat", symbol: "K" },
          { id: "KRW", name: "South Korean Won", symbol: "₩" },
          { id: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
          { id: "SEK", name: "Swedish Krona", symbol: "kr" },
          { id: "NOK", name: "Norwegian Krone", symbol: "kr" },
          { id: "DKK", name: "Danish Krone", symbol: "kr" },
          { id: "ZAR", name: "South African Rand", symbol: "R" },
        ],
        // Arrow functions close over `this`, so they read the live rates table
        toBase: (v, u) => v / (this.rates?.[u] ?? NaN),
        fromBase: (v, u) => v * (this.rates?.[u] ?? NaN),
      },
    };
  }

  /**
   * Load live exchange rates from open.er-api.com (free, no key).
   * Caches in localStorage with a 24h TTL; falls back to cached rates
   * (even stale) when offline. Returns true if rates are usable.
   */
  async loadRates(force = false) {
    const cache = this._readRatesCache();
    const fresh = cache && cache.rates && Date.now() - cache.fetchedAt < 24 * 60 * 60 * 1000;

    if (!force && fresh) {
      this.rates = cache.rates;
      this.ratesTimestamp = cache.apiTimestamp || null;
      this.ratesStale = false;
      return true;
    }

    try {
      const resp = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      if (data.result !== "success" || !data.rates) throw new Error("Bad API response");
      this.rates = data.rates;
      this.ratesTimestamp = data.time_last_update_utc || null;
      this.ratesStale = false;
      this._writeRatesCache(data.rates, this.ratesTimestamp);
      return true;
    } catch (err) {
      // Offline or API failure: fall back to last-known rates
      if (cache && cache.rates) {
        this.rates = cache.rates;
        this.ratesTimestamp = cache.apiTimestamp || null;
        this.ratesStale = true;
        return true;
      }
      this.rates = null;
      this.ratesTimestamp = null;
      return false;
    }
  }

  isRatesLoaded() {
    return !!this.rates;
  }

  _readRatesCache() {
    try {
      const raw = localStorage.getItem("calc-currency-rates");
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  _writeRatesCache(rates, apiTimestamp) {
    try {
      localStorage.setItem(
        "calc-currency-rates",
        JSON.stringify({ rates, fetchedAt: Date.now(), apiTimestamp })
      );
    } catch (err) {
      // localStorage full or unavailable — ignore
    }
  }

  /**
   * Get list of category IDs.
   */
  getCategoryIds() {
    return Object.keys(this.categories);
  }

  /**
   * Get category metadata.
   */
  getCategory(id) {
    return this.categories[id] || null;
  }

  /**
   * Get units for a category.
   */
  getUnits(categoryId) {
    const cat = this.categories[categoryId];
    return cat ? cat.units : [];
  }

  /**
   * Convert a value from one unit to another within a category.
   * Returns the converted number.
   */
  convert(value, fromUnit, toUnit, categoryId) {
    if (fromUnit === toUnit) return value;

    const cat = this.categories[categoryId];
    if (!cat) return null;

    const baseValue = cat.toBase(value, fromUnit);
    return cat.fromBase(baseValue, toUnit);
  }

  /**
   * Get a human-readable formula string for a conversion.
   */
  getFormula(value, fromUnit, toUnit, categoryId, result) {
    const cat = this.categories[categoryId];
    if (!cat) return "";

    const fromSym = cat.units.find((u) => u.id === fromUnit)?.symbol || fromUnit;
    const toSym = cat.units.find((u) => u.id === toUnit)?.symbol || toUnit;

    return `${value} ${fromSym} = ${result} ${toSym}`;
  }

  /**
   * Format a number for display, avoiding floating-point artifacts.
   */
  formatNumber(n) {
    if (typeof n !== "number" || !isFinite(n)) {
      return String(n);
    }

    if (Math.abs(n) < 1e-10 && n !== 0) {
      return n.toExponential(4);
    }
    if (Math.abs(n) > 1e15) {
      return n.toExponential(4);
    }

    const rounded = parseFloat(n.toPrecision(12));
    const str = String(rounded);

    const dotIdx = str.indexOf(".");
    if (dotIdx !== -1 && str.length - dotIdx - 1 > 10) {
      return rounded.toFixed(10).replace(/\.?0+$/, "");
    }

    return str;
  }
}

/**
 * CalcKit — App Bootstrap
 *
 * ES module entry point. Handles:
 * - Tab switching via URL hash routing
 * - Calculator UI (buttons, display, keyboard, scientific mode)
 * - Converter UI (category/unit selects, live input, currency rates)
 * - Health UI (calculator type, dynamic fields, live results)
 * - Tools UI (dynamic fields, live results)
 * - Shared result display with formula and source
 * - Calculation history (last 5, localStorage)
 * - Theme toggle
 * - Service worker registration
 */

import { Calculator } from "./calc.js";
import { Converter } from "./convert.js";
import { HealthCalculator } from "./health.js";
import { ToolsCalculator } from "./tools.js";

// --- State ---
const calc = new Calculator();
const converter = new Converter();
const health = new HealthCalculator();
const tools = new ToolsCalculator();

let currentTab = "calc";
let calcExpression = "";
let calcDisplayValue = "0";
let justEvaluated = false;
let sciMode = false;

// --- DOM References (populated on init) ---
const dom = {};

// --- Tab System ---

const ROUTES = {
  calc: { panel: "tab-calc", init: initCalc },
  convert: { panel: "tab-convert", init: initConvert },
  health: { panel: "tab-health", init: initHealth },
  tools: { panel: "tab-tools", init: initTools },
};

function getRoute() {
  const hash = location.hash.slice(1) || "calc";
  const parts = hash.split("/");
  return { tab: parts[0], params: parts.slice(1) };
}

function switchTab(tab, params) {
  // Hide all panels
  document.querySelectorAll(".calc-panel").forEach((p) => {
    p.hidden = true;
  });

  // Show target panel
  const route = ROUTES[tab];
  if (route) {
    const panel = document.getElementById(route.panel);
    if (panel) {
      panel.hidden = false;
      route.init(params);
    }
  }

  // Update tab aria-selected
  document.querySelectorAll(".calc-tab").forEach((t) => {
    t.setAttribute("aria-selected", t.dataset.tab === tab ? "true" : "false");
  });

  currentTab = tab;

  // Update hash without triggering hashchange
  const paramStr = params && params.length ? "/" + params.join("/") : "";
  const newHash = "#" + tab + paramStr;
  if (location.hash !== newHash) {
    history.replaceState(null, "", newHash);
  }
}

// --- Result Display ---

function showResult(result) {
  if (!dom.resultValue || !dom.resultFormula || !dom.resultSource) return;

  if (!result) {
    dom.resultValue.textContent = "";
    dom.resultFormula.textContent = "";
    dom.resultSource.textContent = "";
    if (dom.resultInterpretation) dom.resultInterpretation.hidden = true;
    return;
  }

  dom.resultValue.textContent = result.value || "";
  dom.resultFormula.textContent = result.formula || "";
  dom.resultSource.textContent = result.source ? "Source: " + result.source : "";

  // Interpretation
  if (dom.resultInterpretation) {
    if (result.interpretation) {
      dom.resultInterpretation.textContent = result.interpretation;
      dom.resultInterpretation.hidden = false;
    } else {
      dom.resultInterpretation.hidden = true;
    }
  }

  // BMI visual bar (only in Health panel)
  if (result.showBmiBar && dom.bmiVisual && typeof result.bmiValue === "number") {
    const pct = health.getBMIPercent(result.bmiValue);
    dom.bmiMarker.style.left = pct + "%";
    dom.bmiVisual.hidden = false;
  } else if (dom.bmiVisual) {
    dom.bmiVisual.hidden = true;
  }
}

// --- History ---

function addToHistory(expression, result) {
  const history = JSON.parse(localStorage.getItem("calc-history") || "[]");
  history.unshift({ expression, result, timestamp: Date.now() });
  if (history.length > 5) history.pop();
  localStorage.setItem("calc-history", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (!dom.historyList) return;
  const history = JSON.parse(localStorage.getItem("calc-history") || "[]");
  dom.historyList.innerHTML = history
    .map(
      (item) =>
        `<li class="history-item">
          <span class="history-item__expr">${escapeHtml(item.expression)}</span>
          <span class="history-item__result">${escapeHtml(item.result)}</span>
        </li>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// Calculator Tab
// ============================================================

function initCalc() {
  updateCalcDisplay();
}

function updateCalcDisplay() {
  if (!dom.calcDisplay) return;
  dom.calcDisplay.textContent = calcDisplayValue || "0";
  if (dom.calcExpression) {
    dom.calcExpression.textContent = justEvaluated ? "" : calcExpression;
  }
}

function appendToExpression(ch) {
  if (justEvaluated) {
    // Start fresh after evaluation
    if (/[0-9.]/.test(ch)) {
      calcExpression = "";
      calcDisplayValue = "0";
    } else {
      // Keep the result as the first operand
      justEvaluated = false;
    }
  }
  justEvaluated = false;
  calcExpression += ch;
  calcDisplayValue = calcExpression;
  updateCalcDisplay();
}

function handleCalcAction(action, value) {
  switch (action) {
    case "digit":
      if (justEvaluated) {
        calcExpression = "";
        calcDisplayValue = "0";
        justEvaluated = false;
      }
      calcExpression += value;
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;

    case "op":
      if (justEvaluated) {
        // Continue from result
        justEvaluated = false;
      }
      calcExpression += " " + value + " ";
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;

    case "decimal":
      if (justEvaluated) {
        calcExpression = "0.";
        calcDisplayValue = calcExpression;
        justEvaluated = false;
        updateCalcDisplay();
        return;
      }
      // Find the last number in the expression
      const lastNum = calcExpression.split(/[\s+\-*/%()]+/).pop() || "";
      if (lastNum.includes(".")) return; // already has decimal
      calcExpression += ".";
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;

    case "eq": {
      if (!calcExpression.trim()) return;
      const result = calc.calculate(calcExpression);
      if (result.error) {
        calcDisplayValue = "Error: " + result.error;
        updateCalcDisplay();
        showResult({ value: "Error", formula: result.error, source: "" });
        return;
      }
      const formatted = calc.formatNumber(result.value);
      const formulaStr = calcExpression + " = " + formatted;
      calcDisplayValue = formatted;
      calcExpression = String(result.value);
      justEvaluated = true;
      updateCalcDisplay();
      showResult({ value: formatted, formula: formulaStr, source: "" });
      addToHistory(calcExpression + " = " + formatted, formatted);
      break;
    }

    case "clear":
      calcExpression = "";
      calcDisplayValue = "0";
      justEvaluated = false;
      updateCalcDisplay();
      showResult(null);
      break;

    case "clearEntry":
      // Remove the last number/expression
      calcExpression = calcExpression.replace(/[\s]*[^\s]+$/, "");
      calcDisplayValue = calcExpression || "0";
      updateCalcDisplay();
      break;

    case "backspace":
      if (justEvaluated) {
        calcExpression = "";
        calcDisplayValue = "0";
        justEvaluated = false;
        updateCalcDisplay();
        return;
      }
      calcExpression = calcExpression.slice(0, -1).trim();
      calcDisplayValue = calcExpression || "0";
      updateCalcDisplay();
      break;

    case "sign":
      if (justEvaluated) {
        const val = parseFloat(calcExpression);
        if (!isNaN(val)) {
          calcExpression = String(-val);
          calcDisplayValue = calcExpression;
          justEvaluated = false;
          updateCalcDisplay();
        }
        return;
      }
      // Toggle sign of the last number
      const parts = calcExpression.split(/([\s+\-*/%()]+)/);
      if (parts.length > 0) {
        const last = parts[parts.length - 1];
        if (/^-?\d+(\.\d+)?$/.test(last)) {
          if (last.startsWith("-")) {
            parts[parts.length - 1] = last.slice(1);
          } else {
            parts[parts.length - 1] = "-" + last;
          }
          calcExpression = parts.join("");
          calcDisplayValue = calcExpression;
          updateCalcDisplay();
        }
      }
      break;

    case "percent":
      if (justEvaluated) {
        const val = parseFloat(calcExpression);
        if (!isNaN(val)) {
          calcExpression = String(val / 100);
          calcDisplayValue = calcExpression;
          justEvaluated = false;
          updateCalcDisplay();
        }
        return;
      }
      calcExpression += "%";
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;

    case "sqrt": {
      const val = parseFloat(calcDisplayValue);
      if (!isNaN(val) && val >= 0) {
        const result = Math.sqrt(val);
        const formatted = calc.formatNumber(result);
        calcExpression = String(result);
        calcDisplayValue = formatted;
        justEvaluated = true;
        updateCalcDisplay();
        showResult({ value: formatted, formula: "√(" + val + ") = " + formatted, source: "" });
        addToHistory("√(" + val + ")", formatted);
      } else if (!isNaN(val)) {
        calcDisplayValue = "Error: sqrt of negative";
        updateCalcDisplay();
      }
      break;
    }

    case "square": {
      const val2 = parseFloat(calcDisplayValue);
      if (!isNaN(val2)) {
        const result = val2 * val2;
        const formatted = calc.formatNumber(result);
        calcExpression = String(result);
        calcDisplayValue = formatted;
        justEvaluated = true;
        updateCalcDisplay();
        showResult({ value: formatted, formula: val2 + "² = " + formatted, source: "" });
        addToHistory(val2 + "²", formatted);
      }
      break;
    }

    case "cube": {
      const val3 = parseFloat(calcDisplayValue);
      if (!isNaN(val3)) {
        const result = val3 * val3 * val3;
        const formatted = calc.formatNumber(result);
        calcExpression = String(result);
        calcDisplayValue = formatted;
        justEvaluated = true;
        updateCalcDisplay();
        showResult({ value: formatted, formula: val3 + "³ = " + formatted, source: "" });
        addToHistory(val3 + "³", formatted);
      }
      break;
    }

    case "pow":
      if (justEvaluated) {
        justEvaluated = false;
      }
      calcExpression += "^";
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;

    case "recip": {
      const val4 = parseFloat(calcDisplayValue);
      if (!isNaN(val4) && val4 !== 0) {
        const result = 1 / val4;
        const formatted = calc.formatNumber(result);
        calcExpression = String(result);
        calcDisplayValue = formatted;
        justEvaluated = true;
        updateCalcDisplay();
        showResult({ value: formatted, formula: "1 ÷ " + val4 + " = " + formatted, source: "" });
        addToHistory("1/" + val4, formatted);
      } else if (!isNaN(val4)) {
        calcDisplayValue = "Error: division by zero";
        updateCalcDisplay();
      }
      break;
    }

    case "sciToggle":
      sciMode = !sciMode;
      if (dom.calcSciGrid) dom.calcSciGrid.hidden = !sciMode;
      if (dom.sciToggle) dom.sciToggle.setAttribute("aria-expanded", String(sciMode));
      break;

    case "fn": {
      if (justEvaluated) {
        calcExpression = "";
        calcDisplayValue = "0";
        justEvaluated = false;
      }
      // Insert explicit * when the function follows a number or closing paren
      const lastFn = calcExpression.trim().slice(-1);
      if (/[0-9.)]/.test(lastFn)) calcExpression += " * ";
      calcExpression += value + "(";
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;
    }

    case "factorial":
      if (justEvaluated) {
        calcExpression = "";
        calcDisplayValue = "0";
        justEvaluated = false;
      }
      calcExpression += "!";
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;

    case "nthroot":
      if (justEvaluated) {
        calcExpression = "";
        calcDisplayValue = "0";
        justEvaluated = false;
      }
      calcExpression += " nthroot ";
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;

    case "const": {
      if (justEvaluated) {
        calcExpression = "";
        calcDisplayValue = "0";
        justEvaluated = false;
      }
      // Insert explicit * when the constant follows a number or closing paren
      const lastConst = calcExpression.trim().slice(-1);
      if (/[0-9.)]/.test(lastConst)) calcExpression += " * ";
      calcExpression += value; // e, pi, or tau
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;
    }

    case "lparen":
      if (justEvaluated) {
        calcExpression = "";
        calcDisplayValue = "0";
        justEvaluated = false;
      }
      calcExpression += "(";
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;

    case "rparen":
      if (justEvaluated) {
        calcExpression = "";
        calcDisplayValue = "0";
        justEvaluated = false;
      }
      calcExpression += ")";
      calcDisplayValue = calcExpression;
      updateCalcDisplay();
      break;

    case "angleMode":
      calc.setAngleMode(calc.angleMode === "deg" ? "rad" : "deg");
      if (dom.angleToggle) {
        dom.angleToggle.textContent = calc.angleMode.toUpperCase();
        dom.angleToggle.setAttribute("aria-pressed", String(calc.angleMode === "rad"));
      }
      break;

    case "mc":
      calc.memoryClear();
      break;

    case "mr":
      if (calc.hasMemory) {
        const memVal = calc.memoryRecall();
        if (justEvaluated) {
          calcExpression = String(memVal);
          calcDisplayValue = calcExpression;
          justEvaluated = false;
          updateCalcDisplay();
        } else {
          calcExpression += String(memVal);
          calcDisplayValue = calcExpression;
          updateCalcDisplay();
        }
      }
      break;

    case "mplus": {
      const currentVal = parseFloat(calcDisplayValue);
      if (!isNaN(currentVal)) {
        calc.memoryAdd(currentVal);
      }
      break;
    }

    case "mminus": {
      const currentVal2 = parseFloat(calcDisplayValue);
      if (!isNaN(currentVal2)) {
        calc.memorySubtract(currentVal2);
      }
      break;
    }
  }
}

function setupCalcKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (currentTab !== "calc") return;

    const key = e.key;

    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      handleCalcAction("digit", key);
      return;
    }

    switch (key) {
      case "+":
      case "-":
      case "*":
      case "/":
        e.preventDefault();
        handleCalcAction("op", key);
        break;
      case ".":
        e.preventDefault();
        handleCalcAction("decimal");
        break;
      case "Enter":
      case "=":
        e.preventDefault();
        handleCalcAction("eq");
        break;
      case "Backspace":
        e.preventDefault();
        handleCalcAction("backspace");
        break;
      case "Escape":
        e.preventDefault();
        handleCalcAction("clear");
        break;
      case "Delete":
        e.preventDefault();
        handleCalcAction("clearEntry");
        break;
      case "%":
        e.preventDefault();
        handleCalcAction("percent");
        break;
      case "r":
      case "R":
        e.preventDefault();
        handleCalcAction("sqrt");
        break;
      case "^":
        e.preventDefault();
        handleCalcAction("pow");
        break;
      case "q":
      case "Q":
        e.preventDefault();
        handleCalcAction("square");
        break;
      case "s":
        e.preventDefault();
        handleCalcAction("fn", e.shiftKey ? "asin" : "sin");
        break;
      case "c":
        e.preventDefault();
        handleCalcAction("fn", e.shiftKey ? "acos" : "cos");
        break;
      case "t":
        e.preventDefault();
        handleCalcAction("fn", e.shiftKey ? "atan" : "tan");
        break;
      case "l":
        e.preventDefault();
        handleCalcAction("fn", "log");
        break;
      case "n":
        e.preventDefault();
        handleCalcAction("fn", "ln");
        break;
      case "g":
        e.preventDefault();
        handleCalcAction("fn", "log2");
        break;
      case "a":
        e.preventDefault();
        handleCalcAction("fn", "abs");
        break;
      case "x":
        e.preventDefault();
        handleCalcAction("fn", "exp");
        break;
      case "e":
        e.preventDefault();
        handleCalcAction("const", "e");
        break;
      case "p":
        e.preventDefault();
        handleCalcAction("const", "pi");
        break;
      case "!":
        e.preventDefault();
        handleCalcAction("factorial");
        break;
      case "(":
        e.preventDefault();
        handleCalcAction("lparen");
        break;
      case ")":
        e.preventDefault();
        handleCalcAction("rparen");
        break;
      case "d":
        e.preventDefault();
        handleCalcAction("angleMode");
        break;
      case "v":
        e.preventDefault();
        handleCalcAction("nthroot");
        break;
    }
  });
}

function setupCalcButtons() {
  // Bind to the whole calc panel so mem-row, sci-row, sci-grid, and
  // main-grid buttons all work (they are siblings, not children of #calc-grid)
  const panel = document.getElementById("tab-calc");
  if (!panel) return;

  panel.addEventListener("click", (e) => {
    const btn = e.target.closest(".calc-btn");
    if (!btn) return;

    const action = btn.dataset.action;
    const value = btn.dataset.value;
    handleCalcAction(action, value);
  });
}

// ============================================================
// Converter Tab
// ============================================================

let convUpdating = false;

function initConvert(params) {
  const category = params[0] || "length";
  populateConvCategory(category);
  populateConvUnits(category);
  if (dom.convRefresh) dom.convRefresh.hidden = category !== "currency";
  doConvert();
}

function populateConvCategory(selected) {
  if (!dom.convCategory) return;

  // Build options
  const ids = converter.getCategoryIds();
  dom.convCategory.innerHTML = ids
    .map(
      (id) =>
        `<option value="${id}" ${id === selected ? "selected" : ""}>${converter.getCategory(id).name}</option>`
    )
    .join("");
}

function populateConvUnits(categoryId) {
  if (!dom.convFrom || !dom.convTo) return;

  const units = converter.getUnits(categoryId);
  const fromVal = dom.convFrom.value || (units[0] ? units[0].id : "");
  const toVal = dom.convTo.value || (units[1] ? units[1].id : units[0] ? units[0].id : "");

  dom.convFrom.innerHTML = units
    .map((u) => `<option value="${u.id}" ${u.id === fromVal ? "selected" : ""}>${u.name} (${u.symbol})</option>`)
    .join("");

  dom.convTo.innerHTML = units
    .map((u) => `<option value="${u.id}" ${u.id === toVal ? "selected" : ""}>${u.name} (${u.symbol})</option>`)
    .join("");
}

function getConvertSource(categoryId) {
  if (categoryId === "currency") {
    return `Exchange rates: open.er-api.com · Updated ${converter.ratesTimestamp || "—"}${converter.ratesStale ? " (offline, may be stale)" : ""}`;
  }
  return "Standard conversion factors (NIST).";
}

function doConvert() {
  if (convUpdating) return;
  if (!dom.convInput || !dom.convOutput || !dom.convCategory) return;

  const categoryId = dom.convCategory.value;
  const fromUnit = dom.convFrom.value;
  const toUnit = dom.convTo.value;
  const inputVal = parseFloat(dom.convInput.value);

  if (isNaN(inputVal)) {
    dom.convOutput.value = "";
    showResult(null);
    return;
  }

  // Currency: ensure live rates are loaded before converting
  if (categoryId === "currency" && !converter.isRatesLoaded()) {
    showResult({ value: "…", formula: "Loading live exchange rates…", source: "" });
    converter.loadRates().then((ok) => {
      if (ok) {
        doConvert();
      } else {
        showResult({
          value: "Unavailable",
          formula: "Exchange rates unavailable offline",
          source: "Connect to the internet to load rates.",
        });
      }
    });
    return;
  }

  const result = converter.convert(inputVal, fromUnit, toUnit, categoryId);
  if (result === null || !isFinite(result)) {
    dom.convOutput.value = "";
    showResult({ value: "Error", formula: "Invalid conversion", source: "" });
    return;
  }

  const formatted = converter.formatNumber(result);
  dom.convOutput.value = formatted;

  const formula = converter.getFormula(inputVal, fromUnit, toUnit, categoryId, formatted);
  showResult({
    value: formatted + " " + (converter.getCategory(categoryId).units.find((u) => u.id === toUnit)?.symbol || ""),
    formula,
    source: getConvertSource(categoryId),
  });
}

function doConvertReverse() {
  if (convUpdating) return;
  if (!dom.convInput || !dom.convOutput || !dom.convCategory) return;

  const categoryId = dom.convCategory.value;
  const fromUnit = dom.convTo.value; // swapped
  const toUnit = dom.convFrom.value; // swapped
  const inputVal = parseFloat(dom.convOutput.value);

  if (isNaN(inputVal)) {
    dom.convInput.value = "";
    showResult(null);
    return;
  }

  const result = converter.convert(inputVal, fromUnit, toUnit, categoryId);
  if (result === null || !isFinite(result)) {
    dom.convInput.value = "";
    showResult({ value: "Error", formula: "Invalid conversion", source: "" });
    return;
  }

  const formatted = converter.formatNumber(result);
  convUpdating = true;
  dom.convInput.value = formatted;
  convUpdating = false;

  const formula = converter.getFormula(inputVal, fromUnit, toUnit, categoryId, formatted);
  showResult({
    value: formatted + " " + (converter.getCategory(categoryId).units.find((u) => u.id === toUnit)?.symbol || ""),
    formula,
    source: getConvertSource(categoryId),
  });
}

function setupConverter() {
  if (!dom.convCategory) return;

  dom.convCategory.addEventListener("change", () => {
    const cat = dom.convCategory.value;
    populateConvUnits(cat);
    if (dom.convRefresh) dom.convRefresh.hidden = cat !== "currency";
    doConvert();
  });

  if (dom.convFrom) {
    dom.convFrom.addEventListener("change", doConvert);
  }
  if (dom.convTo) {
    dom.convTo.addEventListener("change", doConvert);
  }
  if (dom.convInput) {
    dom.convInput.addEventListener("input", doConvert);
  }
  if (dom.convOutput) {
    dom.convOutput.addEventListener("input", doConvertReverse);
  }
  if (dom.convSwap) {
    dom.convSwap.addEventListener("click", () => {
      const tmp = dom.convFrom.value;
      dom.convFrom.value = dom.convTo.value;
      dom.convTo.value = tmp;
      doConvert();
    });
  }
  if (dom.convRefresh) {
    dom.convRefresh.addEventListener("click", () => {
      converter.loadRates(true).then(() => doConvert());
    });
  }
}

// ============================================================
// Health Tab
// ============================================================

function initHealth(params) {
  const type = params[0] || "bmi";
  populateHealthType(type);
  populateHealthFields(type);
  doHealthCalc();
}

function populateHealthType(selected) {
  if (!dom.healthType) return;

  const ids = health.getCalculatorIds();
  dom.healthType.innerHTML = ids
    .map(
      (id) =>
        `<option value="${id}" ${id === selected ? "selected" : ""}>${health.getCalculator(id).name} — ${health.getCalculator(id).description}</option>`
    )
    .join("");
}

function populateHealthFields(type) {
  if (!dom.healthFields) return;

  const calcDef = health.getCalculator(type);
  if (!calcDef) {
    dom.healthFields.innerHTML = "";
    return;
  }

  dom.healthFields.innerHTML = calcDef.fields
    .map((f) => {
      const showIfAttr = f.showIf ? ` data-showif="${f.showIf.field}:${f.showIf.value}"` : "";
      if (f.type === "select") {
        const options = f.options
          .map((o) => `<option value="${o.value}">${o.label}</option>`)
          .join("");
        return `<div class="health-field"${showIfAttr}>
          <label for="health-${f.id}">${f.label}</label>
          <select id="health-${f.id}" class="health-input" data-field="${f.id}">${options}</select>
        </div>`;
      }
      return `<div class="health-field"${showIfAttr}>
        <label for="health-${f.id}">${f.label}</label>
        <input type="number" id="health-${f.id}" class="health-input" data-field="${f.id}"
          min="${f.min}" max="${f.max}" step="${f.step}" placeholder="${f.placeholder || ""}" inputmode="decimal">
      </div>`;
    })
    .join("");

  // Bind input events
  dom.healthFields.querySelectorAll(".health-input").forEach((el) => {
    el.addEventListener("input", doHealthCalc);
    el.addEventListener("change", doHealthCalc);
  });

  // Handle showIf conditional fields (e.g. hip only for female)
  dom.healthFields.querySelectorAll(".health-field[data-showif]").forEach((wrapper) => {
    const [fieldId, value] = wrapper.dataset.showif.split(":");
    const ref = dom.healthFields.querySelector(`[data-field="${fieldId}"]`);
    if (!ref) return;
    const update = () => {
      wrapper.hidden = ref.value !== value;
    };
    ref.addEventListener("change", update);
    update();
  });
}

function doHealthCalc() {
  if (!dom.healthType || !dom.healthFields) return;

  const type = dom.healthType.value;
  const inputs = dom.healthFields.querySelectorAll(".health-input");

  const values = {};
  inputs.forEach((el) => {
    // Skip fields hidden by showIf (e.g. hip when gender is male)
    if (el.closest(".health-field")?.hidden) return;
    if (el.type === "number") {
      values[el.dataset.field] = el.value;
    } else if (el.tagName === "SELECT") {
      values[el.dataset.field] = el.value;
    }
  });

  const result = health.calculate(type, values);
  showResult(result);
}

function setupHealth() {
  if (!dom.healthType) return;

  dom.healthType.addEventListener("change", () => {
    const type = dom.healthType.value;
    populateHealthFields(type);
    doHealthCalc();
  });
}

// ============================================================
// Tools Tab
// ============================================================

let currentTool = "percentage";

function initTools(params) {
  const tool = params[0] || "percentage";
  currentTool = tool;
  populateToolFields(tool);
  doToolCalc();
}

function populateToolFields(type) {
  if (!dom.toolFields) return;

  const toolDef = tools.getTool(type);
  if (!toolDef) {
    dom.toolFields.innerHTML = "";
    return;
  }

  dom.toolFields.innerHTML = toolDef.fields
    .map((f) => {
      if (f.type === "select") {
        const options = f.options
          .map((o) => `<option value="${o.value}">${o.label}</option>`)
          .join("");
        return `<div class="health-field">
          <label for="tool-${f.id}">${f.label}</label>
          <select id="tool-${f.id}" class="tool-input" data-field="${f.id}">${options}</select>
        </div>`;
      }
      if (f.type === "date") {
        return `<div class="health-field">
          <label for="tool-${f.id}">${f.label}</label>
          <input type="date" id="tool-${f.id}" class="tool-input" data-field="${f.id}">
        </div>`;
      }
      if (f.type === "text") {
        return `<div class="health-field">
          <label for="tool-${f.id}">${f.label}</label>
          <input type="text" id="tool-${f.id}" class="tool-input" data-field="${f.id}"
            placeholder="${f.placeholder || ""}" spellcheck="false" autocomplete="off">
        </div>`;
      }
      return `<div class="health-field">
        <label for="tool-${f.id}">${f.label}</label>
        <input type="number" id="tool-${f.id}" class="tool-input" data-field="${f.id}"
          min="${f.min}" max="${f.max}" step="${f.step}" placeholder="${f.placeholder || ""}" inputmode="decimal">
      </div>`;
    })
    .join("");

  // Bind input events
  dom.toolFields.querySelectorAll(".tool-input").forEach((el) => {
    el.addEventListener("input", doToolCalc);
    el.addEventListener("change", doToolCalc);
  });

  // Update subnav aria-selected
  document.querySelectorAll(".tools-tab").forEach((t) => {
    t.setAttribute("aria-selected", t.dataset.tool === type ? "true" : "false");
  });
}

function doToolCalc() {
  if (!dom.toolFields) return;

  const type = currentTool;
  const inputs = dom.toolFields.querySelectorAll(".tool-input");

  const values = {};
  inputs.forEach((el) => {
    if (el.type === "number" || el.type === "date" || el.type === "text") {
      values[el.dataset.field] = el.value;
    } else if (el.tagName === "SELECT") {
      values[el.dataset.field] = el.value;
    }
  });

  const result = tools.calculate(type, values);
  showResult(result);
}

function setupTools() {
  if (!dom.toolFields) return;

  // Subnav click handlers
  document.querySelectorAll(".tools-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tool = tab.dataset.tool;
      currentTool = tool;
      populateToolFields(tool);
      doToolCalc();

      // Update hash
      history.replaceState(null, "", "#tools/" + tool);
    });
  });
}

// ============================================================
// Theme Toggle
// ============================================================

function setupThemeToggle() {
  const toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;

  const icon = toggle.querySelector(".theme-toggle-icon");
  if (!icon) return;

  function updateToggle(theme) {
    const isDark = theme === "dark";
    toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    toggle.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    if (icon) {
      icon.innerHTML = isDark
        ? '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  }

  const html = document.documentElement;
  const current = html.getAttribute("data-theme") || "light";
  updateToggle(current);

  toggle.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme") || "light";
    const next = currentTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateToggle(next);
  });
}

// ============================================================
// Copy Result
// ============================================================

function setupResultCopy() {
  const btn = document.getElementById("result-copy");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const text = dom.resultValue.textContent || "";
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    // "Copied" feedback
    const original = btn.innerHTML;
    btn.textContent = "✓";
    btn.setAttribute("aria-label", "Copied");
    setTimeout(() => {
      btn.innerHTML = original;
      btn.setAttribute("aria-label", "Copy result to clipboard");
    }, 1500);
  });
}

// ============================================================
// Service Worker Registration
// ============================================================

function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
    });
  }
}

// ============================================================
// Init
// ============================================================

function init() {
  // Cache DOM references
  dom.calcDisplay = document.getElementById("calc-display");
  dom.calcExpression = document.getElementById("calc-expression");
  dom.calcSciGrid = document.getElementById("calc-sci-grid");
  dom.sciToggle = document.querySelector('[data-action="sciToggle"]');
  dom.angleToggle = document.querySelector('[data-action="angleMode"]');
  dom.resultValue = document.getElementById("result-value");
  dom.resultFormula = document.getElementById("result-formula");
  dom.resultSource = document.getElementById("result-source");
  dom.resultInterpretation = document.getElementById("result-interpretation");
  dom.bmiVisual = document.getElementById("bmi-visual");
  dom.bmiMarker = document.getElementById("bmi-marker");
  dom.historyList = document.getElementById("history-list");

  // Converter DOM
  dom.convCategory = document.getElementById("conv-category");
  dom.convFrom = document.getElementById("conv-from");
  dom.convTo = document.getElementById("conv-to");
  dom.convInput = document.getElementById("conv-input");
  dom.convOutput = document.getElementById("conv-output");
  dom.convSwap = document.getElementById("conv-swap");
  dom.convRefresh = document.getElementById("conv-refresh");

  // Health DOM
  dom.healthType = document.getElementById("health-type");
  dom.healthFields = document.getElementById("health-fields");

  // Tools DOM
  dom.toolFields = document.getElementById("tool-fields");

  // Setup
  setupCalcButtons();
  setupCalcKeyboard();
  setupConverter();
  setupHealth();
  setupTools();
  setupThemeToggle();
  setupResultCopy();
  registerSW();

  // Tab routing
  window.addEventListener("hashchange", () => {
    const { tab, params } = getRoute();
    switchTab(tab, params);
  });

  // Tab click handlers
  document.querySelectorAll(".calc-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab, []);
    });
  });

  // Initial route
  const { tab, params } = getRoute();
  switchTab(tab, params);

  // Render history
  renderHistory();
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

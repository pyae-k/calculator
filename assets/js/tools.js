/**
 * CalcKit — Tools Calculators
 *
 * Four utility calculators:
 * - Percentage: find %, change %, what % of
 * - Date: days between dates, add/subtract days
 * - Tip: tip amount, split bill
 * - Loan: monthly payment, total interest
 */

export class ToolsCalculator {
  constructor() {
    this.tools = {
      percentage: {
        id: "percentage",
        name: "Percentage",
        description: "Find %, change %, what % of",
        fields: [
          {
            id: "mode",
            label: "Calculation type",
            type: "select",
            options: [
              { value: "whatIs", label: "What is X% of Y?" },
              { value: "whatPercent", label: "X is what % of Y?" },
              { value: "percentChange", label: "% change from X to Y" },
            ],
          },
          { id: "val1", label: "Value X", type: "number", min: -1e15, max: 1e15, step: "any", placeholder: "e.g. 20" },
          { id: "val2", label: "Value Y", type: "number", min: -1e15, max: 1e15, step: "any", placeholder: "e.g. 200" },
        ],
        calculate: (values) => {
          const mode = values.mode;
          const x = parseFloat(values.val1);
          const y = parseFloat(values.val2);

          if (isNaN(x) || isNaN(y)) return null;

          switch (mode) {
            case "whatIs": {
              // What is X% of Y?
              const result = (x / 100) * y;
              return {
                value: `${ToolsCalculator._fmt(result)}`,
                formula: `${x}% of ${y} = (${x} ÷ 100) × ${y} = ${ToolsCalculator._fmt(result)}`,
                source: "",
                interpretation: `${x}% of ${y} is ${ToolsCalculator._fmt(result)}`,
              };
            }
            case "whatPercent": {
              // X is what % of Y?
              if (y === 0) return { value: "Error", formula: "Division by zero", source: "", interpretation: "Y cannot be zero" };
              const pct = (x / y) * 100;
              return {
                value: `${ToolsCalculator._fmt(pct)}%`,
                formula: `${x} ÷ ${y} × 100 = ${ToolsCalculator._fmt(pct)}%`,
                source: "",
                interpretation: `${x} is ${ToolsCalculator._fmt(pct)}% of ${y}`,
              };
            }
            case "percentChange": {
              // % change from X to Y
              if (x === 0) return { value: "Error", formula: "Division by zero", source: "", interpretation: "Starting value cannot be zero" };
              const change = ((y - x) / x) * 100;
              const direction = change >= 0 ? "increase" : "decrease";
              return {
                value: `${ToolsCalculator._fmt(Math.abs(change))}%`,
                formula: `((${y} − ${x}) ÷ ${x}) × 100 = ${ToolsCalculator._fmt(change)}%`,
                source: "",
                interpretation: `${direction} of ${ToolsCalculator._fmt(Math.abs(change))}%`,
              };
            }
          }
        },
      },

      date: {
        id: "date",
        name: "Date",
        description: "Days between, add/subtract days",
        fields: [
          {
            id: "mode",
            label: "Calculation type",
            type: "select",
            options: [
              { value: "between", label: "Days between dates" },
              { value: "add", label: "Add days to date" },
              { value: "subtract", label: "Subtract days from date" },
            ],
          },
          { id: "date1", label: "Start date", type: "date", min: "", max: "", step: "", placeholder: "" },
          { id: "date2", label: "End date", type: "date", min: "", max: "", step: "", placeholder: "" },
          { id: "days", label: "Number of days", type: "number", min: 0, max: 99999, step: 1, placeholder: "e.g. 30" },
        ],
        calculate: (values) => {
          const mode = values.mode;

          if (mode === "between") {
            if (!values.date1 || !values.date2) return null;
            const d1 = new Date(values.date1);
            const d2 = new Date(values.date2);
            if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;

            const diffMs = Math.abs(d2 - d1);
            const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
            const weeks = Math.floor(days / 7);
            const remDays = days % 7;
            const months = Math.round(days / 30.44);
            const years = (days / 365.25).toFixed(1);

            let breakdown = `${days} day${days !== 1 ? "s" : ""}`;
            if (weeks > 0) breakdown += ` (${weeks} week${weeks !== 1 ? "s" : ""}${remDays > 0 ? `, ${remDays} day${remDays !== 1 ? "s" : ""}` : ""})`;

            return {
              value: `${days} days`,
              formula: `${values.date1} → ${values.date2}`,
              source: "",
              interpretation: breakdown,
            };
          }

          if (mode === "add" || mode === "subtract") {
            if (!values.date1 || !values.days) return null;
            const d = new Date(values.date1);
            if (isNaN(d.getTime())) return null;

            const n = parseInt(values.days);
            if (isNaN(n)) return null;

            if (mode === "subtract") d.setDate(d.getDate() - n);
            else d.setDate(d.getDate() + n);

            const resultDate = d.toISOString().split("T")[0];
            const op = mode === "add" ? "+" : "−";

            return {
              value: resultDate,
              formula: `${values.date1} ${op} ${n} day${n !== 1 ? "s" : ""} = ${resultDate}`,
              source: "",
              interpretation: "",
            };
          }

          return null;
        },
      },

      tip: {
        id: "tip",
        name: "Tip",
        description: "Tip amount, split bill",
        fields: [
          { id: "bill", label: "Bill amount ($)", type: "number", min: 0, max: 1e9, step: 0.01, placeholder: "e.g. 50.00" },
          { id: "tipPct", label: "Tip (%)", type: "number", min: 0, max: 100, step: 0.5, placeholder: "e.g. 15" },
          { id: "people", label: "Number of people", type: "number", min: 1, max: 100, step: 1, placeholder: "e.g. 2" },
        ],
        calculate: (values) => {
          const bill = parseFloat(values.bill);
          const tipPct = parseFloat(values.tipPct);
          const people = parseInt(values.people);

          if (isNaN(bill) || isNaN(tipPct) || isNaN(people) || bill < 0 || tipPct < 0 || people < 1) return null;

          const tipAmount = bill * (tipPct / 100);
          const total = bill + tipAmount;
          const perPerson = total / people;

          return {
            value: `$${tipAmount.toFixed(2)} tip`,
            formula: `$${bill.toFixed(2)} × ${tipPct}% = $${tipAmount.toFixed(2)}`,
            source: "",
            interpretation: `Total: $${total.toFixed(2)} · $${perPerson.toFixed(2)}/person (${people} way${people > 1 ? "s" : ""})`,
          };
        },
      },

      loan: {
        id: "loan",
        name: "Loan",
        description: "Monthly payment, total interest",
        fields: [
          { id: "amount", label: "Loan amount ($)", type: "number", min: 0, max: 1e12, step: 100, placeholder: "e.g. 300000" },
          { id: "rate", label: "Annual interest rate (%)", type: "number", min: 0, max: 100, step: 0.01, placeholder: "e.g. 6.5" },
          { id: "term", label: "Loan term (years)", type: "number", min: 1, max: 50, step: 1, placeholder: "e.g. 30" },
        ],
        calculate: (values) => {
          const principal = parseFloat(values.amount);
          const annualRate = parseFloat(values.rate);
          const years = parseInt(values.term);

          if (isNaN(principal) || isNaN(annualRate) || isNaN(years) || principal <= 0 || annualRate < 0 || years <= 0) return null;

          if (annualRate === 0) {
            const monthly = principal / (years * 12);
            return {
              value: `$${monthly.toFixed(2)}/mo`,
              formula: `$${principal.toFixed(2)} ÷ ${years * 12} months = $${monthly.toFixed(2)}/mo`,
              source: "Standard amortization formula.",
              interpretation: `Total: $${principal.toFixed(2)} · No interest (0% APR)`,
            };
          }

          const monthlyRate = annualRate / 100 / 12;
          const numPayments = years * 12;
          const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
          const totalPaid = payment * numPayments;
          const totalInterest = totalPaid - principal;

          return {
            value: `$${payment.toFixed(2)}/mo`,
            formula: `$${principal.toFixed(2)} @ ${annualRate}% APR × ${years} yr`,
            source: "Standard amortization formula.",
            interpretation: `Total interest: $${totalInterest.toFixed(2)} · Total paid: $${totalPaid.toFixed(2)}`,
          };
        },
      },

      compound: {
        id: "compound",
        name: "Compound Interest",
        description: "Future value with compounding",
        fields: [
          { id: "principal", label: "Principal ($)", type: "number", min: 0, max: 1e12, step: 100, placeholder: "e.g. 1000" },
          { id: "rate", label: "Annual interest rate (%)", type: "number", min: 0, max: 100, step: 0.01, placeholder: "e.g. 5" },
          { id: "years", label: "Years", type: "number", min: 1, max: 100, step: 1, placeholder: "e.g. 10" },
          {
            id: "frequency",
            label: "Compounding frequency",
            type: "select",
            options: [
              { value: "1", label: "Annually" },
              { value: "2", label: "Semi-annually" },
              { value: "4", label: "Quarterly" },
              { value: "12", label: "Monthly" },
              { value: "365", label: "Daily" },
            ],
          },
          { id: "contribution", label: "Monthly contribution ($, optional)", type: "number", min: 0, max: 1e9, step: 1, placeholder: "e.g. 100" },
        ],
        calculate: (values) => {
          const principal = parseFloat(values.principal);
          const rate = parseFloat(values.rate);
          const years = parseFloat(values.years);
          const n = parseInt(values.frequency) || 12;
          const contribution = parseFloat(values.contribution) || 0;

          if (isNaN(principal) || isNaN(rate) || isNaN(years) || principal < 0 || rate < 0 || years <= 0) return null;

          const r = rate / 100;
          const t = years;
          const pmt = (contribution * 12) / n; // per-period contribution

          let futureValue;
          let formula;
          if (r === 0) {
            futureValue = principal + pmt * n * t;
            formula = `$${principal.toFixed(2)} + $${pmt.toFixed(2)} × ${n} × ${t} = $${futureValue.toFixed(2)}`;
          } else {
            const growth = Math.pow(1 + r / n, n * t);
            futureValue = principal * growth + pmt * ((growth - 1) / (r / n));
            formula = `$${principal.toFixed(2)} × (1 + ${rate}%/${n})^(${n}×${t}) + contributions = $${futureValue.toFixed(2)}`;
          }

          const totalContributions = contribution * 12 * t;
          const totalInterest = futureValue - principal - totalContributions;

          return {
            value: `$${futureValue.toFixed(2)}`,
            formula,
            source: "Compound interest formula.",
            interpretation: `Contributions: $${totalContributions.toFixed(2)} · Interest: $${totalInterest.toFixed(2)}`,
          };
        },
      },

      savings: {
        id: "savings",
        name: "Savings Goal",
        description: "Monthly contribution to reach a goal",
        fields: [
          { id: "target", label: "Target amount ($)", type: "number", min: 0, max: 1e12, step: 100, placeholder: "e.g. 10000" },
          { id: "current", label: "Current savings ($)", type: "number", min: 0, max: 1e12, step: 100, placeholder: "e.g. 0" },
          { id: "rate", label: "Annual interest rate (%)", type: "number", min: 0, max: 100, step: 0.01, placeholder: "e.g. 5" },
          { id: "years", label: "Years", type: "number", min: 1, max: 100, step: 1, placeholder: "e.g. 5" },
        ],
        calculate: (values) => {
          const target = parseFloat(values.target);
          const current = parseFloat(values.current);
          const rate = parseFloat(values.rate);
          const years = parseFloat(values.years);

          if (isNaN(target) || isNaN(current) || isNaN(rate) || isNaN(years) || target < 0 || current < 0 || rate < 0 || years <= 0) return null;

          const rM = rate / 100 / 12;
          const m = years * 12;

          let pmt;
          if (rM === 0) {
            pmt = (target - current) / m;
          } else {
            const growth = Math.pow(1 + rM, m);
            pmt = ((target - current * growth) * rM) / (growth - 1);
          }

          const totalContributions = pmt * m;
          const totalInterest = target - current - totalContributions;

          return {
            value: `$${pmt.toFixed(2)}/mo`,
            formula: `Monthly contribution to reach $${target.toFixed(2)} in ${years} yr`,
            source: "Future value of annuity formula.",
            interpretation: `Total contributed: $${totalContributions.toFixed(2)} · Interest earned: $${totalInterest.toFixed(2)}`,
          };
        },
      },

      tax: {
        id: "tax",
        name: "Sales Tax",
        description: "Add or remove tax / GST / VAT",
        fields: [
          { id: "amount", label: "Amount ($)", type: "number", min: 0, max: 1e12, step: 0.01, placeholder: "e.g. 100" },
          { id: "rate", label: "Tax rate (%)", type: "number", min: 0, max: 100, step: 0.01, placeholder: "e.g. 10" },
          {
            id: "mode",
            label: "Calculation type",
            type: "select",
            options: [
              { value: "add", label: "Add tax to amount" },
              { value: "remove", label: "Remove tax from amount" },
            ],
          },
        ],
        calculate: (values) => {
          const amount = parseFloat(values.amount);
          const rate = parseFloat(values.rate);
          if (isNaN(amount) || isNaN(rate) || amount < 0 || rate < 0) return null;

          const r = rate / 100;
          if (values.mode === "add") {
            const total = amount * (1 + r);
            const tax = total - amount;
            return {
              value: `$${total.toFixed(2)}`,
              formula: `$${amount.toFixed(2)} × (1 + ${rate}%) = $${total.toFixed(2)}`,
              source: "",
              interpretation: `Tax: $${tax.toFixed(2)} · Total: $${total.toFixed(2)}`,
            };
          }
          const preTax = amount / (1 + r);
          const tax = amount - preTax;
          return {
            value: `$${preTax.toFixed(2)}`,
            formula: `$${amount.toFixed(2)} ÷ (1 + ${rate}%) = $${preTax.toFixed(2)}`,
            source: "",
            interpretation: `Tax included: $${tax.toFixed(2)} · Pre-tax: $${preTax.toFixed(2)}`,
          };
        },
      },

      salary: {
        id: "salary",
        name: "Salary Converter",
        description: "Hourly ↔ monthly ↔ annual",
        fields: [
          { id: "amount", label: "Amount ($)", type: "number", min: 0, max: 1e9, step: 0.01, placeholder: "e.g. 25" },
          {
            id: "period",
            label: "Amount is per",
            type: "select",
            options: [
              { value: "hourly", label: "Hour" },
              { value: "monthly", label: "Month" },
              { value: "annual", label: "Year" },
            ],
          },
          { id: "hoursPerWeek", label: "Hours per week", type: "number", min: 1, max: 168, step: 1, placeholder: "e.g. 40" },
          { id: "weeksPerYear", label: "Weeks per year", type: "number", min: 1, max: 52, step: 1, placeholder: "e.g. 52" },
        ],
        calculate: (values) => {
          const amount = parseFloat(values.amount);
          const hours = parseFloat(values.hoursPerWeek);
          const weeks = parseFloat(values.weeksPerYear);
          if (isNaN(amount) || isNaN(hours) || isNaN(weeks) || amount < 0 || hours <= 0 || weeks <= 0) return null;

          let annual;
          if (values.period === "hourly") annual = amount * hours * weeks;
          else if (values.period === "monthly") annual = amount * 12;
          else annual = amount;

          const hourly = annual / (hours * weeks);
          const monthly = annual / 12;

          return {
            value: `$${annual.toFixed(2)}/yr`,
            formula: `Annual: $${annual.toFixed(2)}`,
            source: "",
            interpretation: `Hourly: $${hourly.toFixed(2)} · Monthly: $${monthly.toFixed(2)}`,
          };
        },
      },

      quadratic: {
        id: "quadratic",
        name: "Quadratic",
        description: "Solve ax² + bx + c = 0",
        fields: [
          { id: "a", label: "a (x² coefficient)", type: "number", min: -1e9, max: 1e9, step: "any", placeholder: "e.g. 1" },
          { id: "b", label: "b (x coefficient)", type: "number", min: -1e9, max: 1e9, step: "any", placeholder: "e.g. -3" },
          { id: "c", label: "c (constant)", type: "number", min: -1e9, max: 1e9, step: "any", placeholder: "e.g. 2" },
        ],
        calculate: (values) => {
          const a = parseFloat(values.a);
          const b = parseFloat(values.b);
          const c = parseFloat(values.c);
          if (isNaN(a) || isNaN(b) || isNaN(c)) return null;

          // Linear case: a = 0
          if (a === 0) {
            if (b === 0) {
              return {
                value: c === 0 ? "All x" : "No solution",
                formula: `${c} = 0`,
                source: "",
                interpretation: c === 0 ? "Identity — every x satisfies the equation" : "Contradiction — no x satisfies the equation",
              };
            }
            const root = -c / b;
            const sign = c < 0 ? "−" : "+";
            return {
              value: `x = ${ToolsCalculator._fmt(root)}`,
              formula: `${b}x ${sign} ${Math.abs(c)} = 0 → x = ${ToolsCalculator._fmt(root)}`,
              source: "",
              interpretation: "Linear equation (a = 0)",
            };
          }

          const disc = b * b - 4 * a * c;
          const real = -b / (2 * a);
          const negB = -b;

          if (disc > 0) {
            const sqrtD = Math.sqrt(disc);
            const r1 = (-b + sqrtD) / (2 * a);
            const r2 = (-b - sqrtD) / (2 * a);
            return {
              value: `x₁ = ${ToolsCalculator._fmt(r1)}, x₂ = ${ToolsCalculator._fmt(r2)}`,
              formula: `x = (${negB} ± √((${b})² − 4·${a}·${c})) ÷ (2·${a})`,
              source: "",
              interpretation: `Discriminant Δ = ${ToolsCalculator._fmt(disc)} > 0 — two real roots`,
            };
          }
          if (disc === 0) {
            return {
              value: `x = ${ToolsCalculator._fmt(real)}`,
              formula: `x = ${negB} ÷ (2·${a}) = ${ToolsCalculator._fmt(real)}`,
              source: "",
              interpretation: `Discriminant Δ = 0 — one repeated real root`,
            };
          }
          const imag = Math.sqrt(-disc) / (2 * a);
          return {
            value: `x = ${ToolsCalculator._fmt(real)} ± ${ToolsCalculator._fmt(imag)}i`,
            formula: `x = (${negB} ± √((${b})² − 4·${a}·${c})) ÷ (2·${a})`,
            source: "",
            interpretation: `Discriminant Δ = ${ToolsCalculator._fmt(disc)} < 0 — two complex roots`,
          };
        },
      },

      base: {
        id: "base",
        name: "Number Base",
        description: "Convert between DEC / BIN / OCT / HEX",
        fields: [
          { id: "value", label: "Value", type: "text", placeholder: "e.g. FF" },
          {
            id: "fromBase",
            label: "From base",
            type: "select",
            options: [
              { value: "10", label: "Decimal (DEC)" },
              { value: "2", label: "Binary (BIN)" },
              { value: "8", label: "Octal (OCT)" },
              { value: "16", label: "Hexadecimal (HEX)" },
            ],
          },
          {
            id: "toBase",
            label: "To base",
            type: "select",
            options: [
              { value: "10", label: "Decimal (DEC)" },
              { value: "2", label: "Binary (BIN)" },
              { value: "8", label: "Octal (OCT)" },
              { value: "16", label: "Hexadecimal (HEX)" },
            ],
          },
        ],
        calculate: (values) => {
          const raw = (values.value || "").trim();
          const fromBase = parseInt(values.fromBase) || 10;
          const toBase = parseInt(values.toBase) || 10;
          if (!raw) return null;

          const valid = { 2: /^[+-]?[01]+$/, 8: /^[+-]?[0-7]+$/, 10: /^[+-]?\d+$/, 16: /^[+-]?[0-9a-fA-F]+$/ };
          const re = valid[fromBase];
          if (!re || !re.test(raw)) {
            return {
              value: "Error",
              formula: `"${raw}" is not valid in base ${fromBase}`,
              source: "",
              interpretation: "Check the input digits",
            };
          }

          const n = parseInt(raw, fromBase);
          if (isNaN(n)) {
            return { value: "Error", formula: "Invalid number", source: "", interpretation: "" };
          }
          const result = n.toString(toBase).toUpperCase();

          return {
            value: result,
            formula: `${raw} (base ${fromBase}) = ${result} (base ${toBase})`,
            source: "",
            interpretation: `Decimal: ${n}`,
          };
        },
      },
    };
  }

  static _fmt(n) {
    if (typeof n !== "number" || !isFinite(n)) return String(n);
    const rounded = parseFloat(n.toPrecision(10));
    const str = String(rounded);
    const dotIdx = str.indexOf(".");
    if (dotIdx !== -1 && str.length - dotIdx - 1 > 6) {
      return rounded.toFixed(6).replace(/\.?0+$/, "");
    }
    return str;
  }

  getToolIds() {
    return Object.keys(this.tools);
  }

  getTool(id) {
    return this.tools[id] || null;
  }

  calculate(type, values) {
    const tool = this.tools[type];
    if (!tool) return null;
    return tool.calculate(values);
  }
}

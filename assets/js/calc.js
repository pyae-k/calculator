/**
 * CalcKit — Calculator Engine
 *
 * Shunting-yard algorithm (Dijkstra) for expression parsing.
 * No eval(). Handles: +, -, *, /, %, parentheses, unary minus, pi.
 * Memory operations: MC, MR, M+, M-.
 *
 * Based on research of open-source calculator parsers,
 * adapted for simplicity and reliability.
 */

// Token types
const TOKEN = {
  NUMBER: 1,
  OPERATOR: 2,
  LPAREN: 3,
  RPAREN: 4,
  CONSTANT: 5,
};

// Operator precedence (higher = binds tighter)
const PRECEDENCE = {
  "+": 2,
  "-": 2,
  "*": 3,
  "/": 3,
  "%": 3,
  "^": 4,
  "u-": 4, // unary minus
  nthroot: 4,
  square: 5,
  cube: 5,
  sqrt: 5,
  recip: 5,
  sin: 5,
  cos: 5,
  tan: 5,
  asin: 5,
  acos: 5,
  atan: 5,
  log: 5,
  ln: 5,
  log2: 5,
  abs: 5,
  exp: 5,
  factorial: 6,
};

// Operator associativity: true = left, false = right
const ASSOCIATIVITY = {
  "+": true,
  "-": true,
  "*": true,
  "/": true,
  "%": true,
  "^": false,
  "u-": false,
  nthroot: true,
  square: false,
  cube: false,
  sqrt: false,
  recip: false,
  sin: false,
  cos: false,
  tan: false,
  asin: false,
  acos: false,
  atan: false,
  log: false,
  ln: false,
  log2: false,
  abs: false,
  exp: false,
  factorial: false,
};

export class Calculator {
  constructor() {
    this.expression = "";
    this.memory = 0;
    this.hasMemory = false;
    this.angleMode = "deg"; // "deg" | "rad"
  }

  /**
   * Tokenize an expression string into an array of tokens.
   * Handles: numbers (int, decimal, scientific notation), operators,
   * parentheses, constants (pi, e, tau), function names, factorial,
   * unary minus detection.
   */
  tokenize(input) {
    const tokens = [];
    let i = 0;
    let prevToken = null;

    // Postfix operators: a minus after one of these is binary, not unary
    const isPostfix = (t) =>
      t && t.type === TOKEN.OPERATOR && ["factorial", "square", "cube"].includes(t.value);

    while (i < input.length) {
      const ch = input[i];

      // Skip whitespace
      if (ch === " " || ch === "\t") {
        i++;
        continue;
      }

      // Number (including decimal and scientific notation)
      if (/[0-9]/.test(ch) || (ch === "." && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
        let num = "";
        while (i < input.length && /[0-9.]/.test(input[i])) {
          num += input[i];
          i++;
        }
        // Scientific notation: 2e3, 1.5e-4 (disambiguated from Euler's e)
        if (i < input.length && /^[eE][+-]?\d/.test(input.slice(i))) {
          num += input[i]; // e or E
          i++;
          if (i < input.length && /[+-]/.test(input[i])) {
            num += input[i];
            i++;
          }
          while (i < input.length && /[0-9]/.test(input[i])) {
            num += input[i];
            i++;
          }
        }
        // Handle multiple dots
        const dotCount = (num.match(/\./g) || []).length;
        if (dotCount > 1) {
          return { error: "Invalid number" };
        }
        tokens.push({ type: TOKEN.NUMBER, value: parseFloat(num) });
        prevToken = { type: TOKEN.NUMBER };
        continue;
      }

      // Letters: constants and function names
      if (/[a-zA-Zτ]/.test(ch)) {
        let name = "";
        while (i < input.length && /[a-zA-Zτ]/.test(input[i])) {
          name += input[i];
          i++;
        }
        // log2 is a function name with a digit
        if (name.toLowerCase() === "log" && input[i] === "2") {
          name = "log2";
          i++;
        }
        const lower = name.toLowerCase();

        if (lower === "pi") {
          tokens.push({ type: TOKEN.CONSTANT, value: Math.PI });
          prevToken = { type: TOKEN.CONSTANT };
          continue;
        }
        if (lower === "e") {
          tokens.push({ type: TOKEN.CONSTANT, value: Math.E });
          prevToken = { type: TOKEN.CONSTANT };
          continue;
        }
        if (lower === "tau" || lower === "τ") {
          tokens.push({ type: TOKEN.CONSTANT, value: 2 * Math.PI });
          prevToken = { type: TOKEN.CONSTANT };
          continue;
        }

        // nthroot is a binary operator (radicand nthroot index), not a function
        if (lower === "nthroot") {
          tokens.push({ type: TOKEN.OPERATOR, value: "nthroot" });
          prevToken = { type: TOKEN.OPERATOR, value: "nthroot" };
          continue;
        }

        const FUNCTIONS = ["sin", "cos", "tan", "asin", "acos", "atan", "log", "ln", "log2", "abs", "exp", "sqrt"];
        if (FUNCTIONS.includes(lower)) {
          tokens.push({ type: TOKEN.OPERATOR, value: lower });
          if (input[i] === "(") {
            tokens.push({ type: TOKEN.LPAREN, value: "(" });
            i++;
            prevToken = { type: TOKEN.LPAREN };
          } else {
            return { error: `Expected "(" after ${lower}` };
          }
          continue;
        }

        return { error: `Unknown function: ${lower}` };
      }

      // Parentheses
      if (ch === "(") {
        tokens.push({ type: TOKEN.LPAREN, value: "(" });
        i++;
        prevToken = { type: TOKEN.LPAREN };
        continue;
      }

      if (ch === ")") {
        tokens.push({ type: TOKEN.RPAREN, value: ")" });
        i++;
        prevToken = { type: TOKEN.RPAREN };
        continue;
      }

      // Power operator
      if (ch === "^") {
        tokens.push({ type: TOKEN.OPERATOR, value: "^" });
        i++;
        prevToken = { type: TOKEN.OPERATOR, value: "^" };
        continue;
      }

      // Square (²) and cube (³) postfix operators
      if (ch === "²") {
        tokens.push({ type: TOKEN.OPERATOR, value: "square" });
        i++;
        prevToken = { type: TOKEN.OPERATOR, value: "square" };
        continue;
      }
      if (ch === "³") {
        tokens.push({ type: TOKEN.OPERATOR, value: "cube" });
        i++;
        prevToken = { type: TOKEN.OPERATOR, value: "cube" };
        continue;
      }

      // Factorial (postfix)
      if (ch === "!") {
        tokens.push({ type: TOKEN.OPERATOR, value: "factorial" });
        i++;
        prevToken = { type: TOKEN.OPERATOR, value: "factorial" };
        continue;
      }

      // Operators
      if ("+-*/%".includes(ch)) {
        // Detect unary minus:
        // - at start of expression
        // - after ( or another operator (but not after a postfix operator)
        const isUnary =
          ch === "-" &&
          (prevToken === null ||
            prevToken.type === TOKEN.LPAREN ||
            (prevToken.type === TOKEN.OPERATOR && !isPostfix(prevToken)));
        tokens.push({ type: TOKEN.OPERATOR, value: isUnary ? "u-" : ch });
        i++;
        prevToken = { type: TOKEN.OPERATOR, value: isUnary ? "u-" : ch };
        continue;
      }

      // Unknown character
      return { error: `Unexpected character: "${ch}"` };
    }

    return tokens;
  }

  /**
   * Shunting-yard: convert infix token array to RPN (Reverse Polish Notation).
   */
  shunt(tokens) {
    if (tokens.error) return tokens;

    const output = [];
    const stack = [];

    for (const token of tokens) {
      switch (token.type) {
        case TOKEN.NUMBER:
        case TOKEN.CONSTANT:
          output.push(token);
          break;

        case TOKEN.OPERATOR: {
          const prec = PRECEDENCE[token.value] || 0;
          const leftAssoc = ASSOCIATIVITY[token.value] !== false;

          while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (top.type !== TOKEN.OPERATOR) break;

            const topPrec = PRECEDENCE[top.value] || 0;
            if (
              (leftAssoc && prec <= topPrec) ||
              (!leftAssoc && prec < topPrec)
            ) {
              output.push(stack.pop());
            } else {
              break;
            }
          }
          stack.push(token);
          break;
        }

        case TOKEN.LPAREN:
          stack.push(token);
          break;

        case TOKEN.RPAREN: {
          let found = false;
          while (stack.length > 0) {
            const top = stack.pop();
            if (top.type === TOKEN.LPAREN) {
              found = true;
              break;
            }
            output.push(top);
          }
          if (!found) {
            return { error: "Mismatched parentheses" };
          }
          break;
        }
      }
    }

    // Pop remaining operators
    while (stack.length > 0) {
      const top = stack.pop();
      if (top.type === TOKEN.LPAREN) {
        return { error: "Mismatched parentheses" };
      }
      output.push(top);
    }

    return output;
  }

  /**
   * Evaluate an RPN token array and return the result.
   */
  evaluate(rpn) {
    if (rpn.error) return rpn;

    const stack = [];

    for (const token of rpn) {
      switch (token.type) {
        case TOKEN.NUMBER:
          stack.push(token.value);
          break;

        case TOKEN.CONSTANT:
          stack.push(token.value);
          break;

        case TOKEN.OPERATOR: {
          const op = token.value;

          // Unary operators (functions + postfix)
          if (
            op === "u-" || op === "sqrt" || op === "square" || op === "cube" || op === "recip" ||
            op === "sin" || op === "cos" || op === "tan" || op === "asin" || op === "acos" || op === "atan" ||
            op === "log" || op === "ln" || op === "log2" || op === "abs" || op === "exp" || op === "factorial"
          ) {
            if (stack.length < 1) {
              return { error: "Insufficient operands" };
            }
            const a = stack.pop();
            let result;
            switch (op) {
              case "u-":
                result = -a;
                break;
              case "sqrt":
                if (a < 0) return { error: "Square root of negative number" };
                result = Math.sqrt(a);
                break;
              case "square":
                result = a * a;
                break;
              case "cube":
                result = a * a * a;
                break;
              case "recip":
                if (a === 0) return { error: "Division by zero" };
                result = 1 / a;
                break;
              case "sin":
                result = Math.sin(this._toRadians(a));
                break;
              case "cos":
                result = Math.cos(this._toRadians(a));
                break;
              case "tan":
                result = Math.tan(this._toRadians(a));
                break;
              case "asin":
                result = this._fromRadians(Math.asin(a));
                break;
              case "acos":
                result = this._fromRadians(Math.acos(a));
                break;
              case "atan":
                result = this._fromRadians(Math.atan(a));
                break;
              case "log":
                if (a <= 0) return { error: "log of non-positive number" };
                result = Math.log10(a);
                break;
              case "ln":
                if (a <= 0) return { error: "ln of non-positive number" };
                result = Math.log(a);
                break;
              case "log2":
                if (a <= 0) return { error: "log2 of non-positive number" };
                result = Math.log2(a);
                break;
              case "abs":
                result = Math.abs(a);
                break;
              case "exp":
                result = Math.exp(a);
                break;
              case "factorial":
                if (a < 0 || !Number.isInteger(a)) {
                  return { error: "Factorial requires a non-negative integer" };
                }
                if (a > 170) return { error: "Factorial too large" };
                result = this._factorial(a);
                break;
            }
            stack.push(result);
          } else {
            // Binary operators
            if (stack.length < 2) {
              return { error: "Insufficient operands" };
            }
            const b = stack.pop();
            const a = stack.pop();
            let result;

            switch (op) {
              case "+":
                result = a + b;
                break;
              case "-":
                result = a - b;
                break;
              case "*":
                result = a * b;
                break;
              case "/":
                if (b === 0) {
                  return { error: "Division by zero" };
                }
                result = a / b;
                break;
              case "%":
                if (b === 0) {
                  return { error: "Division by zero" };
                }
                result = a % b;
                break;
              case "^":
                result = Math.pow(a, b);
                break;
              case "nthroot":
                if (b === 0) return { error: "Root index cannot be zero" };
                if (a < 0) {
                  if (b % 2 === 0) return { error: "Even root of negative number" };
                  result = -Math.pow(-a, 1 / b);
                } else {
                  result = Math.pow(a, 1 / b);
                }
                break;
              default:
                return { error: `Unknown operator: ${op}` };
            }
            stack.push(result);
          }
          break;
        }
      }
    }

    if (stack.length !== 1) {
      return { error: "Invalid expression" };
    }

    const result = stack[0];
    if (!isFinite(result)) {
      return { error: "Result is not finite" };
    }

    return { value: result };
  }

  /**
   * Calculate a complete expression string.
   * Returns { value: number } on success, { error: string } on failure.
   */
  calculate(expression) {
    const tokens = this.tokenize(expression);
    if (tokens.error) return tokens;

    const rpn = this.shunt(tokens);
    if (rpn.error) return rpn;

    return this.evaluate(rpn);
  }

  /**
   * Format a number for display, avoiding floating-point artifacts.
   */
  formatNumber(n) {
    if (typeof n !== "number" || !isFinite(n)) {
      return String(n);
    }

    // Handle very small/large numbers with scientific notation
    if (Math.abs(n) < 1e-10 && n !== 0) {
      return n.toExponential(4);
    }
    if (Math.abs(n) > 1e15) {
      return n.toExponential(4);
    }

    // Round to avoid floating-point artifacts (e.g. 0.1 + 0.2 = 0.30000000000000004)
    const rounded = parseFloat(n.toPrecision(12));
    const str = String(rounded);

    // Limit decimal places to 10
    const dotIdx = str.indexOf(".");
    if (dotIdx !== -1 && str.length - dotIdx - 1 > 10) {
      return rounded.toFixed(10).replace(/\.?0+$/, "");
    }

    return str;
  }

  // --- Scientific Mode Helpers ---

  setAngleMode(mode) {
    this.angleMode = mode === "rad" ? "rad" : "deg";
  }

  _toRadians(x) {
    return this.angleMode === "deg" ? (x * Math.PI) / 180 : x;
  }

  _fromRadians(x) {
    return this.angleMode === "deg" ? (x * 180) / Math.PI : x;
  }

  _factorial(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  // --- Memory Operations ---

  memoryClear() {
    this.memory = 0;
    this.hasMemory = false;
  }

  memoryRecall() {
    return this.hasMemory ? this.memory : 0;
  }

  memoryAdd(value) {
    this.memory += value;
    this.hasMemory = true;
  }

  memorySubtract(value) {
    this.memory -= value;
    this.hasMemory = true;
  }
}

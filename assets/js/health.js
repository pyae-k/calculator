/**
 * CalcKit — Health Calculators
 *
 * BMI (WHO), BMR (Mifflin-St Jeor), Ideal Weight (Devine).
 * Every result includes the formula with user's numbers substituted
 * and a source citation.
 */

export class HealthCalculator {
  constructor() {
    this.calculators = {
      bmi: {
        id: "bmi",
        name: "BMI",
        description: "Body Mass Index — WHO standard",
        fields: [
          { id: "weight", label: "Weight (kg)", type: "number", min: 1, max: 500, step: 0.1, placeholder: "e.g. 70" },
          { id: "height", label: "Height (cm)", type: "number", min: 10, max: 300, step: 0.1, placeholder: "e.g. 175" },
        ],
        calculate: (values, self) => {
          const w = parseFloat(values.weight);
          const hCm = parseFloat(values.height);

          if (isNaN(w) || isNaN(hCm) || w <= 0 || hCm <= 0) {
            return null;
          }

          const hM = hCm / 100;
          const bmi = w / (hM * hM);
          const category = self.getBMICategory(bmi);

          return {
            value: `${bmi.toFixed(1)} kg/m²`,
            formula: `${w} kg ÷ (${hM.toFixed(2)} m)² = ${bmi.toFixed(1)} kg/m²`,
            source: "World Health Organization (WHO). BMI classification.",
            interpretation: `Category: ${category}`,
            bmiValue: bmi,
            showBmiBar: true,
          };
        },
      },

      bmr: {
        id: "bmr",
        name: "BMR",
        description: "Basal Metabolic Rate — Mifflin-St Jeor equation",
        fields: [
          { id: "weight", label: "Weight (kg)", type: "number", min: 1, max: 500, step: 0.1, placeholder: "e.g. 70" },
          { id: "height", label: "Height (cm)", type: "number", min: 10, max: 300, step: 0.1, placeholder: "e.g. 175" },
          { id: "age", label: "Age (years)", type: "number", min: 1, max: 150, step: 1, placeholder: "e.g. 30" },
          {
            id: "gender",
            label: "Sex at birth",
            type: "select",
            options: [
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ],
          },
        ],
        calculate: (values) => {
          const w = parseFloat(values.weight);
          const h = parseFloat(values.height);
          const a = parseFloat(values.age);

          if (isNaN(w) || isNaN(h) || isNaN(a) || w <= 0 || h <= 0 || a <= 0) {
            return null;
          }

          const isMale = values.gender === "male";
          const bmr = isMale
            ? 10 * w + 6.25 * h - 5 * a + 5
            : 10 * w + 6.25 * h - 5 * a - 161;

          const formula = isMale
            ? `(10 × ${w}) + (6.25 × ${h}) - (5 × ${a}) + 5 = ${bmr.toFixed(0)} kcal/day`
            : `(10 × ${w}) + (6.25 × ${h}) - (5 × ${a}) - 161 = ${bmr.toFixed(0)} kcal/day`;

          return {
            value: `${bmr.toFixed(0)} kcal/day`,
            formula,
            source:
              "Mifflin, M. D., et al. (1990). A new predictive equation for resting energy expenditure in healthy individuals. American Journal of Clinical Nutrition, 51(2), 241-247.",
          };
        },
      },

      idealWeight: {
        id: "idealWeight",
        name: "Ideal Weight",
        description: "Ideal Body Weight — Devine formula",
        fields: [
          { id: "height", label: "Height (cm)", type: "number", min: 10, max: 300, step: 0.1, placeholder: "e.g. 175" },
          {
            id: "gender",
            label: "Sex at birth",
            type: "select",
            options: [
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ],
          },
        ],
        calculate: (values) => {
          const h = parseFloat(values.height);

          if (isNaN(h) || h <= 0) {
            return null;
          }

          const isMale = values.gender === "male";
          const inches = h / 2.54;
          const over5ft = Math.max(0, inches - 60);
          const ideal = isMale ? 50 + 2.3 * over5ft : 45.5 + 2.3 * over5ft;

          const formula = isMale
            ? `50 + (2.3 × (${h.toFixed(1)} ÷ 2.54 - 60)) = ${ideal.toFixed(1)} kg`
            : `45.5 + (2.3 × (${h.toFixed(1)} ÷ 2.54 - 60)) = ${ideal.toFixed(1)} kg`;

          return {
            value: `${ideal.toFixed(1)} kg`,
            formula,
            source:
              "Devine, B. J. (1974). Gentamicin therapy. Drug Intelligence & Clinical Pharmacy, 8(11), 650-655.",
          };
        },
      },

      bodyFat: {
        id: "bodyFat",
        name: "Body Fat",
        description: "Body fat % — US Navy circumference method",
        fields: [
          {
            id: "gender",
            label: "Sex at birth",
            type: "select",
            options: [
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ],
          },
          { id: "height", label: "Height (cm)", type: "number", min: 10, max: 300, step: 0.1, placeholder: "e.g. 175" },
          { id: "waist", label: "Waist (cm)", type: "number", min: 20, max: 300, step: 0.1, placeholder: "e.g. 90" },
          { id: "neck", label: "Neck (cm)", type: "number", min: 10, max: 200, step: 0.1, placeholder: "e.g. 40" },
          {
            id: "hip",
            label: "Hip (cm)",
            type: "number",
            min: 20,
            max: 300,
            step: 0.1,
            placeholder: "e.g. 100",
            showIf: { field: "gender", value: "female" },
          },
        ],
        calculate: (values) => {
          const h = parseFloat(values.height);
          const waist = parseFloat(values.waist);
          const neck = parseFloat(values.neck);
          const hip = parseFloat(values.hip);
          const isMale = values.gender === "male";

          if (isNaN(h) || isNaN(waist) || isNaN(neck) || h <= 0 || waist <= 0 || neck <= 0) return null;
          if (!isMale && (isNaN(hip) || hip <= 0)) return null;
          if (waist <= neck) {
            return {
              value: "Error",
              formula: "Waist must be greater than neck",
              source: "",
              interpretation: "Check your measurements",
            };
          }

          let bf;
          let formula;
          if (isMale) {
            bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450;
            formula = `495 ÷ (1.0324 − 0.19077·log10(${waist}−${neck}) + 0.15456·log10(${h})) − 450 = ${bf.toFixed(1)}%`;
          } else {
            bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(h)) - 450;
            formula = `495 ÷ (1.29579 − 0.35004·log10(${waist}+${hip}−${neck}) + 0.221·log10(${h})) − 450 = ${bf.toFixed(1)}%`;
          }

          return {
            value: `${bf.toFixed(1)}%`,
            formula,
            source: "US Navy circumference method (Hodgdon & Beckett, 1984).",
            interpretation: `Body fat: ${bf.toFixed(1)}%`,
          };
        },
      },

      tdee: {
        id: "tdee",
        name: "TDEE",
        description: "Total Daily Energy Expenditure",
        fields: [
          { id: "weight", label: "Weight (kg)", type: "number", min: 1, max: 500, step: 0.1, placeholder: "e.g. 70" },
          { id: "height", label: "Height (cm)", type: "number", min: 10, max: 300, step: 0.1, placeholder: "e.g. 175" },
          { id: "age", label: "Age (years)", type: "number", min: 1, max: 150, step: 1, placeholder: "e.g. 30" },
          {
            id: "gender",
            label: "Sex at birth",
            type: "select",
            options: [
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ],
          },
          {
            id: "activity",
            label: "Activity level",
            type: "select",
            options: [
              { value: "sedentary", label: "Sedentary (little exercise)" },
              { value: "light", label: "Light (1-3 days/week)" },
              { value: "moderate", label: "Moderate (3-5 days/week)" },
              { value: "active", label: "Active (6-7 days/week)" },
              { value: "veryActive", label: "Very active (physical job)" },
            ],
          },
        ],
        calculate: (values) => {
          const w = parseFloat(values.weight);
          const h = parseFloat(values.height);
          const a = parseFloat(values.age);
          if (isNaN(w) || isNaN(h) || isNaN(a) || w <= 0 || h <= 0 || a <= 0) return null;

          const isMale = values.gender === "male";
          const bmr = isMale ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
          const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 };
          const factor = factors[values.activity] || 1.2;
          const tdee = bmr * factor;

          return {
            value: `${tdee.toFixed(0)} kcal/day`,
            formula: `BMR (${bmr.toFixed(0)}) × ${factor} = ${tdee.toFixed(0)} kcal/day`,
            source: "Mifflin-St Jeor equation with activity factors.",
            interpretation: `BMR: ${bmr.toFixed(0)} kcal/day · Activity: ${factor}×`,
          };
        },
      },

      water: {
        id: "water",
        name: "Water Intake",
        description: "Daily water intake — IOM-based",
        fields: [
          { id: "weight", label: "Weight (kg)", type: "number", min: 1, max: 500, step: 0.1, placeholder: "e.g. 70" },
          { id: "age", label: "Age (years)", type: "number", min: 1, max: 150, step: 1, placeholder: "e.g. 30" },
          {
            id: "activity",
            label: "Activity level",
            type: "select",
            options: [
              { value: "low", label: "Low (sedentary)" },
              { value: "moderate", label: "Moderate" },
              { value: "high", label: "High (athlete)" },
            ],
          },
        ],
        calculate: (values) => {
          const w = parseFloat(values.weight);
          const a = parseFloat(values.age);
          if (isNaN(w) || isNaN(a) || w <= 0 || a <= 0) return null;

          const activityBonus = { low: 0, moderate: 0.35, high: 0.7 }[values.activity] || 0;
          const liters = w * 0.033 - Math.max(0, a - 30) * 0.005 + activityBonus;

          return {
            value: `${liters.toFixed(1)} L/day`,
            formula: `(${w} × 0.033) − max(0, ${a} − 30) × 0.005 + ${activityBonus} = ${liters.toFixed(1)} L`,
            source: "IOM-based approximation.",
            interpretation: `≈ ${(liters * 4.22675).toFixed(0)} US cups/day`,
          };
        },
      },

      hrZones: {
        id: "hrZones",
        name: "Heart Rate Zones",
        description: "Karvonen training zones",
        fields: [
          { id: "age", label: "Age (years)", type: "number", min: 1, max: 150, step: 1, placeholder: "e.g. 30" },
          { id: "restingHr", label: "Resting heart rate (bpm)", type: "number", min: 30, max: 200, step: 1, placeholder: "e.g. 60" },
        ],
        calculate: (values) => {
          const age = parseFloat(values.age);
          const resting = parseFloat(values.restingHr);
          if (isNaN(age) || isNaN(resting) || age <= 0 || resting <= 0) return null;

          const hrMax = 220 - age;
          const hrr = hrMax - resting;
          const zones = [
            { name: "Z1", label: "Very light", min: 0.5, max: 0.6 },
            { name: "Z2", label: "Light", min: 0.6, max: 0.7 },
            { name: "Z3", label: "Moderate", min: 0.7, max: 0.8 },
            { name: "Z4", label: "Hard", min: 0.8, max: 0.9 },
            { name: "Z5", label: "Maximum", min: 0.9, max: 1.0 },
          ];
          const zoneLines = zones
            .map((z) => {
              const lo = Math.round(resting + hrr * z.min);
              const hi = Math.round(resting + hrr * z.max);
              return `${z.name} (${z.label}): ${lo}–${hi} bpm`;
            })
            .join("\n");

          return {
            value: `HRmax: ${hrMax} bpm · HRR: ${hrr} bpm`,
            formula: `HRmax = 220 − ${age} = ${hrMax} · HRR = ${hrMax} − ${resting} = ${hrr}`,
            source: "Karvonen formula.",
            interpretation: zoneLines,
          };
        },
      },
    };
  }

  /**
   * Get BMI category based on WHO classification.
   */
  getBMICategory(bmi) {
    if (bmi < 16) return "Severely underweight";
    if (bmi < 17) return "Moderately underweight";
    if (bmi < 18.5) return "Mildly underweight";
    if (bmi < 25) return "Normal range";
    if (bmi < 30) return "Overweight";
    if (bmi < 35) return "Obese class I";
    if (bmi < 40) return "Obese class II";
    return "Obese class III";
  }

  /**
   * Get the BMI position as a percentage (0-100) for the visual bar.
   * Maps BMI 10-45 to 0-100%.
   */
  getBMIPercent(bmi) {
    const min = 10;
    const max = 45;
    const clamped = Math.max(min, Math.min(max, bmi));
    return ((clamped - min) / (max - min)) * 100;
  }

  /**
   * Get list of calculator IDs.
   */
  getCalculatorIds() {
    return Object.keys(this.calculators);
  }

  /**
   * Get a calculator definition by ID.
   */
  getCalculator(id) {
    return this.calculators[id] || null;
  }

  /**
   * Calculate a health metric.
   * Returns { value, formula, source, interpretation?, bmiValue? } or null.
   */
  calculate(type, values) {
    const calc = this.calculators[type];
    if (!calc) return null;
    return calc.calculate(values, this);
  }
}

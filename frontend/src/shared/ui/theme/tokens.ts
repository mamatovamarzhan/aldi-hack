/**
 * Aldi design tokens — single source of truth for the patient-facing UI.
 * The same values are registered as Tailwind utilities in src/styles.css
 * (@theme inline). Change both places together.
 *
 * Rules:
 * - Red (danger) is used ONLY for the urgent banner and the hang-up call button.
 * - Patient screens have no navigation bar and no header.
 * - All UI copy is Russian, user addressed as «Вы».
 * - Color variety lives in gradients, chips, the sphere and the sky background —
 *   never in body text. Azure is reserved for action labels and borders.
 */

export const colors = {
  background: "#FBF9F4",
  panel: "#F3EFFA",
  surface: "#FFFFFF",
  // Lilac (main)
  primary: "#2EA8FF",
  primaryPressed: "#1565D8",
  actionText: "#0757A6",
  ghostDay: "#5B4A9E",
  ghostNight: "#D9CCFF",
  supportiveDay: "#1B2A5C",
  supportiveNight: "#F3F1FF",
  glassDay: "rgba(255,255,255,0.68)",
  glassNight: "rgba(16,20,52,0.58)",
  // ElevenLabs Orb gradient (lilac → azure)
  orbLilac: "#C9B8F2",
  orbAzure: "#8EC5F5",
  primaryTint: "#EDE6FA",
  lilacMist: "#DCD0F5",
  // Sky blues (decor, gradients, chips; deep is the only text/link blue)
  skyLight: "#BFE0F5",
  skyMid: "#8EC5E8",
  skyDeep: "#2F6A98",
  // Meadow greens (decor, gradients, chips; deep is the success color)
  meadowLight: "#CFE6D3",
  sage: "#A9CBB0",
  meadow: "#8DBF9A",
  meadowDeep: "#2F7A5B",
  // Text
  text: "#2A2438",
  textMuted: "#6E6880",
  textFaint: "#A39DB3",
  border: "#E7E2F0",
  // Status
  success: "#2F7A5B",
  warn: "#B8860B",
  danger: "#C9393F",
  dangerBg: "#FDECEC",
} as const;

export const typography = {
  fontFamily: '"Manrope", system-ui, sans-serif',
  weights: { medium: 500, bold: 700, title: 800 },
  title: { fontSize: "44px" },
  supportive: { fontFamily: '"Cormorant Garamond", serif', fontSize: "28px" },
  body: { fontSize: "18px", lineHeight: "27px" },
} as const;

export const radius = {
  button: "9999px", // pill
  card: "20px",
  sheet: "28px", // bottom sheet, top corners only
} as const;

export const shadow = {
  card: "0 12px 32px rgba(90, 70, 150, 0.16)",
  action: "0 10px 30px rgba(30,120,240,0.45)",
} as const;

export const layout = {
  maxContentWidth: "480px", // centered on desktop
  buttonHeight: "56px",
} as const;

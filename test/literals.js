// Shared by rules.test.js and landing-page.test.js: what may not be written by hand in code files.
export const LITERALS = [
  [/#[0-9a-fA-F]{3,8}\b/, 'hex color'],
  [/\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\s*\(/i, 'color function'],
  [/\b\d+(\.\d+)?\s*px\b/i, 'size in px'],
  [/\b(transparent|black|white|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|cyan|magenta|silver|gold|navy|teal)\b/i, 'color name'],
];

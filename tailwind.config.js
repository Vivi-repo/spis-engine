/** @type {import('tailwindcss').Config} */
const tokens = ['bg', 'surface', 'surface2', 'line', 'ink', 'muted', 'accent', 'std', 'safe', 'warn', 'strain', 'crit'];

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Colors resolve to CSS variables (see src/index.css) so light and dark themes share one class set.
      colors: Object.fromEntries(tokens.map(k => [k, `rgb(var(--${k}) / <alpha-value>)`])),
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

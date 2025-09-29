/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        oklok: {
          primary: 'hsl(var(--oklok-primary))',
          'primary-foreground': 'hsl(var(--oklok-primary-foreground))',
          secondary: 'hsl(var(--oklok-secondary))',
          'secondary-foreground': 'hsl(var(--oklok-secondary-foreground))',
          accent: 'hsl(var(--oklok-accent))',
          'accent-foreground': 'hsl(var(--oklok-accent-foreground))',
          muted: 'hsl(var(--oklok-muted))',
          'muted-foreground': 'hsl(var(--oklok-muted-foreground))',
          border: 'hsl(var(--oklok-border))',
          foreground: 'hsl(var(--foreground))',
        },
      },
      borderRadius: {
        'oklok': 'var(--oklok-radius)',
      },
      fontFamily: {
        'inter': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
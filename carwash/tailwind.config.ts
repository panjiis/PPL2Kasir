import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#337BBF',
          light: '#73acdf',
          dark: '#285d90',
          foreground: 'hsl(var(--primary-foreground))',
        },
        accent: {
          DEFAULT: '#FFEE59',
          light: '#fff799',
          dark: '#e6d650',
          foreground: 'hsl(var(--accent-foreground))',
        },
        mint: {
          DEFAULT: '#A3D9A5',
          light: '#c3e7c4',
          dark: '#7fc982',
          50: '#f0f9f0',
          100: '#e1f3e1',
          200: '#c3e7c4',
          300: '#A3D9A5',
          400: '#7fc982',
          500: '#5bb95e',
          600: '#49a44c',
          700: '#3c863f',
          800: '#326935',
          900: '#29562c',
          950: '#152e17',
        },
        teal: {
          DEFAULT: '#BFD8D5',
          light: '#e5efef',
          dark: '#9abfbb',
          50: '#f2f7f7',
          100: '#e5efef',
          200: '#cce0df',
          300: '#BFD8D5',
          400: '#9abfbb',
          500: '#75a6a1',
          600: '#5e8a85',
          700: '#4d706c',
          800: '#405b58',
          900: '#364b49',
          950: '#1e2a29',
        },
        offwhite: {
          DEFAULT: '#F5F7FA', // 💡 Lembut, tidak menyilaukan
          light: '#ffffff',
          dark: '#e7edf1',
          50: '#ffffff',
          100: '#fefefe',
          200: '#fcfdfe',
          300: '#F5F7FA',
          400: '#e9eff3',
          500: '#dfe7ed',
          600: '#c9d3db',
          700: '#b3bec7',
          800: '#9aa6b0',
          900: '#7e8a94',
          950: '#65707a',
        },
        grayblue: {
          DEFAULT: '#DDE5E9',
          light: '#f7f9fa',
          dark: '#adbbc3',
          50: '#f7f9fa',
          100: '#eff3f5',
          200: '#e6ecef',
          300: '#DDE5E9',
          400: '#c5d0d6',
          500: '#adbbc3',
          600: '#95a6b0',
          700: '#7d8d98',
          800: '#67747e',
          900: '#515c64',
          950: '#3a4249',
        },
        sky: {
          50: '#eef5fb',
          100: '#dceaf7',
          200: '#b9d6ef',
          300: '#96c1e7',
          400: '#73acdf',
          500: '#337BBF',
          600: '#2e6fac',
          700: '#285d90',
          800: '#224c75',
          900: '#1c3a5a',
          950: '#122438',
        },
        yellow: {
          50: '#fffde6',
          100: '#fffbcc',
          200: '#fff799',
          300: '#fff266',
          400: '#FFEE59',
          500: '#e6d650',
          600: '#ccbe47',
          700: '#b3a73e',
          800: '#998f35',
          900: '#807729',
          950: '#665f21',
        },

        // ✅ gunakan tone lembut untuk background & foreground
        background: '#F5F7FA', // lembut, tidak full putih
        foreground: '#1a1a1a', // abu gelap agar kontras lembut

        // ✅ support variables dari shadcn
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ✅ Tambahkan animasi smooth untuk global transition
      transitionProperty: {
        theme: 'background-color, color, border-color',
      },
      transitionDuration: {
        400: '400ms',
      },
      transitionTimingFunction: {
        smooth: 'ease-in-out',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
};

export default config;

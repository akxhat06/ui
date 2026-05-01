import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                cream: "#FBF8F1",
                surface: "#FFFFFF",
                ink: "#1A1A1A",
                muted: "#6B6862",
                "muted-light": "#9C9890",
                line: "#E8E4DA",
                "line-strong": "#D4CFC0",
                accent: "#B5413A",
                "accent-soft": "#F0DCDA",
                "status-done": "#3D6647",
                "status-error": "#A03030",
            },
            fontFamily: {
                serif: ["var(--font-serif)", "Georgia", "serif"],
                sans: ["var(--font-sans)", "system-ui", "sans-serif"],
                mono: ["var(--font-mono)", "ui-monospace", "monospace"],
            },
            keyframes: {
                "pulse-soft": {
                    "0%, 100%": { opacity: "1", transform: "scale(1)" },
                    "50%": { opacity: "0.6", transform: "scale(0.96)" },
                },
                "fade-up": {
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
                "fade-up": "fade-up 0.6s ease-out both",
            },
        },
    },
    plugins: [],
};

export default config;
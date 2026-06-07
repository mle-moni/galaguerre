/** @type {import('tailwindcss').Config} */
export default {
    content: ["./resources/**/*.{edge,js,ts}", "./frontend/**/*.{js,ts,jsx,tsx}"],
    theme: {
        fontFamily: {
            roboto: ["Roboto"],
        },
        extend: {
            colors: {
                gg: {
                    navy: "#1e3a5f",
                    "navy-light": "#2a4f7a",
                    gold: "#c9a227",
                    amber: "#da9854",
                    spell: "#4a1e5f",
                    weapon: "#5f3a1e",
                },
            },
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    },
    important: true,
};

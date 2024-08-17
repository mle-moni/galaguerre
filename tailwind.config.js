/** @type {import('tailwindcss').Config} */
export default {
    content: ["./resources/**/*.{edge,js,ts}", "./frontend/**/*.{js,ts,jsx,tsx}"],
    theme: {
        fontFamily: {
            roboto: ["Roboto"],
        },
        extend: {},
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    },
    important: true,
};

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}"
    ],
    theme: { extend: {} },
    plugins: [] // <- IMPORTANT: no "@tailwindcss/line-clamp" here
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        net: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        net: "22px 22px",
      },
    },
  },
  plugins: [],
};

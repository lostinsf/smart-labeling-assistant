/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "576px",
      md: "768px",
      lg: "992px",
      xl: "1200px"
    },
    extend: {
      colors: {
        ink: "#11212d",
        mist: "#d6e5ef",
        sand: "#f8f4ea",
        coral: "#ff7a59",
        teal: "#2b7a78"
      },
      boxShadow: {
        panel: "0 20px 45px rgba(17, 33, 45, 0.08)"
      }
    }
  },
  plugins: []
};

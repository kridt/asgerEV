module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glass:
          "inset 0 1px 0 rgba(255,255,255,0.7), 0 50px 100px -40px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

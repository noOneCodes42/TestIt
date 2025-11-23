module.exports = {
  theme: {
    extend: {
      keyframes: {
        rgb: {
          '0%': { borderColor: 'red' },
          '33%': { borderColor: 'lime' },
          '66%': { borderColor: 'blue' },
          '100%': { borderColor: 'red' },
        },
      },
      animation: {
        rgb: 'rgb 3s linear infinite',
      },
    },
  },
}

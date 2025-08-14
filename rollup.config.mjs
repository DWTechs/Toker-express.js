const config =  {
  input: "build/es6/toker-express.js",
  output: {
    name: "winstan",
    file: "build/toker-express.mjs",
    format: "es"
  },
  external: [
    "@dwtechs/checkard", 
    "@dwtechs/toker", 
    "@dwtechs/winstan",
  ],
  plugins: []
};

export default config;

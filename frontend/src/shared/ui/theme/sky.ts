// Scene-specific semantic palette; independent of patient text and doctor tokens.
export const skyPalette = {
  day: { zenith: '#197ac2', middle: '#4AA8E5', horizon: '#e8dcdf', cloud: '#fffaf1', shadow: '#7e9ebc', hill: '#649075', near: '#35694c' },
  dawn: { zenith: '#6b7fad', middle: '#c3b2d3', horizon: '#f7dba9', cloud: '#f9dbe0', shadow: '#9a87ab', hill: '#687e80', near: '#3f6652' },
  sunset: { zenith: '#777faf', middle: '#cfb5cf', horizon: '#ffc78c', cloud: '#ffd0aa', shadow: '#a382a1', hill: '#697d83', near: '#3d5c4c' },
  night: { zenith: '#101732', middle: '#252a50', horizon: '#666b8e', cloud: '#aba6cd', shadow: '#424362', hill: '#394c59', near: '#203e35' },
  auroraLilac: '#ad8bc9', auroraTeal: '#74b8b2', auroraGreen: '#98c49b',
  starCool: '#cee6ff', starWarm: '#fff0cb', firefly: '#d1ee9e',
  flowerLilac: '#c7ace9', flowerWhite: '#fffaf1', flowerBlue: '#a6cfeb',
  cloudWhite: '#FFFFFF', cloudWarm: '#FFF8EE', cloudBelly: '#B7C3DD', cloudDeep: '#9FAACB',
  cloudLighting: {
    day: { cloud: '#FFFFFF', light: '#FFF4E0', intensity: 2, opacity: .9 },
    dawn: { cloud: '#F3E8FF', light: '#FFD6E4', intensity: 2, opacity: .9 },
    sunset: { cloud: '#FFE3D3', light: '#FFB98A', intensity: 2, opacity: .9 },
    night: { cloud: '#8F88B8', light: '#C9C2FF', intensity: .25, opacity: .35 },
  },
  cloudSkyLight: '#BFE3FB', cloudGroundLight: '#6DBE95',
} as const;
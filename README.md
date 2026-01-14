# Pro Tuner 🎸

A professional guitar and bass tuner Progressive Web App (PWA) built with React and TypeScript.

## Features

- **Universal Tuner**: Detects notes for 6-string, 7-string, 8-string guitars, bass, ukulele, and more
- **Real-time Pitch Detection**: Uses Web Audio API for accurate frequency analysis
- **Visual Feedback**: Clean, intuitive interface showing pitch accuracy
- **PWA Support**: Install on your phone's home screen for native-like experience
- **Works Offline**: Once loaded, works without internet connection

## Supported Instruments

- 6-String Guitar (Standard)
- 7-String Guitar
- 8-String Guitar
- 4-String Bass
- 5-String Bass
- 12-String Guitar
- Ukulele
- Alternate Tunings (Drop D, DADGAD, Open G)

## Getting Started

### Prerequisites

- Node.js 18+ installed

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Installing on Your Phone

1. Deploy to a hosting service (Vercel, Netlify, GitHub Pages)
2. Open the URL in Safari (iOS) or Chrome (Android)
3. Tap "Add to Home Screen"
4. The app will appear as an icon on your home screen!

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Web Audio API
- PWA (vite-plugin-pwa)

## License

MIT

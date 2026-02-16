# Electron React Hello World

A simple Electron + React.js hello world application using Electron Forge.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Run the app in development mode:

```bash
npm run dev
```

This will:
- Start Electron Forge with Vite
- Launch the desktop app automatically
- Enable hot module replacement

### Build

Build the app for production:

```bash
npm run build
```

### Package

Package the app:

```bash
npm run package
```

### Make Distributables

Create distributable packages:

```bash
npm run make
```

## Project Structure

```
cop-viewer-by-puru/
├── src/
│   ├── main.ts        # Electron main process
│   ├── preload.ts     # Preload scripts
│   ├── renderer.tsx   # React entry point
│   ├── App.tsx        # React main component
│   ├── index.css      # Global styles
│   └── types/         # TypeScript type definitions
├── index.html         # HTML entry point
├── package.json
├── tsconfig.json
├── forge.config.ts    # Electron Forge configuration
├── vite.main.config.ts      # Vite config for main process
├── vite.preload.config.ts   # Vite config for preload
├── vite.renderer.config.ts  # Vite config for renderer
├── forge.env.d.ts     # Electron Forge TypeScript definitions
├── tailwind.config.js # Tailwind CSS configuration
└── postcss.config.js  # PostCSS configuration
```

## Technologies

- **Electron** - Desktop app framework
- **Electron Forge** - Complete tooling ecosystem for Electron
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework


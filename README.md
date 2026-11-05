# Arch Pad – Architectural CAD Sketchbook

A professional, offline-first digital architectural sketchbook and CAD drafting workspace designed for architects, engineers, interior designers, and students.

Built as a Progressive Web App (PWA) and Trusted Web Activity (TWA), Arch Pad lets you sketch floor plans, capture site dimensions, draft architectural details, and export presentation cards anywhere—with or without an internet connection.

---

## Features

- **Architectural Drafting Canvas**: High-performance HTML5 Canvas with sub-pixel rendering, smooth pen strokes, and erasing capabilities.
- **Geometric Primitives & Annotations**: Quick-draw lines, rectangles, circles/ellipses, directional arrows, and technical text annotations.
- **CAD Scale Selection**: Industry-standard architectural scales including `1:20`, `1:50`, `1:100`, `1:200`, `1:500`, `1:1000`, and `NTS` (Not to Scale).
- **Dynamic Background Grid**: Scaled multi-tier grid with major axes and subtle subdivisions that adapt fluidly during two-finger pinch-to-zoom and canvas panning.
- **Offline-First Storage**: All projects, drawings, and metadata are saved locally on your device via client-side IndexedDB with zero cloud dependency required.
- **Comprehensive Export Options**:
  - High-resolution PNG and JPEG with branded drafting border, project title, scale badge, and date stamp.
  - Print-ready PDF output.
  - Portable `.voxpad` JSON backup archive for multi-device importing and sharing.
- **Standalone PWA & TWA Ready**: Fully compliant with Android Trusted Web Activities (TWA) and desktop/mobile PWA standalone installation.
- **Hardware & Gesture Navigation**: Built-in Android gesture and back button handling with native double-tap exit confirmation.
- **Optional Cloud Backup**: Optional Google Firebase integration for cross-device cloud project synchronization.

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite
- **Styling**: Tailwind CSS + Custom CAD themes (Dark charcoal & Blueprint light modes)
- **Local Persistence**: IndexedDB API (`idb`)
- **PWA & Offline Engine**: Service Worker Cache API + Web App Manifest
- **Cloud Backend**: Google Firebase (Authentication & Cloud Firestore)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm` or `bun`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SachinCodeTech/Arch-Pad-Pro.git
   cd Arch-Pad-Pro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Preview the production build locally:
   ```bash
   npm run preview
   ```

---

## Privacy & Security

Arch Pad adheres to strict local-first privacy standards:
- All drawings, dimensions, and project files remain stored in the device's local sandbox storage.
- No third-party tracking, advertising SDKs, or invasive telemetry.
- Optional cloud sync requires explicit user sign-in.
- For complete details, see [`public/privacy.html`](public/privacy.html) and [`public/terms.html`](public/terms.html).

---

## Author & Support

- **Developer**: Sheth Sachin D / CodeTech App Store
- **Repository**: [https://github.com/SachinCodeTech/Arch-Pad-Pro](https://github.com/SachinCodeTech/Arch-Pad-Pro)
- **Live Application**: [https://arch-pad-pro.vercel.app](https://arch-pad-pro.vercel.app)
- **Support**: `codetech.appstore@gmail.com`

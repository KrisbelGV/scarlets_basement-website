<p align="center">
  <img src="assets/logo.png" alt="Scarlet's Basement Logo" width="200">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vanilla-js-yellow" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License MIT">
  <img src="https://img.shields.io/badge/deploy-GitHub%20Pages-black" alt="Deploy GitHub Pages">
</p>

# Scarlet's Basement — Web Client

Frontend client for the Scarlet's Basement proxy. A lightweight, dependency-free interface that connects to the Scratch public API through the proxy server, providing advanced search, project indexing checks, studio discovery, and a personalized following feed.

Created by [KrisbelGV](https://github.com/KrisbelGV) as part of the educational and learning project "Scarlet's Basement" available on the [Scarlet's Basement Website](https://krisbelgv.github.io/scarlet-basement-website/).

> *"Scarlet's Basement is an independent companion tool designed to enhance the Scratch experience. It acts as a filtering layer on top of Scratch's public information, offering advanced search, project indexing checks, studio discovery, and community-focused features that help users explore and share content more effectively."*
>
> — About page

> **Note:** Except for some third-party assets (detailed in the [Structure](#structure) section), all code, illustrations, visual design, characters (including Scarlet), and the overall concept of this project are original creations by [KrisbelGV](https://github.com/KrisbelGV).

## Features
- 🔍 **Advanced search** — Search projects across all of Scratch or filter by your following, with support for discard words and multiple profiles
- 📂 **Find a studio** — Discover studios by project ID and optional tags
- 📊 **Is it indexed?** — Check speculative indexing status of any Scratch project
- 👥 **A new view** — Browse recent projects from users you follow
- 👤 **User dashboard** — View your Scratch profile statistics at a glance
- 🌙 **Dark mode** — Toggle between light and dark themes with smooth transitions
- 📱 **Responsive design** — Fully functional on mobile and desktop
- 🚫 **No dependencies** — Built with vanilla HTML, CSS, and JavaScript

## Tech Stack
| Category | Technology |
|----------|------------|
| Languages | HTML5, CSS3, JavaScript (ES6+) |
| Storage | localStorage, sessionStorage |
| API | Scarlet's Basement Proxy |
| Deploy | GitHub Pages |
| Assets | Scratch public CDN |

## Table of contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Structure](#structure)
  - [Directories](#directories)
  - [Page overview](#page-overview)
- [Endpoints consumed](#endpoints-consumed)
- [Privacy](#privacy)
- [License](#license)
- [How to contribute?](#how-to-contribute)

## Installation
1. Clone this repository

    ```bash
    git clone https://github.com/KrisbelGV/scarlets-basement-website.git
    cd scarlets-basement-website
    ```

2. Open `index.html` in your browser, or serve with any static server

    ```bash
    npx serve .
    ```

3. No build step or dependencies required

## Structure

### Directories
```
scarlets-basement-website/
│
├── index.html                  # Homepage with login and FAQ
│
├── pages/
│   ├── about.html              # Privacy, terms, and project info
│   ├── search.html             # Advanced search
│   ├── studio.html             # Studio finder
│   ├── indexed.html            # Indexing status checker
│   ├── view.html               # Following feed (A new view)
│   └── settings.html           # Dark mode toggle and cache management
│
├── css/
│   ├── main.css                # CSS variables, dark mode, global styles
│   ├── responsive.css          # Mobile breakpoints
│   └── components/
│       ├── header.css          # Navigation bar
│       ├── footer.css          # Footer
│       ├── features.css        # Feature cards (homepage)
│       ├── modal.css           # First-visit modal
│       ├── login.css           # Login form and user summary
│       ├── faq.css             # Accordion FAQ
│       ├── alerts.css          # Info and security alerts
│       ├── projects.css        # Project cards, studio cards, loaders
│       ├── search.css          # Advanced search form
│       ├── studios.css         # Studio search form
│       ├── indexed.css         # Indexed status card
│       ├── settings.css        # Settings page
│       └── about.css           # About page
│
├── js/
│   ├── api.js                  # API client (fetch wrapper with retry logic)
│   ├── api-config.js           # Rate limiting, global locks, alerts
│   ├── dark-mode-preload.js    # Dark mode preload (prevents flash)
│   ├── dark-mode.js            # Dark mode controller
│   ├── navigation.js           # Mobile menu and dropdown
│   ├── modal.js                # First-visit modal
│   ├── animations.js           # FAQ accordion
│   ├── login.js                # Login flow and user summary
│   ├── main.js                 # Shared initialization
│   ├── projects.js             # Project cards, loaders, following feed
│   ├── search.js               # Advanced search logic
│   ├── studios.js              # Studio search logic
│   ├── indexed.js              # Indexed check logic
│   └── settings.js             # Settings page logic
│
└── assets/
    ├── logo.png                # Original illustration by KrisbelGV
    ├── favicon.png             # Original illustration by KrisbelGV
    ├── *.svg                   # Original icons by KrisbelGV
    └── (third-party assets listed below)
```

### Third-party assets
The following assets are the only ones not created by the author:

| Asset | Source | License |
|-------|--------|---------|
| `assets/hamburger.svg` | [Feather Icons](https://feathericons.com/) | MIT |
| `assets/x.svg` | [Feather Icons](https://feathericons.com/) | MIT |
| `assets/x_yellow.svg` | [Feather Icons](https://feathericons.com/) (recolored) | MIT |
| `assets/github.svg` | [Simple Icons](https://simpleicons.org/) | CC0 1.0 |
| `assets/scratch_white_favicon.svg` | Scratch (official favicon) | Scratch branding |
| `assets/scratch_head.svg` | Scratch (edited SVG of Scratch the Cat) | Scratch branding |
| `assets/star.svg` | Scratch Web client repository | Scratch branding |
| `assets/heart.svg` | Scratch Web client repository | Scratch branding |
| `assets/view.svg` | Scratch Web client repository (edited, recolored to green) | Scratch branding |
| `assets/studio.svg` | Scratch Web client repository | Scratch branding |
| Project thumbnails and profile images | Scratch CDN | Scratch Terms of Use |

**Note on derivative assets:**  
The following assets were created by [KrisbelGV](https://github.com/KrisbelGV) but incorporate Scratch branding elements:
- `assets/default_profile.svg` — Higher-quality edit of the default Scratch profile silhouette
- `assets/default_thumbnail.png` — Background image that says "available in" with the Scratch logo below

All other assets — including the Scarlet character, logo, favicon, icons, and illustrations — are original creations by [KrisbelGV](https://github.com/KrisbelGV).

### Page overview
| Page | Description | Requires login? |
|------|-------------|:--------------:|
| index.html | Homepage with login, feature cards, and FAQ | Optional |
| search.html | Advanced search with filters (mode, profiles, discard words) | For profile search |
| studio.html | Find studios by project ID and tags | No |
| indexed.html | Check if a project is indexed | No |
| view.html | Browse projects from your following feed | Yes |
| settings.html | Dark mode toggle, cache statistics, clear data | No |
| about.html | Privacy policy, terms of service, transparency | No |

## Endpoints consumed
This client interacts exclusively with the [Scarlet's Basement Proxy](https://github.com/KrisbelGV/scarlets_basement-proxy).

| Endpoint | Used by | Purpose |
|----------|---------|---------|
| `/api/userdata/:username` | index.html | Fetch user profile statistics |
| `/api/search` | search.html | Search projects with filters |
| `/api/findastudio/:projectid` | studio.html | Find studios by project ID |
| `/api/isitindex/:projectid` | indexed.html | Check project indexing status |
| `/api/anewview/:username` | view.html | Get following feed |

## Privacy
Scarlet's Basement stores all data exclusively in your browser using `localStorage` and `sessionStorage`. No tracking, no cookies, no third-party analytics.

| Data stored | Storage | Expiration |
|-------------|---------|------------|
| Search results cache | sessionStorage | 30 minutes |
| Studio results cache | sessionStorage | 30 minutes |
| Username and profile stats | localStorage | 24 hours |
| Dark mode preference | localStorage | Never |
| Dismissed alerts | localStorage | Never |
| Following feed cache | localStorage | 24 hours |
| Global retry timestamp | localStorage | 24 hours |

For full details, see the [About page](https://krisbelgv.github.io/scarlet-basement-website/pages/about.html).

## License

This project is licensed under the MIT License without warranty or liability for its misuse. A copy is available in this repository, and further information, along with the original, can be found on its website.

## How to contribute?
As an open-source educational project, we are more than happy to receive contributions/corrections.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feat/feature`)
5. Open a Pull Request

For more detailed tracking of bug fixes or updates and the motivations behind them, we recommend following our news thread in the Scratch discussion forum.

---

<p align="center">
  <strong>Scarlet's Basement</strong> is not affiliated, associated, authorized, endorsed by, or in any way officially connected to Scratch or the Scratch Foundation.
</p>
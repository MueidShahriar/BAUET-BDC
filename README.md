<div align="center">
  <img src="public/image/BAUET%20BDC_Official%20Logo.png" alt="BAUET Blood Donation Club logo" width="104" />

  <h1>BAUET Blood Donation Club</h1>

  <p><strong>Donate Blood. Save Lives. Build a Stronger Community.</strong></p>

  <p>
    A community-driven platform that connects voluntary blood donors with people in need across the BAUET community.
  </p>

  <p>
    <a href="https://blood-donation-community.vercel.app/">
      <img src="https://img.shields.io/badge/Live%20Application-Open%20Website-16a34a?style=for-the-badge&logo=vercel&logoColor=white" alt="Open live application" />
    </a>
    <a href="https://github.com/mueidshahriar/Blood-Donation-Community">
      <img src="https://img.shields.io/badge/GitHub-Source%20Repository-181717?style=for-the-badge&logo=github&logoColor=white" alt="View source repository" />
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Version-Unreleased-2563eb?style=flat-square" alt="Version: unreleased" />
    <img src="https://img.shields.io/badge/License-Not%20Specified-lightgrey?style=flat-square" alt="License not specified" />
    <img src="https://img.shields.io/badge/PWA-Supported-6d28d9?style=flat-square&logo=pwa" alt="Progressive Web App supported" />
    <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js and Express backend" />
    <img src="https://img.shields.io/badge/Database-Firebase-ffca28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase database" />
  </p>
</div>

---

## Overview

**BAUET Blood Donation Club (BAUET BDC)** is a responsive web platform built to make voluntary blood donation coordination easier, faster, and more accessible within the Bangladesh Army University of Engineering & Technology (BAUET) community.

The platform brings donors and people seeking blood together through donor registration, blood group search, donation activity, events, and administrative tools. It also provides community insights and an optional AI assistant to help users navigate the platform and find general blood donation information.

The mission is simple: **help people find potential donors faster and encourage a stronger culture of voluntary blood donation.**

> **Live application:** [blood-donation-community.vercel.app](https://blood-donation-community.vercel.app/)  
> **Source repository:** [github.com/mueidshahriar/Blood-Donation-Community](https://github.com/mueidshahriar/Blood-Donation-Community)

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Application Pages](#application-pages)
- [AI Assistant](#ai-assistant)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Available Commands](#available-commands)
- [Deployment](#deployment)
- [PWA Installation](#pwa-installation)
- [Security and Privacy](#security-and-privacy)
- [Medical and Emergency Disclaimer](#medical-and-emergency-disclaimer)
- [Versioning and Releases](#versioning-and-releases)
- [Contributing](#contributing)
- [Support and Contact](#support-and-contact)
- [License](#license)

## Features

### Donor registration and profiles
- Register as a voluntary blood donor.
- Create and manage donor profiles.
- Maintain relevant donor details and donation activity.
- Access donor cards and donation certificates.

### Donor discovery
- Search for potential donors by blood group.
- Narrow donor searches by location.
- View donor information to help coordinate contact.
- Use eligibility information as a general reference.

### Donation activities and events
- Explore upcoming blood donation events.
- View recent donation records and community activity.
- Follow donation activity through community statistics.
- Recognize active donors through the leaderboard.

### Administration dashboard
- Manage registered members and donor information.
- Create and manage blood donation events.
- Record and review donation activity.
- Review feedback submitted by users.
- Monitor community information through dashboard statistics and charts.

### User experience
- Responsive interface for desktop, tablet, and mobile.
- English and Bangla language support.
- Progressive Web App (PWA) installation on supported devices.
- Service worker caching for supported offline experiences.

### Optional AI assistant
- Ask general questions about blood donation.
- Get help navigating BAUET BDC features.
- Interact in English, Bangla, or Banglish.
- Receive responses based on conversation and relevant website context.

## Technology Stack

| Area | Technologies |
|:---|:---|
| Frontend | HTML5, CSS3, JavaScript |
| UI and styling | Bootstrap, Tailwind CSS |
| Authentication | Firebase Authentication |
| Realtime data | Firebase Realtime Database |
| Charts and insights | Chart.js |
| Backend | Node.js, Express.js |
| AI integration | Google Generative AI |
| Progressive Web App | Web App Manifest, Service Worker |

## Application Pages

| Page | Description |
|:---|:---|
| `index.html` | Homepage, community overview, statistics, and recent activity |
| `pages/join.html` | Donor registration |
| `pages/search.html` | Donor search |
| `pages/events.html` | Blood donation events |
| `pages/profile.html` | Donor profile management |
| `pages/admin.html` | Administrative dashboard |
| `pages/leaderboard.html` | Donor leaderboard |
| `pages/donationGuide.html` | Blood donation guidance |

## AI Assistant

BAUET BDC provides an optional AI assistant powered by the configured Google Generative AI service.

The assistant runs through the Node.js and Express backend. It can use conversation history and relevant website context to answer questions about the platform and provide general information.

**Requirements**
- A working Node.js backend.
- A valid `GEMINI_API_KEY` configured on the server.

**Limitations**
- The assistant does not browse the live internet.
- It does not replace medical professionals or official blood donation screening.
- AI-generated information may be incomplete or outdated.
- Time-sensitive medical information must be checked with a qualified professional or reliable current source.

The project does not fine-tune its own AI model. Responses are generated by the configured Google Generative AI service.

## Project Structure

```text
Blood-Donation-Community/
│
├── assets/
│   ├── css/                         # Shared and page-specific styles
│   └── js/
│       ├── modules/                 # Shared application modules
│       └── ...                      # Page controllers and other scripts
│
├── firebase-rules/
│   ├── realtime-database.rules.json # Firebase Realtime Database rules
│   └── storage.rules                # Private requisition document rules
│
├── image/                           # Logos, icons, and image assets
│
├── pages/                           # Public, donor, and admin pages
│
├── index.html                       # Main application page
├── manifest.webmanifest             # PWA metadata
├── server.js                        # Node.js server and AI endpoint
├── service-worker.js                # PWA caching and offline support
├── package.json                     # Dependencies and npm scripts
└── README.md
```

## Getting Started

Follow these steps to run the project locally.

### Prerequisites

Install or prepare the following:

- [Node.js](https://nodejs.org/) (use a currently supported LTS release).
- npm (included with Node.js).
- A [Firebase project](https://console.firebase.google.com/).
- A Google Generative AI API key, only if you want to enable the AI assistant.

### 1. Clone the repository

```bash
git clone https://github.com/mueidshahriar/Blood-Donation-Community.git

cd Blood-Donation-Community
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

In the Firebase Console:

1. Create or select a Firebase project.
2. Register a Firebase web application.
3. Enable Email/Password Authentication.
4. Create and enable Firebase Realtime Database.
5. Configure the web app settings in:

```text
assets/js/modules/firebase-config.js
```

Review the database rules in:

```text
firebase-rules/realtime-database.rules.json
```

Apply rules that match your deployment and access-control requirements. Do not deploy permissive test rules to production.

### 4. Configure the blood request service

The public RBC request form uses the existing Firebase project, but all submissions and status changes pass through the trusted Node.js backend. Copy `.env.example` to `.env` and configure one Firebase Admin credential method:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_DATABASE_URL=https://blood-donation-community-a1eb2-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=blood-donation-community-a1eb2.appspot.com
```

Never add the service-account JSON to frontend code or commit it to Git. Enable Firebase Storage, then deploy both rule files:

```bash
firebase deploy --only database,storage
```

For App Check, register the deployed web domain with reCAPTCHA v3 and set:

```env
FIREBASE_APP_CHECK_SITE_KEY=your_public_recaptcha_v3_site_key
FIREBASE_APP_CHECK_ENFORCED=true
```

For scheduled expiry, configure the hosting provider or Cloud Scheduler to call `POST /api/blood-requests/expire` with `Authorization: Bearer <CRON_SECRET>` and set the same `CRON_SECRET` on the server. The admin dashboard also checks for expired requests when an administrator opens it.

### 5. Configure the AI assistant (optional)

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_google_generative_ai_api_key
PORT=3000
```

Keep this file private. Do not commit API keys or other secrets to Git.

If the AI assistant is not needed, you can skip this step. The main website can run without the Gemini API key, but AI features will be unavailable.

### 6. Start the application

Development command:

```bash
npm run dev
```

Alternative start command:

```bash
npm start
```

### 7. Open the local application

Visit:

```text
http://localhost:3000
```

If the configured port is different, use the port set in your environment.

## Configuration

| Setting | Purpose | Required |
|:---|:---|:---|
| Firebase web configuration | Connects the frontend to Firebase services | Yes |
| Firebase Authentication | Supports account registration and sign-in | Yes |
| Firebase Realtime Database | Stores application data | Yes |
| Firebase Storage | Stores private requisition slips | Yes for document uploads |
| Firebase Admin service account or Application Default Credentials | Authorizes secure request APIs | Yes for blood requests |
| `FIREBASE_APP_CHECK_SITE_KEY` | Enables reCAPTCHA-based App Check | Recommended |
| `CRON_SECRET` and a scheduler | Runs automatic request expiry without an active admin session | Recommended |
| `GEMINI_API_KEY` | Enables the optional AI assistant | No |
| `PORT` | Sets the Node.js server port | No, defaults to the configured server value |

**Important:** Firebase client configuration is intended for browser use, but database access must still be protected with correct Firebase Security Rules. Never put private server credentials or the Gemini API key in frontend code.

## Available Commands

| Command | Description |
|:---|:---|
| `npm install` | Install project dependencies |
| `npm run dev` | Start the development server |
| `npm run build:css` | Rebuild the checked-in Tailwind stylesheet after changing utility classes |
| `npm start` | Start the Node.js server |

## Deployment

The public application is available at:

**[https://blood-donation-community.vercel.app/](https://blood-donation-community.vercel.app/)**

The project includes a Node.js server that serves application files and provides the `/chat` endpoint for the AI assistant.

For deployment:

1. Push the project to the intended GitHub repository.
2. Configure Firebase Authentication and Realtime Database.
3. Apply production-ready Firebase Security Rules.
4. Configure server environment variables in the hosting provider.
5. Deploy the Node.js server to a compatible hosting environment.
6. Ensure frontend chat requests reach the deployed `/chat` endpoint.
7. Test registration, sign-in, donor search, events, admin access, and AI functionality after deployment.

If the frontend and backend are hosted separately, configure the frontend to call the correct backend URL. Do not assume that deploying static frontend files also deploys the Node.js AI endpoint.

## PWA Installation

BAUET BDC supports installation as a Progressive Web App on compatible browsers.

### Android and desktop
1. Open the [live application](https://blood-donation-community.vercel.app/).
2. Open the browser menu.
3. Select **Install App** or **Add to Home Screen**, if available.
4. Follow the browser's installation prompt.

### iPhone and iPad
1. Open the live application in Safari.
2. Tap the **Share** button.
3. Select **Add to Home Screen**.
4. Confirm the installation.

PWA installation and offline behavior depend on browser support, HTTPS, service worker configuration, and the resources cached by the application.

## Security and Privacy

The platform may process personal donor information. Protecting that information is essential.

- Apply Firebase Realtime Database Security Rules before production deployment.
- Restrict administrative permissions to trusted accounts.
- Collect and display only information needed for donor coordination.
- Do not expose private donor information publicly without an appropriate purpose and consent.
- Keep API keys, service-account credentials, and `.env` files out of source control.
- Validate and authorize sensitive operations on the server or through secure Firebase rules.
- Review access permissions whenever administrators or project maintainers change.
- Use HTTPS for deployed environments.
- Provide a clear process for handling requests to correct or remove personal information.

If you discover a security issue, do not publish sensitive exploit details in a public issue. Contact the project maintainer privately.

## Medical and Emergency Disclaimer

BAUET Blood Donation Club is a donor discovery and community coordination platform. It is **not** a hospital, blood bank, diagnostic laboratory, or emergency medical service.

The platform does not independently verify blood compatibility, donor eligibility, or medical suitability. Final donor screening, compatibility testing, and donation decisions must be handled by qualified healthcare professionals and the relevant medical facility.

For emergencies, contact a hospital or appropriate emergency medical service directly. Do not rely on this website as the only source of emergency assistance.

## Versioning and Releases

The README currently identifies the project as **Unreleased** because no confirmed release tag or application version was provided.

When publishing a stable release:

1. Choose a version using [Semantic Versioning](https://semver.org/), such as `1.0.0`.
2. Create a Git tag, for example `v1.0.0`.
3. Publish a GitHub Release with a summary of changes.
4. Update the version badge and release notes in this README.

Suggested version format:

- `MAJOR`: incompatible changes.
- `MINOR`: new backward-compatible functionality.
- `PATCH`: backward-compatible fixes.

Do not treat the example version as the current application version until an actual release is published.

## Contributing

Contributions, bug reports, and suggestions are welcome.

To contribute:

1. Fork the repository.
2. Create a focused branch for your change.
3. Make your changes and keep the scope clear.
4. Test the affected features.
5. Commit your work with a descriptive message.
6. Open a pull request explaining the change and how it was tested.

For bugs or feature suggestions, use the repository's [Issues](https://github.com/mueidshahriar/Blood-Donation-Community/issues) page, if enabled.

## Support and Contact

For questions about the club or the application:

**BAUET Blood Donation Club**
- Website: [blood-donation-community.vercel.app](https://blood-donation-community.vercel.app/)
- Email: [bauet.bdc@gmail.com](mailto:bauet.bdc@gmail.com)
- Phone: [+880 1712-460423](tel:+8801712460423)
- LinkedIn: [BAUET Blood Donation Club](https://www.linkedin.com/company/bauet-blood-donation-club)

**Project Maintainer: Md. Mueid Shahriar**
- Email: [mdmueidshahriar16@gmail.com](mailto:mdmueidshahriar16@gmail.com)
- GitHub: [@mueidshahriar](https://github.com/mueidshahriar)

## License

**No open-source license has been specified in the project information provided for this README.**

Until the project owner adds a `LICENSE` file, the project should be treated as having no granted open-source reuse permissions. Public availability on GitHub does not, by itself, grant permission to copy, modify, redistribute, or use the code.

If the intention is to publish the project as open source, the maintainer should select and add an appropriate license. The [MIT License](https://choosealicense.com/licenses/mit/) is one common permissive option, but it should only be added after the project owner approves it.

---

<div align="center">
  <h3>Every Drop Counts. Every Donor Matters.</h3>
  <p><strong>Together, We Can Save Lives.</strong></p>
  <p>Built with care for the BAUET community.</p>
  <p>
    <a href="https://blood-donation-community.vercel.app/">Visit the Live Application</a>
    &nbsp; • &nbsp;
    <a href="https://github.com/mueidshahriar/Blood-Donation-Community">Explore the Source Code</a>
  </p>
</div>

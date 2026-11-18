import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./modules/firebase-config.js";
import { initVisitorTracker } from "./modules/visitor-tracker.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
initVisitorTracker(getDatabase(app));

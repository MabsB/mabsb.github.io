/*
 * PROJECTS
 * --------
 * Everything in the "Projects" section comes from this file. The list order is
 * the display order.
 *
 * Fields
 *   id          Short unique name, used for links like #smart-gate.
 *   visible     false hides a project without deleting it.
 *   featured    true gives the project the large, full-width layout.
 *   status      "live" | "built" | "prototype" | "in-progress" | "coursework" | null
 *               Use "live" only when the public link works. null shows no badge.
 *   areas       Any of "web", "iot", "mobile", "ai", "networking".
 *               These drive the filter buttons above the projects.
 *   built       Things that exist in the project today. Keep them factual.
 *   flow        (optional) Steps drawn as a signal chain on a featured project:
 *               [{ step: "Input", label: "RFID tag" }, ...]. highlight: true
 *               marks the step to emphasize.
 *   spec        Rules or requirements that were specified (shown with a dashed
 *               border so visitors can tell them apart from what is built).
 *   links       Only public links that work. kind: "live" | "source" | "demo" | "video"
 *   images      Screenshots in assets/img/projects/, e.g.
 *               { src: "assets/img/projects/mrt-bigasan-shop.webp",
 *                 alt: "MRT Bigasan shop page listing rice products",
 *                 width: 1280, height: 800 }
 *
 * Privacy: never add screenshots or text that show real residents, customers,
 * RFID tag numbers, passwords, API keys, or Firebase configuration.
 */
(window.PORTFOLIO = window.PORTFOLIO || {}).projects = [
  {
    id: "smart-gate",
    visible: true,
    featured: true,
    title: "Smart Gate",
    subtitle:
      "IoT-enabled resident management system with UHF RFID access control and real-time financial monitoring",
    year: "2026",
    kind: "IoT and web application",
    status: "built",
    areas: ["iot", "web"],
    summary:
      "A resident management platform that ties gate access to resident records and monthly-dues billing. A UHF RFID reader on an ESP32 handles resident and visitor access at the gate, while administrators and guards work from Firebase-backed web dashboards.",
    sections: [
      {
        heading: "The problem",
        text:
          "A residential community has to control who passes the gate, keep resident and RFID records up to date, and track who has paid their monthly dues. Smart Gate brings all three into one system."
      },
      {
        heading: "How it works",
        text:
          "A UHF RFID reader connected to an ESP32 DevKit V1 reads tags at the gate, and a servo motor operates the gate mechanism. The ESP32 is integrated with a web application built on Firebase Authentication and Cloud Firestore, where administrators register residents and their RFID tags."
      }
    ],
    // The signal chain drawn at the top of the featured card, in order.
    flow: [
      { step: "Input", label: "RFID tag" },
      { step: "Read", label: "UHF reader" },
      { step: "Control", label: "ESP32 + servo", highlight: true },
      { step: "Sync", label: "Firebase" },
      { step: "Manage", label: "Dashboards" }
    ],
    builtHeading: "What I built",
    built: [
      "A web application for resident records, UHF RFID registration, user management, and administrative monitoring, built on Firebase and Cloud Firestore",
      "Role-based authentication and access management for administrators and guards",
      "Automated monthly dues and fee generation: billing schedules, payment-status tracking, penalties, and statements of account (SOA)",
      "A GCash payment-proof workflow: submission, approval or rejection, receipt generation, and financial monitoring",
      "Integration with the UHF RFID reader and ESP32 for RFID-based resident and visitor access",
      "Administrative and gate-management dashboards for residents, payments, RFID records, and system operations"
    ],
    spec: {
      heading: "Billing and access rules",
      badge: "As specified",
      items: [
        { label: "Registration", value: "Administrators create resident records and register RFID tags; residents can't self-register" },
        { label: "Monthly dues", value: "₱300" },
        { label: "Due date", value: "The 6th of each month" },
        { label: "Overdue", value: "From the 7th" },
        { label: "Late penalty", value: "5% on overdue payments" }
      ]
    },
    stack: [
      "ESP32 DevKit V1",
      "UHF RFID",
      "Servo motor",
      "Firebase Authentication",
      "Cloud Firestore",
      "Role-based access control"
    ],
    links: [],
    images: []
  },

  {
    id: "mrt-bigasan",
    visible: true,
    featured: false,
    title: "MRT Bigasan",
    subtitle: "E-commerce website for a rice retailer",
    year: "2025",
    kind: "Web application",
    status: "live",
    areas: ["web"],
    summary:
      "An online store for a rice-selling business. Customers browse the shop, place orders, and review them under My Orders, while staff run the store through role-based tools.",
    builtHeading: "What I built",
    built: [
      "A database-driven storefront using HTML, CSS, JavaScript, and Firebase/Cloud Firestore",
      "Customer and administrative functions with CRUD operations and role-based workflows",
      "GCash and cash-on-delivery payment workflows",
      "Deployment on Firebase Hosting, configured with Cloudflare"
    ],
    rolesHeading: "User roles",
    // Add "Rider" here once you've confirmed the rider role is part of the live system.
    roles: ["Administrator", "Cashier", "Customer"],
    stack: ["HTML", "CSS", "JavaScript", "Firebase", "Cloud Firestore", "Firebase Hosting", "Cloudflare"],
    links: [{ label: "Visit the live site", url: "https://mrtbigasan.com/", kind: "live" }],
    images: []
  },

  {
    id: "study-buddy",
    visible: true,
    featured: false,
    title: "Study Buddy",
    subtitle: "Android app that monitors and controls an Arduino device over Bluetooth",
    year: "2025",
    kind: "Android and IoT",
    status: null,
    areas: ["mobile", "iot"],
    summary:
      "An Android app written in Java that connects to an Arduino-based Study Buddy device over classic Bluetooth. It shows temperature and light-level readings, switches a lamp on and off, and displays the time.",
    builtHeading: "What the app does",
    built: [
      "Finds the paired Bluetooth module (for example an HC-05 or HC-06) and connects over RFCOMM (Serial Port Profile)",
      "Requests readings with text commands and parses pipe-delimited replies for temperature (°C and °F), light level, and lamp state",
      "Separate screens for the dashboard, temperature, light level, lamp control, and clock; the sensor screens refresh every 1–2 seconds",
      "Checks Bluetooth support, prompts to turn Bluetooth on, and requests Android 12+ Bluetooth permissions"
    ],
    code: {
      heading: "Message format, from the source code",
      rows: [
        { label: "App sends", value: "GET_DATA, TOGGLE_LAMP" },
        { label: "Device replies", value: "TEMP:25.5|TEMP_F:77.9|LIGHT:65|LAMP:1" }
      ]
    },
    stack: ["Java", "Android SDK (API 24–35)", "Bluetooth RFCOMM", "Arduino", "Material Components"],
    links: [{ label: "View source on GitHub", url: "https://github.com/MabsB/Study-Buddy", kind: "source" }],
    note: "The repository holds the Android app. The Arduino firmware isn't included.",
    images: []
  },

  {
    // NOTEBUD: hidden until its details are filled in. There was no information
    // about it in the resume or on GitHub. Fill in the fields below with what the
    // app really does, then change visible to true.
    id: "notebud",
    visible: false,
    featured: false,
    title: "NoteBud",
    subtitle: "", // e.g. "Android app for ..."
    year: "",
    kind: "Android application",
    status: null,
    areas: ["mobile"],
    summary: "", // 1–2 sentences: what it is and who it is for
    sections: [
      // { heading: "The problem", text: "..." }
    ],
    builtHeading: "What I built",
    built: [
      // "Feature that exists in the app today"
    ],
    stack: [
      // Only what the app actually uses, e.g. "Java" or "Kotlin", "Room", "Firebase"
    ],
    links: [
      // { label: "View source on GitHub", url: "https://github.com/MabsB/...", kind: "source" }
    ],
    images: []
  }
];

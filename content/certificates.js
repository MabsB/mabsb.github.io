/*
 * CERTIFICATIONS AND TRAINING
 * ---------------------------
 * Everything in the "Certifications and training" section comes from this file.
 *
 * Categories (first list): the filter buttons. featured: true categories are
 * the ones visitors see first.
 *
 * Certificates (second list), one object per UNIQUE credential:
 *   title      The official title, copied from the certificate itself.
 *   category   One of the category ids below.
 *   type       "career-path" | "course" | "workshop" | "academic-event"
 *              | "certification" | "in-progress"
 *              Use "certification" only for a passed industry exam (e.g. CCST, CCNA).
 *              Use "in-progress" for anything unfinished, such as a Trailhead superbadge.
 *   issuer     Fill in ONLY from the certificate. null = not shown.
 *   year       Completion year from the certificate. null = not shown.
 *   file       Path to a PDF you've APPROVED for public view, e.g.
 *              "assets/certificates/cisco-endpoint-security.pdf". null = no button.
 *   verifyUrl  An official verification link (e.g. a Credly badge). null = no button.
 *
 * Before adding a file, read assets/certificates/README.md (privacy checklist).
 */
(window.PORTFOLIO = window.PORTFOLIO || {}).certificateCategories = [
  { id: "cybersecurity", label: "Cybersecurity", featured: true },
  { id: "networking", label: "Networking", featured: true },
  { id: "software", label: "Software development", featured: true },
  { id: "web-ux", label: "Web development & UX" },
  { id: "ai-ethics", label: "AI & business ethics" },
  { id: "professional", label: "Professional development" },
  { id: "productivity", label: "Productivity tools" },
  { id: "academic", label: "Academic events" }
];

window.PORTFOLIO.certificates = [
  // Cybersecurity
  { title: "Junior Cybersecurity Analyst Career Path", category: "cybersecurity", type: "career-path", issuer: "Cisco Networking Academy", year: null, file: null, verifyUrl: null },
  { title: "Introduction to Cybersecurity", category: "cybersecurity", type: "course", issuer: "Cisco Networking Academy", year: null, file: null, verifyUrl: null },
  { title: "Endpoint Security", category: "cybersecurity", type: "course", issuer: "Cisco Networking Academy", year: null, file: null, verifyUrl: null },
  { title: "Network Defense", category: "cybersecurity", type: "course", issuer: "Cisco Networking Academy", year: null, file: null, verifyUrl: null },
  { title: "Cyber Threat Management", category: "cybersecurity", type: "course", issuer: "Cisco Networking Academy", year: null, file: null, verifyUrl: null },
  { title: "Ethical Hacking: Introduction to Ethical Hacking", category: "cybersecurity", type: "course", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "Ethical Hacking: Scanning Networks", category: "cybersecurity", type: "course", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "Cybersecurity Foundations: Computer Forensics", category: "cybersecurity", type: "course", issuer: null, year: null, file: null, verifyUrl: null },

  // Networking
  { title: "Networking Basics", category: "networking", type: "course", issuer: "Cisco Networking Academy", year: null, file: null, verifyUrl: null },
  { title: "Networking Devices and Initial Configuration", category: "networking", type: "course", issuer: "Cisco Networking Academy", year: null, file: null, verifyUrl: null },
  { title: "Working with Computers and Devices", category: "networking", type: "course", issuer: null, year: null, file: null, verifyUrl: null },

  // Software development
  { title: "Complete Guide to Android Development with Kotlin for Beginners", category: "software", type: "course", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "Advanced Kotlin Database Development", category: "software", type: "course", issuer: null, year: null, file: null, verifyUrl: null },

  // Web development & UX
  { title: "Basic Web Development Workshop", category: "web-ux", type: "workshop", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "UX Foundations: Multidevice Design", category: "web-ux", type: "course", issuer: null, year: null, file: null, verifyUrl: null },

  // AI & business ethics
  { title: "Ethics in the Age of Generative AI", category: "ai-ethics", type: "course", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "Business Ethics for Sales Professionals", category: "ai-ethics", type: "course", issuer: null, year: null, file: null, verifyUrl: null },

  // Professional development
  { title: "Leadership Skills for the Future (2020)", category: "professional", type: "course", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "Introduction to Risk Management", category: "professional", type: "course", issuer: null, year: null, file: null, verifyUrl: null },

  // Productivity tools
  { title: "PowerPoint Essential Training: Microsoft 365 (2023)", category: "productivity", type: "course", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "PowerPoint Tips and Tricks (2019)", category: "productivity", type: "course", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "Excel Tips and Tricks (2023)", category: "productivity", type: "course", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "Excel Essential Training: Microsoft 365 (2022)", category: "productivity", type: "course", issuer: null, year: null, file: null, verifyUrl: null },
  { title: "Word Essential Training: Microsoft 365 (2023)", category: "productivity", type: "course", issuer: null, year: null, file: null, verifyUrl: null },

  // Academic events
  { title: "8th SoCIT Research Forum", category: "academic", type: "academic-event", issuer: null, year: null, file: null, verifyUrl: null }
];

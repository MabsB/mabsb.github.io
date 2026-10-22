/*
 * TECHNICAL SKILLS
 * ----------------
 * Everything in the "Technical skills" section comes from this file.
 *
 * Each group has a category name and a list of items.
 *   name      What visitors see.
 *   usedIn    Projects on this site where the skill was applied. Skills with
 *             usedIn get a dot, so recruiters can see where you used them.
 *             Use the exact project titles from content/projects.js.
 *   aliases   Extra search words (optional), e.g. "database" for MySQL.
 *   note      (on a group) one short line of context, shown under the name.
 *
 * Only list skills you can back up with a project, coursework, or a certificate.
 * Mark coursework-only skills honestly, as with "Kotlin (coursework)".
 * No percentages or "expert" levels.
 */
(window.PORTFOLIO = window.PORTFOLIO || {}).skills = [
  {
    category: "Programming languages",
    items: [
      { name: "Python" },
      { name: "Java", usedIn: ["Study Buddy"] },
      { name: "C#", aliases: ["c sharp", "csharp", ".net"] },
      { name: "JavaScript", usedIn: ["MRT Bigasan"], aliases: ["js"] },
      { name: "PHP" },
      { name: "SQL", aliases: ["database", "query"] }
    ]
  },
  {
    category: "Web development",
    items: [
      { name: "HTML5", usedIn: ["MRT Bigasan"], aliases: ["html"] },
      { name: "CSS3", usedIn: ["MRT Bigasan"], aliases: ["css"] },
      { name: "Frontend development", usedIn: ["MRT Bigasan"], aliases: ["front-end", "ui"] },
      { name: "Responsive web design", aliases: ["mobile-friendly", "responsive"] },
      { name: "Firebase Hosting", usedIn: ["MRT Bigasan"], aliases: ["deployment", "hosting"] },
      { name: "Cloudflare", usedIn: ["MRT Bigasan"], aliases: ["dns", "cdn", "deployment"] }
    ]
  },
  {
    category: "Databases and integration",
    items: [
      { name: "Cloud Firestore", usedIn: ["Smart Gate", "MRT Bigasan"], aliases: ["firebase", "database", "nosql"] },
      { name: "Firebase Authentication", usedIn: ["Smart Gate"], aliases: ["firebase", "auth", "login"] },
      { name: "MySQL", aliases: ["database", "sql"] },
      { name: "REST APIs", aliases: ["api", "http"] },
      { name: "CRUD operations", usedIn: ["Smart Gate", "MRT Bigasan"], aliases: ["database"] },
      { name: "Role-based access control", usedIn: ["Smart Gate", "MRT Bigasan"], aliases: ["rbac", "roles", "permissions", "security"] },
      { name: "Database management", aliases: ["database"] }
    ]
  },
  {
    category: "Mobile development",
    items: [
      { name: "Android development", usedIn: ["Study Buddy"], aliases: ["mobile", "app"] },
      { name: "Android Studio", usedIn: ["Study Buddy"], aliases: ["mobile", "ide"] },
      { name: "Bluetooth serial communication", usedIn: ["Study Buddy"], aliases: ["bluetooth", "rfcomm", "spp", "iot"] },
      { name: "Kotlin (coursework)", aliases: ["kotlin", "mobile"] }
    ]
  },
  {
    category: "AI, machine learning, and automation",
    items: [
      { name: "Generative AI", aliases: ["ai", "genai"] },
      { name: "Prompt engineering", aliases: ["ai", "llm"] },
      { name: "AI-assisted development", aliases: ["ai", "copilot"] },
      { name: "Machine learning fundamentals", aliases: ["ml", "ai"] },
      { name: "Computer vision", aliases: ["cv", "ai", "image"] },
      { name: "YOLO object detection", aliases: ["computer vision", "ai", "ml"] },
      { name: "Google Colab", aliases: ["python", "notebook", "ml"] },
      { name: "n8n workflow automation", aliases: ["automation", "workflow", "ai"] }
    ]
  },
  {
    category: "IoT and embedded systems",
    items: [
      { name: "ESP32 DevKit V1", usedIn: ["Smart Gate"], aliases: ["esp32", "microcontroller", "iot"] },
      { name: "UHF RFID", usedIn: ["Smart Gate"], aliases: ["rfid", "iot"] },
      { name: "Servo motor control", usedIn: ["Smart Gate"], aliases: ["servo", "hardware"] },
      { name: "Arduino", usedIn: ["Study Buddy"], aliases: ["microcontroller", "iot", "hardware"] },
      { name: "Microcontrollers", usedIn: ["Smart Gate", "Study Buddy"], aliases: ["embedded", "hardware", "iot"] },
      { name: "Sensor integration", aliases: ["sensors", "hardware", "iot"] },
      { name: "Hardware–software integration", usedIn: ["Smart Gate", "Study Buddy"], aliases: ["hardware", "iot", "integration"] }
    ]
  },
  {
    category: "Networking and security",
    note: "From Cisco Networking Academy coursework and hands-on work in Cisco Packet Tracer.",
    items: [
      { name: "Networking fundamentals", aliases: ["network", "tcp/ip"] },
      { name: "Network configuration", aliases: ["network", "routing", "switching"] },
      { name: "Network troubleshooting", aliases: ["network", "support"] },
      { name: "Cisco Packet Tracer", aliases: ["network", "cisco", "simulation"] },
      { name: "Cybersecurity fundamentals", aliases: ["security"] },
      { name: "Endpoint security", aliases: ["security"] },
      { name: "Network defense", aliases: ["security", "network"] },
      { name: "Threat analysis", aliases: ["security"] }
    ]
  },
  {
    category: "Data and productivity",
    items: [
      { name: "Data analytics", aliases: ["data", "analysis"] },
      { name: "Power BI", aliases: ["data", "dashboard", "microsoft"] },
      { name: "Microsoft Excel", aliases: ["excel", "spreadsheet", "data"] },
      { name: "Microsoft Office", aliases: ["word", "powerpoint", "office"] },
      { name: "Google Workspace", aliases: ["google docs", "sheets", "gmail"] }
    ]
  },
  {
    category: "Developer tools",
    items: [
      { name: "Git", aliases: ["version control"] },
      { name: "GitHub", aliases: ["git", "version control"] },
      { name: "Visual Studio Code", aliases: ["vs code", "vscode", "editor", "ide"] }
    ]
  }
];

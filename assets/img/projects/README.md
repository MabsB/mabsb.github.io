# Project screenshots

Screenshots make projects much easier to judge. Add two or three per project.

## Before you take them

- Use **test or demo data**. No real residents, customers, payments, phone numbers or addresses.
- Hide or crop out **RFID tag numbers, Firebase settings, API keys, admin emails and passwords**.
- For Smart Gate, a photo of the hardware (reader, ESP32, gate) works well, as long as no personal data is visible.

## Size and format

- About **1600 px wide** for desktop screenshots; phone screenshots at their natural size.
- **WebP** or **JPG** for screenshots and photos (PNG is fine for simple UI images).
- Aim for **under 400 KB** each. Free tools such as squoosh.app can shrink them.
- Short lowercase names with hyphens, starting with the project id:

```
smart-gate-admin-dashboard.webp
smart-gate-hardware.jpg
mrt-bigasan-shop.webp
study-buddy-dashboard.png
```

## Adding them to the page

List them in the project's `images` in `content/projects.js`. The alt text should say what the screenshot shows, for someone who can't see it:

```js
images: [
  { src: "assets/img/projects/mrt-bigasan-shop.webp",
    alt: "MRT Bigasan shop page with rice products and prices",
    width: 1600, height: 1000 }
]
```

`width` and `height` are the image's real size in pixels. They stop the page from jumping while images load.

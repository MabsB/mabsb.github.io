# Certificate files

Put a certificate here **only after you've decided it can be public.** Everything in this folder is downloadable by anyone once it's pushed, even if no page links to it.

## Privacy check, for each file

Open the certificate and look for:

- [ ] Your **email address** (some certificate PDFs print it, and some file names contain it)
- [ ] **Credential IDs, QR codes or links** you'd rather not share
- [ ] Student number, birth date, address or phone number
- [ ] Anything about other people

If something needs hiding, choose one of these:

1. **Use a verification link instead of the file.** Cisco Networking Academy and many other providers issue badges (for example through Credly) with a public verification page. Put that address in `verifyUrl` and leave `file` as `null`.
2. **Publish an image with the private part removed.** Take a screenshot or export the page as an image, crop out or blur the private part, and save it as `.webp`, `.png` or `.jpg`.
3. **Redact the PDF properly.** Use a real redaction tool (for example Adobe Acrobat's Redact feature). A black box drawn over text doesn't remove it: the text underneath can still be copied.

## Naming

Use short, lowercase names with hyphens. They become part of the public link.

```
cisco-endpoint-security.pdf
cisco-junior-cybersecurity-analyst.webp
```

Never keep the original download name if it contains your email address or a long ID.

## Linking it

In `content/certificates.js`, set the `file` for that certificate:

```js
{ title: "Endpoint Security", category: "cybersecurity", type: "course",
  issuer: "Cisco Networking Academy", year: 2025,
  file: "assets/certificates/cisco-endpoint-security.pdf", verifyUrl: null },
```

(The year above is only an example. Use the date printed on your certificate.)

Then run `node tools/validate.mjs`. It warns about files in this folder that no certificate links to.

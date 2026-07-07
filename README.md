# Longboard® — site (V2)

Static site for Longboard Architectural Products. Ten pages, one shared
stylesheet, one shared script, no build step, no backend.

```
index.html                 Home
applications.html          Applications + comparison table
hitch.html                 HITCH™ system + spacing calculator
linklock.html              Link & Lock™ system
finishes.html              Finish catalogue + filters
finish-light-cherry.html   Finish monograph (template for the range)
projects.html              Project index + gallery
case-alberni.html          Case study — The Alberni Tower
design-assist.html         Design Assist + request form
facility.html              The Abbotsford facility
css/site.css · js/site.js  Shared styles + behavior
assets/                    17 images, compressed for web
```

## Deploy on GitHub Pages

1. Push this folder's contents to a repo (root, or `/docs`).
2. Repo → Settings → Pages → Source: **Deploy from a branch** → select the
   branch (and `/ (root)` or `/docs`).
3. Live at `https://<user>.github.io/<repo>/` within a minute.
4. Custom domain: Settings → Pages, then point DNS (CNAME for `www`,
   A/ALIAS for apex).

Works identically on Netlify / Vercel / S3.

## Before pointing real traffic at it

- Add absolute-URL `og:image` tags once the final domain is known.
- Contact routing is `tel:1-800-604-0343` / `mailto:info@longboardproducts.com`;
  the Design Assist form submits via a pre-filled email until a form backend
  exists.
- Document links (install guides, submittals, warranties) point to the contact
  section until the PDFs are wired in.

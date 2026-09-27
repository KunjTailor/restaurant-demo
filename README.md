# Porta Blu — restaurant website demo

A six-page demo site for a fictional wood-fired pizza & pasta restaurant in Portland, OR.
Built as a showcase for restaurant clients by LocalLift Web Studios.

**Pages:** Home · Menu · Order & Reserve · Catering · Our Story · Visit & Contact

**What it shows off**
- Hero with food photo, cuisine, location and a live “Open now / Closed” status (Pacific time)
- View Menu / Order Online / Call buttons, plus a sticky mobile bar: Call · Menu · Order
- Six popular dishes with photos, descriptions and prices, and a full menu with dietary tags
- Ordering & reservation options, with a working table-finder demo
- Catering packages, pricing and quote forms with inline validation
- Map, hours (today highlighted), holiday hours, parking, transit and accessibility info
- Mobile-first layout, accessible markup, fast static files, social-share preview tags

Buttons that would go to third-party services (online ordering, DoorDash, gift cards) show a
short “Demo link” note instead. Forms show a success message but don’t send anywhere.

## Editing

Source lives in `src/`; the finished site is generated into `docs/`.

```
src/pages/     one file per page
src/partials/  shared header, footer, mobile bar, map, hours, icons
src/assets/    styles.css and main.js
```

After changing anything in `src/`, rebuild:

```
python3 build.py
```

To re-skin for a new client, change the color and font tokens at the top of
`src/assets/styles.css`, then swap names, copy, phone number and photos in `src/`.

## Hosting

`docs/` is plain HTML/CSS/JS. On GitHub: **Settings → Pages → Deploy from a branch →
`main` / `/docs`**. On Vercel, import the repo; `vercel.json` already points it at `docs/`
(no build step). It also works as-is on Netlify or any static host.

Photos are from [Unsplash](https://unsplash.com) (free to use under the Unsplash License).
The site includes `noindex` so the fictional restaurant stays out of search results;
remove that meta tag in `src/partials/head.html` for a real client.

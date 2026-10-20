# github-pages-test

Proof of concept: a static web app hosted on GitHub Pages. It is a much
simpler take on a [Django Packages grid](https://www.djangopackages.org/grids/g/developer-tools/):
packages as columns, attributes and features as rows, with filtering and sorting.

Plain HTML, CSS and JavaScript - no build step, no dependencies.

- `index.html`, `style.css`, `app.js` - the app
- `data/packages.json` - grid data (edit this to change the packages)
- `.github/workflows/pages.yml` - deploys to GitHub Pages on every push to `main`

## Run locally

`fetch()` needs a web server, so opening `index.html` directly won't work:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

# consecration

Saint Louis-Marie de Montfort's Total Consecration to Jesus Through Mary.

## Development

Use Node.js 20.19 or newer.

```sh
npm ci
npm run dev
```

## Quality Checks

```sh
npm run lint
npm run content:validate
npm run content:build
npm test
npm run build
```

`content:validate` checks markdown front matter, day sequencing, recurring prayer includes, and local asset links. `content:build` compiles validated markdown into `dist/content-index.json` and `dist/days/<consecration>/<day>.json`.

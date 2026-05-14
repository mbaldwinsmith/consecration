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

`content:build` and `content:validate` are currently Phase 0 placeholders. They are wired into CI now so the Phase 2 content pipeline can replace the placeholder implementations without changing contributor workflow.

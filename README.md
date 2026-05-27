# @hivehook/sdk

Official TypeScript / JavaScript client for [Hivehook](https://hivehook.com), webhook infrastructure for modern teams (inbound and outbound).

Latest release: **0.1.1** on [npm](https://www.npmjs.com/package/@hivehook/sdk).

## Install

```bash
npm install @hivehook/sdk
```

## Quick start

```ts
import { HivehookClient } from "@hivehook/sdk";

const client = new HivehookClient({
  baseUrl: "http://localhost:8080",
  apiKey: process.env.HIVEHOOK_API_KEY!,
});

const source = await client.sources.create({
  name: "Stripe production",
  slug: "stripe-prod",
  providerType: "stripe",
  verifyConfig: { secret: "whsec_..." },
});

console.log(`created source ${source.id}. POST webhooks to /ingest/${source.slug}`);
```

## Webhook signature verification

```ts
import { verify } from "@hivehook/sdk/webhook";

const signature = req.headers["x-hivehook-signature"] as string;
const timestamp = Number(req.headers["x-hivehook-timestamp"]);
const ok = await verify(body, "your-signing-secret", signature, timestamp);
```

## Documentation

See the full reference at [hivehook.com/docs](https://hivehook.com/docs).

## License

MIT. See [LICENSE](LICENSE).

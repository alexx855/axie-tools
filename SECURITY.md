# Security Policy

## Reporting a Vulnerability

Please report security issues privately by emailing hello@alexpedersen.dev.

Do not open a public issue for vulnerabilities, leaked credentials, exploitable transaction flows, or token handling bugs. Include a concise description, affected versions, and reproduction steps that do not expose private keys, marketplace access tokens, API keys, or seed phrases.

## Supported Versions

Security fixes target the latest published version of `axie-tools`.

## Credential Safety

`axie-tools` can submit real Ronin transactions and authenticated marketplace requests. Never share or commit:

- `PRIVATE_KEY`
- `MARKETPLACE_ACCESS_TOKEN`
- `SKYMAVIS_API_KEY`
- wallet seed phrases
- local `.env`, `.npmrc`, or agent settings

Use a dedicated low-value wallet for testing, and prefer read-only helpers before running approval, buy, listing, cancellation, or transfer flows.

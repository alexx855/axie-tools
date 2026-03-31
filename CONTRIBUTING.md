# Contributing to Axie Tools

## Setup

```bash
git clone https://github.com/your-username/axie-tools.git
cd axie-tools
npm install
npm run build
```

## Development

```bash
# Run CLI in dev mode
bun cli.ts

# Format code
npm run format
```

Tests run individually with bun and require environment variables. See the [Testing section in the README](README.md#testing) for specific commands.

## Submitting changes

1. Fork the repo and create a feature branch
2. Make your changes and add tests for new functionality
3. Ensure the build passes: `npm run build`
4. Run `npm run format` before committing
5. Submit a pull request with a clear description

### Commit messages

Follow conventional commits: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Reporting issues

For bugs, include: steps to reproduce, expected vs actual behavior, Node.js version, and error messages.

For feature requests, describe the use case and proposed behavior.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

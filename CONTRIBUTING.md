# Contributing to Axie Tools

Thank you for your interest in contributing to Axie Tools! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. By participating, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for mistakes
- Show empathy towards other contributors
- Help create a positive community

## How to Contribute

### Types of Contributions

- **Bug fixes**: Fix issues in the codebase
- **Features**: Add new functionality
- **Documentation**: Improve documentation and examples
- **Tests**: Add or improve test coverage

### Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a feature branch
5. Make your changes
6. Run tests and ensure code quality
7. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- pnpm (recommended) or npm

### Installation

 ```bash
 # Clone the repository
 git clone https://github.com/your-username/axie-tools.git
 cd axie-tools

 # Install dependencies
 pnpm install

 # Build the project
 pnpm build
 ```

### Development Workflow

 ```bash
 # Run in development mode
 pnpm dev

 # Run tests
 pnpm test

 # Format code
 pnpm format

 # Check formatting
 pnpm format:check
 ```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test:create-order-axie

# Run with environment variables
AXIE_ID=12345 PRICE=0.1 pnpm test:create-order-axie
```

### Writing Tests

- Write tests for new features
- Include both positive and negative test cases
- Mock external dependencies when appropriate
- Use descriptive test names

## Submitting Changes

### Pull Request Process

1. Ensure your code builds successfully and passes tests
2. Add tests for new functionality
3. Update documentation if needed
4. Run the full test suite
5. Create a pull request with a clear description

### Commit Messages

Follow conventional commit format:

```text
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Relevant code snippets or error messages

### Feature Requests

For feature requests, please provide:

- Clear description of the proposed feature
- Use case and benefits
- Implementation suggestions if applicable

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (ISC).

## Questions?

If you have questions about contributing, feel free to:

- Open a discussion on GitHub
- Check existing issues and pull requests
- Review the documentation and examples

Thank you for contributing to Axie Tools! 🚀

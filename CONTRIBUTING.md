# Contributing to ConnectSphere

First off, thank you for considering contributing to ConnectSphere! It's people like you that make ConnectSphere such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/connectShphere.git
   cd connectShphere
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/isaacbuz/connectShphere.git
   ```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- System information (OS, browser, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Explanation of why this enhancement would be useful
- Possible implementation approach

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `documentation` - Documentation improvements

## Development Setup

1. Install dependencies:
   ```bash
   make install
   # or manually:
   npm install
   pip install -r requirements.txt
   ```

2. Copy environment variables:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. Start development environment:
   ```bash
   make dev
   ```

4. Run tests:
   ```bash
   make test
   ```

## Coding Standards

### JavaScript/TypeScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional components in React
- Use async/await over promises

Example:
```typescript
// Good
export const fetchUser = async (userId: string): Promise<User> => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};
```

### Python

- Follow PEP 8
- Use type hints
- Use Black for formatting
- Write docstrings for all functions/classes

Example:
```python
from typing import List, Dict, Optional

async def process_content(
    content: str, 
    options: Optional[Dict[str, Any]] = None
) -> List[str]:
    """
    Process content with AI agents.
    
    Args:
        content: The content to process
        options: Optional processing options
        
    Returns:
        List of processed content items
    """
    options = options or {}
    # Implementation here
```

### Solidity

- Follow Solidity style guide
- Use latest stable compiler version
- Include comprehensive natspec comments
- Write security-conscious code

Example:
```solidity
/**
 * @title ContentRegistry
 * @notice Manages content ownership and licensing on the blockchain
 * @dev Implements ERC721 with custom licensing logic
 */
contract ContentRegistry is ERC721, AccessControl {
    // Implementation
}
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or modifications
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes that don't modify src or test files

### Examples

```bash
feat(agents): add content moderation agent with toxicity detection
fix(blockchain): resolve gas estimation error in content creation
docs(api): update API documentation with new endpoints
```

## Pull Request Process

1. Update your fork:
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes following coding standards

4. Write/update tests

5. Update documentation

6. Commit your changes following commit guidelines

7. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

8. Create a Pull Request from your fork to the main repository

### PR Requirements

- Clear description of changes
- Link to related issue(s)
- All tests passing
- No merge conflicts
- Code review approval from at least one maintainer

## Testing

### Running Tests

```bash
# All tests
make test

# Specific test suites
make test-node      # Node.js tests
make test-python    # Python tests
make test-contracts # Smart contract tests
```

### Writing Tests

- Aim for >80% code coverage
- Test edge cases
- Use descriptive test names
- Mock external dependencies

Example test:
```typescript
describe('ContentModerationAgent', () => {
  it('should detect toxic content with high confidence', async () => {
    const agent = new ContentModerationAgent();
    const result = await agent.analyze('toxic message here');
    
    expect(result.isToxic).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
  });
});
```

## Documentation

- Update README.md if changing setup or usage
- Add JSDoc/docstrings to all public APIs
- Update API documentation for endpoint changes
- Include examples in documentation

## Architecture Decisions

When proposing significant changes:

1. Create an Architecture Decision Record (ADR)
2. Include rationale, alternatives considered
3. Get feedback before implementation

## Security

- Never commit secrets or API keys
- Report security vulnerabilities privately to maintainers
- Follow OWASP guidelines
- Get security review for crypto/auth changes

## Questions?

Feel free to:

- Open an issue for questions
- Join our Discord community
- Contact maintainers directly

Thank you for contributing to ConnectSphere! 🚀 
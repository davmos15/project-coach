# Contributing to Project Coach

Thank you for your interest in contributing to Project Coach! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs
- Include detailed steps to reproduce
- Provide environment information
- Check existing issues before creating new ones

### Suggesting Features
- Use GitHub Issues with the "enhancement" label
- Describe the use case and expected behavior
- Consider backward compatibility

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run tests and linting**
   ```bash
   npm test
   npm run lint
   ```
6. **Commit with descriptive messages**
   ```bash
   git commit -m "feat: add scheduling optimization algorithm"
   ```
7. **Push to your fork**
8. **Create a Pull Request**

## 📋 Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- AWS CLI (for deployment testing)
- Google Cloud account (for API testing)

### Local Development
```bash
git clone https://github.com/your-username/project-coach.git
cd project-coach
npm install
cp .env.example .env
# Fill in your test credentials
npm run dev
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 🏗️ Code Standards

### Style Guide
- Use ES6+ features
- Follow existing code formatting
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting, missing semicolons
- `refactor:` code restructuring
- `test:` adding tests
- `chore:` maintenance tasks

### Code Structure
```
src/
├── handlers/          # Serverless function handlers
├── services/          # Business logic services
├── utils/            # Utility functions
├── config/           # Configuration files
└── __tests__/        # Test files
```

### Testing Guidelines
- Write unit tests for all new functions
- Include integration tests for API endpoints
- Mock external services (Google APIs)
- Maintain >80% code coverage
- Test error scenarios

### Example Test
```javascript
import { describe, it, expect, jest } from '@jest/globals';
import SchedulingEngine from '../services/schedulingEngine.js';

describe('SchedulingEngine', () => {
  it('should schedule tasks in available slots', async () => {
    const mockCalendarService = {
      getBusyTimes: jest.fn().mockResolvedValue([])
    };
    
    const engine = new SchedulingEngine(mockCalendarService);
    const result = await engine.findAvailableSlots();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

## 🔐 Security Guidelines

### Sensitive Data
- Never commit API keys or secrets
- Use environment variables for configuration
- Follow principle of least privilege
- Validate all user inputs

### Dependencies
- Regularly update dependencies
- Run `npm audit` before releases
- Review security advisories
- Use exact versions in package-lock.json

## 📝 Documentation

### Code Documentation
- Add JSDoc comments to all public functions
- Include parameter types and return values
- Provide usage examples

### README Updates
- Update README.md for new features
- Include configuration examples
- Update API documentation

### Example JSDoc
```javascript
/**
 * Schedules tasks based on available calendar slots
 * @param {Array<Object>} tasks - Array of task objects
 * @param {Array<Object>} availableSlots - Available time slots
 * @returns {Promise<Array<Object>>} Scheduled tasks with time assignments
 * @throws {Error} When no suitable slots are found
 */
async function scheduleTasks(tasks, availableSlots) {
  // Implementation
}
```

## 🚀 Release Process

### Version Management
- Use semantic versioning (semver)
- Update CHANGELOG.md
- Tag releases appropriately

### Pre-release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Security audit clean
- [ ] Performance tested
- [ ] Breaking changes documented

## 🤔 Questions?

- Check existing issues and discussions
- Join our Discord community
- Email: dev@projectcoach.ai

## 📜 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professional communication

### Unacceptable Behavior
- Harassment or discrimination
- Inappropriate language or content
- Spam or off-topic discussions
- Sharing others' private information

## 🙏 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for helping make Project Coach better!
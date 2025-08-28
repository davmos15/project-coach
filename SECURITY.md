# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 5.0.x   | :white_check_mark: |
| < 5.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT create a public GitHub issue**
2. **Email us directly**: security@projectcoach.ai
3. **Include detailed information**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours
- **Regular Updates**: Every 5 business days
- **Resolution Timeline**: Varies by severity

### Severity Levels

#### Critical (24-48 hours)
- Remote code execution
- Authentication bypass
- Data exposure of sensitive information

#### High (1 week)
- Privilege escalation
- SQL injection
- XSS vulnerabilities

#### Medium (2-4 weeks)
- Information disclosure
- CSRF vulnerabilities
- Dependency vulnerabilities

#### Low (Next release cycle)
- Minor information leaks
- Low-impact configuration issues

## Security Measures

### Data Protection
- OAuth 2.0 for authentication
- Minimal permission scopes
- Data remains in user's Google account
- No persistent storage of user data

### Infrastructure Security
- HTTPS everywhere
- Serverless architecture
- Encrypted environment variables
- Regular dependency updates

### Code Security
- Input validation
- Output encoding
- Error handling without information leakage
- Regular security audits

## Best Practices for Users

### Account Security
- Use strong, unique passwords
- Enable 2FA on Google account
- Review OAuth permissions regularly
- Monitor calendar access

### Configuration
- Keep configuration files secure
- Use environment variables for secrets
- Regularly rotate API keys
- Monitor unusual activity

## Security Testing

We employ:
- Static code analysis
- Dependency vulnerability scanning
- Regular penetration testing
- Automated security checks in CI/CD

## Responsible Disclosure

We follow responsible disclosure practices:
- Work with security researchers
- Provide reasonable time for fixes
- Credit researchers (if desired)
- Coordinate public disclosure

## Contact

- **Security Email**: security@projectcoach.ai
- **General Contact**: support@projectcoach.ai
- **Response Time**: 24 hours for security issues

Thank you for helping keep Project Coach secure!
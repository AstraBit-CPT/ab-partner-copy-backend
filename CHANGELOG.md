# Changelog

All notable changes to the Copy Partner Proxy service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX (Production Ready Release)

### Added
- Initial production-ready release
- Pluggable authentication module with `IAuthProvider` interface
- Default authentication provider using `X-Partner-User-Id` header
- Authentication examples for JWT, Session, API Key, and OAuth
- Comprehensive Swagger/OpenAPI documentation
- Path-based API versioning with configurable gateway mapping
- Health check endpoints (`/health-check`, `/heartbeat`)
- Request proxying to copy-gateway with automatic signature generation
- HMAC SHA256 signature generation for gateway authentication
- Rate limiting (100 requests per minute by default)
- CORS support with configurable origins
- Security headers via Helmet middleware
- Structured logging with Winston
- Docker support with multi-stage builds
- Docker Compose configuration for local development
- Comprehensive unit tests for ProxyService and auth providers
- E2E tests covering all major functionality
- ESLint and Prettier configuration
- Environment variable configuration via `.env.template`
- Detailed documentation:
  - Main README with setup and usage instructions
  - Authentication module README with implementation guide
  - Partner customization guide
  - Implementation summary
  - Quick start guide for authentication

### Security
- API keys and secrets managed securely via environment variables
- Request signing with HMAC SHA256
- Timestamp validation to prevent replay attacks
- Configurable receive window for request validation
- Security headers via Helmet
- Rate limiting to prevent abuse
- CORS configuration for cross-origin protection

### Configuration
- Environment-based configuration via ConfigService
- Support for multiple API versions
- Configurable gateway version mapping
- Adjustable CORS settings
- Configurable logging levels
- Flexible server binding (host and port)

### Documentation
- Comprehensive README with examples
- Swagger UI available at root path (`/`)
- OpenAPI JSON specification at `/api-json`
- Authentication module documentation
- Partner customization guide
- Example implementations for common auth patterns

### Testing
- Unit tests for ProxyService
- Unit tests for DefaultAuthProvider
- Integration tests for versioning
- E2E tests covering all endpoints
- Test coverage configuration with exclusions for examples

### Developer Experience
- Hot reload for development mode
- Docker Compose for local development
- Prettier and ESLint for code quality
- Git hooks for pre-commit formatting
- Clear separation of concerns
- TypeScript strict typing

## [Unreleased]

### Planned Features

---

## Version History

### Version Numbering
- **Major version (X.0.0)**: Breaking changes, incompatible API changes
- **Minor version (0.X.0)**: New features, backward-compatible
- **Patch version (0.0.X)**: Bug fixes, backward-compatible

### Upgrade Guidelines

#### From 0.x.x to 1.0.0
This is the first production release. If you were using a pre-release version:

1. Update environment variables to match `.env.template`
2. Implement your authentication provider following the new `IAuthProvider` interface
3. Update `auth.module.ts` to use your provider
4. Review and update any custom modifications
5. Run tests to ensure compatibility
6. Update Docker configurations if using containers

### Support Policy
- **Current version (1.x.x)**: Full support with security updates and bug fixes
- **Previous major versions**: Security updates only for 6 months after new major release
- **End of Life**: Announced 3 months in advance

### Breaking Changes Policy
Breaking changes will only be introduced in major version updates and will be:
- Clearly documented in this changelog
- Announced in advance when possible
- Accompanied by migration guides
- Minimized to maintain partner compatibility

---

## Contributing

When making changes:
1. Update this CHANGELOG.md with your changes
2. Follow the format: Added, Changed, Deprecated, Removed, Fixed, Security
3. Include the date when releasing a new version
4. Update version numbers in package.json
5. Tag releases in git with version numbers

## Questions or Issues?

For questions about changes or to report issues:
- Check the documentation in the repository
- Review closed issues for similar problems
- Contact AstraBit support for assistance


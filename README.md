[![Build Status](https://github.com/DavidKk/vercel-openapi/actions/workflows/coverage.workflow.yml/badge.svg)](https://github.com/DavidKk/vercel-openapi/actions/workflows/coverage.workflow.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-openapi/blob/main/README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-openapi/blob/main/README.md)

# Vercel OpenAPI

A lightweight solution providing public API caching proxy and holiday data services for developers.

## Core Features

- **API Caching Proxy**: Provides a caching layer for public APIs to reduce direct calls and improve response speed
- **Holiday Data Service**: Built-in holiday data interface supporting date queries and holiday checks
- **Developer Friendly**: Clean RESTful API design with JWT authentication and 2FA support

## Security Considerations

- All API requests require JWT authentication - please keep your secret key secure
- 2FA verification is optional but strongly recommended for production environments
- Regularly rotate JWT_SECRET and 2FA_SECRET for improved security

## Deploy to Vercel

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-openapi)

### Environment Variables Configuration

Refer to the [`.env.example`](./.env.example) file to set required environment variables:

- `JWT_SECRET`: JWT signing key
- `JWT_EXPIRES_IN`: JWT expiration time
- `ACCESS_2FA_SECRET`: 2FA secret key (optional)
- `ACCESS_USERNAME`: Admin username
- `ACCESS_PASSWORD`: Admin password

## Quick Start

1. Set the above environment variables in Vercel
2. After deployment, obtain an access token via `/api/auth/login`
3. Use the token to access the holiday data interface at `/api/holiday`

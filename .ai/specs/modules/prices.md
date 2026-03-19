# Prices module spec

## Scope

- Overview page (`/prices`) is publicly readable.
- Management page (`/prices/manage`) requires authenticated session.
- This phase focuses on UI interaction parity with calc prices calculator and manager data entry.

## Data semantics

- Product list and history are stored in gist files.
- Product CRUD is authenticated only.
- Overview reads product data for all users; history write is authenticated, with local fallback history allowed on client.

## Public API

- No public REST endpoint is added in this phase.
- API/MCP pages remain documentation placeholders to keep module navigation consistency.

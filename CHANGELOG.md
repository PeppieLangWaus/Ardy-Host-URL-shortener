# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [1.0.1] - 2026-08-18
### Fixed
- Resolve the real visitor IP from Cloudflare's `CF-Connecting-IP` header instead of relying solely on `req.ip`, and updated `trust proxy` to account for Cloudflare as an added hop in front of Traefik — so per-IP rate limiting on link creation and redirects keeps working correctly once traffic is proxied through Cloudflare.

# Changelog

All notable changes to this project will be documented in this file.

## [0.5.4] - 2026-01-26

### Fixed

- Fixed mixed content error when accessing via HTTPS (Cloudflare tunnel)
- Added support for Home Assistant ingress with X-Ingress-Path header
- Fixed protocol detection using X-Forwarded-Proto header for reverse proxies
- Dashboard and image URLs now work correctly via both HTTP and HTTPS access
- Fixed 413 Content Too Large error by adding Nginx client_max_body_size (100MB)

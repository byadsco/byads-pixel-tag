# Changelog

All notable changes to the ByAds Pixel template are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the template uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). See [RELEASING.md](RELEASING.md) for what
counts as a major, minor or patch change.

## [1.0.0] - 2026-10-05

### Added

- First public release of the ByAds Pixel tag template for Google Tag Manager web containers.
- Loads the ByAds Pixel from `https://pixel.byads.co` and sends page views, conversions, custom events,
  consent state, ad identifiers, custom properties and user data.
- Optional normalization before sending: lowercase or SHA-256 for user data, and lowercase, MD5 or SHA-256
  for custom properties.
- Identifier filters to skip click IDs, browser IDs, analytics IDs, campaign UTMs or affiliate IDs.

[1.0.0]: https://github.com/byadsco/byads-pixel-tag/releases/tag/v1.0.0

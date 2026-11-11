# Changelog

All notable changes to Server Logic Tools are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- Reorganised the user guide into the four Diátaxis quadrants — tutorials, how-to guides, reference, and explanation — indexed from `docs/usage-manual.md`.
- Added a full recipe reference, a full `Server.*` object reference, and three explanation guides.
- Split the build guide into `docs/how-to/build-and-load-from-source.md`.
- Added `CONTRIBUTING.md` and this `CHANGELOG.md`.

### Changed

- Aligned the npm `description` and `keywords` with the repository description and topics.

## [1.0.0] - 2026-11-11

### Added

- **Logic Starter** — generate a Power Pages server logic handler, a matching client call, and a permission checklist from one of ten recipes; edit and download the result as a ZIP.
- **Server Objects** — a searchable, curated `Server.*` reference with member signatures, samples, and permission notes, including inserting samples into the current handler.
- **Logic Inspector** — scan the server logic files on a Power Pages site and report each file's web-role, table-permission, and outbound-networking readiness, with Markdown and PDF report export.
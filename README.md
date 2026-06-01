# WilsonOS DJ Service Showcase

Sanitized public mirror of a Spotify/DJ backend service experiment. The public
extract keeps core service/API code and documentation while removing personal
playlists, logs, private analysis notes and old deployment files.

## What This Demonstrates

- PHP service code around Spotify OAuth/API usage
- Playback/search/control abstractions
- Token refresh workflow documentation
- Lightweight backend/service experimentation for a companion DJ app
- React Native/Expo companion app code for sessions, Spotify login, credits and AI-assisted DJ personas

## Code Map

- `SpotifyService.php`, `spotify_api_simple.php` and `oauth_callback.php` show the PHP service layer around Spotify OAuth and API calls.
- `mobile-app/app/` contains the Expo router screens for login, tabs, sessions, analysis and credits.
- `mobile-app/services/` contains Spotify, auth, file picker, audio, AI model and DJ-session service modules.
- `mobile-app/contexts/` contains auth and credit state management.
- `mobile-app/components/` contains reusable UI pieces and tests.
- `doc/` keeps the sanitized implementation notes that explain the service flow.

## Sanitization Notes

No Spotify tokens or private playlist exports are included. Personal notes and
raw music library data were removed from history.

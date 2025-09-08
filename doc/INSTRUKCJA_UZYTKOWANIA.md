# 🎵 WilsonOS Spotify API - Instrukcja Użytkowania

**Data:** 2025-09-08 20:16:50  
**Status:** ✅ Działa poprawnie

## 🚀 Szybki Start

### 1. Autoryzacja (jednorazowo)
```
http://wilsonos.com/oauth_callback.php
```
- Otwórz link w przeglądarce
- Zaloguj się do Spotify
- Autoryzuj aplikację WilsonOS
- Token zostanie automatycznie zapisany

### 2. Sprawdzenie urządzeń
```bash
curl "http://wilsonos.com/spotify_api_simple.php/devices"
```
- Upewnij się, że masz aktywne urządzenie Spotify
- Otwórz aplikację Spotify na komputerze/telefonie

## 🎵 Podstawowe Komendy

### Wyszukiwanie utworów
```bash
curl "http://wilsonos.com/spotify_api_simple.php/search?query=ARTYSTA%20UTWOR&limit=5"
```

**Przykład:**
```bash
curl "http://wilsonos.com/spotify_api_simple.php/search?query=pink%20floyd%20the%20wall&limit=5"
```

### Odtwarzanie utworu
```bash
curl -X POST "http://wilsonos.com/spotify_api_simple.php/play" \
  -H "Content-Type: application/json" \
  -d '{"track_id": "ID_UTWORU"}'
```

**Przykład:**
```bash
curl -X POST "http://wilsonos.com/spotify_api_simple.php/play" \
  -H "Content-Type: application/json" \
  -d '{"track_id": "7K6xMPtAjTuLPNlJMLf5bS"}'
```

### Odtwarzanie od konkretnego momentu
```bash
curl -X POST "http://wilsonos.com/spotify_api_simple.php/play" \
  -H "Content-Type: application/json" \
  -d '{"track_id": "ID_UTWORU", "position_ms": 128000}'
```

**Przykład (od 2:08 min):**
```bash
curl -X POST "http://wilsonos.com/spotify_api_simple.php/play" \
  -H "Content-Type: application/json" \
  -d '{"track_id": "1u1HKQWf4k2rqIc8ryAwKp", "position_ms": 128000}'
```

## 🎛️ Kontrola Odtwarzania

### Pauza
```bash
curl -X POST "http://wilsonos.com/spotify_api_simple.php/pause"
```

### Wznowienie
```bash
curl -X POST "http://wilsonos.com/spotify_api_simple.php/play"
```

### Następny utwór
```bash
curl -X POST "http://wilsonos.com/spotify_api_simple.php/next"
```

### Poprzedni utwór
```bash
curl -X POST "http://wilsonos.com/spotify_api_simple.php/previous"
```

### Głośność (0-100)
```bash
curl -X POST "http://wilsonos.com/spotify_api_simple.php/volume" \
  -H "Content-Type: application/json" \
  -d '{"volume": 75}'
```

## 📱 Status Odtwarzania

### Aktualnie odtwarzany utwór
```bash
curl "http://wilsonos.com/spotify_api_simple.php/currently-playing"
```

### Lista urządzeń
```bash
curl "http://wilsonos.com/spotify_api_simple.php/devices"
```

## 🔧 Rozwiązywanie Problemów

### Problem: "No active device found"
**Rozwiązanie:**
1. Otwórz aplikację Spotify na komputerze/telefonie
2. Zaloguj się do tego samego konta co autoryzowałeś
3. Spróbuj odtworzyć dowolny utwór w aplikacji
4. Sprawdź urządzenia: `curl "http://wilsonos.com/spotify_api_simple.php/devices"`

### Problem: "Invalid access token"
**Rozwiązanie:**
1. Odwiedź ponownie: `http://wilsonos.com/oauth_callback.php`
2. Zaloguj się i autoryzuj ponownie
3. Token zostanie automatycznie odświeżony

### Problem: "Brak tokena dostępu"
**Rozwiązanie:**
1. Wykonaj autoryzację OAuth (patrz sekcja "Szybki Start")
2. Upewnij się, że jesteś zalogowany do Spotify

## 🎯 Przykłady Użycia

### Scenariusz 1: Wyszukaj i odtwórz utwór
```bash
# 1. Wyszukaj utwór
curl "http://wilsonos.com/spotify_api_simple.php/search?query=bohemian%20rhapsody&limit=1"

# 2. Skopiuj track_id z odpowiedzi i odtwórz
curl -X POST "http://wilsonos.com/spotify_api_simple.php/play" \
  -H "Content-Type: application/json" \
  -d '{"track_id": "SKOPIOWANY_ID"}'
```

### Scenariusz 2: Płynne przejście między utworami
```bash
# 1. Odtwórz pierwszy utwór
curl -X POST "http://wilsonos.com/spotify_api_simple.php/play" \
  -H "Content-Type: application/json" \
  -d '{"track_id": "ID_UTWORU_1"}'

# 2. Po chwili odtwórz drugi utwór (automatycznie wyciszy pierwszy)
curl -X POST "http://wilsonos.com/spotify_api_simple.php/play" \
  -H "Content-Type: application/json" \
  -d '{"track_id": "ID_UTWORU_2"}'
```

### Scenariusz 3: Odtwórz od konkretnego momentu
```bash
# Odtwórz od 3:30 min (210 sekund = 210000 ms)
curl -X POST "http://wilsonos.com/spotify_api_simple.php/play" \
  -H "Content-Type: application/json" \
  -d '{"track_id": "ID_UTWORU", "position_ms": 210000}'
```

## 📋 Lista Endpointów

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/search` | GET | Wyszukiwanie utworów |
| `/play` | POST | Odtwarzanie utworu |
| `/pause` | POST | Pauza |
| `/next` | POST | Następny utwór |
| `/previous` | POST | Poprzedni utwór |
| `/volume` | POST | Zmiana głośności |
| `/devices` | GET | Lista urządzeń |
| `/currently-playing` | GET | Aktualnie odtwarzany |

## 🎵 Gotowe do użycia!

API WilsonOS Spotify jest w pełni funkcjonalne i gotowe do użycia. Wszystkie podstawowe funkcje działają poprawnie:

- ✅ Wyszukiwanie utworów
- ✅ Odtwarzanie od dowolnego momentu
- ✅ Płynne przejścia między utworami
- ✅ Kontrola odtwarzania
- ✅ Zarządzanie głośnością
- ✅ Automatyczne odświeżanie tokenów

**Miłego słuchania! 🎧**

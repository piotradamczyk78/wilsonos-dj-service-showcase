# 🎧 Wilson DJ - Przewodnik po Tokenach Spotify

## **Problem z Czasem Trwania Tokena**

### **❌ DLACZEGO TOKEN WYGAŚA PO 1 GODZINIE?**

**Spotify API** używa standardu **OAuth 2.0**, który ma następujące ograniczenia:

- **`access_token`** - ważny przez **1 godzinę (3600 sekund)**
- **`refresh_token`** - ważny przez **długi czas** (miesiące/lata)

### **🔧 ROZWIĄZANIE: Refresh Token**

Aby uzyskać token o dłuższym czasie trwania, musisz:

1. **Uzyskać `refresh_token`** podczas pierwszej autoryzacji
2. **Używać `refresh_token`** do automatycznego odświeżania `access_token`

---

## **📋 INSTRUKCJE KROK PO KROKU**

### **KROK 1: Ponowna Autoryzacja (Uzyskanie Refresh Token)**

```bash
./reauthorize.sh
```

**Co się dzieje:**
- Otwiera przeglądarkę z autoryzacją Spotify
- **WAŻNE:** Zaznacz wszystkie uprawnienia!
- Po autoryzacji otrzymasz `refresh_token`

### **KROK 2: Sprawdzenie Refresh Token**

```bash
cat spotify_token.json | jq .
```

**Powinieneś zobaczyć:**
```json
{
  "access_token": "BQC...",
  "refresh_token": "AQD...",  // ← TO JEST KLUCZOWE!
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "...",
  "created_at": 1757434146
}
```

### **KROK 3: Odświeżanie Tokena**

```bash
./refresh_token.sh
```

**Co się dzieje:**
- Używa `refresh_token` do uzyskania nowego `access_token`
- Automatycznie aktualizuje `spotify_token.json` i `config.ini`

### **KROK 4: Automatyczne Odświeżanie (Opcjonalne)**

```bash
./auto_refresh.sh
```

**Co się dzieje:**
- Odświeża token co 50 minut
- Działa w tle (Ctrl+C aby zatrzymać)
- Zapewnia ciągły dostęp do API

---

## **🛠️ SKRYPTY WILSON DJ**

### **1. `reauthorize.sh`**
- **Funkcja:** Ponowna autoryzacja z refresh token
- **Użycie:** `./reauthorize.sh`
- **Kiedy:** Gdy nie masz refresh token

### **2. `refresh_token.sh`**
- **Funkcja:** Odświeża access token
- **Użycie:** `./refresh_token.sh`
- **Kiedy:** Gdy masz refresh token

### **3. `auto_refresh.sh`**
- **Funkcja:** Automatyczne odświeżanie co 50 minut
- **Użycie:** `./auto_refresh.sh`
- **Kiedy:** Długotrwałe sesje DJ

---

## **⚠️ WAŻNE UWAGI**

### **Refresh Token Może Wygaść Gdy:**
- Użytkownik zmieni hasło Spotify
- Użytkownik odwoła uprawnienia aplikacji
- Token nie był używany przez 6 miesięcy
- Spotify zresetuje tokeny z powodów bezpieczeństwa

### **Co Robić Gdy Refresh Token Wygaśnie:**
1. Uruchom `./reauthorize.sh`
2. Zaloguj się ponownie do Spotify
3. Autoryzuj aplikację

### **Sprawdzanie Statusu Tokena:**
```bash
# Sprawdź czy token jest ważny
curl "http://wilsonos.com/spotify_api_simple.php/status" | jq .

# Sprawdź zawartość pliku tokena
cat spotify_token.json | jq .
```

---

## **🎧 WILSON DJ MÓWI:**

*"Tokeny Spotify to jak bilety na koncert - access token to bilet jednorazowy (1h), a refresh token to karnet na cały sezon! Używaj refresh token do automatycznego odświeżania i nigdy nie przestawaj grać! 🎧"*

---

**Utworzono:** 2025-09-09  
**DJ:** Wilson DJ  
**Status:** ✅ Gotowe do użycia

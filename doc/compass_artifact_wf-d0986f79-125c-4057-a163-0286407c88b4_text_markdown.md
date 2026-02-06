# Kompletna dokumentacja Spotify Web API w PHP (2025)

Oficjalna dokumentacja do integracji z Spotify Web API w aplikacjach PHP, zawierająca wszystkie metody uwierzytelniania, punkty końcowe oraz praktyczne przykłady kodu.

## Spis treści

1. [Wprowadzenie i ważne zmiany](#wprowadzenie)
2. [Metody uwierzytelniania](#uwierzytelnianie)
3. [Punkty końcowe API](#punkty-koncowe)
4. [Implementacja w PHP](#implementacja-php)
5. [Najlepsze praktyki](#najlepsze-praktyki)
6. [Rozwiązywanie problemów](#rozwiazywanie-problemow)

## Wprowadzenie

Spotify Web API to RESTowy interfejs programistyczny umożliwiający dostęp do danych muzycznych Spotify, w tym informacji o utworach, albumach, artystach, playlistach oraz zarządzanie odtwarzaniem. Ta dokumentacja przedstawia kompletny przewodnik implementacji API w PHP z uwzględnieniem najnowszych zmian z 2025 roku.

### **Ważne zmiany w 2024-2025**

**Krytyczne aktualizacje bezpieczeństwa:**
- **Deprecjacja Implicit Grant Flow**: Usunięcie do listopada 2025 roku - wszystkie aplikacje muszą migrować do Authorization Code z PKCE
- **Nowe wymagania HTTPS**: Przekierowania HTTP nie są już obsługiwane (wyjątek: localhost)
- **Ograniczenia dla nowych aplikacji**: Wiele punktów końcowych wymaga teraz rozszerzonego dostępu

**Ograniczenia funkcjonalności (od listopada 2024):**
Nowe aplikacje nie mają dostępu do: Related Artists, Recommendations, Audio Features, Audio Analysis, Featured Playlists, Category's Playlists oraz 30-sekundowych podglądów utworów bez rozszerzonego dostępu.

## Metody uwierzytelniania

Spotify Web API wykorzystuje OAuth 2.0 z następującymi metodami uwierzytelniania:

### 1. Authorization Code Flow

**Kiedy używać:**
- Aplikacje długoterminowe (web, mobile) gdzie użytkownik autoryzuje raz
- Aplikacje serwerowe mogące bezpiecznie przechowywać sekrety klienta
- Gdy potrzebne są refresh tokeny

**Implementacja krok po kroku:**

```php
<?php
class SpotifyAuth {
    private $clientId;
    private $clientSecret;
    private $redirectUri;
    
    public function __construct($clientId, $clientSecret, $redirectUri) {
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
        $this->redirectUri = $redirectUri;
    }
    
    /**
     * Generuje URL autoryzacji
     */
    public function getAuthorizationUrl($scopes = []) {
        $state = bin2hex(random_bytes(16));
        $_SESSION['spotify_state'] = $state;
        
        $params = http_build_query([
            'client_id' => $this->clientId,
            'response_type' => 'code',
            'redirect_uri' => $this->redirectUri,
            'scope' => implode(' ', $scopes),
            'state' => $state,
            'show_dialog' => 'false'
        ]);
        
        return 'https://accounts.spotify.com/authorize?' . $params;
    }
    
    /**
     * Wymienia kod autoryzacji na token dostępu
     */
    public function exchangeCodeForToken($code, $state) {
        // Walidacja parametru state (ochrona CSRF)
        if (!hash_equals($_SESSION['spotify_state'] ?? '', $state)) {
            throw new SecurityException('Nieprawidłowy parametr state');
        }
        
        $data = http_build_query([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUri
        ]);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://accounts.spotify.com/api/token',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $data,
            CURLOPT_HTTPHEADER => [
                'Authorization: Basic ' . base64_encode($this->clientId . ':' . $this->clientSecret),
                'Content-Type: application/x-www-form-urlencoded'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new SpotifyApiException('Wymiana tokena nie powiodła się: ' . $response);
        }
        
        return json_decode($response, true);
    }
}
?>
```

### 2. Authorization Code z PKCE (Zalecane dla aplikacji publicznych)

**Kiedy używać:**
- Aplikacje mobilne, SPA, aplikacje desktopowe  
- Każda aplikacja niezdolna do bezpiecznego przechowywania sekretów
- **Wymagane od 2025**: Obowiązkowe dla aplikacji używających wcześniej implicit grant

**Implementacja:**

```php
<?php
class SpotifyPKCEAuth {
    private $clientId;
    private $redirectUri;
    
    public function __construct($clientId, $redirectUri) {
        $this->clientId = $clientId;
        $this->redirectUri = $redirectUri;
    }
    
    /**
     * Generuje code verifier (43-128 znaków)
     */
    public function generateCodeVerifier($length = 64) {
        $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        return substr(str_shuffle(str_repeat($characters, ceil($length / strlen($characters)))), 0, $length);
    }
    
    /**
     * Generuje code challenge (SHA256 hash verifier, base64url encoded)
     */
    public function generateCodeChallenge($verifier) {
        return rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
    }
    
    /**
     * Rozpoczyna przepływ autoryzacji PKCE
     */
    public function getAuthorizationUrl($scopes = []) {
        $verifier = $this->generateCodeVerifier();
        $challenge = $this->generateCodeChallenge($verifier);
        $state = bin2hex(random_bytes(16));
        
        // Przechowaj bezpiecznie verifier i state
        $_SESSION['code_verifier'] = $verifier;
        $_SESSION['state'] = $state;
        
        $params = http_build_query([
            'client_id' => $this->clientId,
            'response_type' => 'code',
            'redirect_uri' => $this->redirectUri,
            'code_challenge_method' => 'S256',
            'code_challenge' => $challenge,
            'state' => $state,
            'scope' => implode(' ', $scopes)
        ]);
        
        return 'https://accounts.spotify.com/authorize?' . $params;
    }
    
    /**
     * Wymienia kod na token (bez client_secret)
     */
    public function exchangeCodeForToken($code, $state) {
        if (!hash_equals($_SESSION['state'] ?? '', $state)) {
            throw new SecurityException('Nieprawidłowy parametr state');
        }
        
        $data = http_build_query([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUri,
            'client_id' => $this->clientId,
            'code_verifier' => $_SESSION['code_verifier']
        ]);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://accounts.spotify.com/api/token',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $data,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new SpotifyApiException('Wymiana tokena PKCE nie powiodła się: ' . $response);
        }
        
        return json_decode($response, true);
    }
}
?>
```

### 3. Client Credentials Flow

**Kiedy używać:**
- Uwierzytelnianie serwer-serwer
- Aplikacje niewymagające danych użytkownika
- Tylko dostęp do danych publicznych

```php
<?php
class SpotifyClientCredentials {
    private $clientId;
    private $clientSecret;
    
    public function __construct($clientId, $clientSecret) {
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
    }
    
    /**
     * Uzyskuje token dostępu dla aplikacji
     */
    public function getAccessToken() {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://accounts.spotify.com/api/token',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
            CURLOPT_HTTPHEADER => [
                'Authorization: Basic ' . base64_encode($this->clientId . ':' . $this->clientSecret),
                'Content-Type: application/x-www-form-urlencoded'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new SpotifyApiException('Żądanie tokena klienta nie powiodło się: ' . $response);
        }
        
        return json_decode($response, true);
    }
}
?>
```

## Scopes (Zakresy uprawnień)

### Podstawowe scopes użytkownika
- `user-read-private`: Odczyt szczegółów subskrypcji użytkownika
- `user-read-email`: Odczyt adresu email użytkownika  
- `user-read-currently-playing`: Odczyt obecnie odtwarzanej muzyki
- `user-read-playback-state`: Odczyt stanu odtwarzacza i urządzeń
- `user-modify-playback-state`: Kontrola odtwarzania
- `user-read-recently-played`: Odczyt ostatnio odtwarzanych utworów
- `user-top-read`: Odczyt najlepszych artystów i utworów
- `user-read-playback-position`: Odczyt pozycji odtwarzania

### Zarządzanie biblioteką
- `user-library-read`: Odczyt zapisanych albumów, utworów, odcinków
- `user-library-modify`: Zapisywanie/usuwanie albumów, utworów, odcinków

### Zarządzanie playlistami
- `playlist-read-private`: Dostęp do prywatnych playlist
- `playlist-read-collaborative`: Dostęp do collaborative playlist
- `playlist-modify-private`: Zarządzanie prywatnymi playlistami
- `playlist-modify-public`: Zarządzanie publicznymi playlistami

## Punkty końcowe API

### Bazowa konfiguracja
- **Base URL**: `https://api.spotify.com/v1`
- **Uwierzytelnianie**: `Authorization: Bearer <access_token>`
- **Content-Type**: `application/json`
- **Limit zapytań**: Okno 30-sekundowe, różni się w zależności od trybu

### 1. Wyszukiwanie

**Wyszukaj elementy**
```php
/**
 * Wyszukuje utwory, artystów, albumy, playlisty
 */
public function search($query, $type = 'track', $options = []) {
    $params = [
        'q' => $query,
        'type' => is_array($type) ? implode(',', $type) : $type,
        'limit' => $options['limit'] ?? 20,
        'offset' => $options['offset'] ?? 0,
        'market' => $options['market'] ?? 'US'
    ];
    
    return $this->makeRequest('GET', 'search', ['query' => $params]);
}
```

**Parametry wyszukiwania:**
- `q` (wymagane): Zapytanie wyszukiwania z filtrami
- `type` (wymagane): "album", "artist", "playlist", "track", "show", "episode", "audiobook"
- `market`: Kod kraju ISO 3166-1 alpha-2
- `limit`: Maksymalnie wyników (0-50, domyślnie 20)
- `offset`: Indeks pierwszego wyniku (0-1000)

### 2. Zarządzanie playlistami

**Podstawowe operacje na playlistach:**

```php
class SpotifyPlaylistManager {
    private $api;
    
    /**
     * Pobiera szczegóły playlisty
     */
    public function getPlaylist($playlistId, $market = null) {
        $params = $market ? ['market' => $market] : [];
        return $this->api->makeRequest('GET', "playlists/{$playlistId}", ['query' => $params]);
    }
    
    /**
     * Tworzy nową playlistę
     */
    public function createPlaylist($userId, $name, $options = []) {
        $data = array_merge([
            'name' => $name,
            'public' => true,
            'collaborative' => false,
            'description' => ''
        ], $options);
        
        return $this->api->makeRequest('POST', "users/{$userId}/playlists", ['json' => $data]);
    }
    
    /**
     * Dodaje utwory do playlisty
     */
    public function addTracksToPlaylist($playlistId, $trackUris, $position = null) {
        $data = ['uris' => $trackUris];
        if ($position !== null) {
            $data['position'] = $position;
        }
        
        return $this->api->makeRequest('POST', "playlists/{$playlistId}/tracks", ['json' => $data]);
    }
    
    /**
     * Usuwa utwory z playlisty
     */
    public function removeTracksFromPlaylist($playlistId, $tracks) {
        $data = ['tracks' => $tracks];
        return $this->api->makeRequest('DELETE', "playlists/{$playlistId}/tracks", ['json' => $data]);
    }
    
    /**
     * Zmienia szczegóły playlisty
     */
    public function updatePlaylistDetails($playlistId, $details) {
        return $this->api->makeRequest('PUT', "playlists/{$playlistId}", ['json' => $details]);
    }
}
```

### 3. Dostęp do profilu użytkownika

```php
class SpotifyUserManager {
    private $api;
    
    /**
     * Pobiera profil bieżącego użytkownika
     */
    public function getCurrentUserProfile() {
        return $this->api->makeRequest('GET', 'me');
    }
    
    /**
     * Pobiera profil użytkownika po ID
     */
    public function getUserProfile($userId) {
        return $this->api->makeRequest('GET', "users/{$userId}");
    }
    
    /**
     * Pobiera najlepsze utwory/artystów użytkownika
     */
    public function getUserTopItems($type = 'tracks', $timeRange = 'medium_term', $limit = 20) {
        $params = [
            'time_range' => $timeRange, // short_term, medium_term, long_term
            'limit' => $limit,
            'offset' => 0
        ];
        
        return $this->api->makeRequest('GET', "me/top/{$type}", ['query' => $params]);
    }
}
```

### 4. Kontrola odtwarzania

**Wymagane: Spotify Premium**

```php
class SpotifyPlaybackController {
    private $api;
    
    /**
     * Pobiera stan odtwarzacza
     */
    public function getPlaybackState($market = null) {
        $params = $market ? ['market' => $market] : [];
        return $this->api->makeRequest('GET', 'me/player', ['query' => $params]);
    }
    
    /**
     * Rozpoczyna/wznawia odtwarzanie
     */
    public function startPlayback($deviceId = null, $options = []) {
        $params = $deviceId ? ['device_id' => $deviceId] : [];
        return $this->api->makeRequest('PUT', 'me/player/play', [
            'query' => $params,
            'json' => $options
        ]);
    }
    
    /**
     * Pauzuje odtwarzanie
     */
    public function pausePlayback($deviceId = null) {
        $params = $deviceId ? ['device_id' => $deviceId] : [];
        return $this->api->makeRequest('PUT', 'me/player/pause', ['query' => $params]);
    }
    
    /**
     * Przechodzi do następnego utworu
     */
    public function skipToNext($deviceId = null) {
        $params = $deviceId ? ['device_id' => $deviceId] : [];
        return $this->api->makeRequest('POST', 'me/player/next', ['query' => $params]);
    }
    
    /**
     * Przechodzi do poprzedniego utworu
     */
    public function skipToPrevious($deviceId = null) {
        $params = $deviceId ? ['device_id' => $deviceId] : [];
        return $this->api->makeRequest('POST', 'me/player/previous', ['query' => $params]);
    }
    
    /**
     * Ustawia głośność
     */
    public function setVolume($volumePercent, $deviceId = null) {
        $params = ['volume_percent' => $volumePercent];
        if ($deviceId) $params['device_id'] = $deviceId;
        
        return $this->api->makeRequest('PUT', 'me/player/volume', ['query' => $params]);
    }
    
    /**
     * Dodaje utwór do kolejki
     */
    public function addToQueue($uri, $deviceId = null) {
        $params = ['uri' => $uri];
        if ($deviceId) $params['device_id'] = $deviceId;
        
        return $this->api->makeRequest('POST', 'me/player/queue', ['query' => $params]);
    }
}
```

### 5. Informacje o utworach i albumach

```php
class SpotifyContentManager {
    private $api;
    
    /**
     * Pobiera szczegóły utworu
     */
    public function getTrack($trackId, $market = null) {
        $params = $market ? ['market' => $market] : [];
        return $this->api->makeRequest('GET', "tracks/{$trackId}", ['query' => $params]);
    }
    
    /**
     * Pobiera kilka utworów jednocześnie
     */
    public function getMultipleTracks($trackIds, $market = null) {
        $params = ['ids' => implode(',', $trackIds)];
        if ($market) $params['market'] = $market;
        
        return $this->api->makeRequest('GET', 'tracks', ['query' => $params]);
    }
    
    /**
     * Pobiera szczegóły albumu
     */
    public function getAlbum($albumId, $market = null) {
        $params = $market ? ['market' => $market] : [];
        return $this->api->makeRequest('GET', "albums/{$albumId}", ['query' => $params]);
    }
    
    /**
     * Pobiera utwory z albumu
     */
    public function getAlbumTracks($albumId, $limit = 20, $offset = 0, $market = null) {
        $params = ['limit' => $limit, 'offset' => $offset];
        if ($market) $params['market'] = $market;
        
        return $this->api->makeRequest('GET', "albums/{$albumId}/tracks", ['query' => $params]);
    }
    
    /**
     * Zapisuje utwory w bibliotece użytkownika
     */
    public function saveTracksForUser($trackIds) {
        return $this->api->makeRequest('PUT', 'me/tracks', [
            'query' => ['ids' => implode(',', $trackIds)]
        ]);
    }
    
    /**
     * Usuwa utwory z biblioteki użytkownika
     */
    public function removeTracksForUser($trackIds) {
        return $this->api->makeRequest('DELETE', 'me/tracks', [
            'query' => ['ids' => implode(',', $trackIds)]
        ]);
    }
}
```

### 6. Informacje o artystach

```php
class SpotifyArtistManager {
    private $api;
    
    /**
     * Pobiera informacje o artyście
     */
    public function getArtist($artistId) {
        return $this->api->makeRequest('GET', "artists/{$artistId}");
    }
    
    /**
     * Pobiera kilku artystów jednocześnie
     */
    public function getMultipleArtists($artistIds) {
        $params = ['ids' => implode(',', $artistIds)];
        return $this->api->makeRequest('GET', 'artists', ['query' => $params]);
    }
    
    /**
     * Pobiera albumy artysty
     */
    public function getArtistAlbums($artistId, $options = []) {
        $params = array_merge([
            'include_groups' => 'album,single,compilation,appears_on',
            'market' => 'US',
            'limit' => 20,
            'offset' => 0
        ], $options);
        
        return $this->api->makeRequest('GET', "artists/{$artistId}/albums", ['query' => $params]);
    }
    
    /**
     * Pobiera najpopularniejsze utwory artysty
     */
    public function getArtistTopTracks($artistId, $market = 'US') {
        return $this->api->makeRequest('GET', "artists/{$artistId}/top-tracks", [
            'query' => ['market' => $market]
        ]);
    }
    
    /**
     * Pobiera powiązanych artystów (wymaga rozszerzonego dostępu)
     */
    public function getRelatedArtists($artistId) {
        return $this->api->makeRequest('GET', "artists/{$artistId}/related-artists");
    }
}
```

## Implementacja w PHP

### Zalecana biblioteka: jwilsson/spotify-web-api-php

**Instalacja:**
```bash
composer require jwilsson/spotify-web-api-php
```

**Podstawowa konfiguracja:**
```php
<?php
require 'vendor/autoload.php';

use SpotifyWebAPI\Session;
use SpotifyWebAPI\SpotifyWebAPI;

// Inicjalizacja sesji OAuth
$session = new Session(
    'CLIENT_ID',
    'CLIENT_SECRET', 
    'REDIRECT_URI'
);

// Inicjalizacja API klienta
$api = new SpotifyWebAPI();

// Ustawienie tokena dostępu
$api->setAccessToken($accessToken);

// Przykład użycia
$results = $api->search('Adele', 'artist');
print_r($results);
?>
```

### Kompletna klasa API klienta

```php
<?php
class SpotifyApiClient {
    private $session;
    private $api;
    private $tokenManager;
    
    public function __construct($clientId, $clientSecret, $redirectUri) {
        $this->session = new Session($clientId, $clientSecret, $redirectUri);
        $this->api = new SpotifyWebAPI();
        $this->tokenManager = new SpotifyTokenManager();
    }
    
    /**
     * Wykonuje zapytanie API z automatycznym odświeżaniem tokena
     */
    public function makeRequest($method, $endpoint, $params = []) {
        // Sprawdź i odśwież token jeśli potrzeba
        $this->ensureValidToken();
        
        try {
            return $this->executeRequest($method, $endpoint, $params);
        } catch (SpotifyWebAPIException $e) {
            if ($e->getCode() === 401) {
                // Token wygasł - spróbuj odświeżyć
                $this->refreshToken();
                return $this->executeRequest($method, $endpoint, $params);
            }
            
            throw $this->handleApiError($e);
        }
    }
    
    private function ensureValidToken() {
        $token = $this->tokenManager->getCurrentToken();
        
        if (!$token || $this->tokenManager->isTokenExpired($token)) {
            $this->refreshToken();
        }
        
        $this->api->setAccessToken($token['access_token']);
    }
    
    private function refreshToken() {
        $refreshToken = $this->tokenManager->getRefreshToken();
        
        if (!$refreshToken) {
            throw new SpotifyAuthException('Brak refresh tokena - wymagana ponowna autoryzacja');
        }
        
        try {
            $this->session->refreshAccessToken($refreshToken);
            
            $newToken = [
                'access_token' => $this->session->getAccessToken(),
                'refresh_token' => $this->session->getRefreshToken(),
                'expires_in' => 3600,
                'created_at' => time()
            ];
            
            $this->tokenManager->saveToken($newToken);
            $this->api->setAccessToken($newToken['access_token']);
            
        } catch (Exception $e) {
            throw new SpotifyAuthException('Odświeżanie tokena nie powiodło się: ' . $e->getMessage());
        }
    }
    
    private function executeRequest($method, $endpoint, $params) {
        // Implementacja z obsługą rate limitingu
        $maxRetries = 3;
        $attempt = 0;
        
        while ($attempt < $maxRetries) {
            try {
                switch (strtoupper($method)) {
                    case 'GET':
                        return $this->api->getGeneric($endpoint, $params);
                    case 'POST':
                        return $this->api->postGeneric($endpoint, $params);
                    case 'PUT':
                        return $this->api->putGeneric($endpoint, $params);
                    case 'DELETE':
                        return $this->api->deleteGeneric($endpoint, $params);
                    default:
                        throw new InvalidArgumentException("Nieobsługiwana metoda HTTP: {$method}");
                }
            } catch (SpotifyWebAPIException $e) {
                if ($e->getCode() === 429) {
                    // Rate limiting - wykładnicze backoff
                    $delay = pow(2, $attempt) + rand(0, 1000) / 1000; // Jitter
                    sleep($delay);
                    $attempt++;
                    continue;
                }
                throw $e;
            }
        }
        
        throw new SpotifyApiException('Przekroczono limit ponownych prób');
    }
}

/**
 * Zarządza tokenami Spotify
 */
class SpotifyTokenManager {
    private $pdo;
    
    public function __construct() {
        $this->pdo = new PDO(
            "mysql:host=" . $_ENV['DB_HOST'] . ";dbname=" . $_ENV['DB_NAME'],
            $_ENV['DB_USER'],
            $_ENV['DB_PASS']
        );
    }
    
    public function saveToken($token) {
        $stmt = $this->pdo->prepare(
            "INSERT INTO spotify_tokens (user_id, access_token, refresh_token, expires_at) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             access_token = VALUES(access_token),
             refresh_token = VALUES(refresh_token),
             expires_at = VALUES(expires_at)"
        );
        
        $expiresAt = date('Y-m-d H:i:s', $token['created_at'] + $token['expires_in']);
        
        $stmt->execute([
            $_SESSION['user_id'],
            hash('sha256', $token['access_token']), // Przechowuj zahashowane
            $token['refresh_token'] ? hash('sha256', $token['refresh_token']) : null,
            $expiresAt
        ]);
    }
    
    public function getCurrentToken() {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM spotify_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
        );
        $stmt->execute([$_SESSION['user_id']]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function isTokenExpired($token) {
        return strtotime($token['expires_at']) <= (time() + 300); // 5 minut bufor
    }
}
?>
```

### Obsługa błędów i limitów zapytań

```php
<?php
class SpotifyErrorHandler {
    
    /**
     * Obsługuje błędy API Spotify
     */
    public static function handleException(SpotifyWebAPIException $e) {
        $code = $e->getCode();
        $message = $e->getMessage();
        
        switch ($code) {
            case 400:
                throw new SpotifyBadRequestException("Nieprawidłowe żądanie: {$message}");
            case 401:
                throw new SpotifyAuthException("Token nieważny lub wygasły: {$message}");
            case 403:
                throw new SpotifyForbiddenException("Niewystarczające uprawnienia: {$message}");
            case 404:
                throw new SpotifyNotFoundException("Zasób nie znaleziony: {$message}");
            case 429:
                $retryAfter = $e->getRetryAfter() ?? 1;
                throw new SpotifyRateLimitException("Limit zapytań przekroczony. Spróbuj za {$retryAfter}s");
            case 500:
            case 502:
            case 503:
                throw new SpotifyServerException("Błąd serwera Spotify: {$message}");
            default:
                throw new SpotifyApiException("Nieznany błąd API: {$message}", $code);
        }
    }
    
    /**
     * Implementuje wykładniczy backoff z jitter
     */
    public static function exponentialBackoff($attempt, $maxDelay = 60) {
        $delay = min(pow(2, $attempt), $maxDelay);
        $jitter = mt_rand(0, 1000) / 1000; // 0-1 sekunda jitter
        
        sleep($delay + $jitter);
    }
}

// Niestandardowe wyjątki
class SpotifyApiException extends Exception {}
class SpotifyAuthException extends SpotifyApiException {}
class SpotifyBadRequestException extends SpotifyApiException {}
class SpotifyForbiddenException extends SpotifyApiException {}
class SpotifyNotFoundException extends SpotifyApiException {}
class SpotifyRateLimitException extends SpotifyApiException {}
class SpotifyServerException extends SpotifyApiException {}
?>
```

## Najlepsze praktyki

### 1. Bezpieczeństwo uwierzytelniania

```php
// Bezpieczne przechowywanie konfiguracji
class SpotifyConfig {
    public static function getClientCredentials() {
        return [
            'client_id' => $_ENV['SPOTIFY_CLIENT_ID'] ?? null,
            'client_secret' => $_ENV['SPOTIFY_CLIENT_SECRET'] ?? null,
            'redirect_uri' => $_ENV['SPOTIFY_REDIRECT_URI'] ?? null
        ];
    }
    
    public static function validate() {
        $config = self::getClientCredentials();
        
        foreach ($config as $key => $value) {
            if (empty($value)) {
                throw new ConfigException("Brak wymaganej konfiguracji: {$key}");
            }
        }
        
        return true;
    }
}

// Używaj w .env file
// SPOTIFY_CLIENT_ID=your_client_id_here
// SPOTIFY_CLIENT_SECRET=your_client_secret_here
// SPOTIFY_REDIRECT_URI=https://yourdomain.com/callback
```

### 2. Zarządzanie limitami zapytań

```php
class SpotifyRateLimiter {
    private $redis;
    private $windowSize = 30; // 30 sekund
    private $maxRequests = 100; // maksymalnie 100 żądań na okno
    
    public function __construct() {
        $this->redis = new Redis();
        $this->redis->connect($_ENV['REDIS_HOST'], $_ENV['REDIS_PORT']);
    }
    
    public function checkLimit($userId) {
        $key = "spotify_rate_limit:{$userId}";
        $current = $this->redis->get($key) ?: 0;
        
        if ($current >= $this->maxRequests) {
            throw new SpotifyRateLimitException('Limit zapytań przekroczony');
        }
        
        $this->redis->incr($key);
        $this->redis->expire($key, $this->windowSize);
        
        return $this->maxRequests - $current - 1;
    }
}
```

### 3. Cachowanie odpowiedzi

```php
class SpotifyCacheManager {
    private $cache;
    
    public function __construct() {
        $this->cache = new Memcached();
        $this->cache->addServer($_ENV['MEMCACHED_HOST'], $_ENV['MEMCACHED_PORT']);
    }
    
    public function getCachedResponse($key) {
        return $this->cache->get($key);
    }
    
    public function setCachedResponse($key, $data, $ttl = 3600) {
        return $this->cache->set($key, $data, $ttl);
    }
    
    public function getCacheKey($endpoint, $params = []) {
        return 'spotify:' . md5($endpoint . serialize($params));
    }
}

// Użycie w API klient
public function makeRequestWithCache($method, $endpoint, $params = []) {
    $cacheKey = $this->cache->getCacheKey($endpoint, $params);
    $cachedResponse = $this->cache->getCachedResponse($cacheKey);
    
    if ($cachedResponse !== false) {
        return $cachedResponse;
    }
    
    $response = $this->makeRequest($method, $endpoint, $params);
    
    // Cache na 30 minut dla większości endpoints
    $this->cache->setCachedResponse($cacheKey, $response, 1800);
    
    return $response;
}
```

### 4. Testy jednostkowe

```php
use PHPUnit\Framework\TestCase;

class SpotifyApiClientTest extends TestCase {
    private $mockHttpClient;
    private $client;
    
    protected function setUp(): void {
        $this->mockHttpClient = $this->createMock(HttpClientInterface::class);
        $this->client = new SpotifyApiClient($this->mockHttpClient);
    }
    
    public function testSearchTracksReturnsExpectedData(): void {
        $expectedResponse = [
            'tracks' => [
                'items' => [
                    ['id' => '123', 'name' => 'Test Song']
                ]
            ]
        ];
        
        $this->mockHttpClient
            ->expects($this->once())
            ->method('request')
            ->willReturn(new Response(200, [], json_encode($expectedResponse)));
        
        $result = $this->client->searchTracks('test query');
        
        $this->assertArrayHasKey('tracks', $result);
        $this->assertCount(1, $result['tracks']['items']);
    }
    
    public function testHandlesRateLimitingCorrectly(): void {
        $this->mockHttpClient
            ->expects($this->once())
            ->method('request')
            ->willThrowException(new SpotifyRateLimitException('Rate limit exceeded'));
        
        $this->expectException(SpotifyRateLimitException::class);
        $this->client->searchTracks('test');
    }
}
```

### 5. Logowanie i monitoring

```php
class SpotifyApiLogger {
    private $logger;
    
    public function __construct() {
        $this->logger = new Logger('spotify_api');
        $this->logger->pushHandler(new StreamHandler($_ENV['LOG_PATH'], Logger::INFO));
    }
    
    public function logRequest($method, $endpoint, $params, $response, $duration) {
        $this->logger->info('Spotify API Request', [
            'method' => $method,
            'endpoint' => $endpoint,
            'params' => $params,
            'status_code' => $response['status'] ?? null,
            'duration_ms' => $duration,
            'user_id' => $_SESSION['user_id'] ?? null
        ]);
    }
    
    public function logError($error, $context = []) {
        $this->logger->error('Spotify API Error', [
            'error' => $error->getMessage(),
            'code' => $error->getCode(),
            'context' => $context,
            'trace' => $error->getTraceAsString()
        ]);
    }
}
```

## Rozwiązywanie problemów

### Często spotykane błędy

**1. Invalid client (błąd 401)**
```php
// Problem: Nieprawidłowy Client ID lub Client Secret
// Rozwiązanie:
SpotifyConfig::validate(); // Sprawdź konfigurację
// Upewnij się, że używasz właściwych danych z Spotify Dashboard
```

**2. Invalid redirect URI (błąd 400)**
```php
// Problem: Redirect URI nie pasuje do zarejestrowanego
// Rozwiązanie: Sprawdź dokładne dopasowanie w Spotify Dashboard
$redirectUri = 'https://yourdomain.com/callback'; // Musi być identyczne
```

**3. Rate limit exceeded (błąd 429)**
```php
// Problem: Przekroczenie limitu zapytań
// Rozwiązanie: Implementuj rate limiting i exponential backoff
try {
    $response = $api->makeRequest('GET', $endpoint);
} catch (SpotifyRateLimitException $e) {
    $retryAfter = $e->getRetryAfter() ?? 1;
    sleep($retryAfter);
    // Ponów zapytanie
}
```

**4. Insufficient scope (błęd 403)**
```php
// Problem: Token nie ma wymaganych uprawnień
// Rozwiązanie: Dodaj brakujące scopes do autoryzacji
$scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-modify-public' // Dodaj brakujący scope
];
```

### Debugowanie API

```php
class SpotifyDebugger {
    public static function debugRequest($method, $endpoint, $params, $response) {
        if ($_ENV['APP_DEBUG'] === 'true') {
            error_log("=== Spotify API Debug ===");
            error_log("Method: {$method}");
            error_log("Endpoint: {$endpoint}");
            error_log("Params: " . json_encode($params));
            error_log("Response: " . json_encode($response));
            error_log("========================");
        }
    }
    
    public static function validateToken($token) {
        if (!$token) {
            throw new SpotifyAuthException('Token jest pusty');
        }
        
        // Sprawdź format tokena
        if (!preg_match('/^[A-Za-z0-9\-_]+$/', $token)) {
            throw new SpotifyAuthException('Token ma nieprawidłowy format');
        }
        
        return true;
    }
    
    public static function checkApiHealth() {
        try {
            $client = new SpotifyClientCredentials(
                $_ENV['SPOTIFY_CLIENT_ID'], 
                $_ENV['SPOTIFY_CLIENT_SECRET']
            );
            $token = $client->getAccessToken();
            
            if (isset($token['access_token'])) {
                return ['status' => 'OK', 'message' => 'API działa poprawnie'];
            }
        } catch (Exception $e) {
            return ['status' => 'ERROR', 'message' => $e->getMessage()];
        }
    }
}
```

### Lista kontrolna przed wdrożeniem

1. **Konfiguracja:**
   - [ ] Client ID i Client Secret ustawione w zmiennych środowiskowych
   - [ ] Redirect URI zarejestrowane w Spotify Dashboard
   - [ ] HTTPS używane w produkcji

2. **Bezpieczeństwo:**
   - [ ] Tokeny przechowywane bezpiecznie (zahashowane)
   - [ ] Walidacja parametru `state` zaimplementowana
   - [ ] Sekrety nie hardkodowane w kodzie

3. **Obsługa błędów:**
   - [ ] Wszystkie kody błędów HTTP obsłużone
   - [ ] Rate limiting zaimplementowany
   - [ ] Exponential backoff wdrożony
   - [ ] Logowanie błędów skonfigurowane

4. **Performance:**
   - [ ] Cachowanie odpowiedzi API
   - [ ] Connection pooling dla HTTP klientów
   - [ ] Asynchroniczne żądania dla bulk operacji

5. **Monitoring:**
   - [ ] Metryki API (latencja, błędy, throughput)
   - [ ] Alerty dla wysokich błędów rate limit
   - [ ] Health check endpoints

To kończy kompletną dokumentację Spotify Web API w PHP. Dokumentacja zawiera wszystkie niezbędne informacje dla deweloperów chcących zintegrować swoje aplikacje PHP ze Spotify Web API, uwzględniając najnowsze zmiany i najlepsze praktyki na 2025 rok.
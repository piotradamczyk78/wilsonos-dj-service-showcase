<?php
/**
 * WilsonOS Spotify Service
 * Główny serwis do zarządzania odtwarzaniem muzyki
 * Created: 2025-09-08 18:52:16
 */

class SpotifyService {
    private $baseUrl = 'https://api.spotify.com/v1';
    private $tokenFile = 'spotify_tokens.json';
    
    public function __construct() {
        // Simplified constructor - no database needed
    }
    
    /**
     * Wykonuje zapytanie do API Spotify
     */
    private function makeRequest($method, $endpoint, $data = null) {
        $startTime = microtime(true);
        $accessToken = $this->getAccessToken();
        
        if (!$accessToken) {
            throw new Exception('Brak tokena dostępu');
        }
        
        $url = $this->baseUrl . '/' . ltrim($endpoint, '/');
        
        $ch = curl_init();
        $headers = [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ];
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => $headers
        ]);
        
        switch (strtoupper($method)) {
            case 'GET':
                if ($data) {
                    $url .= '?' . http_build_query($data);
                    curl_setopt($ch, CURLOPT_URL, $url);
                }
                break;
                
            case 'POST':
            case 'PUT':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
                if ($data) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                break;
                
            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                if ($data) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                break;
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $duration = round((microtime(true) - $startTime) * 1000);
        curl_close($ch);
        
        // Logowanie wywołania
        $this->logApiCall($endpoint, $method, $data, $response, $httpCode, $duration);
        
        if ($httpCode >= 400) {
            $errorData = json_decode($response, true);
            throw new Exception('Błąd API Spotify: ' . ($errorData['error']['message'] ?? 'Nieznany błąd'));
        }
        
        return json_decode($response, true);
    }
    
    /**
     * Pobiera token dostępu z pliku
     */
    private function getAccessToken() {
        if (file_exists($this->tokenFile)) {
            $tokenData = json_decode(file_get_contents($this->tokenFile), true);
            if ($tokenData && isset($tokenData['access_token'])) {
                return $tokenData['access_token'];
            }
        }
        return null;
    }
    
    /**
     * Pobiera stan odtwarzacza
     */
    public function getPlaybackState() {
        return $this->makeRequest('GET', 'me/player');
    }
    
    /**
     * Pobiera dostępne urządzenia
     */
    public function getAvailableDevices() {
        $response = $this->makeRequest('GET', 'me/player/devices');
        return $response['devices'] ?? [];
    }
    
    /**
     * Ustawia aktywne urządzenie
     */
    public function setActiveDevice($deviceId) {
        $this->makeRequest('PUT', 'me/player', ['device_ids' => [$deviceId]]);
        
        // Zapisz w konfiguracji
        $this->setConfig('current_device_id', $deviceId);
        
        return true;
    }
    
    /**
     * Wyszukuje utwory
     */
    public function searchTracks($query, $limit = 20) {
        $params = [
            'q' => $query,
            'type' => 'track',
            'limit' => $limit
        ];
        
        $response = $this->makeRequest('GET', 'search', $params);
        return $response['tracks']['items'] ?? [];
    }
    
    /**
     * Odtwarza utwór na określonej pozycji
     */
    public function playTrack($trackId, $positionMs = 0, $fadeIn = true) {
        $currentState = $this->getPlaybackState();
        
        // Jeśli coś już gra, wykonaj płynne przejście
        if ($currentState && $currentState['is_playing']) {
            if ($fadeIn) {
                $this->fadeOutCurrentTrack();
            } else {
                $this->pausePlayback();
            }
        }
        
        $data = [
            'uris' => ["spotify:track:$trackId"],
            'position_ms' => $positionMs
        ];
        
        $this->makeRequest('PUT', 'me/player/play', $data);
        
        // Logowanie odtwarzania (bez bazy danych)
        
        return true;
    }
    
    /**
     * Pauzuje odtwarzanie
     */
    public function pausePlayback() {
        $this->makeRequest('PUT', 'me/player/pause');
        return true;
    }
    
    /**
     * Wznawia odtwarzanie
     */
    public function resumePlayback() {
        $this->makeRequest('PUT', 'me/player/play');
        return true;
    }
    
    /**
     * Przechodzi do następnego utworu
     */
    public function skipToNext() {
        $this->makeRequest('POST', 'me/player/next');
        return true;
    }
    
    /**
     * Przechodzi do poprzedniego utworu
     */
    public function skipToPrevious() {
        $this->makeRequest('POST', 'me/player/previous');
        return true;
    }
    
    /**
     * Ustawia głośność
     */
    public function setVolume($volumePercent) {
        $params = ['volume_percent' => max(0, min(100, $volumePercent))];
        $this->makeRequest('PUT', 'me/player/volume', $params);
        return true;
    }
    
    /**
     * Płynnie wycisza aktualny utwór
     */
    public function fadeOutCurrentTrack($durationMs = 3000) {
        $currentState = $this->getPlaybackState();
        
        if (!$currentState || !$currentState['is_playing']) {
            return true;
        }
        
        $currentVolume = $currentState['device']['volume_percent'] ?? 50;
        $steps = 10;
        $stepDuration = $durationMs / $steps;
        $volumeStep = $currentVolume / $steps;
        
        for ($i = 0; $i < $steps; $i++) {
            $newVolume = max(0, $currentVolume - ($volumeStep * ($i + 1)));
            $this->setVolume($newVolume);
            usleep($stepDuration * 1000); // Konwersja na mikrosekundy
        }
        
        $this->pausePlayback();
        
        // Przywróć oryginalną głośność
        $this->setVolume($currentVolume);
        
        return true;
    }
    
    /**
     * Płynnie rozpoczyna nowy utwór
     */
    public function fadeInTrack($trackId, $positionMs = 0, $durationMs = 3000) {
        // Rozpocznij odtwarzanie z głośnością 0
        $this->setVolume(0);
        $this->playTrack($trackId, $positionMs, false);
        
        // Płynnie zwiększaj głośność
        $targetVolume = $this->getConfig('default_volume', 50);
        $steps = 10;
        $stepDuration = $durationMs / $steps;
        $volumeStep = $targetVolume / $steps;
        
        for ($i = 0; $i < $steps; $i++) {
            $newVolume = $volumeStep * ($i + 1);
            $this->setVolume($newVolume);
            usleep($stepDuration * 1000);
        }
        
        return true;
    }
    
    /**
     * Płynne przejście między utworami
     */
    public function smoothTransition($newTrackId, $positionMs = 0, $fadeDurationMs = 3000) {
        $this->fadeOutCurrentTrack($fadeDurationMs);
        usleep(500000); // Krótka pauza 0.5s
        $this->fadeInTrack($newTrackId, $positionMs, $fadeDurationMs);
        
        return true;
    }
    
    /**
     * Pobiera informacje o utworze
     */
    public function getTrackInfo($trackId) {
        return $this->makeRequest('GET', "tracks/$trackId");
    }
    
    /**
     * Pobiera konfigurację (uproszczona wersja bez bazy)
     */
    private function getConfig($key, $default = null) {
        // Domyślne wartości bez bazy danych
        $configs = [
            'default_volume' => 50,
            'current_device_id' => null
        ];
        
        return $configs[$key] ?? $default;
    }
    
    /**
     * Ustawia konfigurację (uproszczona wersja bez bazy)
     */
    private function setConfig($key, $value) {
        // W uproszczonej wersji nie zapisujemy konfiguracji
        return true;
    }
    
    /**
     * Loguje wywołania API (uproszczona wersja)
     */
    private function logApiCall($endpoint, $method, $requestData, $responseData, $statusCode, $duration) {
        // W uproszczonej wersji nie logujemy do bazy
        error_log("Spotify API: $method $endpoint - $statusCode ({$duration}ms)");
    }
    
    /**
     * Sprawdza stan serwisu
     */
    public function getServiceStatus() {
        try {
            $token = $this->getAccessToken();
            $playbackState = $this->getPlaybackState();
            $devices = $this->getAvailableDevices();
            
            return [
                'status' => 'ok',
                'token' => $token ? 'available' : 'missing',
                'playback' => $playbackState ? [
                    'is_playing' => $playbackState['is_playing'],
                    'device' => $playbackState['device']['name'] ?? 'Nieznane',
                    'track' => $playbackState['item']['name'] ?? 'Brak'
                ] : null,
                'devices' => count($devices),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
}
?>

<?php
/**
 * WilsonOS Spotify API - Uproszczona wersja
 * Kontrola odtwarzania bez bazy danych
 * Created: 2025-09-08 18:52:16
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Obsługa preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Ładowanie konfiguracji
$config = parse_ini_file('config.ini');

// Pobierz metodę HTTP i endpoint
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/spotify_api_simple.php', '', $path);
$path = trim($path, '/');

// Pobierz dane z request body
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

// Funkcja do wykonywania zapytań do Spotify API
function makeSpotifyRequest($endpoint, $method = 'GET', $data = null) {
    global $config;
    
    $accessToken = $config['ACCESS_TOKEN'];
    if (!$accessToken) {
        throw new Exception('Brak tokena dostępu');
    }
    
    $url = 'https://api.spotify.com/v1/' . ltrim($endpoint, '/');
    
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
    curl_close($ch);
    
    if ($httpCode >= 400) {
        $errorData = json_decode($response, true);
        throw new Exception('Błąd API Spotify: ' . ($errorData['error']['message'] ?? 'Nieznany błąd'));
    }
    
    return json_decode($response, true);
}

// Routing
try {
    switch ($path) {
        case 'status':
            if ($method === 'GET') {
                $playbackState = makeSpotifyRequest('me/player');
                $devices = makeSpotifyRequest('me/player/devices');
                
                $status = [
                    'status' => 'ok',
                    'playback' => $playbackState ? [
                        'is_playing' => $playbackState['is_playing'],
                        'device' => $playbackState['device']['name'] ?? 'Nieznane',
                        'track' => $playbackState['item']['name'] ?? 'Brak',
                        'artist' => $playbackState['item']['artists'][0]['name'] ?? 'Brak'
                    ] : null,
                    'devices' => count($devices['devices'] ?? []),
                    'timestamp' => date('Y-m-d H:i:s')
                ];
                
                echo json_encode($status);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'search':
            if ($method === 'GET' || $method === 'POST') {
                $query = $input['query'] ?? $_GET['query'] ?? '';
                $limit = $input['limit'] ?? $_GET['limit'] ?? 20;
                
                if (empty($query)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Brak zapytania wyszukiwania']);
                    break;
                }
                
                $results = makeSpotifyRequest('search', 'GET', [
                    'q' => $query,
                    'type' => 'track',
                    'limit' => $limit
                ]);
                
                echo json_encode(['tracks' => $results['tracks']['items'] ?? []]);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'play':
            if ($method === 'POST') {
                $trackId = $input['track_id'] ?? null;
                $position = $input['position_ms'] ?? 0;
                
                if (!$trackId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Brak ID utworu']);
                    break;
                }
                
                $data = [
                    'uris' => ["spotify:track:$trackId"],
                    'position_ms' => $position
                ];
                
                makeSpotifyRequest('me/player/play', 'PUT', $data);
                echo json_encode(['success' => true, 'message' => 'Utwór odtwarzany']);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'pause':
            if ($method === 'POST') {
                makeSpotifyRequest('me/player/pause', 'PUT');
                echo json_encode(['success' => true, 'message' => 'Odtwarzanie wstrzymane']);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'resume':
            if ($method === 'POST') {
                makeSpotifyRequest('me/player/play', 'PUT');
                echo json_encode(['success' => true, 'message' => 'Odtwarzanie wznowione']);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'next':
            if ($method === 'POST') {
                makeSpotifyRequest('me/player/next', 'POST');
                echo json_encode(['success' => true, 'message' => 'Następny utwór']);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'previous':
            if ($method === 'POST') {
                makeSpotifyRequest('me/player/previous', 'POST');
                echo json_encode(['success' => true, 'message' => 'Poprzedni utwór']);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'volume':
            if ($method === 'POST') {
                $volume = $input['volume'] ?? null;
                
                if ($volume === null || $volume < 0 || $volume > 100) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Nieprawidłowa wartość głośności (0-100)']);
                    break;
                }
                
                makeSpotifyRequest('me/player/volume', 'PUT', ['volume_percent' => $volume]);
                echo json_encode(['success' => true, 'message' => "Głośność ustawiona na {$volume}%"]);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'devices':
            if ($method === 'GET') {
                $devices = makeSpotifyRequest('me/player/devices');
                echo json_encode(['devices' => $devices['devices'] ?? []]);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'set-device':
            if ($method === 'POST') {
                $deviceId = $input['device_id'] ?? null;
                
                if (!$deviceId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Brak ID urządzenia']);
                    break;
                }
                
                makeSpotifyRequest('me/player', 'PUT', ['device_ids' => [$deviceId]]);
                echo json_encode(['success' => true, 'message' => 'Urządzenie ustawione']);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'track-info':
            if ($method === 'GET') {
                $trackId = $_GET['track_id'] ?? null;
                
                if (!$trackId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Brak ID utworu']);
                    break;
                }
                
                $trackInfo = makeSpotifyRequest("tracks/$trackId");
                echo json_encode(['track' => $trackInfo]);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        default:
            // Endpoint nie znaleziony - zwróć dostępne endpointy
            $endpoints = [
                'GET /status' => 'Sprawdza stan serwisu',
                'GET /search?query=...&limit=20' => 'Wyszukuje utwory',
                'POST /play' => 'Odtwarza utwór (track_id, position_ms)',
                'POST /pause' => 'Wstrzymuje odtwarzanie',
                'POST /resume' => 'Wznawia odtwarzanie',
                'POST /next' => 'Następny utwór',
                'POST /previous' => 'Poprzedni utwór',
                'POST /volume' => 'Ustawia głośność (volume: 0-100)',
                'GET /devices' => 'Lista dostępnych urządzeń',
                'POST /set-device' => 'Ustawia aktywne urządzenie (device_id)',
                'GET /track-info?track_id=...' => 'Informacje o utworze'
            ];
            
            echo json_encode([
                'message' => 'WilsonOS Spotify API - Uproszczona wersja',
                'version' => '1.0-simple',
                'endpoints' => $endpoints
            ]);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Błąd serwera',
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>

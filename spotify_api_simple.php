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
            
        case 'play-playlist':
            if ($method === 'POST') {
                $artist = $input['artist'] ?? null;
                $limit = $input['limit'] ?? 10;
                
                if (!$artist) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Brak nazwy artysty']);
                    break;
                }
                
                // Wyszukaj utwory artysty
                $results = makeSpotifyRequest('search', 'GET', [
                    'q' => "artist:$artist",
                    'type' => 'track',
                    'limit' => $limit
                ]);
                
                $tracks = $results['tracks']['items'] ?? [];
                
                if (empty($tracks)) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Nie znaleziono utworów artysty']);
                    break;
                }
                
                // METODA 1: Spróbuj z uris array (jak w kodzie)
                $uris = array_map(function($track) {
                    return "spotify:track:" . $track['id'];
                }, $tracks);
                
                $data = [
                    'uris' => $uris,
                    'position_ms' => 0
                ];
                
                try {
                    makeSpotifyRequest('me/player/play', 'PUT', $data);
                    $method_used = 'uris_array';
                } catch (Exception $e) {
                    // METODA 2: Fallback - stwórz playlistę i odtwórz przez context_uri
                    try {
                        // Pobierz user ID
                        $user = makeSpotifyRequest('me');
                        $userId = $user['id'];
                        
                        // Stwórz playlistę
                        $playlistData = [
                            'name' => "Wilson DJ - $artist Mix",
                            'description' => "Automatycznie utworzona playlista przez Wilson DJ",
                            'public' => false
                        ];
                        
                        $playlist = makeSpotifyRequest("users/$userId/playlists", 'POST', $playlistData);
                        $playlistId = $playlist['id'];
                        
                        // Dodaj utwory do playlisty
                        makeSpotifyRequest("playlists/$playlistId/tracks", 'POST', ['uris' => $uris]);
                        
                        // Odtwórz playlistę
                        $playlistData = [
                            'context_uri' => "spotify:playlist:$playlistId"
                        ];
                        
                        makeSpotifyRequest('me/player/play', 'PUT', $playlistData);
                        $method_used = 'playlist_context';
                        
                    } catch (Exception $e2) {
                        // METODA 3: Ostatnia deska ratunku - odtwórz pierwszy utwór
                        $firstTrack = $tracks[0];
                        $trackId = $firstTrack['id'];
                        
                        $data = [
                            'uris' => ["spotify:track:$trackId"],
                            'position_ms' => 0
                        ];
                        
                        makeSpotifyRequest('me/player/play', 'PUT', $data);
                        $method_used = 'single_track_fallback';
                    }
                }
                
                echo json_encode([
                    'success' => true, 
                    'message' => "Odtwarzanie playlisty $artist ($limit utworów) - metoda: $method_used",
                    'current_track' => $tracks[0]['name'],
                    'method' => $method_used,
                    'playlist' => array_map(function($track) {
                        return [
                            'name' => $track['name'],
                            'id' => $track['id'],
                            'duration' => $track['duration_ms']
                        ];
                    }, $tracks)
                ]);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'add-to-queue':
            if ($method === 'POST') {
                $trackId = $input['track_id'] ?? null;
                
                if (!$trackId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Brak ID utworu']);
                    break;
                }
                
                $uri = "spotify:track:$trackId";
                makeSpotifyRequest("me/player/queue?uri=" . urlencode($uri), 'POST');
                
                echo json_encode([
                    'success' => true,
                    'message' => "Dodano utwór do kolejki",
                    'track_id' => $trackId
                ]);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'clear-queue':
            if ($method === 'POST') {
                // Spotify nie ma bezpośredniego API do czyszczenia kolejki
                // Możemy spróbować zatrzymać odtwarzanie i przejść do następnego utworu
                // aż kolejka się opróżni, ale to może być problematyczne
                // Alternatywnie - poinformujemy użytkownika o ograniczeniu
                echo json_encode([
                    'success' => true,
                    'message' => 'Spotify nie pozwala na bezpośrednie czyszczenie kolejki. Użyj "next" aby przejść przez utwory.',
                    'note' => 'Możesz użyć /next wielokrotnie aby przejść przez kolejkę'
                ]);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'create-playlist':
            if ($method === 'POST') {
                $name = $input['name'] ?? null;
                $description = $input['description'] ?? '';
                $tracks = $input['tracks'] ?? []; // Array of track IDs
                $isPublic = $input['public'] ?? false;
                
                if (!$name) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Brak nazwy playlisty']);
                    break;
                }
                
                // Pobierz ID użytkownika
                $userInfo = makeSpotifyRequest('me');
                $userId = $userInfo['id'];
                
                // Utwórz playlistę
                $playlistData = [
                    'name' => $name,
                    'description' => $description,
                    'public' => $isPublic
                ];
                
                $playlist = makeSpotifyRequest("users/$userId/playlists", 'POST', $playlistData);
                $playlistId = $playlist['id'];
                
                // Dodaj utwory do playlisty (maksymalnie 100 na raz)
                if (!empty($tracks)) {
                    $trackUris = array_map(function($trackId) {
                        return "spotify:track:$trackId";
                    }, $tracks);
                    
                    // Spotify pozwala na dodanie maksymalnie 100 utworów na raz
                    $chunks = array_chunk($trackUris, 100);
                    foreach ($chunks as $chunk) {
                        makeSpotifyRequest("playlists/$playlistId/tracks", 'POST', [
                            'uris' => $chunk
                        ]);
                    }
                }
                
                echo json_encode([
                    'success' => true,
                    'message' => "Utworzono playlistę: $name",
                    'playlist_id' => $playlistId,
                    'playlist_url' => $playlist['external_urls']['spotify'],
                    'tracks_added' => count($tracks)
                ]);
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Metoda nie dozwolona']);
            }
            break;
            
        case 'playlist-management':
            if ($method === 'GET') {
                // Lista wszystkich playlist użytkownika
                $playlists = makeSpotifyRequest('me/playlists?limit=50');
                
                echo json_encode([
                    'success' => true,
                    'playlists' => $playlists['items'],
                    'total' => $playlists['total']
                ]);
            } elseif ($method === 'POST') {
                $action = $input['action'] ?? null;
                
                switch ($action) {
                    case 'rename':
                        $playlistId = $input['playlist_id'] ?? null;
                        $newName = $input['new_name'] ?? null;
                        
                        if (!$playlistId || !$newName) {
                            http_response_code(400);
                            echo json_encode(['error' => 'Brak playlist_id lub new_name']);
                            break;
                        }
                        
                        makeSpotifyRequest("playlists/$playlistId", 'PUT', [
                            'name' => $newName
                        ]);
                        
                        echo json_encode([
                            'success' => true,
                            'message' => "Zmieniono nazwę playlisty na: $newName"
                        ]);
                        break;
                        
                    case 'update_description':
                        $playlistId = $input['playlist_id'] ?? null;
                        $description = $input['description'] ?? '';
                        
                        if (!$playlistId) {
                            http_response_code(400);
                            echo json_encode(['error' => 'Brak playlist_id']);
                            break;
                        }
                        
                        makeSpotifyRequest("playlists/$playlistId", 'PUT', [
                            'description' => $description
                        ]);
                        
                        echo json_encode([
                            'success' => true,
                            'message' => "Zaktualizowano opis playlisty"
                        ]);
                        break;
                        
                    case 'delete':
                        $playlistId = $input['playlist_id'] ?? null;
                        
                        if (!$playlistId) {
                            http_response_code(400);
                            echo json_encode(['error' => 'Brak playlist_id']);
                            break;
                        }
                        
                        // Pobierz ID użytkownika
                        $userInfo = makeSpotifyRequest('me');
                        $userId = $userInfo['id'];
                        
                        makeSpotifyRequest("playlists/$playlistId/followers", 'DELETE');
                        
                        echo json_encode([
                            'success' => true,
                            'message' => "Usunięto playlistę"
                        ]);
                        break;
                        
                    case 'get_tracks':
                        $playlistId = $input['playlist_id'] ?? null;
                        
                        if (!$playlistId) {
                            http_response_code(400);
                            echo json_encode(['error' => 'Brak playlist_id']);
                            break;
                        }
                        
                        $tracks = makeSpotifyRequest("playlists/$playlistId/tracks?limit=100");
                        
                        echo json_encode([
                            'success' => true,
                            'tracks' => $tracks['items'],
                            'total' => $tracks['total']
                        ]);
                        break;
                        
                    case 'add_tracks':
                        $playlistId = $input['playlist_id'] ?? null;
                        $tracks = $input['tracks'] ?? [];
                        
                        if (!$playlistId || empty($tracks)) {
                            http_response_code(400);
                            echo json_encode(['error' => 'Brak playlist_id lub tracks']);
                            break;
                        }
                        
                        $trackUris = array_map(function($trackId) {
                            return "spotify:track:$trackId";
                        }, $tracks);
                        
                        // Spotify pozwala na dodanie maksymalnie 100 utworów na raz
                        $chunks = array_chunk($trackUris, 100);
                        foreach ($chunks as $chunk) {
                            makeSpotifyRequest("playlists/$playlistId/tracks", 'POST', [
                                'uris' => $chunk
                            ]);
                        }
                        
                        echo json_encode([
                            'success' => true,
                            'message' => "Dodano " . count($tracks) . " utworów do playlisty"
                        ]);
                        break;
                        
                    case 'remove_tracks':
                        $playlistId = $input['playlist_id'] ?? null;
                        $tracks = $input['tracks'] ?? [];
                        
                        if (!$playlistId || empty($tracks)) {
                            http_response_code(400);
                            echo json_encode(['error' => 'Brak playlist_id lub tracks']);
                            break;
                        }
                        
                        $trackUris = array_map(function($trackId) {
                            return "spotify:track:$trackId";
                        }, $tracks);
                        
                        makeSpotifyRequest("playlists/$playlistId/tracks", 'DELETE', [
                            'tracks' => array_map(function($uri) {
                                return ['uri' => $uri];
                            }, $trackUris)
                        ]);
                        
                        echo json_encode([
                            'success' => true,
                            'message' => "Usunięto " . count($tracks) . " utworów z playlisty"
                        ]);
                        break;
                        
                    default:
                        http_response_code(400);
                        echo json_encode(['error' => 'Nieznana akcja. Dostępne: rename, update_description, delete, get_tracks, add_tracks, remove_tracks']);
                }
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
                'POST /play-playlist' => 'Odtwarza playlistę artysty (artist, limit) - 3 metody fallback',
                'POST /add-to-queue' => 'Dodaje utwór do kolejki (track_id)',
                'POST /clear-queue' => 'Informuje o ograniczeniach Spotify API (nie można bezpośrednio wyczyścić kolejki)',
                'POST /create-playlist' => 'Tworzy nową playlistę w Spotify (name, description, tracks[], public)',
                'GET /playlist-management' => 'Lista wszystkich playlist użytkownika',
                'POST /playlist-management' => 'Zarządzanie playlistami (action: rename, update_description, delete, get_tracks, add_tracks, remove_tracks)',
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

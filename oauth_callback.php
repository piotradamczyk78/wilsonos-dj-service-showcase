<?php
/**
 * WilsonOS Spotify OAuth Callback
 * Obsługuje zwrot z autoryzacji Spotify
 * Created: 2025-09-08 18:52:16
 */

// Ładowanie konfiguracji
$config = parse_ini_file('config.ini');

// Sprawdź czy otrzymaliśmy kod autoryzacji
if (isset($_GET['code'])) {
    $code = $_GET['code'];
    
    try {
        // Wymień kod na token
        $data = http_build_query([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $config['REDIRECT_URI']
        ]);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://accounts.spotify.com/api/token',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $data,
            CURLOPT_HTTPHEADER => [
                'Authorization: Basic ' . base64_encode($config['SPOTIFY_CLIENT_ID'] . ':' . $config['SPOTIFY_CLIENT_SECRET']),
                'Content-Type: application/x-www-form-urlencoded'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('Wymiana kodu na token nie powiodła się: ' . $response);
        }
        
        $tokenData = json_decode($response, true);
        
        // Zapisz token do pliku
        $tokenFile = 'spotify_token.json';
        file_put_contents($tokenFile, json_encode($tokenData));
        
        // Aktualizuj config.ini z nowym tokenem
        $configContent = file_get_contents('config.ini');
        $configContent = preg_replace(
            '/ACCESS_TOKEN="[^"]*"/',
            'ACCESS_TOKEN="' . $tokenData['access_token'] . '"',
            $configContent
        );
        file_put_contents('config.ini', $configContent);
        
        // Sukces - przekieruj z komunikatem
        $successUrl = $config['WILSONOS_HTTP'] . '?spotify_auth=success';
        header("Location: $successUrl");
        exit();
        
    } catch (Exception $e) {
        // Błąd - przekieruj z komunikatem błędu
        $errorUrl = $config['WILSONOS_HTTP'] . '?spotify_auth=error&message=' . urlencode($e->getMessage());
        header("Location: $errorUrl");
        exit();
    }
    
} elseif (isset($_GET['error'])) {
    // Błąd autoryzacji
    $error = $_GET['error'];
    $errorDescription = $_GET['error_description'] ?? 'Nieznany błąd';
    
    $errorUrl = $config['WILSONOS_HTTP'] . '?spotify_auth=error&message=' . urlencode($errorDescription);
    header("Location: $errorUrl");
    exit();
    
} else {
    // Brak parametrów - wygeneruj URL autoryzacji
    $scopes = [
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'user-read-private',
        'user-read-email'
    ];
    
    $params = http_build_query([
        'client_id' => $config['SPOTIFY_CLIENT_ID'],
        'response_type' => 'code',
        'redirect_uri' => $config['REDIRECT_URI'],
        'scope' => implode(' ', $scopes),
        'show_dialog' => 'false'
    ]);
    
    $authUrl = 'https://accounts.spotify.com/authorize?' . $params;
    header("Location: $authUrl");
    exit();
}
?>
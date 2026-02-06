#!/bin/bash

# Wilson DJ - Auto Token Refresh Script
# Automatycznie odświeża token co 50 minut
# Autor: Wilson DJ
# Data: 2025-09-09

echo "🎧 Wilson DJ - Auto Token Refresh"
echo "================================================"
echo "Automatyczne odświeżanie tokena co 50 minut"
echo "Naciśnij Ctrl+C aby zatrzymać"
echo ""

# Funkcja do odświeżania tokena
refresh_token() {
    echo "🔄 $(date '+%Y-%m-%d %H:%M:%S') - Odświeżam token..."
    
    RESPONSE=$(wget -qO- "http://wilsonos.com/refresh_token.php" 2>&1)
    
    if echo "$RESPONSE" | grep -q "Token odświeżony pomyślnie\|✓ Token odświeżony\|Nowy token"; then
        echo "✅ $(date '+%Y-%m-%d %H:%M:%S') - Token odświeżony pomyślnie!"
        return 0
    else
        echo "❌ $(date '+%Y-%m-%d %H:%M:%S') - Błąd odświeżania tokena!"
        echo "Odpowiedź: $RESPONSE"
        return 1
    fi
}

# Sprawdź czy wget jest dostępny
if ! command -v wget &> /dev/null; then
    echo "❌ Błąd: wget nie jest zainstalowany!"
    exit 1
fi

# Sprawdź czy refresh_token.php jest dostępny
if ! wget -q --spider "http://wilsonos.com/refresh_token.php"; then
    echo "❌ Błąd: Nie można połączyć się z serwerem!"
    echo "Sprawdź czy serwer jest dostępny: http://wilsonos.com/refresh_token.php"
    exit 1
fi

# Pierwsze odświeżenie
echo "🚀 Rozpoczynam pierwsze odświeżenie..."
refresh_token

# Pętla odświeżania co 50 minut (3000 sekund)
while true; do
    echo "⏰ $(date '+%Y-%m-%d %H:%M:%S') - Czekam 50 minut do następnego odświeżenia..."
    sleep 3000
    
    refresh_token
done

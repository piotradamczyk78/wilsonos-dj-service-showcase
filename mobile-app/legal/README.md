# Legal Documents

Dokumenty prawne wymagane przez Google Play Store.

## Pliki

- `privacy-policy.html` - Polityka Prywatności (RODO-compliant)
- `terms-of-service.html` - Regulamin Serwisu

## Hosting

Te pliki muszą być publicznie dostępne online. Opcje:

### Opcja 1: GitHub Pages (darmowy, szybki)

```bash
# 1. Skopiuj pliki do osobnego repo z enabled GitHub Pages
# 2. URL będzie: https://username.github.io/repo-name/privacy-policy.html

# Lub użyj głównej strony Octadecimal:
# https://octadecimal.pl/wilsonos-dj/privacy-policy.html
# https://octadecimal.pl/wilsonos-dj/terms-of-service.html
```

### Opcja 2: Netlify/Vercel (darmowy, auto-deploy)

```bash
# Deploy tego folderu jako static site
netlify deploy --dir=legal --prod
```

### Opcja 3: Własny serwer

```bash
# Upload przez FTP/SFTP do octadecimal.pl/wilsonos-dj/
scp legal/*.html user@octadecimal.pl:/var/www/html/wilsonos-dj/
```

## Dodanie linków do Google Play Console

Po wdrożeniu, dodaj URLs w Google Play Console:

1. **Store Listing → Privacy Policy:**
   - https://octadecimal.pl/wilsonos-dj/privacy-policy.html

2. **Metadata → Terms of Service (opcjonalne ale zalecane):**
   - https://octadecimal.pl/wilsonos-dj/terms-of-service.html

## Aktualizacje

Każda zmiana w polityce/regulaminie = zmień datę "Ostatnia aktualizacja" + poinformuj użytkowników.

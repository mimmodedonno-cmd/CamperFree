# CamperFree PWA 1.3

Pacchetto completo e pulito per GitHub e Vercel.

## File inclusi

- `index.html` — applicazione CamperFree
- `manifest.webmanifest` — configurazione PWA
- `sw.js` — service worker/cache versione 1.3
- `icon.png` — icona principale
- `icons/icon-192.png` — icona Android/PWA
- `icons/icon-512.png` — icona alta risoluzione / maskable

## Pubblicazione su GitHub

Caricare **i file estratti**, non il file ZIP.
La struttura deve rimanere così:

CamperFree/
├── index.html
├── manifest.webmanifest
├── sw.js
├── icon.png
└── icons/
    ├── icon-192.png
    └── icon-512.png

## Pubblicazione su Vercel

Collegare il repository GitHub `CamperFree` a Vercel.
Non serve framework: il progetto è statico.
La root del progetto deve contenere `index.html`.

## Installazione

### iPhone / iPad
Aprire il sito in Safari → Condividi → Aggiungi alla schermata Home.

### Android
Aprire il sito in Chrome → menu → Installa app / Aggiungi a schermata Home.

## Nota sulle mappe

La mappa e i servizi cartografici richiedono connessione internet.
Il service worker mantiene in cache l'interfaccia principale dell'app, ma non garantisce mappe complete offline.

## Versione

CamperFree PWA 1.3.0

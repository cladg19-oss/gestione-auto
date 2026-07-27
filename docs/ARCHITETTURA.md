# Architettura di La Mia Auto

## Versione 9.0.0

Il refactoring viene eseguito in fasi ridotte per non compromettere la compatibilità con i dati già salvati.

### Struttura attuale

- `index.html`: struttura dell'interfaccia.
- `style.css`: stile generale.
- `app.js`: logica dell'interfaccia e dei moduli funzionali.
- `js/storage.js`: caricamento, normalizzazione, salvataggio, esportazione e importazione dei dati.
- `sw.js`: cache PWA.

### Persistenza

La chiave resta invariata:

```js
const STORAGE_KEY='miaAutoDataV2';
```

`storage.js` normalizza sempre la struttura letta, conservando la compatibilità con i backup e con le versioni precedenti.

### Prossime fasi

1. Estrarre utilità comuni e formattazione.
2. Separare Dashboard e navigazione.
3. Separare Garage, rifornimenti, spese, manutenzioni e scadenze.
4. Aggiungere test automatici sulle funzioni di persistenza.

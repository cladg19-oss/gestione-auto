## 9.2.2 — Build 00044
- Corretto il falso riconoscimento della carta di circolazione come ricevuta carburante.
- Nuova classificazione a punteggio con priorità ai segnali strutturali del libretto.
- Il nome del file viene usato come ulteriore indizio.
- Per il libretto non vengono più proposti importi, distributori o attività casuali.
- Titolo automatico più descrittivo per la carta di circolazione.

## 9.2.1 — Build 00043

- Scansione automatica di immagini e PDF con OCR in italiano.
- Riconoscimento automatico di ricevute carburante, revisioni, RCA, bollo, fatture e gomme.
- Compilazione automatica di titolo, categoria, data e note.
- Estrazione di importo, distributore/officina, indirizzo, targa, chilometri, litri, prezzo al litro, scadenza ed esito quando presenti.
- Conferma visiva dei dati riconosciuti prima del salvataggio.
- Creazione opzionale automatica del relativo rifornimento, manutenzione o scadenza.
- Ricerca documenti estesa al testo estratto.
- Nessuna modifica alla chiave `miaAutoDataV2`.

# Changelog

## 9.1.0 — Build 00041
- Nuova Timeline completa dell’auto.
- Ricerca testuale su tutti gli eventi.
- Filtri per rifornimenti, spese, manutenzioni e scadenze.
- Raggruppamento cronologico e scheda dettaglio.
- Collegamenti a Google Maps e Waze quando è presente una posizione.
- Collegamento diretto dalla Timeline alla sezione originale.


## 9.0.0 — Build 00039

- Prima fase del refactoring tecnico.
- Creato `js/storage.js` per centralizzare persistenza e backup.
- Mantenuta la chiave `miaAutoDataV2`.
- Aggiunta normalizzazione completa dei dati caricati.
- Migliorata la validazione dei backup importati.
- Aggiornata la cache PWA.
- Aggiunta la documentazione dell'architettura.

## 8.5.0 — Build 00038

- Home intelligente.
- Suggerimenti automatici.
- Confronto delle spese mensili.
- Attività recenti.

## 9.0.1 — Build 00040

### Architettura
- Creato `js/utils.js` per formattazione, date, sicurezza HTML e generazione ID.
- Creato `js/events.js` con un modello evento comune per Timeline e analisi future.
- Rimosse da `app.js` le utilità duplicate.
- Aggiunto `docs/MODELLO-DATI.md`.
- Aggiornata la cache PWA senza modificare la chiave dei dati locali.

## 9.2.0 — Build 00042
- Archivio documenti basato su IndexedDB.
- Caricamento locale di PDF, JPG, PNG, WebP, HEIC/HEIF quando supportati dal browser.
- Ricerca, filtro per categoria, anteprima, download ed eliminazione.
- Riepilogo numero file e spazio occupato.
- I documenti non sono ancora inclusi nel backup JSON del Garage.

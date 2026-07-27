# Changelog

## 9.6.0 — Build 00054

- Nuovo Centro Veicolo nel Garage.
- Scheda riepilogativa con dati auto, stato, scadenze, manutenzioni, documenti e costi.
- Accesso rapido a Documenti, Scadenze, Manutenzioni, Rifornimenti, Spese e Timeline.
- Modifica dei dati del veicolo separata dalla scheda riepilogativa.
- Chiave dati invariata: `miaAutoDataV2`.
- Aggiornata la cache PWA.

# 9.5.2 — Campi RCA contestuali (Build 00053)

- La polizza RCA non mostra più i campi generici errati “Attività”, “Luogo”, “Chilometri” e “Documento/fattura”.
- Data e importo generici vengono ignorati per le assicurazioni: vengono usati solo decorrenza, scadenza, premio annuale e rata riconosciuti dal parser RCA.
- Migliorato il riconoscimento di etichette come “N. Polizza”.
- Se un dato RCA non è riconosciuto con una regola dedicata, il campo resta vuoto invece di essere riempito con un valore casuale.
- Chiave dati invariata: `miaAutoDataV2`.

# 9.5.1 — Importi e date polizza corretti (Build 00052)

- Distinzione tra premio annuale e importo della singola rata.
- Riconoscimento della rateazione (ad esempio trimestrale).
- Migliorato il riconoscimento di decorrenza e scadenza nelle frasi con intervallo di copertura.
- Migliorata l’estrazione del contraente senza includere le etichette successive.
- I dati assicurativi sono mostrati in campi separati nella scheda di conferma.
- Chiave dati invariata: `miaAutoDataV2`.

# 9.5.0 — Estrazione dati assicurazione (Build 00051)

- Aggiunto parser dedicato `assicurazioneParser.js`.
- Estrazione di compagnia, numero polizza, targa, decorrenza, scadenza, premio, classe di merito, contraente e garanzie.
- I dati riconosciuti vengono mostrati prima del salvataggio e inseriti nelle note del documento.
- La scadenza RCA importata riporta compagnia e numero polizza.
- Chiave dati invariata: `miaAutoDataV2`.

# 9.4.1 — Correzione riconoscimento assicurazione (Build 00050)

- I documenti Genertel e delle principali compagnie assicurative hanno ora priorità assicurativa.
- Aggiunti indicatori RCA: bonus/malus, classe di merito, massimale, franchigia, premio e decorrenza.
- I dati tecnici del veicolo presenti in una polizza non causano più la classificazione errata come libretto.
- Aggiornata la cache PWA per forzare il caricamento del classificatore corretto.
- Chiave dati invariata: `miaAutoDataV2`.

# 9.4.0 — Fondazione OCR modulare (Build 00049)

- Separato il classificatore documenti in `js/ocr/documentClassifier.js`.
- Creato un parser dedicato per la carta/libretto di circolazione.
- Creato un parser dedicato per il certificato di proprietà.
- `documents.js` ora orchestra i moduli invece di contenere tutta la logica OCR.
- Nessuna modifica alla chiave dati `miaAutoDataV2`.
- Comportamento della 9.3.2 preservato.

# Versione 9.3.2 — Build 00048

- Corretto il caso reale in cui un PDF scansionato veniva riconosciuto come documento generico.
- Il nome file `Certificato di proprietà` forza la categoria corretta anche se l’OCR non legge l’intestazione.
- Analogo fallback sicuro per `Carta/Libretto di circolazione`.
- Aggiunto cache-busting al modulo OCR per impedire al browser di riutilizzare il vecchio file JavaScript.
- Nessuna modifica alla chiave `miaAutoDataV2`.

## 9.3.1 — Build 00047

- Aggiunta la categoria separata **Certificato di proprietà**.
- L’OCR riconosce intestazioni PRA, CDPD, gravami e ipoteche.
- Il certificato di proprietà non viene più classificato come libretto di circolazione.
- Estrazione dedicata di proprietario, codice fiscale, numero certificato, ID CDPD e situazione gravami/ipoteche.
- Disattivata l’importazione automatica nella scheda veicolo per il certificato di proprietà: i dati restano da controllare e archiviare.
- Cache PWA aggiornata alla Build 00047.

# Changelog

## 9.3.0 — Build 00046
- Il libretto estrae marca, modello, telaio, prima immatricolazione, alimentazione, cilindrata, potenza e posti.
- Possibilità di aggiornare la scheda veicolo direttamente dal documento.
- Importazione automatica disattivata quando l’affidabilità è inferiore al 70%.
- Avviso esplicito quando i dati richiedono controllo manuale.
- Corrette le espressioni regolari dei campi armonizzati UE.

## 9.2.3 — Build 00045
- Classificazione OCR rafforzata con segnali strutturali specifici per ogni documento.
- La sola parola benzina non basta più a classificare un libretto come rifornimento.
- Visualizzazione dell'affidabilità del riconoscimento.
- Selettore manuale per correggere il tipo di documento prima del salvataggio.
- Disattivazione automatica della creazione di eventi economici quando si sceglie Libretto.

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

# Archivio documenti

I file vengono salvati localmente in IndexedDB, database `miaAutoDocumentsDB`, archivio `documents`.
Non vengono caricati su server esterni. Ogni record contiene metadati e Blob del file.
Il limite applicativo è 12 MB per singolo file. La disponibilità totale dipende dalla quota concessa dal browser.
Il backup JSON basato sulla chiave `miaAutoDataV2` non include i Blob dell'archivio documenti.


## Distinzione documentale 9.3.1

Il **Libretto/Carta di circolazione** e il **Certificato di proprietà** sono categorie distinte.
Il primo contiene i dati tecnici necessari alla circolazione; il secondo riguarda proprietà, intestazione e situazione giuridica presso il PRA.
L’OCR non deve usare il certificato di proprietà per compilare automaticamente dati tecnici mancanti.

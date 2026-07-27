# Archivio documenti

I file vengono salvati localmente in IndexedDB, database `miaAutoDocumentsDB`, archivio `documents`.
Non vengono caricati su server esterni. Ogni record contiene metadati e Blob del file.
Il limite applicativo è 12 MB per singolo file. La disponibilità totale dipende dalla quota concessa dal browser.
Il backup JSON basato sulla chiave `miaAutoDataV2` non include i Blob dell'archivio documenti.

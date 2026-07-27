# Modello dati – La Mia Auto

## Persistenza

La chiave locale resta invariata:

```js
const STORAGE_KEY = 'miaAutoDataV2';
```

I dati principali continuano a essere salvati nelle collezioni originali:

- `vehicle`
- `fuel`
- `expenses`
- `maintenance`
- `deadlines`

## Modello evento comune

Il modulo `js/events.js` converte le collezioni esistenti in un formato comune, senza duplicare né migrare i dati salvati:

```js
{
  id: 'fuel:123',
  sourceId: '123',
  type: 'fuel',
  date: '2026-07-26',
  title: 'Rifornimento',
  description: 'Distributore',
  amount: 45.80,
  km: 141500,
  location: '',
  lat: null,
  lng: null,
  raw: {}
}
```

Questo modello sarà usato dalla futura Timeline, dalla ricerca globale e dalle analisi, mantenendo la compatibilità con i backup precedenti.

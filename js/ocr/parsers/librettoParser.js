(() => {
  'use strict';
  function matchValue(text, patterns){
    for(const pattern of patterns){ const match = text.match(pattern); if(match?.[1]) return match[1].trim(); }
    return '';
  }
  function numberFrom(value){
    if(value == null) return null;
    const cleaned = String(value).replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.').replace(/[^\d.-]/g,'');
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }
  function clean(value){ return String(value || '').replace(/\s+/g,' ').replace(/[|;]+$/,'').trim(); }
  function toIsoDate(day, month, year){
    let y = Number(year); if(y < 100) y += 2000;
    const date = new Date(y, Number(month)-1, Number(day));
    if(Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function firstDate(text, labels=[]){
    for(const label of labels){
      const match = text.match(new RegExp(`${label}[^\\d]{0,22}(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{2,4})`, 'i'));
      if(match) return toIsoDate(match[1], match[2], match[3]);
    }
    const match = text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
    return match ? toIsoDate(match[1], match[2], match[3]) : '';
  }
  function parse(text){
    const make = clean(matchValue(text,[/(?:\bD\.1\b|marca)\s*[:\-]?\s*([A-Z0-9][A-Z0-9 .'-]{1,30})/i,/(?:costruttore)\s*[:\-]?\s*([A-Z0-9][A-Z0-9 .'-]{1,30})/i]));
    const model = clean(matchValue(text,[/(?:\bD\.3\b|denominazione commerciale|modello)\s*[:\-]?\s*([A-Z0-9][A-Z0-9 ._\/-]{1,45})/i]));
    const vin = matchValue(text,[/(?:\bE\b|numero (?:del )?telaio|telaio|vin)\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{11,17})/i,/\b([A-HJ-NPR-Z0-9]{17})\b/i]).replace(/\s/g,'').toUpperCase();
    const firstRegistration = firstDate(text,['prima immatricolazione','data di prima immatricolazione','immatricolazione','\\bB\\b']);
    const displacement = numberFrom(matchValue(text,[/(?:\bP\.1\b|cilindrata)\s*[:\-]?\s*(\d{2,5})/i]));
    const powerKw = numberFrom(matchValue(text,[/(?:\bP\.2\b|potenza(?: massima)?(?: netta)?(?: in kw)?)\s*[:\-]?\s*(\d{1,3}(?:[.,]\d)?)/i]));
    const seats = numberFrom(matchValue(text,[/(?:\bS\.1\b|posti a sedere|numero posti)\s*[:\-]?\s*(\d{1,2})/i]));
    let fuel = clean(matchValue(text,[/(?:\bP\.3\b|alimentazione|combustibile)\s*[:\-]?\s*([A-ZÀ-Ü /-]{3,30})/i]));
    const fuelLower = fuel.toLocaleLowerCase('it-IT');
    if(/benzina/.test(fuelLower)) fuel='Benzina'; else if(/gasolio|diesel/.test(fuelLower)) fuel='Diesel'; else if(/elettric/.test(fuelLower)) fuel='Elettrica'; else if(/ibrid/.test(fuelLower)) fuel='Ibrida'; else if(/gpl/.test(fuelLower)) fuel='GPL'; else if(/metano/.test(fuelLower)) fuel='Metano';
    return {make, model, vin, firstRegistration, displacement, powerKw, seats, fuel};
  }
  window.MiaAutoLibrettoParser = Object.freeze({ parse });
})();

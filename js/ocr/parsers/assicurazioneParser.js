(() => {
  'use strict';

  const normalize = value => String(value || '').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  const first = (text, patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return '';
  };
  const isoDate = value => {
    const match = String(value || '').match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (!match) return '';
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    return `${year}-${String(match[2]).padStart(2,'0')}-${String(match[1]).padStart(2,'0')}`;
  };
  const amount = value => {
    if (!value) return null;
    const number = Number(String(value).replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.').replace(/[^\d.-]/g,''));
    return Number.isFinite(number) ? number : null;
  };

  function parse(rawText) {
    const text = normalize(rawText);
    const upper = text.toLocaleUpperCase('it-IT');
    const companyPatterns = [
      [/\bGENERTEL\b/i,'Genertel'], [/\bGENERALI ITALIA\b/i,'Generali Italia'], [/\bUNIPOLSAI\b/i,'UnipolSai'],
      [/\bALLIANZ DIRECT\b/i,'Allianz Direct'], [/\bPRIMA ASSICURAZIONI\b/i,'Prima Assicurazioni'], [/\bVERTI\b/i,'Verti'], [/\bCONTE\.IT\b/i,'ConTe.it']
    ];
    const company = companyPatterns.find(([re]) => re.test(text))?.[1] || first(text,[/(?:compagnia|impresa di assicurazione|societ[aà])\s*[:\-]?\s*([^\n]{3,60})/i]);
    const policyNumber = first(text,[
      /(?:numero\s+(?:di\s+)?polizza|n\.?\s*polizza|polizza\s*(?:n\.?|numero)?|contratto\s*(?:n\.?|numero))\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/.\-]{4,30})/i,
      /\bPOLIZZA\s+([A-Z0-9][A-Z0-9\/.\-]{5,30})\b/i
    ]);
    const plate = first(upper,[/(?:TARGA|VEICOLO)\s*[:\-]?\s*([A-Z]{2}\s*\d{3}\s*[A-Z]{2})/i,/\b([A-Z]{2}\d{3}[A-Z]{2})\b/]).replace(/\s/g,'');
    const coverageRange = text.match(/(?:durata|validit[aà]|copertura)?[^\d]{0,40}(?:dalle?\s+(?:ore\s+)?\d{1,2}[:.,]\d{2}\s+del\s+)?(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})[^\d]{0,35}(?:alle?\s+(?:ore\s+)?\d{1,2}[:.,]\d{2}\s+del\s+)?(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i);
    const startRaw = coverageRange?.[1] || first(text,[
      /(?:decorrenza|dalle ore\s+\d{1,2}[:.,]\d{2}\s+del|validit[aà]\s+dal|inizio copertura)\D{0,35}(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i
    ]);
    const expiryRaw = coverageRange?.[2] || first(text,[
      /(?:scadenza|fino alle ore\s+\d{1,2}[:.,]\d{2}\s+del|validit[aà]\s+fino\s+al|termine copertura)\D{0,35}(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i
    ]);
    const annualPremiumRaw = first(text,[
      /(?:totale\s+da\s+pagare|premio\s+(?:totale|annuo|annuale|lordo)|totale\s+premio|importo\s+annuo)\s*[:€]?\s*(\d{1,5}(?:[.]\d{3})*,\d{2})/i,
      /(?:totale\s+da\s+pagare|premio\s+(?:totale|annuo|annuale|lordo)|totale\s+premio|importo\s+annuo)\s*[:€]?\s*(\d{1,5}[.]\d{2})/i
    ]);
    const installmentRaw = first(text,[
      /(?:al\s+trimestre|rata\s+(?:trimestrale|mensile|semestrale|annuale)|importo\s+rata)\D{0,20}(\d{1,5}(?:[.]\d{3})*,\d{2})\s*€?/i,
      /(\d{1,5}(?:[.]\d{3})*,\d{2})\s*€?\s*(?:al\s+trimestre|a\s+trimestre|trimestrali?)/i
    ]);
    const installmentFrequency = first(text,[/(?:rateazione|frazionamento)\s*[:\-]?\s*(mensile|bimestrale|trimestrale|quadrimestrale|semestrale|annuale)/i]) || (/al\s+trimestre/i.test(text)?'Trimestrale':'');
    const meritClass = first(text,[
      /(?:classe\s+(?:universale|di merito)|classe\s+cu|cu)\s*[:\-]?\s*(\d{1,2})/i,
      /(?:bonus\s*malus)\D{0,30}(\d{1,2})/i
    ]);
    const insured = first(text,[
      /(?:assicurato|contraente)\s*[:\-]?\s*([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ' ]{3,60}?)(?=\s+(?:codice fiscale|cellulare|telefono|email|n\.?\s*polizza|durata|rateazione)\b|$)/i
    ]);
    const guarantees = [];
    const guaranteeMap = [
      [/\brca\b|responsabilit[aà] civile auto/i,'RCA'], [/furto/i,'Furto'], [/incendio/i,'Incendio'],
      [/cristalli/i,'Cristalli'], [/assistenza stradale|soccorso stradale/i,'Assistenza stradale'],
      [/infortuni (?:del )?conducente/i,'Infortuni conducente'], [/eventi naturali/i,'Eventi naturali'], [/atti vandalici/i,'Atti vandalici'], [/kasko|collisione/i,'Kasko/Collisione']
    ];
    guaranteeMap.forEach(([re,label]) => { if (re.test(text)) guarantees.push(label); });

    return {
      company: company.replace(/\s+/g,' ').trim(), policyNumber, plate,
      startDate: isoDate(startRaw), expiry: isoDate(expiryRaw),
      premium: amount(annualPremiumRaw), annualPremium: amount(annualPremiumRaw),
      installmentAmount: amount(installmentRaw), installmentFrequency,
      meritClass, insured: insured.replace(/\s+/g,' ').trim(), guarantees: [...new Set(guarantees)]
    };
  }

  window.MiaAutoAssicurazioneParser = Object.freeze({ parse });
})();

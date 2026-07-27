(() => {
  'use strict';
  function matchValue(text, patterns){ for(const pattern of patterns){ const match=text.match(pattern); if(match?.[1]) return match[1].trim(); } return ''; }
  function clean(value){ return String(value || '').replace(/\s+/g,' ').replace(/[|;]+$/,'').trim(); }
  function parse(text){
    const owner = clean(matchValue(text,[/(?:proprietario|intestatario)\s*[:\-]?\s*([A-ZÀ-Ü][A-ZÀ-Ü' .-]{3,70})/i,/(?:cognome e nome|denominazione sociale)\s*[:\-]?\s*([A-ZÀ-Ü][A-ZÀ-Ü' .-]{3,70})/i]));
    const ownerTaxCode = matchValue(text,[/(?:codice fiscale)\s*[:\-]?\s*([A-Z0-9]{16})/i,/\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/i]).toUpperCase();
    const certificateNumber = matchValue(text,[/(?:certificato di propriet[aà]\s*(?:n\.?|numero)?|\bn\.)\s*[:\-]?\s*([A-Z0-9\/.-]{5,30})/i]);
    const cdpdId = matchValue(text,[/(?:id\s*cdpd)\s*[:\-]?\s*([A-Z0-9_-]{8,80})/i]);
    let liens='';
    if(/non risultano iscritte ipoteche|nessun(?:a)? (?:gravame|ipoteca)/i.test(text)) liens='Nessun gravame o ipoteca risultante';
    else if(/gravami|ipoteche/i.test(text)) liens='Presenza di annotazioni da controllare';
    return {owner, ownerTaxCode, certificateNumber, cdpdId, liens};
  }
  window.MiaAutoCertificatoProprietaParser = Object.freeze({ parse });
})();

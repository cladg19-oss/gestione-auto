(() => {
  'use strict';

  function normalize(value){
    return String(value || '')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .toLocaleLowerCase('it-IT');
  }

  function classifyDocument(text, fileName = ''){
    const body = normalize(text);
    const name = String(fileName || '').replace(/[_-]+/g, ' ').toLocaleLowerCase('it-IT');
    const ownershipFile = /certificato.{0,12}(?:di\s+)?propriet[aà]|\bcdpd\b|certificato.{0,8}pra/.test(name);
    const registrationFile = /(?:carta|libretto).{0,12}(?:di\s+)?circolazione|certificato.{0,12}immatricolazione/.test(name);
    const scores = {registration:0, ownership:0, revision:0, fuel:0, insurance:0, tax:0, tires:0, maintenance:0, generic:0};
    const reasons = {};
    const add = (kind, points, re, label, scope = body) => {
      if(re.test(scope)){
        scores[kind] += points;
        (reasons[kind] ??= []).push(label || String(re));
      }
    };

    add('registration',18,/carta.{0,8}circolazione|libretto|circolazione/,'nome file: libretto',name);
    add('ownership',24,/certificato.{0,8}(?:di )?propriet[aà]|certificato propriet[aà]|cdpd/,'nome file: certificato di proprietà',name);
    add('revision',15,/revisione|revisioni/,'nome file: revisione',name);
    add('insurance',15,/rca|assicurazione|polizza/,'nome file: assicurazione',name);
    add('tax',15,/bollo|tassa automobilistica/,'nome file: bollo',name);
    add('fuel',12,/carburante|rifornimento|benzinaio|scontrino/,'nome file: carburante',name);
    add('tires',12,/gomme|pneumatici/,'nome file: gomme',name);
    add('maintenance',10,/tagliando|manutenzione|officina|fattura/,'nome file: manutenzione',name);

    add('ownership',42,/certificato di propriet[aà]|certificato digitale di propriet[aà]|\bcdpd\b/,'intestazione certificato di proprietà');
    add('ownership',24,/pubblico registro automobilistico|\bpra\b/,'ente PRA');
    add('ownership',22,/gravami[, e]*ipoteche|non risultano iscritte ipoteche|dati dell['’]intestazione/,'gravami e intestazione');
    add('ownership',12,/numero (?:precedenti )?intestatari|\bproprietario\b[\s\S]{0,100}\bcodice fiscale\b/,'dati proprietario');

    add('registration',30,/carta di circolazione|certificato di immatricolazione/,'intestazione ufficiale');
    add('registration',14,/ministero delle infrastrutture|repubblica italiana/,'ente emittente');
    add('registration',12,/numero di omologazione|numero del telaio|identificazione del veicolo|vin/,'telaio/VIN');
    add('registration',10,/cilindrata|massa complessiva|massa a vuoto|potenza massima|prima immatricolazione/,'dati tecnici');
    add('registration',10,/\b(?:a\.1|c\.1\.1|c\.2\.1|d\.1|d\.2|d\.3|e|f\.1|j|p\.1|p\.2|p\.3|s\.1)\b/i,'campi armonizzati UE');
    add('registration',8,/\btarga\b[\s\S]{0,160}\btelaio\b|\bveicolo\b[\s\S]{0,160}\bcilindrata\b/,'struttura veicolo');

    add('revision',24,/certificato di revisione|esito della revisione|rapporto di revisione/,'certificato revisione');
    add('revision',12,/revisione[\s\S]{0,80}(regolare|ripetere|sospeso)|prossima revisione/,'esito/scadenza revisione');
    add('revision',6,/centro revisioni|mctc/,'centro revisione');
    add('fuel',18,/prezzo\s*(?:al|per)?\s*litro|€\s*\/\s*l|eur\s*\/\s*l/,'prezzo al litro');
    add('fuel',16,/litri\s*(?:erogati|totali)?|volume\s*erogato|quantit[aà]\s*litri/,'litri erogati');
    add('fuel',14,/erogazione|pompa\s*\d+|self service|distributore carburanti/,'impianto carburante');
    add('fuel',12,/documento commerciale[\s\S]{0,180}(benzina|gasolio|diesel|gpl|carburante)/,'documento commerciale carburante');
    add('fuel',2,/\bbenzina\b|\bgasolio\b|\bdiesel\b|\bgpl\b/,'tipo carburante');
    add('insurance',46,/\bgenertel\b|\bgenerali italia\b|\bunipolsai\b|\ballianz direct\b|\bprima assicurazioni\b|\bverti\b|\bconte\.it\b/,'compagnia assicurativa riconosciuta');
    add('insurance',34,/certificato di assicurazione|contratto di assicurazione|documento informativo (?:precontrattuale|assicurativo)|polizza\s*(?:n|numero)|rc\s*auto|r\.?\s*c\.?\s*a\.?\s*(?:auto)?/,'polizza RCA');
    add('insurance',24,/bonus\s*malus|classe\s+(?:universale|di merito)|attestato di rischio|massimale|franchigia|garanzia rca/,'terminologia assicurativa');
    add('insurance',14,/premio (?:assicurativo|annuo|totale)|contraente|assicurato|decorrenza (?:della )?(?:polizza|copertura)|scadenza (?:della )?(?:polizza|copertura)/,'dati assicurativi');
    add('tax',22,/bollo auto|tassa automobilistica|avviso di scadenza bollo/,'bollo auto');
    add('tax',9,/aci[\s\S]{0,80}bollo|regione[\s\S]{0,80}automobil/,'ente bollo');
    add('tires',18,/pneumatici|equilibratura|convergenza|cambio gomme|montaggio gomme/,'lavori gomme');
    add('maintenance',15,/tagliando|manodopera|ricambi|olio motore|filtro olio|officina/,'manutenzione');
    add('maintenance',5,/fattura|preventivo/,'documento fiscale');

    const hasOfficialRegistrationHeading=/carta di circolazione|certificato di immatricolazione/.test(body);
    const hasOfficialOwnershipHeading=/certificato (?:digitale )?di propriet[aà]|\bcdpd\b/.test(body);
    if(scores.insurance >= 34 && !hasOfficialRegistrationHeading){
      scores.registration = Math.max(0, scores.registration - 24);
      scores.maintenance = Math.max(0, scores.maintenance - 8);
      scores.tax = Math.max(0, scores.tax - 6);
    }
    if(scores.registration >= 20){ scores.fuel = Math.max(0, scores.fuel - 12); scores.maintenance = Math.max(0, scores.maintenance - 4); }
    if(scores.ownership >= 24 || hasOfficialOwnershipHeading){ scores.registration = Math.max(0, scores.registration - 18); scores.fuel = 0; scores.maintenance = Math.max(0, scores.maintenance - 5); }

    const ranked = Object.entries(scores).sort((a,b) => b[1] - a[1]);
    const [best, score] = ranked[0];
    const second = ranked[1]?.[1] || 0;
    let kind = best;
    if(score < 8 || ((score - second) < 4 && score < 20)) kind = 'generic';
    if(ownershipFile){
      kind = 'ownership';
      scores.ownership = Math.max(scores.ownership, 80);
      (reasons.ownership ??= []).push('nome file ufficiale: certificato di proprietà');
    }else if(registrationFile){
      kind = 'registration';
      scores.registration = Math.max(scores.registration, 75);
      (reasons.registration ??= []).push('nome file ufficiale: carta/libretto di circolazione');
    }
    const finalScore = scores[kind] || score;
    const confidence = kind === 'generic'
      ? Math.min(55, Math.max(20, finalScore * 4))
      : Math.min(99, Math.round(55 + finalScore * 1.4 + Math.max(0, finalScore - second) * 1.5));
    return {kind, confidence, scores, reasons: reasons[kind] || []};
  }

  window.MiaAutoDocumentClassifier = Object.freeze({ classify: classifyDocument });
})();

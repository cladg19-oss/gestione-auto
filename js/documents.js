(() => {
  'use strict';
  const DB_NAME='miaAutoDocumentsDB';
  const DB_VERSION=1;
  const STORE='documents';
  const MAX_FILE_SIZE=12*1024*1024;
  let documents=[];
  let selectedId=null;
  let previewUrl='';
  let currentExtraction=null;
  let scanToken=0;
  const $=id=>document.getElementById(id);

  function openDb(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE)){
          const store=db.createObjectStore(STORE,{keyPath:'id'});
          store.createIndex('date','date');
          store.createIndex('category','category');
        }
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function withStore(mode,operation){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);
      const store=tx.objectStore(STORE);
      const request=operation(store);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
      tx.oncomplete=()=>db.close();
    });
  }
  const getAll=()=>withStore('readonly',store=>store.getAll());
  const put=item=>withStore('readwrite',store=>store.put(item));
  const remove=id=>withStore('readwrite',store=>store.delete(id));
  const escape=value=>window.MiaAutoUtils.escapeHtml(String(value??''));
  const formatDate=value=>value?window.MiaAutoUtils.formatDate(value):'Data non indicata';
  const money=value=>Number(value||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});

  function formatBytes(bytes){
    const n=Number(bytes||0);
    if(n<1024)return `${n} B`;
    if(n<1024**2)return `${(n/1024).toLocaleString('it-IT',{maximumFractionDigits:1})} KB`;
    return `${(n/1024**2).toLocaleString('it-IT',{maximumFractionDigits:1})} MB`;
  }
  function iconFor(doc){
    if(doc.fileType==='application/pdf')return '📄';
    if(doc.fileType?.startsWith('image/'))return '🖼️';
    return '📎';
  }
  function setMessage(message,isError=false){
    const element=$('documentsMessage');
    if(!element)return;
    element.textContent=message;
    element.classList.toggle('error',isError);
  }
  function filteredDocuments(){
    const query=($('documentsSearch')?.value||'').trim().toLocaleLowerCase('it-IT');
    const category=$('documentsCategoryFilter')?.value||'all';
    return documents.filter(doc=>{
      const matchesCategory=category==='all'||doc.category===category;
      const haystack=[doc.title,doc.category,doc.notes,doc.fileName,doc.date,doc.extractedText].join(' ').toLocaleLowerCase('it-IT');
      return matchesCategory&&(!query||haystack.includes(query));
    }).sort((a,b)=>(b.date||b.createdAt||'').localeCompare(a.date||a.createdAt||''));
  }
  function render(){
    const list=$('documentsList');
    if(!list)return;
    const items=filteredDocuments();
    $('documentsCount').textContent=documents.length.toLocaleString('it-IT');
    $('documentsSize').textContent=formatBytes(documents.reduce((sum,doc)=>sum+Number(doc.fileSize||0),0));
    if(!items.length){
      list.innerHTML=`<div class="documents-empty"><span>📂</span><h3>${documents.length?'Nessun risultato':'Il tuo archivio è vuoto'}</h3><p>${documents.length?'Modifica la ricerca o il filtro.':'Aggiungi libretto, polizza, fatture, ricevute o foto dell’auto.'}</p></div>`;
      return;
    }
    list.innerHTML=items.map(doc=>`<button class="document-card" type="button" data-document-id="${escape(doc.id)}">
      <span class="document-icon">${iconFor(doc)}</span>
      <span class="document-copy"><small>${escape(doc.category)}${doc.extraction?.kind?' · ✨ Analizzato':''}</small><strong>${escape(doc.title)}</strong><span>${formatDate(doc.date)} · ${formatBytes(doc.fileSize)}</span></span>
      <span class="timeline-chevron">›</span>
    </button>`).join('');
  }
  async function reload(){
    try{documents=await getAll();render();setMessage('');}
    catch(error){console.error(error);setMessage('Non riesco ad aprire l’archivio documenti in questo browser.',true);}
  }
  function closePreview(){
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}
    selectedId=null;
  }
  function openPreview(doc){
    selectedId=doc.id;
    $('documentPreviewTitle').textContent=doc.title;
    $('documentPreviewCategory').textContent=doc.category;
    $('documentPreviewMeta').textContent=`${formatDate(doc.date)} · ${doc.fileName} · ${formatBytes(doc.fileSize)}`;
    const recognized=doc.extraction?.summary?`\n\n✨ Dati riconosciuti: ${doc.extraction.summary}`:'';
    $('documentPreviewNotes').textContent=(doc.notes||'')+recognized;
    previewUrl=URL.createObjectURL(doc.blob);
    const area=$('documentPreviewArea');
    if(doc.fileType==='application/pdf')area.innerHTML=`<iframe title="Anteprima ${escape(doc.title)}" src="${previewUrl}"></iframe>`;
    else if(doc.fileType?.startsWith('image/'))area.innerHTML=`<img src="${previewUrl}" alt="${escape(doc.title)}">`;
    else area.innerHTML='<div class="preview-unavailable">Anteprima non disponibile. Usa il pulsante Scarica.</div>';
    const download=$('documentDownloadBtn');
    download.href=previewUrl;download.download=doc.fileName||doc.title;
    $('documentPreviewModal').showModal();
  }

  function normalizeText(text){
    return String(text||'').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  }
  function numberFrom(value){
    if(value==null)return null;
    const cleaned=String(value).replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.').replace(/[^\d.-]/g,'');
    const n=Number(cleaned);
    return Number.isFinite(n)?n:null;
  }
  function toIsoDate(day,month,year){
    let y=Number(year); if(y<100)y+=2000;
    const d=new Date(y,Number(month)-1,Number(day));
    if(Number.isNaN(d.getTime()))return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function firstDate(text,labels=[]){
    for(const label of labels){
      const re=new RegExp(`${label}[^\\d]{0,22}(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{2,4})`,'i');
      const m=text.match(re); if(m)return toIsoDate(m[1],m[2],m[3]);
    }
    const m=text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
    return m?toIsoDate(m[1],m[2],m[3]):'';
  }
  function addYears(iso,years){
    if(!iso)return '';
    const d=new Date(`${iso}T12:00:00`);d.setFullYear(d.getFullYear()+years);
    return d.toISOString().slice(0,10);
  }
  function matchValue(text,patterns){
    for(const pattern of patterns){const m=text.match(pattern);if(m?.[1])return m[1].trim();}
    return '';
  }
  function cleanVehicleText(value){
    return String(value||'').replace(/\s+/g,' ').replace(/[|;]+$/,'').trim();
  }
  function registrationFields(text){
    const parser=window.MiaAutoLibrettoParser;
    if(!parser?.parse)throw new Error('Parser libretto non caricato.');
    return parser.parse(text);
  }
  function ownershipFields(text){
    const parser=window.MiaAutoCertificatoProprietaParser;
    if(!parser?.parse)throw new Error('Parser certificato di proprietà non caricato.');
    return parser.parse(text);
  }
  function insuranceFields(text){
    const parser=window.MiaAutoAssicurazioneParser;
    if(!parser?.parse)throw new Error('Parser assicurazione non caricato.');
    return parser.parse(text);
  }
  function bestAmount(text){
    const patterns=[
      /(?:totale\s+(?:da\s+pagare|documento|fattura)?|importo\s+(?:pagato|totale)?|corrispettivo|pagato)\s*[:€]?\s*(\d{1,5}[.,]\d{2})/ig,
      /(?:eur|€)\s*(\d{1,5}[.,]\d{2})/ig,
      /(\d{1,5}[.,]\d{2})\s*(?:eur|€)/ig
    ];
    const weighted=[];
    patterns.forEach((re,index)=>{for(const m of text.matchAll(re)){const n=numberFrom(m[1]);if(n!=null)weighted.push({n,score:3-index});}});
    if(!weighted.length)return null;
    weighted.sort((a,b)=>b.score-a.score||b.n-a.n);
    return weighted[0].n;
  }
  function findAddress(lines){
    const addressWords=/(via|viale|piazza|corso|strada|s\.p\.|ss\s*\d|localit[aà]|loc\.|frazione)\b/i;
    const cityCap=/\b\d{5}\b/;
    return lines.find(line=>addressWords.test(line)&&line.length<120)||lines.find(line=>cityCap.test(line)&&line.length<120)||'';
  }
  function findBusiness(lines){
    const skip=/(documento commerciale|scontrino|fattura|ricevuta|partita iva|p\.iva|codice fiscale|telefono|tel\.|cassa|operatore|cliente)/i;
    return lines.slice(0,12).find(line=>line.length>3&&line.length<80&&!skip.test(line)&&!/^\d/.test(line))||'';
  }
  function classify(text,fileName=''){
    const classifier=window.MiaAutoDocumentClassifier;
    if(!classifier?.classify)throw new Error('Modulo classificatore OCR non caricato.');
    return classifier.classify(text,fileName);
  }
  function extractData(rawText,fileName=''){
    const text=normalizeText(rawText);
    const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);
    const classification=classify(text,fileName);
    const kind=classification.kind;
    const date=firstDate(text,['data revisione','data operazione','data documento','data emissione','data']);
    const amount=['registration','ownership'].includes(kind)?null:bestAmount(text);
    const location=['registration','ownership'].includes(kind)?'':findAddress(lines);
    const business=['registration','ownership'].includes(kind)?'':findBusiness(lines);
    const plate=matchValue(text,[/(?:targa|veicolo)\s*[:\-]?\s*([A-Z]{2}\s*\d{3}\s*[A-Z]{2})/i,/\b([A-Z]{2}\d{3}[A-Z]{2})\b/i]).replace(/\s/g,'').toUpperCase();
    const km=numberFrom(matchValue(text,[/(?:km|chilometraggio|odometro)\s*[:\-]?\s*([\d. ]{3,8})/i,/([\d. ]{3,8})\s*km\b/i]));
    const liters=numberFrom(matchValue(text,[/(?:litri|volume|quantit[aà])\s*[:\-]?\s*(\d{1,3}[.,]\d{1,3})/i,/(\d{1,3}[.,]\d{1,3})\s*l(?:itri)?\b/i]));
    const pricePerLiter=numberFrom(matchValue(text,[/(?:prezzo\s*(?:al|per)?\s*litro|€\s*\/\s*l)\s*[:\-]?\s*(\d[.,]\d{2,4})/i,/(\d[.,]\d{3})\s*€?\s*\/\s*l/i]));
    const explicitExpiry=firstDate(text,['scadenza','valido fino al','validità fino al','prossima revisione']);
    const result=matchValue(text,[/(?:esito|risultato)\s*[:\-]?\s*(regolare|ripetere|sospeso|positivo|negativo)/i]);
    const policy=matchValue(text,[/(?:numero polizza|polizza n\.?|n\. polizza)\s*[:\-]?\s*([A-Z0-9\/-]+)/i]);
    const invoice=matchValue(text,[/(?:fattura|documento)\s*(?:n\.?|numero)?\s*[:\-]?\s*([A-Z0-9\/-]+)/i]);
    const expiry=explicitExpiry||(kind==='revision'&&date?addYears(date,2):'');
    const registration=['registration','ownership'].includes(kind)?registrationFields(text):{};
    const ownership=kind==='ownership'?ownershipFields(text):{};
    const insurance=kind==='insurance'?insuranceFields(text):{};
    const category={fuel:'Altro',revision:'Revisione',insurance:'Assicurazione RCA',tax:'Bollo auto',tires:'Gomme',maintenance:'Manutenzione e fatture',registration:'Libretto di circolazione',ownership:'Certificato di proprietà',generic:'Altro'}[kind];
    const titleBase={fuel:'Ricevuta carburante',revision:'Revisione auto',insurance:'Polizza RCA',tax:'Bollo auto',tires:'Gomme e pneumatici',maintenance:'Fattura manutenzione',registration:'Libretto di circolazione',ownership:'Certificato di proprietà',generic:'Documento'}[kind];
    const cleanFileName=fileName.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
    const registrationName=['registration','ownership'].includes(kind)&&cleanFileName
      ? cleanFileName.replace(/^(?:(?:carta|libretto)\s+di\s+circolazione|certificato\s+di\s+propriet[aà])\s*/i,'').trim()
      : '';
    const title=['registration','ownership'].includes(kind)
      ? `${titleBase}${registrationName?` ${registrationName}`:''}`
      : `${titleBase}${date?` ${date.slice(0,4)}`:''}`;
    const insuranceDate=insurance.startDate||date;
    const insuranceExpiry=insurance.expiry||expiry;
    const insuranceAmount=insurance.premium!=null?insurance.premium:amount;
    const insurancePlate=insurance.plate||plate;
    const insurancePolicy=insurance.policyNumber||policy;
    const fields={kind,confidence:classification.confidence,date:kind==='insurance'?insuranceDate:date,amount:kind==='insurance'?insuranceAmount:amount,location,business,plate:kind==='insurance'?insurancePlate:plate,km,liters,pricePerLiter,expiry:kind==='insurance'?insuranceExpiry:expiry,result,policy:kind==='insurance'?insurancePolicy:policy,invoice,...registration,...ownership,...insurance};
    const summaryParts=[];
    if(fields.amount!=null)summaryParts.push(`importo ${money(fields.amount)}`);
    if(fields.company)summaryParts.push(fields.company);
    if(fields.policy)summaryParts.push(`polizza ${fields.policy}`);
    if(business)summaryParts.push(business);
    if(location)summaryParts.push(location);
    if(km)summaryParts.push(`${km.toLocaleString('it-IT')} km`);
    if(fields.expiry)summaryParts.push(`scadenza ${formatDate(fields.expiry)}`);
    return {...fields,category,title,summary:summaryParts.join(' · '),text,fileName};
  }

  function setScanProgress(label,percent){
    const box=$('documentScanStatus');
    box?.classList.remove('hidden');
    if($('documentScanLabel'))$('documentScanLabel').textContent=label;
    const p=Math.max(0,Math.min(100,Math.round(percent||0)));
    if($('documentScanPercent'))$('documentScanPercent').textContent=`${p}%`;
    if($('documentScanBar'))$('documentScanBar').style.width=`${p}%`;
  }
  function hideScanProgress(){setTimeout(()=>$('documentScanStatus')?.classList.add('hidden'),600);}
  function resetExtraction(){
    currentExtraction=null;
    $('documentExtractedPanel')?.classList.add('hidden');
    $('documentCreateEventRow')?.classList.add('hidden');
    if($('documentExtractedFields'))$('documentExtractedFields').innerHTML='';
  }
  function field(label,value){return value!=null&&value!==''?`<div class="extracted-field"><small>${escape(label)}</small><strong>${escape(value)}</strong></div>`:'';}
  function renderExtraction(extraction){
    currentExtraction=extraction;
    const panel=$('documentExtractedPanel');
    const fields=$('documentExtractedFields');
    if(!panel||!fields)return;
    const kindLabel={fuel:'Rifornimento carburante',revision:'Revisione',insurance:'Assicurazione RCA',tax:'Bollo auto',tires:'Gomme',maintenance:'Manutenzione',registration:'Libretto di circolazione',ownership:'Certificato di proprietà',generic:'Documento generico'}[extraction.kind];
    fields.innerHTML=[
      field('Tipo',kindLabel),field('Affidabilità',`${extraction.confidence||0}%`),field('Data',extraction.date?formatDate(extraction.date):''),
      field('Importo',extraction.amount!=null?money(extraction.amount):''),field('Attività',extraction.business),
      field('Luogo',extraction.location),field('Targa',extraction.plate),
      field('Chilometri',extraction.km?`${extraction.km.toLocaleString('it-IT')} km`:''),field('Litri',extraction.liters?`${extraction.liters.toLocaleString('it-IT')} l`:''),
      field('Prezzo/litro',extraction.pricePerLiter?`${extraction.pricePerLiter.toLocaleString('it-IT',{minimumFractionDigits:3,maximumFractionDigits:3})} €/l`:''),
      field('Scadenza',extraction.expiry?formatDate(extraction.expiry):''),field('Esito',extraction.result),field('Compagnia',extraction.company),field('N. polizza/fattura',extraction.policy||extraction.invoice),
      field('Decorrenza polizza',extraction.startDate?formatDate(extraction.startDate):''),field('Premio',extraction.premium!=null?money(extraction.premium):''),
      field('Classe di merito',extraction.meritClass),field('Contraente/assicurato',extraction.insured),field('Garanzie',Array.isArray(extraction.guarantees)?extraction.guarantees.join(', '):''),
      field('Marca',extraction.make),field('Modello',extraction.model),field('Telaio (VIN)',extraction.vin),
      field('Prima immatricolazione',extraction.firstRegistration?formatDate(extraction.firstRegistration):''),
      field('Alimentazione',extraction.fuel),field('Cilindrata',extraction.displacement?`${extraction.displacement.toLocaleString('it-IT')} cm³`:''),
      field('Potenza',extraction.powerKw?`${extraction.powerKw.toLocaleString('it-IT')} kW`:''),field('Posti',extraction.seats),
      field('Proprietario',extraction.owner),field('Codice fiscale proprietario',extraction.ownerTaxCode),
      field('N. certificato',extraction.certificateNumber),field('ID CDPD',extraction.cdpdId),field('Gravami/ipoteche',extraction.liens)
    ].join('')||field('Risultato','Testo letto, ma nessun dato strutturato riconosciuto');
    panel.classList.remove('hidden');
    if($('documentDetectedKind'))$('documentDetectedKind').value=extraction.kind;
    const canCreate=['fuel','revision','insurance','tax','tires','maintenance','registration'].includes(extraction.kind);
    const row=$('documentCreateEventRow');
    row?.classList.toggle('hidden',!canCreate);
    if($('documentCreateEventText'))$('documentCreateEventText').textContent={
      fuel:'Registra anche il rifornimento nella sezione Carburante',revision:'Registra anche revisione e prossima scadenza',insurance:'Registra anche la scadenza RCA',tax:'Registra anche la scadenza del bollo',tires:'Registra anche la manutenzione gomme',maintenance:'Registra anche la manutenzione',registration:'Aggiorna la scheda del veicolo con i dati del libretto'
    }[extraction.kind]||'Registra anche questi dati nell’app';
    const checkbox=$('documentCreateEvent');
    if(checkbox){
      const hasUsefulRegistration=extraction.kind!=='registration'||Boolean(extraction.plate||extraction.make||extraction.model||extraction.vin||extraction.firstRegistration);
      checkbox.checked=canCreate&&extraction.confidence>=70&&hasUsefulRegistration;
    }
    const warning=$('documentImportWarning');
    if(warning){
      const needsReview=canCreate&&extraction.confidence<70;
      warning.textContent=needsReview?'Affidabilità bassa: controlla e correggi i dati prima di attivare l’importazione automatica.':'';
      warning.classList.toggle('hidden',!needsReview);
    }
  }
  function applyDetectedKind(kind){
    if(!currentExtraction||!kind)return;
    currentExtraction.kind=kind;
    currentExtraction.category={fuel:'Altro',revision:'Revisione',insurance:'Assicurazione RCA',tax:'Bollo auto',tires:'Gomme',maintenance:'Manutenzione e fatture',registration:'Libretto di circolazione',ownership:'Certificato di proprietà',generic:'Altro'}[kind]||'Altro';
    const labels={fuel:'Ricevuta carburante',revision:'Revisione auto',insurance:'Polizza RCA',tax:'Bollo auto',tires:'Gomme e pneumatici',maintenance:'Fattura manutenzione',registration:'Libretto di circolazione',ownership:'Certificato di proprietà',generic:'Documento'};
    currentExtraction.title=labels[kind]||'Documento';
    if(['registration','ownership'].includes(kind)){
      currentExtraction.amount=null;currentExtraction.location='';currentExtraction.business='';
      $('documentCreateEvent')&&( $('documentCreateEvent').checked=false );
    }
    $('documentCategory').value=currentExtraction.category;
    $('documentTitle').value=currentExtraction.title;
    renderExtraction(currentExtraction);
  }
  $('documentDetectedKind')?.addEventListener('change',event=>applyDetectedKind(event.target.value));

  function autofillForm(extraction){
    if(!$('documentTitle').value.trim())$('documentTitle').value=extraction.title;
    if(extraction.category)$('documentCategory').value=extraction.category;
    if(extraction.date)$('documentDate').value=extraction.date;
    const notes=[];
    if(extraction.business)notes.push(`Attività: ${extraction.business}`);
    if(extraction.location)notes.push(`Luogo: ${extraction.location}`);
    if(extraction.amount!=null)notes.push(`Importo: ${money(extraction.amount)}`);
    if(extraction.plate)notes.push(`Targa: ${extraction.plate}`);
    if(extraction.km)notes.push(`Chilometri: ${extraction.km.toLocaleString('it-IT')} km`);
    if(extraction.liters)notes.push(`Carburante: ${extraction.liters.toLocaleString('it-IT')} litri`);
    if(extraction.pricePerLiter)notes.push(`Prezzo al litro: ${extraction.pricePerLiter.toLocaleString('it-IT',{minimumFractionDigits:3,maximumFractionDigits:3})} €/l`);
    if(extraction.expiry)notes.push(`Scadenza: ${formatDate(extraction.expiry)}`);
    if(extraction.result)notes.push(`Esito: ${extraction.result}`);
    if(extraction.company)notes.push(`Compagnia: ${extraction.company}`);
    if(extraction.policy)notes.push(`Polizza: ${extraction.policy}`);
    if(extraction.startDate)notes.push(`Decorrenza: ${formatDate(extraction.startDate)}`);
    if(extraction.premium!=null)notes.push(`Premio: ${money(extraction.premium)}`);
    if(extraction.meritClass)notes.push(`Classe di merito: ${extraction.meritClass}`);
    if(extraction.insured)notes.push(`Contraente/assicurato: ${extraction.insured}`);
    if(Array.isArray(extraction.guarantees)&&extraction.guarantees.length)notes.push(`Garanzie: ${extraction.guarantees.join(', ')}`);
    if(extraction.invoice)notes.push(`Documento: ${extraction.invoice}`);
    if(extraction.make)notes.push(`Marca: ${extraction.make}`);
    if(extraction.model)notes.push(`Modello: ${extraction.model}`);
    if(extraction.vin)notes.push(`Telaio: ${extraction.vin}`);
    if(extraction.firstRegistration)notes.push(`Prima immatricolazione: ${formatDate(extraction.firstRegistration)}`);
    if(extraction.fuel)notes.push(`Alimentazione: ${extraction.fuel}`);
    if(extraction.displacement)notes.push(`Cilindrata: ${extraction.displacement.toLocaleString('it-IT')} cm³`);
    if(extraction.powerKw)notes.push(`Potenza: ${extraction.powerKw.toLocaleString('it-IT')} kW`);
    if(extraction.owner)notes.push(`Proprietario: ${extraction.owner}`);
    if(extraction.ownerTaxCode)notes.push(`Codice fiscale proprietario: ${extraction.ownerTaxCode}`);
    if(extraction.certificateNumber)notes.push(`N. certificato: ${extraction.certificateNumber}`);
    if(extraction.cdpdId)notes.push(`ID CDPD: ${extraction.cdpdId}`);
    if(extraction.liens)notes.push(`Gravami/ipoteche: ${extraction.liens}`);
    if(notes.length&&!$('documentNotes').value.trim())$('documentNotes').value=notes.join('\n').slice(0,500);
  }

  async function extractPdfText(file,onProgress){
    const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
    const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
    let text='';
    const pages=Math.min(pdf.numPages,4);
    for(let i=1;i<=pages;i++){
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      text+=content.items.map(item=>item.str).join(' ')+'\n';
      onProgress?.(10+(i/pages)*35,`Lettura PDF pagina ${i} di ${pages}`);
    }
    if(normalizeText(text).length>=80)return text;
    if(!window.Tesseract)throw new Error('Motore OCR non disponibile');
    text='';
    for(let i=1;i<=Math.min(pdf.numPages,3);i++){
      const page=await pdf.getPage(i);
      const viewport=page.getViewport({scale:1.8});
      const canvas=document.createElement('canvas');
      canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      const result=await window.Tesseract.recognize(canvas,'ita+eng',{logger:m=>{
        if(m.status==='recognizing text')onProgress?.(45+((i-1+m.progress)/Math.min(pdf.numPages,3))*50,`OCR pagina ${i} di ${Math.min(pdf.numPages,3)}`);
      }});
      text+=result.data.text+'\n';
    }
    return text;
  }
  async function scanFile(file,token){
    resetExtraction();
    setScanProgress('Preparazione analisi…',3);
    try{
      let text='';
      if(file.type==='application/pdf'){
        text=await extractPdfText(file,(percent,label)=>{if(token===scanToken)setScanProgress(label,percent);});
      }else{
        if(!window.Tesseract)throw new Error('Motore OCR non disponibile');
        const result=await window.Tesseract.recognize(file,'ita+eng',{logger:m=>{
          if(token!==scanToken)return;
          const labels={'loading tesseract core':'Caricamento motore OCR…','initializing tesseract':'Inizializzazione OCR…','loading language traineddata':'Caricamento lingua italiana…','initializing api':'Preparazione lettura…','recognizing text':'Lettura del documento…'};
          const base=m.status==='recognizing text'?20:5;
          const percent=m.status==='recognizing text'?20+(m.progress||0)*75:base+(m.progress||0)*15;
          setScanProgress(labels[m.status]||'Analisi documento…',percent);
        }});
        text=result.data.text;
      }
      if(token!==scanToken)return;
      setScanProgress('Riconoscimento dei dati…',97);
      const extraction=extractData(text,file.name);
      renderExtraction(extraction);autofillForm(extraction);
      setScanProgress('Analisi completata',100);hideScanProgress();
    }catch(error){
      console.error(error);
      if(token!==scanToken)return;
      setScanProgress('Analisi non riuscita',100);
      setMessage('Il documento è stato selezionato, ma la scansione automatica non è riuscita. Puoi comunque compilarlo e salvarlo manualmente.',true);
      hideScanProgress();
    }
  }

  function appendSmartRecord(extraction){
    if(!extraction||!$('documentCreateEvent')?.checked)return false;
    const data=window.MiaAutoStorage.loadData();
    const id=()=>crypto.randomUUID?.()||`id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const date=extraction.date||new Date().toISOString().slice(0,10);
    if(extraction.kind==='registration'){
      const vehicle=data.vehicle||{};
      const combinedName=[extraction.make,extraction.model].filter(Boolean).join(' ').trim();
      if(combinedName)vehicle.name=combinedName;
      if(extraction.firstRegistration)vehicle.year=extraction.firstRegistration.slice(0,4);
      if(extraction.fuel)vehicle.fuel=extraction.fuel;
      if(extraction.plate)vehicle.plate=extraction.plate;
      if(extraction.vin)vehicle.vin=extraction.vin;
      if(extraction.firstRegistration)vehicle.firstRegistration=extraction.firstRegistration;
      if(extraction.displacement)vehicle.displacement=Number(extraction.displacement);
      if(extraction.powerKw)vehicle.powerKw=Number(extraction.powerKw);
      if(extraction.seats)vehicle.seats=Number(extraction.seats);
      data.vehicle=vehicle;
    }else if(extraction.kind==='fuel'){
      data.fuel.push({id:id(),date,odometer:Number(extraction.km||0),liters:Number(extraction.liters||0),pricePerLiter:Number(extraction.pricePerLiter||0),total:Number(extraction.amount||0),station:extraction.business||'',location:extraction.location||'',lat:null,lng:null,fullTank:false,source:'document-ocr'});
    }else if(extraction.kind==='revision'){
      data.maintenance.push({id:id(),type:`Revisione${extraction.result?` (${extraction.result})`:''}`,date,km:Number(extraction.km||0),cost:Number(extraction.amount||0),location:extraction.location||extraction.business||'',lat:null,lng:null,source:'document-ocr'});
      if(extraction.expiry)data.deadlines.push({id:id(),type:'Revisione',date:extraction.expiry,km:0,location:extraction.location||extraction.business||'',lat:null,lng:null,notes:'Scadenza ricavata automaticamente dal documento',source:'document-ocr'});
    }else if(extraction.kind==='insurance'&&extraction.expiry){
      data.deadlines.push({id:id(),type:'Assicurazione RCA',date:extraction.expiry,km:0,location:extraction.business||'',lat:null,lng:null,notes:[extraction.company,extraction.policy?`Polizza ${extraction.policy}`:''].filter(Boolean).join(' · ')||'Scadenza ricavata automaticamente dal documento',source:'document-ocr'});
    }else if(extraction.kind==='tax'&&(extraction.expiry||extraction.date)){
      data.deadlines.push({id:id(),type:'Bollo auto',date:extraction.expiry||extraction.date,km:0,location:extraction.location||'',lat:null,lng:null,notes:'Data ricavata automaticamente dal documento',source:'document-ocr'});
    }else if(['tires','maintenance'].includes(extraction.kind)){
      data.maintenance.push({id:id(),type:extraction.kind==='tires'?'Gomme e pneumatici':'Manutenzione',date,km:Number(extraction.km||0),cost:Number(extraction.amount||0),location:extraction.location||extraction.business||'',lat:null,lng:null,source:'document-ocr'});
    }else return false;
    if(extraction.km&&Number(extraction.km)>Number(data.vehicle?.km||0))data.vehicle.km=Number(extraction.km);
    window.MiaAutoStorage.saveData(data);
    document.dispatchEvent(new CustomEvent('miaauto:data-changed'));
    return true;
  }

  $('addDocumentBtn')?.addEventListener('click',()=>{
    const today=new Date().toISOString().slice(0,10);
    $('documentDate').value=today;
    resetExtraction();
    $('documentModal').showModal();
  });
  $('documentFile')?.addEventListener('change',()=>{
    const file=$('documentFile').files[0];
    scanToken++;
    if(!file){resetExtraction();return;}
    if(file.size>MAX_FILE_SIZE){setMessage('Il file supera 12 MB. Riducilo prima di salvarlo.',true);return;}
    scanFile(file,scanToken);
  });
  $('documentForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const file=$('documentFile').files[0];
    if(!file)return;
    if(file.size>MAX_FILE_SIZE){setMessage('Il file supera 12 MB. Riducilo prima di salvarlo.',true);return;}
    const allowed=file.type==='application/pdf'||file.type.startsWith('image/');
    if(!allowed){setMessage('Sono supportati soltanto PDF e immagini.',true);return;}
    const button=$('saveDocumentBtn');button.disabled=true;button.textContent='Salvataggio…';
    try{
      const smartRecordAdded=appendSmartRecord(currentExtraction);
      await put({
        id:`doc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        title:$('documentTitle').value.trim(),category:$('documentCategory').value,
        date:$('documentDate').value,notes:$('documentNotes').value.trim(),
        fileName:file.name,fileType:file.type||'application/octet-stream',fileSize:file.size,
        vehiclePlate:window.MiaAutoStorage.loadData().vehicle?.plate||'',createdAt:new Date().toISOString(),blob:file,
        extractedText:currentExtraction?.text?.slice(0,25000)||'',
        extraction:currentExtraction?{...currentExtraction,text:undefined}:null
      });
      $('documentForm').reset();resetExtraction();$('documentModal').close();
      setMessage(smartRecordAdded?'Documento salvato e dati aggiunti automaticamente all’app.':'Documento salvato correttamente.');
      await reload();
    }catch(error){console.error(error);setMessage('Salvataggio non riuscito. Lo spazio del browser potrebbe essere insufficiente.',true);}
    finally{button.disabled=false;button.textContent='Salva documento';}
  });
  $('documentsSearch')?.addEventListener('input',render);
  $('documentsCategoryFilter')?.addEventListener('change',render);
  $('documentsList')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-document-id]');if(!button)return;
    const doc=documents.find(item=>item.id===button.dataset.documentId);if(doc)openPreview(doc);
  });
  $('documentDeleteBtn')?.addEventListener('click',async()=>{
    if(!selectedId||!confirm('Eliminare definitivamente questo documento?'))return;
    try{await remove(selectedId);$('documentPreviewModal').close();closePreview();setMessage('Documento eliminato.');await reload();}
    catch(error){console.error(error);setMessage('Non è stato possibile eliminare il documento.',true);}
  });
  $('documentPreviewModal')?.addEventListener('close',closePreview);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)reload();});
  reload();
})();

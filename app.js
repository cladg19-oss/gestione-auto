const {STORAGE_KEY}=window.MiaAutoStorage;
const {money,number,formatDate,daysUntil,escapeHtml}=window.MiaAutoUtils;
const THEME_KEY='miaAutoTheme';
const WELCOME_KEY='miaAutoWelcome840';

let data=window.MiaAutoStorage.loadData();
let activeDeadlineFilter='all';
let activeTimelineFilter='all';
let timelineSearchTerm='';
let selectedTimelineEvent=null;

const $=id=>document.getElementById(id);
const fuelUseLocation=$('fuelUseLocation');
const fuelLocationStatus=$('fuelLocationStatus');
const expenseUseLocation=$('expenseUseLocation');
const expenseLocationStatus=$('expenseLocationStatus');
const maintenanceUseLocation=$('maintenanceUseLocation');
const maintenanceLocationStatus=$('maintenanceLocationStatus');
const fuelLocation=$('fuelLocation');
const expenseLocation=$('expenseLocation');
const maintenanceLocation=$('maintenanceLocation');
const deadlineKm=$('deadlineKm');
const deadlineLocation=$('deadlineLocation');
const deadlineUseLocation=$('deadlineUseLocation');
const deadlineLocationStatus=$('deadlineLocationStatus');



function saveData(){
  window.MiaAutoStorage.saveData(data);
  renderAll();
}

const pendingLocations={fuel:null,expense:null,maintenance:null,deadline:null};

function selectCurrentDeadline(items){
  const sorted=[...items].sort((a,b)=>a.date.localeCompare(b.date));
  return sorted.find(item=>daysUntil(item.date)>=0)||sorted[sorted.length-1]||null;
}

function destinationQuery(item){
  if(item && item.lat!=null && item.lng!=null)return `${item.lat},${item.lng}`;
  if(item && item.location)return item.location;
  return '';
}

function googleMapsUrl(item){
  const query=destinationQuery(item);
  return query?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`:'';
}

function wazeUrl(item){
  if(item && item.lat!=null && item.lng!=null){
    return `https://www.waze.com/ul?ll=${item.lat}%2C${item.lng}&navigate=yes`;
  }
  if(item && item.location){
    return `https://www.waze.com/ul?q=${encodeURIComponent(item.location)}&navigate=yes`;
  }
  return '';
}

function locationActions(item){
  const google=googleMapsUrl(item);
  const waze=wazeUrl(item);
  if(!google && !waze)return '';
  return `<div class="navigation-actions">
    ${google?`<a class="nav-app-btn maps-btn" href="${google}" target="_blank" rel="noopener noreferrer">🗺️ Google Maps</a>`:''}
    ${waze?`<a class="nav-app-btn waze-btn" href="${waze}" target="_blank" rel="noopener noreferrer">🚙 Waze</a>`:''}
  </div>`;
}

function clickableLocationContent(item,content){
  const google=googleMapsUrl(item);
  return google
    ? `<a class="place-open-link" href="${google}" target="_blank" rel="noopener noreferrer" title="Apri il percorso in Google Maps">${content}</a>`
    : content;
}

function captureLocation(kind,statusElement){
  if(!navigator.geolocation){
    if(statusElement)statusElement.textContent='Posizione non supportata.';
    return;
  }
  if(statusElement)statusElement.textContent='Rilevamento in corso…';
  navigator.geolocation.getCurrentPosition(
    position=>{
      pendingLocations[kind]={
        lat:position.coords.latitude,
        lng:position.coords.longitude
      };
      if(statusElement)statusElement.textContent='Posizione acquisita.';
    },
    ()=>{
      if(statusElement)statusElement.textContent='Posizione non rilevata. Controlla i permessi.';
    },
    {enableHighAccuracy:true,timeout:10000,maximumAge:60000}
  );
}

function badgeFor(date){
  const days=daysUntil(date);
  if(days<0)return ['Scaduta','red'];
  if(days===0)return ['Oggi','yellow'];
  if(days<=7)return [`${days} giorni`,'red'];
  if(days<=30)return [`${days} giorni`,'yellow'];
  return ['Regolare','green'];
}
function iconFor(type=''){
  const t=type.toLowerCase();
  if(t.includes('rca')||t.includes('assicur'))return '🛡️';
  if(t.includes('bollo'))return '💳';
  if(t.includes('revis'))return '🔍';
  if(t.includes('tagliando')||t.includes('olio'))return '🔧';
  if(t.includes('gom'))return '🛞';
  if(t.includes('patente'))return '🪪';
  return '📌';
}
function getFuelCalculations(){
  const sorted=[...data.fuel].sort((a,b)=>a.odometer-b.odometer);
  let totalDistance=0,totalLitersForConsumption=0;
  for(let i=1;i<sorted.length;i++){
    const current=sorted[i],previous=sorted[i-1];
    if(current.fullTank&&previous.fullTank&&current.odometer>previous.odometer){
      totalDistance+=current.odometer-previous.odometer;
      totalLitersForConsumption+=current.liters;
    }
  }
  const kmL=totalLitersForConsumption>0?totalDistance/totalLitersForConsumption:0;
  return {
    totalLiters:data.fuel.reduce((s,x)=>s+Number(x.liters||0),0),
    totalCost:data.fuel.reduce((s,x)=>s+Number(x.total||0),0),
    kmL,
    l100:kmL>0?100/kmL:0
  };
}

function renderVehicle(){
  const v=data.vehicle;
  vehicleName.textContent=v.name||'Veicolo';
  vehicleMeta.textContent=`${v.year||'Anno'} · ${v.fuel||'Alimentazione'}`;
  vehiclePlate.textContent=(v.plate||'TARGA').toUpperCase();
  statKm.textContent=`${Number(v.km||0).toLocaleString('it-IT')} km`;
  vehicleNameInput.value=v.name||'';
  vehicleYearInput.value=v.year||'';
  vehicleFuelInput.value=v.fuel||'';
  vehiclePlateInput.value=v.plate||'';
  vehicleKmInput.value=v.km||0;
}

function renderStats(){
  const fuelCalc=getFuelCalculations();
  const ordinaryExpenses=data.expenses.reduce((s,x)=>s+Number(x.amount||0),0);
  const maintenanceExpenses=data.maintenance.reduce((s,x)=>s+Number(x.cost||0),0);
  statExpenses.textContent=money(ordinaryExpenses+maintenanceExpenses+fuelCalc.totalCost);
  statConsumption.textContent=fuelCalc.kmL?`${number(fuelCalc.kmL,1)} km/l`:'-- km/l';
  const next=[...data.deadlines].filter(x=>daysUntil(x.date)>=0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  statDeadline.textContent=next?next.type:'Nessuna';
}

function deadlineCard(item){
  const [text,color]=badgeFor(item.date);
  return `<article class="list-item">
    <div class="deadline-main">
      <div class="deadline-icon">${iconFor(item.type)}</div>
      ${clickableLocationContent(item,`<div><h3>${escapeHtml(item.type)}</h3><p>${formatDate(item.date)}${item.km?` · ${Number(item.km).toLocaleString('it-IT')} km`:''}${item.location?` · ${escapeHtml(item.location)}`:''}${item.notes?` · ${escapeHtml(item.notes)}`:''}</p></div>`)}
    </div>
    <div><span class="badge ${color}">${text}</span> ${locationActions(item)}
          <button class="delete" data-delete-deadline="${item.id}" aria-label="Elimina scadenza o revisione">🗑️</button></div>
  </article>`;
}

function renderDeadlines(){
  const sorted=[...data.deadlines].sort((a,b)=>a.date.localeCompare(b.date));
  const filtered=sorted.filter(item=>{
    const d=daysUntil(item.date);
    if(activeDeadlineFilter==='urgent')return d>=0&&d<=30;
    if(activeDeadlineFilter==='expired')return d<0;
    return true;
  });
  deadlineList.innerHTML=filtered.length?filtered.map(deadlineCard).join(''):'<div class="empty">Nessuna scadenza in questa sezione.</div>';
  homeDeadlines.innerHTML=sorted.length?sorted.slice(0,3).map(deadlineCard).join(''):'<div class="empty">Aggiungi assicurazione, bollo o revisione.</div>';
}

function renderHealth(){
  const important=[
    {label:'Assicurazione RCA',keywords:['rca','assicur']},
    {label:'Bollo auto',keywords:['bollo']},
    {label:'Revisione',keywords:['revis']}
  ];
  let worst='ok';
  const rows=important.map(item=>{
    const found=selectCurrentDeadline(data.deadlines.filter(d=>item.keywords.some(k=>d.type.toLowerCase().includes(k))));
    if(!found){
      if(worst==='ok')worst='warn';
      return `<div class="health-row"><span>⚪ ${item.label}</span><small>Non inserita</small></div>`;
    }
    const days=daysUntil(found.date);
    let icon='✅',text='Regolare';
    if(days<0){icon='❌';text='Scaduta';worst='danger';}
    else if(days<=30){icon='⚠️';text=days===0?'Scade oggi':`Tra ${days} giorni`;if(worst!=='danger')worst='warn';}
    return `<div class="health-row"><span>${icon} ${item.label}</span><small>${text}</small></div>`;
  });
  healthList.innerHTML=rows.join('');
  healthBadge.className=`health-badge ${worst}`;
  healthBadge.textContent=worst==='danger'?'Intervento necessario':worst==='warn'?'Da controllare':'Tutto regolare';
  healthHeading.textContent=`Stato della ${data.vehicle.name||'auto'}`;
}

function fuelCard(item,index,sorted){
  let cons='';
  if(index<sorted.length-1){
    const p=sorted[index+1];
    if(item.fullTank&&p.fullTank&&item.odometer>p.odometer&&item.liters>0){
      cons=`${number((item.odometer-p.odometer)/item.liters,1)} km/l`;
    }
  }
  const details=`<div><h3>${formatDate(item.date)}</h3><p>${number(item.liters,2)} l · ${Number(item.odometer).toLocaleString('it-IT')} km${item.station?` · ${escapeHtml(item.station)}`:''}${item.location?` · ${escapeHtml(item.location)}`:''}</p></div>`;
  return `<article class="list-item location-card">
    <div class="fuel-main">${clickableLocationContent(item,`<div class="fuel-icon">⛽</div>${details}`)}</div>
    <div class="fuel-result">
      <strong>${money(item.total)}</strong>
      <small>${cons||'Consumo non calcolabile'}</small>
      ${locationActions(item)}
      <button class="delete" data-delete-fuel="${item.id}" aria-label="Elimina rifornimento">🗑️</button>
    </div>
  </article>`;
}

function renderFuel(){
  const sorted=[...data.fuel].sort((a,b)=>b.odometer-a.odometer);
  fuelList.innerHTML=sorted.length?sorted.map((x,i)=>fuelCard(x,i,sorted)).join(''):'<div class="empty">Nessun rifornimento inserito.</div>';
  homeFuelList.innerHTML=sorted.length?sorted.slice(0,2).map((x,i)=>fuelCard(x,i,sorted)).join(''):'<div class="empty">Aggiungi il primo rifornimento.</div>';
  const calc=getFuelCalculations();
  fuelTotalLiters.textContent=`${number(calc.totalLiters,2)} l`;
  fuelTotalCost.textContent=money(calc.totalCost);
  fuelAvgKmL.textContent=calc.kmL?number(calc.kmL,1):'--';
  fuelAvgL100.textContent=calc.l100?number(calc.l100,1):'--';
}

function renderExpenses(){
  const s=[...data.expenses].sort((a,b)=>b.date.localeCompare(a.date));
  expenseList.innerHTML=s.length?s.map(x=>{
    const content=`<div><h3>${escapeHtml(x.category)}</h3><p>${formatDate(x.date)}${x.location?` · ${escapeHtml(x.location)}`:''}${x.notes?` · ${escapeHtml(x.notes)}`:''}</p></div>`;
    return `<article class="list-item location-card">
      <div class="expense-main">${clickableLocationContent(x,content)}</div>
      <div class="item-actions">
        <strong>${money(x.amount)}</strong>
        ${locationActions(x)}
        <button class="delete" data-delete-expense="${x.id}" aria-label="Elimina spesa">🗑️</button>
      </div>
    </article>`;
  }).join(''):'<div class="empty">Nessuna spesa inserita.</div>';
}

function renderMaintenance(){
  const s=[...data.maintenance].sort((a,b)=>b.date.localeCompare(a.date));
  maintenanceList.innerHTML=s.length?s.map(x=>{
    const content=`<div><h3>${escapeHtml(x.type)}</h3><p>${formatDate(x.date)}${x.km?` · ${Number(x.km).toLocaleString('it-IT')} km`:''}${x.location?` · ${escapeHtml(x.location)}`:''}</p></div>`;
    return `<article class="list-item location-card">
      <div class="maintenance-main">${clickableLocationContent(x,content)}</div>
      <div class="item-actions">
        <strong>${x.cost?money(x.cost):''}</strong>
        ${locationActions(x)}
        <button class="delete" data-delete-maintenance="${x.id}" aria-label="Elimina manutenzione">🗑️</button>
      </div>
    </article>`;
  }).join(''):'<div class="empty">Nessuna manutenzione inserita.</div>';
}

function totalExpensesAll(){return data.expenses.reduce((s,x)=>s+Number(x.amount||0),0)+data.maintenance.reduce((s,x)=>s+Number(x.cost||0),0)+getFuelCalculations().totalCost;}
function healthScoreCalc(){let score=40;[['rca','assicur'],['bollo'],['revis']].forEach(keys=>{const item=selectCurrentDeadline(data.deadlines.filter(d=>keys.some(k=>d.type.toLowerCase().includes(k))));if(!item)score-=5;else if(daysUntil(item.date)<0)score-=20;else if(daysUntil(item.date)<=30)score-=5;else score+=10;});if(data.maintenance.length)score+=10;if(data.fuel.length>=2)score+=5;return Math.max(0,Math.min(100,score));}
function renderHealthScore(){const score=healthScoreCalc();healthScore.textContent=score;document.querySelector('.score-circle').style.setProperty('--score',`${score}%`);healthScoreLabel.textContent=score>=85?'Ottima':score>=65?'Buona':score>=45?'Da migliorare':'Attenzione';healthScoreText.textContent=score>=85?'L’auto risulta ben gestita.':score>=65?'La situazione è buona, ma mancano alcuni dati.':score>=45?'Aggiungi scadenze e manutenzioni mancanti.':'Sono presenti scadenze o dati da controllare.';}
function renderChart(){const now=new Date(),months=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:new Intl.DateTimeFormat('it-IT',{month:'short'}).format(d),value:0});}const all=[...data.expenses.map(x=>({date:x.date,amount:x.amount})),...data.maintenance.map(x=>({date:x.date,amount:x.cost})),...data.fuel.map(x=>({date:x.date,amount:x.total}))];all.forEach(x=>{const m=months.find(m=>x.date&&x.date.startsWith(m.key));if(m)m.value+=Number(x.amount||0);});const max=Math.max(...months.map(m=>m.value),1);monthlyChart.innerHTML=months.map(m=>`<div class="bar-column"><span class="bar-value">${m.value?money(m.value):''}</span><div class="bar" style="height:${Math.max(4,(m.value/max)*120)}px"></div><span class="bar-label">${m.label}</span></div>`).join('');}
function applyTheme(theme){
  const prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark=theme==='dark'||(theme==='system'&&prefersDark);
  document.body.classList.toggle('theme-dark',dark);
}
function initSettings(){
  const theme=localStorage.getItem(THEME_KEY)||'system';
  const select=$('themeSelect');
  if(select){select.value=theme;select.addEventListener('change',()=>{localStorage.setItem(THEME_KEY,select.value);applyTheme(select.value);});}
  applyTheme(theme);
  const media=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');
  if(media&&media.addEventListener)media.addEventListener('change',()=>{if((localStorage.getItem(THEME_KEY)||'system')==='system')applyTheme('system');});
}

function renderSmartDashboard(){
  const now=new Date();
  const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const yearKey=String(now.getFullYear());
  const operations=[
    ...data.expenses.map(x=>({date:x.date,amount:Number(x.amount||0)})),
    ...data.maintenance.map(x=>({date:x.date,amount:Number(x.cost||0)})),
    ...data.fuel.map(x=>({date:x.date,amount:Number(x.total||0)}))
  ];
  const monthOps=operations.filter(x=>x.date&&x.date.startsWith(monthKey));
  const monthTotal=monthOps.reduce((sum,x)=>sum+x.amount,0);
  const yearTotal=operations.filter(x=>x.date&&x.date.startsWith(yearKey)).reduce((sum,x)=>sum+x.amount,0);
  const next=[...data.deadlines].filter(x=>x.date&&daysUntil(x.date)>=0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const lastFuel=[...data.fuel].filter(x=>x.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
  const lastMaintenance=[...data.maintenance].filter(x=>x.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
  const set=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
  set('smartMonthExpenses',money(monthTotal));
  set('smartMonthOperations',`${monthOps.length} ${monthOps.length===1?'operazione':'operazioni'}`);
  set('smartYearExpenses',money(yearTotal));
  set('smartMaintenanceCount',String(data.maintenance.length));
  const km=Number(data.vehicle.km||0);
  set('smartCostKm',km>0?money(totalExpensesAll()/km):'--');
  if(next){
    const days=daysUntil(next.date);
    set('smartNextDeadline',next.type||'Scadenza');
    set('smartNextDeadlineDate',`${formatDate(next.date)} · ${days===0?'oggi':`tra ${days} giorni`}`);
  }else{
    set('smartNextDeadline','Nessuna');set('smartNextDeadlineDate','Aggiungi una scadenza');
  }
  if(lastFuel){
    set('smartLastFuel',money(lastFuel.total));
    set('smartLastFuelDetail',`${formatDate(lastFuel.date)} · ${number(lastFuel.liters,2)} l`);
  }else{
    set('smartLastFuel','Nessuno');set('smartLastFuelDetail','Inserisci il primo pieno');
  }
  if(lastMaintenance){
    set('smartLastMaintenance',lastMaintenance.type||'Intervento');
    set('smartLastMaintenanceDetail',`${formatDate(lastMaintenance.date)}${lastMaintenance.km?` · ${Number(lastMaintenance.km).toLocaleString('it-IT')} km`:''}`);
  }else{
    set('smartLastMaintenance','Nessuna');set('smartLastMaintenanceDetail','Nessun intervento registrato');
  }
}

function monthlyOperationsTotal(year,month){
  const key=`${year}-${String(month+1).padStart(2,'0')}`;
  return [
    ...data.expenses.map(x=>({date:x.date,amount:Number(x.amount||0)})),
    ...data.maintenance.map(x=>({date:x.date,amount:Number(x.cost||0)})),
    ...data.fuel.map(x=>({date:x.date,amount:Number(x.total||0)}))
  ].filter(x=>x.date&&x.date.startsWith(key)).reduce((sum,x)=>sum+x.amount,0);
}
function renderMonthComparison(){
  const now=new Date();
  const current=monthlyOperationsTotal(now.getFullYear(),now.getMonth());
  const previousDate=new Date(now.getFullYear(),now.getMonth()-1,1);
  const previous=monthlyOperationsTotal(previousDate.getFullYear(),previousDate.getMonth());
  const value=$('monthComparisonValue'),text=$('monthComparisonText'),bar=$('monthComparisonBar');
  if(!value||!text||!bar)return;
  if(previous<=0){value.textContent='Nessun confronto';text.textContent=current>0?'Manca uno storico nel mese precedente.':'Servono dati in almeno due mesi.';bar.style.width='0%';bar.className='';return;}
  const diff=current-previous;
  const percent=(diff/previous)*100;
  value.textContent=`${percent>0?'+':''}${number(percent,0)}%`;
  value.className=percent>5?'comparison-up':percent<-5?'comparison-down':'comparison-flat';
  text.textContent=percent>5?`Hai speso ${money(Math.abs(diff))} in più del mese scorso.`:percent<-5?`Hai speso ${money(Math.abs(diff))} in meno del mese scorso.`:'Le spese sono quasi stabili rispetto al mese scorso.';
  bar.style.width=`${Math.min(100,Math.max(8,Math.abs(percent)))}%`;
  bar.className=percent>5?'up':percent<-5?'down':'flat';
}
function buildSuggestions(){
  const items=[];
  const next=[...data.deadlines].filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date)).find(x=>daysUntil(x.date)>=0);
  const expired=[...data.deadlines].filter(x=>x.date&&daysUntil(x.date)<0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  if(expired)items.push({tone:'danger',icon:'!',title:`${expired.type||'Scadenza'} scaduta`,text:`È scaduta il ${formatDate(expired.date)}. Aggiorna la data appena possibile.`});
  else if(next){const d=daysUntil(next.date);items.push({tone:d<=30?'warning':'info',icon:d<=30?'!':'i',title:d===0?`${next.type} scade oggi`:`${next.type} tra ${d} giorni`,text:`Data prevista: ${formatDate(next.date)}.`});}
  else items.push({tone:'warning',icon:'+',title:'Aggiungi le scadenze principali',text:'Inserisci RCA, bollo e revisione per ricevere avvisi utili.'});
  if(!data.maintenance.length)items.push({tone:'warning',icon:'🔧',title:'Nessuna manutenzione registrata',text:'Aggiungi almeno l’ultimo tagliando per completare lo stato dell’auto.'});
  else {const last=[...data.maintenance].filter(x=>x.date).sort((a,b)=>b.date.localeCompare(a.date))[0];if(last){const age=Math.floor((Date.now()-new Date(last.date+'T12:00:00'))/86400000);if(age>365)items.push({tone:'warning',icon:'🔧',title:'Manutenzione da verificare',text:`L’ultimo intervento risale a ${age} giorni fa.`});else items.push({tone:'success',icon:'✓',title:'Manutenzione registrata',text:`Ultimo intervento: ${last.type||'manutenzione'} del ${formatDate(last.date)}.`});}}
  const calc=getFuelCalculations();
  if(data.fuel.length<2)items.push({tone:'info',icon:'⛽',title:'Consumo medio non disponibile',text:'Servono almeno due pieni completi con chilometraggio.'});
  else if(calc.kmL)items.push({tone:'success',icon:'⛽',title:`Consumo medio ${number(calc.kmL,1)} km/l`,text:'Il valore viene calcolato usando i pieni completi registrati.'});
  return items.slice(0,4);
}
function renderSuggestions(){
  const box=$('smartSuggestions');if(!box)return;
  box.innerHTML=buildSuggestions().map(x=>`<article class="suggestion-item ${x.tone}"><span>${x.icon}</span><div><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.text)}</p></div></article>`).join('');
}
function renderRecentActivity(){
  const container=$('recentActivity');if(!container)return;
  const events=[
    ...data.fuel.map(x=>({kind:'fuel',date:x.date,title:'Rifornimento',detail:`${money(x.total)} · ${number(x.liters,2)} l`,icon:'⛽'})),
    ...data.expenses.map(x=>({kind:'expense',date:x.date,title:x.category||'Spesa',detail:money(x.amount),icon:'💶'})),
    ...data.maintenance.map(x=>({kind:'maintenance',date:x.date,title:x.type||'Manutenzione',detail:`${x.cost?money(x.cost):'Intervento registrato'}${x.km?` · ${Number(x.km).toLocaleString('it-IT')} km`:''}`,icon:'🔧'})),
    ...data.deadlines.map(x=>({kind:'deadline',date:x.date,title:x.type||'Scadenza',detail:daysUntil(x.date)<0?'Scaduta':`Scade ${formatDate(x.date)}`,icon:'📅'}))
  ].filter(x=>x.date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  container.innerHTML=events.length?events.map(x=>`<article class="activity-row"><span class="activity-icon ${x.kind}">${x.icon}</span><div><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.detail)}</p></div><time>${formatDate(x.date)}</time></article>`).join(''):'<div class="empty">Le attività compariranno qui dopo il primo inserimento.</div>';
}
function timelineIcon(type){
  return {fuel:'⛽',expense:'💶',maintenance:'🔧',deadline:'📅'}[type]||'•';
}
function timelineTypeLabel(type){
  return {fuel:'Rifornimento',expense:'Spesa',maintenance:'Manutenzione',deadline:'Scadenza'}[type]||'Evento';
}
function timelineSection(type){
  return {fuel:'fuel',expense:'expenses',maintenance:'maintenance',deadline:'deadlines'}[type]||'home';
}
function timelineEventMeta(event){
  const parts=[];
  if(event.amount>0)parts.push(money(event.amount));
  if(event.km>0)parts.push(`${Number(event.km).toLocaleString('it-IT')} km`);
  if(event.location)parts.push(event.location);
  return parts.join(' · ')||event.description||timelineTypeLabel(event.type);
}
function timelineDateKey(date){
  const today=new Date();today.setHours(0,0,0,0);
  const target=new Date(`${date}T12:00:00`);target.setHours(0,0,0,0);
  const diff=Math.round((today-target)/86400000);
  if(diff===0)return 'Oggi';
  if(diff===1)return 'Ieri';
  return formatDate(date);
}
function filteredTimelineEvents(){
  const query=timelineSearchTerm.trim().toLocaleLowerCase('it-IT');
  return window.MiaAutoEvents.buildTimeline(data).filter(event=>{
    if(activeTimelineFilter!=='all'&&event.type!==activeTimelineFilter)return false;
    if(!query)return true;
    const haystack=[event.title,event.description,event.location,event.amount,event.km,timelineTypeLabel(event.type)].join(' ').toLocaleLowerCase('it-IT');
    return haystack.includes(query);
  });
}
function renderTimeline(){
  const container=$('timelineList'),count=$('timelineCount');
  if(!container)return;
  const events=filteredTimelineEvents();
  if(count)count.textContent=`${events.length} ${events.length===1?'evento':'eventi'}`;
  if(!events.length){
    container.innerHTML='<div class="empty">Nessun evento corrisponde alla ricerca. I dati registrati appariranno qui in ordine cronologico.</div>';
    return;
  }
  let lastDate='';
  container.innerHTML=events.map(event=>{
    const heading=event.date!==lastDate?`<h3 class="timeline-date">${timelineDateKey(event.date)}</h3>`:'';
    lastDate=event.date;
    const description=event.description&&event.description!==event.title?`<p>${escapeHtml(event.description)}</p>`:'';
    return `${heading}<button class="timeline-event" type="button" data-timeline-event="${escapeHtml(event.id)}">
      <span class="timeline-dot ${event.type}">${timelineIcon(event.type)}</span>
      <span class="timeline-event-copy"><small>${timelineTypeLabel(event.type)}</small><strong>${escapeHtml(event.title)}</strong>${description}<span>${escapeHtml(timelineEventMeta(event))}</span></span>
      <time>${formatDate(event.date)}</time><span class="timeline-chevron">›</span>
    </button>`;
  }).join('');
}
function showTimelineDetail(event){
  selectedTimelineEvent=event;
  const modal=$('timelineDetailModal');
  if(!modal)return;
  $('timelineDetailTitle').textContent=event.title||timelineTypeLabel(event.type);
  const rows=[
    ['Tipo',timelineTypeLabel(event.type)],
    ['Data',formatDate(event.date)],
    event.amount>0?['Importo',money(event.amount)]:null,
    event.km>0?['Chilometri',`${Number(event.km).toLocaleString('it-IT')} km`]:null,
    event.description?['Dettagli',event.description]:null,
    event.location?['Posizione',event.location]:null
  ].filter(Boolean);
  const maps=locationActions(event.raw||event);
  $('timelineDetailBody').innerHTML=`<div class="timeline-detail-icon ${event.type}">${timelineIcon(event.type)}</div><dl>${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHtml(String(value))}</dd></div>`).join('')}</dl>${maps}`;
  modal.showModal();
}



function yearlyCostGroups(){
  const year=String(new Date().getFullYear());
  const groups=[
    {key:'fuel',label:'Carburante',icon:'⛽',value:data.fuel.filter(x=>x.date&&x.date.startsWith(year)).reduce((s,x)=>s+Number(x.total||0),0)},
    {key:'maintenance',label:'Manutenzione',icon:'🔧',value:data.maintenance.filter(x=>x.date&&x.date.startsWith(year)).reduce((s,x)=>s+Number(x.cost||0),0)},
    {key:'expenses',label:'Altre spese',icon:'💶',value:data.expenses.filter(x=>x.date&&x.date.startsWith(year)).reduce((s,x)=>s+Number(x.amount||0),0)}
  ];
  return groups;
}
function renderAnnualOverview(){
  const groups=yearlyCostGroups();
  const total=groups.reduce((sum,item)=>sum+item.value,0);
  const totalEl=$('overviewYearTotal');
  const box=$('costBreakdown');
  if(totalEl)totalEl.textContent=money(total);
  if(box)box.innerHTML=groups.map(item=>{
    const percentage=total>0?Math.round((item.value/total)*100):0;
    return `<article class="cost-row"><span class="cost-icon">${item.icon}</span><div><div><strong>${item.label}</strong><b>${money(item.value)}</b></div><div class="cost-track"><span style="width:${percentage}%"></span></div><small>${percentage}% del totale annuale</small></div></article>`;
  }).join('');
}
function renderDataCompleteness(){
  const checks=[
    Boolean(data.vehicle.name&&data.vehicle.plate&&data.vehicle.year),
    Number(data.vehicle.km||0)>0,
    data.deadlines.some(x=>/assicur|rca/i.test(x.type||'')),
    data.deadlines.some(x=>/revis/i.test(x.type||'')),
    data.maintenance.length>0,
    data.fuel.length>=2
  ];
  const completed=checks.filter(Boolean).length;
  const percentage=Math.round((completed/checks.length)*100);
  const text=$('dataCompletenessText'),bar=$('dataCompletenessBar'),hint=$('dataCompletenessHint');
  if(text)text.textContent=`${percentage}%`;
  if(bar)bar.style.width=`${percentage}%`;
  if(hint)hint.textContent=percentage===100?'Profilo completo: tutte le analisi principali sono disponibili.':percentage>=67?'Mancano pochi dati per completare il profilo del veicolo.':'Aggiungi targa, scadenze, manutenzioni e rifornimenti per analisi più precise.';
}
function renderTodayLabel(){
  const el=$('todayLabel');
  if(!el)return;
  const now=new Date();
  const label=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'}).format(now);
  el.textContent=label.charAt(0).toUpperCase()+label.slice(1);
}

function buildQuickCheck(){
  const checks=[];
  const deadlineDefinitions=[
    {label:'Assicurazione RCA',keywords:['rca','assicur']},
    {label:'Revisione',keywords:['revis']},
    {label:'Bollo auto',keywords:['bollo']}
  ];

  deadlineDefinitions.forEach(definition=>{
    const item=selectCurrentDeadline(data.deadlines.filter(deadline=>definition.keywords.some(keyword=>(deadline.type||'').toLowerCase().includes(keyword))));
    if(!item){
      checks.push({status:'warn',icon:'⚠️',title:definition.label,text:'Dato non inserito: aggiungi la scadenza per poterla controllare.'});
      return;
    }
    const days=daysUntil(item.date);
    if(days<0)checks.push({status:'danger',icon:'❌',title:definition.label,text:`Scaduta il ${formatDate(item.date)}.`});
    else if(days===0)checks.push({status:'warn',icon:'⚠️',title:definition.label,text:'Scade oggi.'});
    else if(days<=30)checks.push({status:'warn',icon:'⚠️',title:definition.label,text:`Scade tra ${days} giorni, il ${formatDate(item.date)}.`});
    else checks.push({status:'ok',icon:'✅',title:definition.label,text:`Regolare fino al ${formatDate(item.date)}.`});
  });

  const lastMaintenance=[...data.maintenance].filter(item=>item.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(!lastMaintenance){
    checks.push({status:'warn',icon:'⚠️',title:'Manutenzione',text:'Nessun intervento registrato.'});
  }else{
    const age=Math.max(0,Math.floor((Date.now()-new Date(`${lastMaintenance.date}T12:00:00`))/86400000));
    const kmSince=lastMaintenance.km?Math.max(0,Number(data.vehicle.km||0)-Number(lastMaintenance.km||0)):null;
    if(age>365){
      checks.push({status:'warn',icon:'⚠️',title:'Manutenzione',text:`Ultimo intervento ${formatDate(lastMaintenance.date)} (${age} giorni fa). Verifica se è il momento del tagliando.`});
    }else{
      checks.push({status:'ok',icon:'✅',title:'Manutenzione',text:`Ultimo intervento: ${lastMaintenance.type||'manutenzione'} del ${formatDate(lastMaintenance.date)}${kmSince!==null?` · ${kmSince.toLocaleString('it-IT')} km percorsi dopo`:''}.`});
    }
  }

  if(!data.vehicle.plate){
    checks.push({status:'warn',icon:'⚠️',title:'Dati veicolo',text:'Targa non inserita.'});
  }else if(!Number(data.vehicle.km||0)){
    checks.push({status:'warn',icon:'⚠️',title:'Dati veicolo',text:'Inserisci i chilometri attuali per migliorare i controlli.'});
  }else{
    checks.push({status:'ok',icon:'✅',title:'Dati veicolo',text:`Targa ${(data.vehicle.plate||'').toUpperCase()} · ${Number(data.vehicle.km).toLocaleString('it-IT')} km.`});
  }

  const dangerCount=checks.filter(check=>check.status==='danger').length;
  const warningCount=checks.filter(check=>check.status==='warn').length;
  const overall=dangerCount?'danger':warningCount?'warn':'ok';
  return {checks,overall,dangerCount,warningCount};
}

function openQuickCheck(){
  const modal=$('quickCheckModal');
  const summary=$('quickCheckSummary');
  const results=$('quickCheckResults');
  if(!modal||!summary||!results)return;
  const report=buildQuickCheck();
  const summaryTitle=report.overall==='danger'?'Intervento necessario':report.overall==='warn'?'Alcuni elementi da controllare':'Veicolo sotto controllo';
  const summaryText=report.overall==='danger'
    ? `${report.dangerCount} problema ${report.dangerCount===1?'richiede':'richiedono'} attenzione immediata.`
    : report.overall==='warn'
      ? `${report.warningCount} ${report.warningCount===1?'elemento necessita':'elementi necessitano'} di verifica o di dati aggiuntivi.`
      : 'Non risultano scadenze critiche o dati mancanti.';
  summary.className=`quick-check-summary ${report.overall}`;
  summary.innerHTML=`<strong>${summaryTitle}</strong><p>${summaryText}</p>`;
  results.innerHTML=report.checks.map(check=>`<article class="quick-check-result"><span>${check.icon}</span><div><strong>${escapeHtml(check.title)}</strong><p>${escapeHtml(check.text)}</p></div></article>`).join('');
  modal.showModal();
}

function renderAll(){renderVehicle();renderStats();renderHealthScore();renderHealth();renderDeadlines();renderFuel();renderExpenses();renderMaintenance();renderChart();renderSmartDashboard();renderMonthComparison();renderSuggestions();renderRecentActivity();renderTimeline();renderAnnualOverview();renderDataCompleteness();renderTodayLabel();}

const timelineSearch=$('timelineSearch');
if(timelineSearch)timelineSearch.addEventListener('input',()=>{timelineSearchTerm=timelineSearch.value;renderTimeline();});
document.querySelectorAll('[data-timeline-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  activeTimelineFilter=btn.dataset.timelineFilter;
  document.querySelectorAll('[data-timeline-filter]').forEach(item=>item.classList.toggle('active',item===btn));
  renderTimeline();
}));
const timelineOpenSource=$('timelineOpenSource');
if(timelineOpenSource)timelineOpenSource.addEventListener('click',()=>{
  if(!selectedTimelineEvent)return;
  $('timelineDetailModal').close();
  openView(timelineSection(selectedTimelineEvent.type));
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-timeline-event]');
  if(!button)return;
  const item=window.MiaAutoEvents.buildTimeline(data).find(entry=>entry.id===button.dataset.timelineEvent);
  if(item)showTimelineDetail(item);
});

document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>openView(btn.dataset.view)));
const settingsBtn=$('settingsBtn');
if(settingsBtn)settingsBtn.addEventListener('click',()=>openView('settings'));
document.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',()=>openView(btn.dataset.open)));
function openView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  const fabMenu=$('quickAddMenu');
  const fab=$('quickAddFab');
  if(fabMenu)fabMenu.classList.remove('open');
  if(fab){fab.classList.remove('open');fab.setAttribute('aria-expanded','false');}
  window.scrollTo({top:0,behavior:'smooth'});
}
const quickAddFab=$('quickAddFab');
const quickAddMenu=$('quickAddMenu');
if(quickAddFab&&quickAddMenu){
  quickAddFab.addEventListener('click',()=>{
    const open=quickAddMenu.classList.toggle('open');
    quickAddFab.classList.toggle('open',open);
    quickAddFab.setAttribute('aria-expanded',String(open));
    quickAddMenu.setAttribute('aria-hidden',String(!open));
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('.quick-add'))return;
    quickAddMenu.classList.remove('open');
    quickAddFab.classList.remove('open');
    quickAddFab.setAttribute('aria-expanded','false');
  });
}

document.querySelectorAll('[data-modal]').forEach(btn=>btn.addEventListener('click',()=>{
  const dialog=document.getElementById(btn.dataset.modal);
  const today=new Date().toISOString().slice(0,10);
  if(btn.dataset.modal==='fuelModal'){fuelDate.value=today;fuelOdometer.value=data.vehicle.km||'';}
  if(btn.dataset.modal==='expenseModal'&&!expenseDate.value)expenseDate.value=today;
  if(btn.dataset.modal==='maintenanceModal'&&!maintenanceDate.value)maintenanceDate.value=today;
  if(btn.dataset.modal==='deadlineModal'&&!deadlineDate.value)deadlineDate.value=today;
  dialog.showModal();
}));
document.querySelectorAll('.close').forEach(btn=>btn.addEventListener('click',()=>btn.closest('dialog').close()));
const quickCheckBtn=$('quickCheckBtn');
if(quickCheckBtn)quickCheckBtn.addEventListener('click',openQuickCheck);
const quickCheckClose=$('quickCheckClose');
if(quickCheckClose)quickCheckClose.addEventListener('click',()=>$('quickCheckModal').close());

deadlineTypePreset.addEventListener('change',()=>{
  if(deadlineTypePreset.value&&deadlineTypePreset.value!=='Altro')deadlineType.value=deadlineTypePreset.value;
  if(deadlineTypePreset.value==='Altro')deadlineType.value='';
});
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{
  activeDeadlineFilter=btn.dataset.filter;
  document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===btn));
  renderDeadlines();
}));

function syncFuelTotal(){
  const liters=Number(fuelLiters.value||0);
  const price=Number(fuelPricePerLiter.value||0);
  if(liters&&price)fuelTotal.value=(liters*price).toFixed(2);
}
fuelLiters.addEventListener('input',syncFuelTotal);
fuelPricePerLiter.addEventListener('input',syncFuelTotal);

if(fuelUseLocation)fuelUseLocation.addEventListener('click',()=>captureLocation('fuel',fuelLocationStatus));
if(expenseUseLocation)expenseUseLocation.addEventListener('click',()=>captureLocation('expense',expenseLocationStatus));
if(maintenanceUseLocation)maintenanceUseLocation.addEventListener('click',()=>captureLocation('maintenance',maintenanceLocationStatus));
if(deadlineUseLocation)deadlineUseLocation.addEventListener('click',()=>captureLocation('deadline',deadlineLocationStatus));

vehicleForm.addEventListener('submit',e=>{
  e.preventDefault();
  data.vehicle={name:vehicleNameInput.value.trim(),year:vehicleYearInput.value,fuel:vehicleFuelInput.value.trim(),plate:vehiclePlateInput.value.trim().toUpperCase(),km:Number(vehicleKmInput.value||0)};
  saveData();openView('home');
});
deadlineForm.addEventListener('submit',e=>{
  e.preventDefault();
  const deadlineGps=pendingLocations.deadline||{};
  data.deadlines.push({
    id:crypto.randomUUID(),
    type:deadlineType.value.trim(),
    date:deadlineDate.value,
    km:Number(deadlineKm ? deadlineKm.value : 0),
    location:deadlineLocation ? deadlineLocation.value.trim() : '',
    lat:deadlineGps.lat,
    lng:deadlineGps.lng,
    notes:deadlineNotes.value.trim()
  });
  pendingLocations.deadline=null;
  deadlineForm.reset();
  if(deadlineLocationStatus)deadlineLocationStatus.textContent='';deadlineModal.close();saveData();
});
fuelForm.addEventListener('submit',e=>{
  e.preventDefault();
  const total=Number(fuelTotal.value||0)||Number(fuelLiters.value||0)*Number(fuelPricePerLiter.value||0);
  const odometer=Number(fuelOdometer.value);
  data.fuel.push({id:crypto.randomUUID(),date:fuelDate.value,odometer,liters:Number(fuelLiters.value),pricePerLiter:Number(fuelPricePerLiter.value||0),total,station:fuelStation.value.trim(),location:fuelLocation ? fuelLocation.value.trim() : '',lat:pendingLocations.fuel?.lat??null,lng:pendingLocations.fuel?.lng??null,fullTank:fuelFullTank.checked});pendingLocations.fuel=null;if(fuelLocationStatus)fuelLocationStatus.textContent='';
  if(odometer>Number(data.vehicle.km||0))data.vehicle.km=odometer;
  fuelForm.reset();fuelModal.close();saveData();
});
expenseForm.addEventListener('submit',e=>{
  e.preventDefault();
  data.expenses.push({id:crypto.randomUUID(),category:expenseCategory.value.trim(),amount:Number(expenseAmount.value),date:expenseDate.value,location:expenseLocation ? expenseLocation.value.trim() : '',lat:pendingLocations.expense?.lat??null,lng:pendingLocations.expense?.lng??null,notes:expenseNotes.value.trim()});pendingLocations.expense=null;if(expenseLocationStatus)expenseLocationStatus.textContent='';
  expenseForm.reset();expenseModal.close();saveData();
});
maintenanceForm.addEventListener('submit',e=>{
  e.preventDefault();
  data.maintenance.push({id:crypto.randomUUID(),type:maintenanceType.value.trim(),date:maintenanceDate.value,km:Number(maintenanceKm.value||0),cost:Number(maintenanceCost.value||0),location:maintenanceLocation ? maintenanceLocation.value.trim() : '',lat:pendingLocations.maintenance?.lat??null,lng:pendingLocations.maintenance?.lng??null});pendingLocations.maintenance=null;if(maintenanceLocationStatus)maintenanceLocationStatus.textContent='';
  maintenanceForm.reset();maintenanceModal.close();saveData();
});
document.addEventListener('click',e=>{
  const d=e.target.dataset;
  if(d.deleteDeadline){data.deadlines=data.deadlines.filter(x=>x.id!==d.deleteDeadline);saveData();}
  if(d.deleteFuel){data.fuel=data.fuel.filter(x=>x.id!==d.deleteFuel);saveData();}
  if(d.deleteExpense){data.expenses=data.expenses.filter(x=>x.id!==d.deleteExpense);saveData();}
  if(d.deleteMaintenance){data.maintenance=data.maintenance.filter(x=>x.id!==d.deleteMaintenance);saveData();}
});

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;installBtn.classList.remove('hidden');});
installBtn.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.classList.add('hidden');});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));

document.addEventListener('miaauto:data-changed',()=>{data=window.MiaAutoStorage.loadData();renderAll();});

initSettings();
renderAll();

exportBtn.addEventListener('click',()=>{window.MiaAutoStorage.downloadBackup(data);backupMessage.textContent='Backup esportato correttamente.';});
importInput.addEventListener('change',async()=>{const file=importInput.files[0];if(!file)return;try{data=await window.MiaAutoStorage.readBackupFile(file);saveData();backupMessage.textContent='Backup importato correttamente.';}catch{backupMessage.textContent='Impossibile importare il file: backup non valido.';}importInput.value='';});


function initWelcome(){
  const modal=$('welcomeModal');
  const next=$('welcomeNext');
  const skip=$('welcomeSkip');
  if(!modal||!next||!skip)return;
  const slides=[
    {kicker:'Benvenuto',title:'Tutta la tua auto, in un solo posto',text:'Registra spese, rifornimenti, manutenzioni e scadenze senza perdere la storia del veicolo.'},
    {kicker:'Sempre sotto controllo',title:'Non dimenticare più una scadenza',text:'Tieni d’occhio RCA, bollo, revisione e interventi importanti direttamente dalla Dashboard.'},
    {kicker:'Gestione intelligente',title:'Capisci quanto costa davvero la tua auto',text:'Consulta consumi, spese mensili e andamento della manutenzione con dati sempre aggiornati.'}
  ];
  let index=0;
  const render=()=>{
    $('welcomeKicker').textContent=slides[index].kicker;
    $('welcomeTitle').textContent=slides[index].title;
    $('welcomeText').textContent=slides[index].text;
    document.querySelectorAll('.welcome-dots span').forEach((dot,i)=>dot.classList.toggle('active',i===index));
    next.textContent=index===slides.length-1?'Inizia a usare l’app':'Continua';
  };
  const close=()=>{localStorage.setItem(WELCOME_KEY,'1');modal.close();};
  next.addEventListener('click',()=>{if(index<slides.length-1){index++;render();}else close();});
  skip.addEventListener('click',close);
  if(!localStorage.getItem(WELCOME_KEY)){
    render();
    setTimeout(()=>{if(!modal.open)modal.showModal();},250);
  }
}

initWelcome();

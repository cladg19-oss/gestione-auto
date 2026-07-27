(function(global){
  'use strict';

  const STORAGE_KEY='miaAutoDataV2';
  const BACKUP_VERSION=6;

  const DEFAULT_DATA={
    vehicle:{name:'Toyota Aygo',year:'2017',fuel:'Benzina',plate:'',km:0},
    deadlines:[],
    fuel:[],
    expenses:[],
    maintenance:[]
  };

  function cloneDefaultData(){
    return typeof structuredClone==='function'
      ? structuredClone(DEFAULT_DATA)
      : JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  function normalizeData(value){
    const source=value&&typeof value==='object'?value:{};
    return {
      ...cloneDefaultData(),
      ...source,
      vehicle:{...DEFAULT_DATA.vehicle,...(source.vehicle||{})},
      deadlines:Array.isArray(source.deadlines)?source.deadlines:[],
      fuel:Array.isArray(source.fuel)?source.fuel:[],
      expenses:Array.isArray(source.expenses)?source.expenses:[],
      maintenance:Array.isArray(source.maintenance)?source.maintenance:[]
    };
  }

  function loadData(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      return raw?normalizeData(JSON.parse(raw)):cloneDefaultData();
    }catch(error){
      console.warn('Impossibile leggere i dati locali.',error);
      return cloneDefaultData();
    }
  }

  function saveData(data){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(normalizeData(data)));
  }

  function createBackup(data){
    return {
      version:BACKUP_VERSION,
      exportedAt:new Date().toISOString(),
      storageKey:STORAGE_KEY,
      data:normalizeData(data)
    };
  }

  function downloadBackup(data){
    const blob=new Blob([JSON.stringify(createBackup(data),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download=`backup-la-mia-auto-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function readBackupFile(file){
    if(!file)throw new Error('Nessun file selezionato');
    const parsed=JSON.parse(await file.text());
    const imported=parsed&&parsed.data?parsed.data:parsed;
    if(!imported||typeof imported!=='object'||!imported.vehicle||!Array.isArray(imported.deadlines)){
      throw new Error('Formato backup non valido');
    }
    return normalizeData(imported);
  }

  global.MiaAutoStorage=Object.freeze({
    STORAGE_KEY,
    BACKUP_VERSION,
    DEFAULT_DATA,
    normalizeData,
    loadData,
    saveData,
    createBackup,
    downloadBackup,
    readBackupFile
  });
})(window);

(function(global){
  'use strict';

  function money(value){
    return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(value||0));
  }

  function number(value,digits=1){
    return new Intl.NumberFormat('it-IT',{
      maximumFractionDigits:digits,
      minimumFractionDigits:digits
    }).format(Number(value||0));
  }

  function formatDate(value){
    if(!value)return 'Data non inserita';
    return new Intl.DateTimeFormat('it-IT').format(new Date(`${value}T12:00:00`));
  }

  function daysUntil(value,referenceDate=new Date()){
    if(!value)return Number.NaN;
    const today=new Date(referenceDate);
    today.setHours(0,0,0,0);
    const target=new Date(`${value}T12:00:00`);
    return Math.ceil((target-today)/86400000);
  }

  function escapeHtml(text=''){
    return String(text).replace(/[&<>"']/g,char=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[char]));
  }

  function createId(prefix='item'){
    if(global.crypto&&typeof global.crypto.randomUUID==='function'){
      return `${prefix}_${global.crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  global.MiaAutoUtils=Object.freeze({money,number,formatDate,daysUntil,escapeHtml,createId});
})(window);

(function(global){
  'use strict';

  function safeDate(value){
    return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:'';
  }

  function normalizeEvent(event){
    const source=event&&typeof event==='object'?event:{};
    return {
      id:String(source.id||''),
      type:String(source.type||'other'),
      date:safeDate(source.date),
      title:String(source.title||''),
      description:String(source.description||''),
      amount:Number(source.amount||0),
      km:Number(source.km||0),
      location:String(source.location||''),
      lat:source.lat==null?null:Number(source.lat),
      lng:source.lng==null?null:Number(source.lng),
      sourceId:String(source.sourceId||source.id||''),
      raw:source.raw||null
    };
  }

  function fromFuel(item){
    return normalizeEvent({
      id:`fuel:${item.id}`,
      sourceId:item.id,
      type:'fuel',
      date:item.date,
      title:'Rifornimento',
      description:item.station||'Carburante',
      amount:item.total,
      km:item.odometer,
      location:item.location,
      lat:item.lat,
      lng:item.lng,
      raw:item
    });
  }

  function fromExpense(item){
    return normalizeEvent({
      id:`expense:${item.id}`,
      sourceId:item.id,
      type:'expense',
      date:item.date,
      title:item.category||'Spesa',
      description:item.notes||'',
      amount:item.amount,
      location:item.location,
      lat:item.lat,
      lng:item.lng,
      raw:item
    });
  }

  function fromMaintenance(item){
    return normalizeEvent({
      id:`maintenance:${item.id}`,
      sourceId:item.id,
      type:'maintenance',
      date:item.date,
      title:item.type||'Manutenzione',
      amount:item.cost,
      km:item.km,
      location:item.location,
      lat:item.lat,
      lng:item.lng,
      raw:item
    });
  }

  function fromDeadline(item){
    return normalizeEvent({
      id:`deadline:${item.id}`,
      sourceId:item.id,
      type:'deadline',
      date:item.date,
      title:item.type||'Scadenza',
      description:item.notes||'',
      km:item.km,
      location:item.location,
      lat:item.lat,
      lng:item.lng,
      raw:item
    });
  }

  function buildTimeline(data){
    const source=data&&typeof data==='object'?data:{};
    return [
      ...(Array.isArray(source.fuel)?source.fuel.map(fromFuel):[]),
      ...(Array.isArray(source.expenses)?source.expenses.map(fromExpense):[]),
      ...(Array.isArray(source.maintenance)?source.maintenance.map(fromMaintenance):[]),
      ...(Array.isArray(source.deadlines)?source.deadlines.map(fromDeadline):[])
    ].filter(item=>item.date).sort((a,b)=>b.date.localeCompare(a.date));
  }

  global.MiaAutoEvents=Object.freeze({normalizeEvent,fromFuel,fromExpense,fromMaintenance,fromDeadline,buildTimeline});
})(window);

/* Contador de visitas con GoatCounter (sin cookies). Se activa escribiendo el código en data/config.json → contador.goatcounter.
   Si la página tiene data-show="id", muestra el total de visitas en ese elemento. */
(function(){
  var me=document.currentScript;if(!me)return;
  fetch(me.dataset.config).then(function(r){return r.json()}).then(function(c){
    var code=c.contador&&String(c.contador.goatcounter||"").trim();
    if(!/^[a-z0-9-]+$/i.test(code||""))return;
    var host="https://"+code+".goatcounter.com";
    var s=document.createElement("script");
    s.async=true;s.src="https://gc.zgo.at/count.js";s.dataset.goatcounter=host+"/count";
    document.head.appendChild(s);
    var id=me.dataset.show,el=id&&document.getElementById(id);
    if(!el)return;
    /* espera un momento para que se registre esta visita y luego lee el total */
    setTimeout(function(){
      fetch(host+"/counter/TOTAL.json").then(function(r){return r.json()}).then(function(d){
        if(d&&d.count){el.textContent="Visitas al sitio: "+d.count;el.hidden=false}
      }).catch(function(){});
    },1500);
  }).catch(function(){});
})();

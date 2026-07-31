const MOSCOW={lat:55.7558,lon:37.6176,label:"Москва · по умолчанию",precise:false};
const STORAGE_KEY="ryadom_pages_catalog_v1";
const state={location:{...MOSCOW},query:"",products:[],liveOffers:[],catalog:loadCatalog(),stores:[],sort:"price"};
const $=selector=>document.querySelector(selector);

function escapeHtml(value=""){
  return String(value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
}
function normalize(value){return String(value??"").toLocaleLowerCase("ru").replace(/ё/g,"е").replace(/[^a-zа-я0-9]+/gi," ").trim()}
function number(value){if(value===""||value===null||value===undefined)return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function loadCatalog(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return[]}}
function saveCatalog(items){state.catalog=items;localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}
function toast(message){const node=$("#toast");node.textContent=message;node.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.hidden=true,3000)}

function distanceKm(lat1,lon1,lat2,lon2){
  const rad=value=>value*Math.PI/180,dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function formatDistance(value){
  if(!Number.isFinite(Number(value))||value>=999)return"далеко";
  return value<1?`${Math.max(1,Math.round(value*1000))} м`:`${Number(value).toFixed(value<10?1:0)} км`;
}
function formatPrice(value,currency="RUB"){
  try{return new Intl.NumberFormat("ru-RU",{style:"currency",currency,maximumFractionDigits:value%1?2:0}).format(value)}
  catch{return`${value} ${currency}`}
}
function normalizeStock(value,quantity){
  const stock=normalize(value).replace(/ /g,"_");
  if(["1","true","yes","да","in_stock","available","в_наличии"].includes(stock))return"in_stock";
  if(["0","false","no","нет","out_of_stock","unavailable","нет_в_наличии"].includes(stock))return"out_of_stock";
  if(Number(quantity)>0)return"in_stock";
  return"unknown";
}
function availability(offer){
  if(offer.stock_status==="in_stock")return`<span class="availability in">✓ В наличии${offer.stock_quantity?` · ${escapeHtml(offer.stock_quantity)} шт.`:""}</span>`;
  if(offer.stock_status==="out_of_stock"){
    let when="дата поставки неизвестна";
    if(offer.restock_at){const date=new Date(offer.restock_at);if(!Number.isNaN(date.getTime()))when=date.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
    return`<span class="availability out">↻ Нет в наличии · ${escapeHtml(when)}</span>`;
  }
  return'<span class="availability unknown">□ Наличие магазин не передал</span>';
}

function normalizedProduct(raw={}){
  return{
    code:String(raw.code||""),
    name:String(raw.product_name_ru||raw.product_name||raw.generic_name||"Товар без названия"),
    brand:Array.isArray(raw.brands)?raw.brands.join(", "):String(raw.brands||""),
    image:String(raw.image_front_small_url||raw.image_front_url||raw.image_url||""),
    quantity:String(raw.quantity||""),
    countries:Array.isArray(raw.countries_tags)?raw.countries_tags:[],
  };
}

async function searchProducts(query){
  const digits=query.replace(/\D/g,"");
  const fields="code,product_name,product_name_ru,generic_name,brands,quantity,image_front_small_url,image_front_url,image_url,countries_tags";
  if(query.trim()===digits&&digits.length>=8&&digits.length<=14){
    const response=await fetch(`https://world.openfoodfacts.org/api/v3.6/product/${digits}.json?fields=${encodeURIComponent(fields)}`);
    if(!response.ok)return[];
    const payload=await response.json();
    return payload.product?[normalizedProduct(payload.product)]:[];
  }
  const params=new URLSearchParams({search_terms:query,search_simple:"1",action:"process",json:"1",page_size:"10",fields,lc:"ru"});
  const response=await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`);
  if(!response.ok)throw new Error("Каталог товаров временно недоступен");
  const payload=await response.json();
  return(payload.products||[]).filter(item=>item.code).map(normalizedProduct)
    .sort((a,b)=>Number(!a.countries.includes("en:russia"))-Number(!b.countries.includes("en:russia"))||Number(!a.image)-Number(!b.image)).slice(0,8);
}

async function pricesFor(product){
  try{
    const params=new URLSearchParams({product_code:product.code,page_size:"20",ordering:"-date"});
    const response=await fetch(`https://prices.openfoodfacts.org/api/v1/prices?${params}`);
    if(!response.ok)return[];
    const payload=await response.json();
    return(payload.items||[]).flatMap(raw=>{
      const location=raw.location||{},lat=number(location.osm_lat),lon=number(location.osm_lon),price=number(raw.price);
      if(lat===null||lon===null||price===null)return[];
      const away=distanceKm(state.location.lat,state.location.lon,lat,lon);
      if(away>80)return[];
      return[{
        id:`open-${raw.id||crypto.randomUUID()}`,product_name:product.name,brand:product.brand,image:product.image,price,
        currency:raw.currency||"RUB",date:raw.date||"",store:location.osm_name||location.osm_brand||"Магазин",
        address:location.osm_display_name||"",lat,lon,distance_km:Math.round(away*100)/100,
        url:`https://prices.openfoodfacts.org/product/${product.code}`,stock_status:"unknown",source:"Open Prices",
      }];
    });
  }catch{return[]}
}

function queryScore(product,query){
  const haystack=normalize(product),tokens=normalize(query).split(" ").filter(token=>token.length>1);
  if(!tokens.length)return 0;
  return tokens.filter(token=>haystack.includes(token)).length/tokens.length;
}
function importedMatches(){
  return state.catalog.filter(item=>queryScore(`${item.product_name} ${item.brand||""}`,state.query)>=.45).map(item=>{
    const lat=number(item.lat),lon=number(item.lon);
    return{...item,distance_km:lat!==null&&lon!==null?distanceKm(state.location.lat,state.location.lon,lat,lon):999};
  });
}
function allOffers(){
  const rank={in_stock:0,unknown:1,out_of_stock:2};
  return[...state.liveOffers,...importedMatches()].sort((a,b)=>{
    const stock=(rank[a.stock_status||"unknown"]??1)-(rank[b.stock_status||"unknown"]??1);if(stock)return stock;
    if(state.sort==="distance")return(a.distance_km??999)-(b.distance_km??999)||a.price-b.price;
    if(state.sort==="fresh")return String(b.date||"").localeCompare(String(a.date||""))||a.price-b.price;
    return a.price-b.price||(a.distance_km??999)-(b.distance_km??999);
  });
}

function renderOffers(){
  const offers=allOffers(),list=$("#offerList");
  $("#resultsSection").hidden=false;
  $("#resultsSummary").textContent=offers.length?`${offers.length} вариантов по запросу «${state.query}»`:`По запросу «${state.query}»`;
  if(!offers.length){
    list.innerHTML=`<div class="empty-card">${state.products.length?"Товар найден, но рядом пока нет опубликованных цен. Проверьте варианты ниже.":"Точных предложений рядом не найдено. Посмотрите цены в интернет-магазинах."}</div>`;
    return;
  }
  list.innerHTML=offers.map(offer=>{
    const open=offer.url?`<a class="offer-card" href="${escapeHtml(offer.url)}" target="_blank" rel="noreferrer">`:'<div class="offer-card">';
    const close=offer.url?"</a>":"</div>";
    return`${open}<div class="offer-image">${offer.image?`<img src="${escapeHtml(offer.image)}" alt="">`:"□"}</div><div class="offer-copy"><p class="offer-name">${escapeHtml(offer.product_name)}</p><div class="offer-store">${escapeHtml(offer.store)}${offer.address?` · ${escapeHtml(offer.address)}`:""}</div>${availability(offer)}</div><div class="offer-price"><span class="price">${escapeHtml(formatPrice(offer.price,offer.currency))}</span><span class="distance">${escapeHtml(formatDistance(offer.distance_km))}</span></div>${close}`;
  }).join("");
}

function providerLinks(query){
  const q=encodeURIComponent(query);
  return[
    ["Price.ru","Сравнение магазинов",`https://price.ru/search/?query=${q}`],
    ["Яндекс Маркет","Цена и доставка",`https://market.yandex.ru/search?text=${q}`],
    ["Ozon","Маркетплейс",`https://www.ozon.ru/search/?text=${q}`],
    ["Wildberries","Маркетплейс",`https://www.wildberries.ru/catalog/0/search.aspx?search=${q}`],
  ];
}
function renderProviders(){
  $("#providersSection").hidden=false;
  $("#providerList").innerHTML=providerLinks(state.query).map(([name,hint,url])=>`<a class="provider" href="${url}" target="_blank" rel="noreferrer"><span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(hint)}</small></span><b>↗</b></a>`).join("");
}

async function performSearch(rawQuery){
  const query=String(rawQuery??$("#searchInput").value).trim();
  if(!query){toast("Введите название товара или сфотографируйте его");return}
  state.query=query;$("#searchInput").value=query;$("#searchButton").disabled=true;$("#searchButton").textContent="Ищем…";
  let catalogueError=false;
  try{state.products=await searchProducts(query)}catch{state.products=[];catalogueError=true}
  state.liveOffers=(await Promise.all(state.products.slice(0,6).map(pricesFor))).flat();
  renderOffers();renderProviders();
  if(catalogueError)toast("Каталог временно недоступен — показаны ссылки магазинов");
  $("#searchButton").disabled=false;$("#searchButton").textContent="Найти цены";
  $("#resultsSection").scrollIntoView({behavior:"smooth",block:"start"});
}

async function locateUser(){
  if(!navigator.geolocation){toast("Геолокация не поддерживается");return}
  $("#locationLabel").textContent="Определяем место…";$("#locateButton").disabled=true;
  navigator.geolocation.getCurrentPosition(async position=>{
    state.location={lat:position.coords.latitude,lon:position.coords.longitude,label:"Текущее место",precise:true};
    try{
      const params=new URLSearchParams({lat:state.location.lat,lon:state.location.lon,format:"jsonv2",zoom:"14","accept-language":"ru"});
      const response=await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
      if(response.ok){const data=await response.json(),a=data.address||{};state.location.label=[a.city||a.town||a.village||a.county,a.suburb||a.neighbourhood].filter(Boolean).join(" · ")||"Текущее место"}
    }catch{}
    $("#locationLabel").textContent=state.location.label;$("#locateButton").disabled=false;toast("Местоположение обновлено");
    await loadStores();if(state.query)await performSearch(state.query);
  },error=>{
    $("#locationLabel").textContent=state.location.label;$("#locateButton").disabled=false;
    toast(error.code===1?"Разрешите доступ к геолокации в Safari":"Не удалось определить местоположение");
  },{enableHighAccuracy:true,timeout:12000,maximumAge:300000});
}

async function loadStores(){
  const button=$("#storesButton");button.disabled=true;button.textContent="…";
  const {lat,lon}=state.location,radius=5000;
  const query=`[out:json][timeout:18];nwr(around:${radius},${lat},${lon})[shop~"supermarket|convenience|chemist|department_store|mall|electronics|clothes|shoes|beauty|mobile_phone|sports|toys|pet|hardware|doityourself"];out center tags 60;`;
  try{
    const response=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({data:query})});
    if(!response.ok)throw new Error();
    const payload=await response.json();
    state.stores=(payload.elements||[]).flatMap(raw=>{
      const center=raw.center||{},tags=raw.tags||{},storeLat=number(raw.lat??center.lat),storeLon=number(raw.lon??center.lon);
      if(storeLat===null||storeLon===null)return[];
      return[{id:`${raw.type}-${raw.id}`,name:tags.name||tags.brand||"Магазин",address:[tags["addr:street"],tags["addr:housenumber"]].filter(Boolean).join(", "),lat:storeLat,lon:storeLon,distance_km:distanceKm(lat,lon,storeLat,storeLon)}];
    }).sort((a,b)=>a.distance_km-b.distance_km).slice(0,30);
    renderStores();
  }catch{toast("Не удалось получить магазины рядом")}
  button.disabled=false;button.textContent="↻";
}
function renderStores(){
  const list=$("#storeList");
  if(!state.stores.length){list.innerHTML='<div class="empty-card">Магазины не найдены.</div>';return}
  list.innerHTML=state.stores.slice(0,8).map(store=>`<a class="store" href="https://maps.apple.com/?ll=${store.lat},${store.lon}&q=${encodeURIComponent(store.name)}"><span><strong>${escapeHtml(store.name)}</strong><span>${escapeHtml(store.address||"Адрес не указан")}</span></span><span class="store-distance">${escapeHtml(formatDistance(store.distance_km))}</span></a>`).join("");
}

function canonicalOcr(text){
  const clean=String(text||"").replace(/\n+/g," ").replace(/[^a-zA-Zа-яА-ЯёЁ0-9% .-]+/g," ").replace(/\s+/g," ").trim();
  return clean.split(" ").filter(word=>word.length>2&&!/^\d+$/.test(word)).slice(0,7).join(" ");
}
async function recognizePhoto(file){
  if(!file)return;
  const url=URL.createObjectURL(file),status=$("#scanStatus");status.hidden=false;status.textContent="Ищу штрихкод на фото…";
  try{
    if(window.ZXingBrowser){
      const reader=new window.ZXingBrowser.BrowserMultiFormatReader();
      const result=await reader.decodeFromImageUrl(url),code=result.getText().replace(/\D/g,"");
      if(code.length>=8){
        status.textContent=`Штрихкод ${code} найден`;await performSearch(code);
        URL.revokeObjectURL(url);setTimeout(()=>status.hidden=true,1800);return;
      }
    }
  }catch{}
  try{
    if(!window.Tesseract)throw new Error();
    status.textContent="Читаю название товара… 0%";
    const worker=await window.Tesseract.createWorker("rus+eng",1,{logger:info=>{if(info.status==="recognizing text")status.textContent=`Читаю название товара… ${Math.round((info.progress||0)*100)}%`}});
    await worker.setParameters({tessedit_pageseg_mode:window.Tesseract.PSM.SPARSE_TEXT});
    const result=await worker.recognize(url);await worker.terminate();
    const recognized=canonicalOcr(result.data.text);if(!recognized)throw new Error();
    status.textContent=`Распознано: ${recognized}`;await performSearch(recognized);
  }catch{toast("Не получилось распознать товар. Снимите этикетку ближе.")}
  finally{URL.revokeObjectURL(url);setTimeout(()=>status.hidden=true,1800)}
}

function parseCsv(text){
  const first=text.split(/\r?\n/,1)[0]||"",separator=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?";":",";
  const rows=[];let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'&&quoted&&text[i+1]==='"'){field+='"';i++}else if(char==='"')quoted=!quoted;
    else if(char===separator&&!quoted){row.push(field.trim());field=""}
    else if((char==="\n"||char==="\r")&&!quoted){if(char==="\r"&&text[i+1]==="\n")i++;row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field=""}
    else field+=char;
  }
  row.push(field.trim());if(row.some(Boolean))rows.push(row);
  const headers=(rows.shift()||[]).map(normalize);
  return rows.map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]||""])));
}
async function importCatalog(file){
  if(!file)return;
  try{
    const rows=parseCsv(await file.text());
    const items=rows.map((row,index)=>({
      id:`catalog-${Date.now()}-${index}`,product_name:row.product||row.product_name||row["товар"]||"Товар",brand:row.brand||row["бренд"]||"",
      store:row.store||row["магазин"]||"Магазин",address:row.address||row["адрес"]||"",price:Number(String(row.price||row["цена"]||"").replace(",",".")),
      currency:row.currency||"RUB",image:row.image||"",url:row.url||"",date:row.updated_at||"",restock_at:row.restock_at||row["поставка"]||"",
      stock_quantity:row.stock_quantity?Number(row.stock_quantity):null,stock_status:normalizeStock(row.in_stock||row.stock_status||row["наличие"],row.stock_quantity),
      lat:row.lat?Number(row.lat):null,lon:row.lon?Number(row.lon):null,source:"Мой каталог",
    })).filter(item=>Number.isFinite(item.price));
    saveCatalog(items);toast(`Каталог загружен: ${items.length} товаров`);if(state.query)renderOffers();
  }catch{toast("Не удалось прочитать CSV-каталог")}
}

$("#searchForm").addEventListener("submit",event=>{event.preventDefault();performSearch()});
document.querySelectorAll("[data-query]").forEach(button=>button.addEventListener("click",()=>performSearch(button.dataset.query)));
$("#sortSelect").addEventListener("change",event=>{state.sort=event.target.value;renderOffers()});
$("#locateButton").addEventListener("click",locateUser);$("#storesButton").addEventListener("click",loadStores);
$("#photoInput").addEventListener("change",event=>recognizePhoto(event.target.files?.[0]));
$("#catalogInput").addEventListener("change",event=>importCatalog(event.target.files?.[0]));
$("#installButton").addEventListener("click",()=>$("#installSheet").hidden=false);
$("#closeSheet").addEventListener("click",()=>$("#installSheet").hidden=true);$("#doneSheet").addEventListener("click",()=>$("#installSheet").hidden=true);
$("#installSheet").addEventListener("click",event=>{if(event.target===$("#installSheet"))$("#installSheet").hidden=true});

if("serviceWorker"in navigator){navigator.serviceWorker.register("./sw.js").then(registration=>registration.update()).catch(()=>{})}

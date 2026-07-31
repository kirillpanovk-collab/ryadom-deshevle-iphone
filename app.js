const MOSCOW={lat:55.7558,lon:37.6176,label:"Москва · по умолчанию",precise:false};
const STORAGE_KEY="ryadom_pages_catalog_v1";
const THEME_STORAGE_KEY="ryadom_theme_v1";
const LOCATION_STORAGE_KEY="ryadom_location_v1";
const LOCATION_CACHE_KEY="ryadom_location_search_cache_v1";
const GEOCODER_ENDPOINT="https://nominatim.openstreetmap.org";
const OVERPASS_ENDPOINTS=["https://maps.mail.ru/osm/tools/overpass/api/interpreter","https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter"];
const STORE_RADIUS_METERS=3500;
const STORE_RADIUS_LABEL="до 3,5 км";
const THEME_IDS=["burgundy","ruby","rose","violet","indigo","cobalt","ocean","teal","emerald","forest","amber","graphite"];
const THEME_COLORS={burgundy:"#741b36",ruby:"#a91f45",rose:"#b13b68",violet:"#6939b7",indigo:"#3f4fb1",cobalt:"#1f5ea8",ocean:"#08718a",teal:"#14766f",emerald:"#187a59",forest:"#2c633f",amber:"#a65f00",graphite:"#514a55"};
const STORE_CATEGORIES={
  groceries:{label:"Продуктовые магазины",shops:"supermarket|convenience|greengrocer"},
  dairy:{label:"Молочные и продуктовые магазины",shops:"dairy|supermarket|convenience"},
  bakery:{label:"Пекарни и продуктовые магазины",shops:"bakery|supermarket|convenience"},
  butcher:{label:"Мясные и продуктовые магазины",shops:"butcher|supermarket|convenience"},
  fish:{label:"Рыбные и продуктовые магазины",shops:"seafood|fishmonger|supermarket|convenience"},
  drinks:{label:"Напитки и продуктовые магазины",shops:"beverages|supermarket|convenience"},
  alcohol:{label:"Винные и продуктовые магазины",shops:"alcohol|supermarket"},
  sweets:{label:"Кондитерские и продуктовые магазины",shops:"confectionery|supermarket|convenience"},
  beauty:{label:"Косметика и уход",shops:"cosmetics|perfumery|chemist"},
  pharmacy:{label:"Аптеки и медицинские товары",shops:"chemist|medical_supply",amenities:"pharmacy"},
  baby:{label:"Детские товары",shops:"baby_goods|chemist|supermarket|convenience"},
  electronics:{label:"Электроника и бытовая техника",shops:"electronics|mobile_phone|computer|appliance|electrical"},
  fashion:{label:"Одежда и обувь",shops:"clothes|shoes|fashion_accessories|sports"},
  home:{label:"Дом, мебель и ремонт",shops:"furniture|houseware|hardware|doityourself|interior_decoration|lighting|garden_centre"},
  pets:{label:"Зоомагазины",shops:"pet|pet_grooming"},
  sports:{label:"Спортивные магазины",shops:"sports|outdoor|bicycle"},
  toys:{label:"Игрушки и хобби",shops:"toys|hobby|games|model"},
  books:{label:"Книги и канцтовары",shops:"books|stationery|newsagent"},
  auto:{label:"Автотовары",shops:"car_parts|car_repair|tyres|motorcycle"},
  jewelry:{label:"Украшения и часы",shops:"jewelry|watches"},
};
const STORE_CATEGORY_RULES=[
  ["pharmacy",/лекар|таблет|капсул|лечебн|сироп от|витамин|антисепт|бинт|медицин|аптеч|парацет|ибупроф|аспирин|medicine|medication|supplement/],
  ["baby",/подгуз|памперс|детск(?:ое|ая) питан|молочн.*смес|baby|infant|diaper/],
  ["beauty",/космет|шампун|бальзам для волос|кондиционер для волос|крем|сыворот|помад|тушь|парфюм|духи|дезодорант|гель для душа|мыло|зубн.*паст|beauty|cosmetic|shampoo|skin care|hair care|personal care/],
  ["dairy",/молок|кефир|йогурт|сыр|творог|сливк|сметан|ряженк|dairy|milk|cheese|yogurt/],
  ["bakery",/хлеб|батон|булоч|выпеч|багет|лаваш|bread|bakery/],
  ["butcher",/мясо|говядин|свинин|куриц|индейк|колбас|сосиск|meat|butcher/],
  ["fish",/рыб|лосос|семг|форел|кревет|морепродукт|seafood|fish/],
  ["alcohol",/вино|водк|коньяк|виски|пиво|шампан|alcohol|wine|beer/],
  ["drinks",/вода пить|минерал.*вод|сок|лимонад|газиров|напиток|beverage|juice/],
  ["sweets",/конфет|шоколад|печень|вафл|торт|мармелад|candy|chocolate|confectionery/],
  ["electronics",/телефон|смартфон|iphone|ноутбук|компьютер|телевизор|наушник|зарядк|usb|электрон|пылесос|холодильник|стиральн|electronics|smartphone|computer/],
  ["pets",/корм для (?:кош|соб)|кошач|собач|зоотовар|наполнитель|поводок|pet food|pets/],
  ["sports",/спорт|гантел|тренажер|велосипед|самокат|лыж|сноуборд|палатк|рюкзак турист|sports|outdoor/],
  ["toys",/игруш|конструктор|кукл|настольн.*игр|пазл|хобби|toys|games/],
  ["books",/книг|учебник|тетрад|ручк|карандаш|канцтовар|books|stationery/],
  ["auto",/автомоб|автотовар|масло мотор|шина|покрышк|аккумулятор|стеклоочист|car part|motor oil/],
  ["jewelry",/ювелир|украшен|кольцо|сереж|браслет|часы наруч|jewelry|watches/],
  ["fashion",/одежд|футболк|брюк|джинс|плать|куртк|обув|кроссов|ботин|носк|белье|clothes|shoes|fashion/],
  ["home",/мебел|стол письмен|стул|шкаф|матрас|посуда|кастрюл|сковород|инструмент|дрель|ламп|краск|обои|ремонт|furniture|hardware|houseware/],
];
const state={location:loadLocation(),locationResults:[],query:"",products:[],liveOffers:[],catalog:loadCatalog(),stores:[],storeCategory:null,storeRequestId:0,sort:"price"};
const $=selector=>document.querySelector(selector);

function loadLocation(){
  try{
    const saved=JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY)||"null");
    const lat=Number(saved?.lat),lon=Number(saved?.lon),label=String(saved?.label||"").trim();
    if(Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180&&label)return{lat,lon,label,precise:Boolean(saved.precise)};
  }catch{}
  return{...MOSCOW};
}
function saveLocation(location){
  state.location={lat:Number(location.lat),lon:Number(location.lon),label:String(location.label),precise:Boolean(location.precise)};
  localStorage.setItem(LOCATION_STORAGE_KEY,JSON.stringify(state.location));
  $("#locationLabel").textContent=state.location.label;
}

function loadThemeSelection(){
  try{
    const saved=JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)||"{}");
    return{theme:THEME_IDS.includes(saved.theme)?saved.theme:"burgundy",mode:["auto","day","night"].includes(saved.mode)?saved.mode:"auto"};
  }catch{return{theme:"burgundy",mode:"auto"}}
}
const themeState=loadThemeSelection();
const systemColorMode=matchMedia("(prefers-color-scheme: dark)");
function resolvedColorMode(mode){return mode==="auto"?(systemColorMode.matches?"night":"day"):mode}
function updateThemeControls(){
  document.querySelectorAll("[data-theme-choice]").forEach(button=>{const active=button.dataset.themeChoice===themeState.theme;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))});
  document.querySelectorAll("[data-mode-choice]").forEach(button=>{const active=button.dataset.modeChoice===themeState.mode;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))});
}
function applyTheme(theme=themeState.theme,mode=themeState.mode,persist=true){
  themeState.theme=THEME_IDS.includes(theme)?theme:"burgundy";
  themeState.mode=["auto","day","night"].includes(mode)?mode:"auto";
  document.documentElement.dataset.theme=themeState.theme;
  document.documentElement.dataset.mode=themeState.mode;
  document.documentElement.dataset.resolvedMode=resolvedColorMode(themeState.mode);
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=THEME_COLORS[themeState.theme];
  if(persist)localStorage.setItem(THEME_STORAGE_KEY,JSON.stringify(themeState));
  updateThemeControls();
}

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
    categories:Array.isArray(raw.categories_tags)?raw.categories_tags:[String(raw.categories||"")],
  };
}

async function searchProducts(query){
  const digits=query.replace(/\D/g,"");
  const fields="code,product_name,product_name_ru,generic_name,brands,quantity,image_front_small_url,image_front_url,image_url,countries_tags,categories,categories_tags";
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

function inferStoreCategory(query,products=[]){
  const productText=products.flatMap(product=>[product.name,product.brand,...(product.categories||[])]).join(" ");
  const haystack=normalize(`${query} ${productText}`);
  const matched=STORE_CATEGORY_RULES.find(([,pattern])=>pattern.test(haystack));
  return STORE_CATEGORIES[matched?.[0]||"groceries"];
}
function updateStoreHint(text){$("#storeHint").textContent=text}

async function performSearch(rawQuery){
  const query=String(rawQuery??$("#searchInput").value).trim();
  if(!query){toast("Введите название товара или сфотографируйте его");return}
  state.query=query;$("#searchInput").value=query;$("#searchButton").disabled=true;$("#searchButton").textContent="Ищем…";
  let catalogueError=false;
  try{state.products=await searchProducts(query)}catch{state.products=[];catalogueError=true}
  state.storeCategory=inferStoreCategory(query,state.products);
  updateStoreHint(`${state.storeCategory.label} · ${STORE_RADIUS_LABEL}`);
  loadStores();
  state.liveOffers=(await Promise.all(state.products.slice(0,6).map(pricesFor))).flat();
  renderOffers();renderProviders();
  if(catalogueError)toast("Каталог временно недоступен — показаны ссылки магазинов");
  $("#searchButton").disabled=false;$("#searchButton").textContent="Найти цены";
  $("#resultsSection").scrollIntoView({behavior:"smooth",block:"start"});
}

async function locateUser(){
  if(!navigator.geolocation){toast("Геолокация не поддерживается");return}
  const button=$("#useGeolocationButton");button.disabled=true;button.textContent="Определяем место…";
  navigator.geolocation.getCurrentPosition(async position=>{
    const location={lat:position.coords.latitude,lon:position.coords.longitude,label:"Текущее место",precise:true};
    try{
      const params=new URLSearchParams({lat:location.lat,lon:location.lon,format:"jsonv2",zoom:"14",addressdetails:"1","accept-language":"ru"});
      const response=await fetch(`${GEOCODER_ENDPOINT}/reverse?${params}`);
      if(response.ok){const data=await response.json(),a=data.address||{};location.label=[a.city||a.town||a.village||a.hamlet||a.municipality||a.county,a.suburb||a.neighbourhood].filter(Boolean).join(" · ")||"Текущее место"}
    }catch{}
    saveLocation(location);button.disabled=false;button.textContent="◎ Использовать текущее место";$("#locationSheet").hidden=true;resetStores();toast("Местоположение обновлено");
    if(state.query)await performSearch(state.query);
  },error=>{
    button.disabled=false;button.textContent="◎ Использовать текущее место";
    toast(error.code===1?"Разрешите доступ к геолокации в Safari":"Не удалось определить местоположение");
  },{enableHighAccuracy:true,timeout:12000,maximumAge:300000});
}

function resetStores(){
  state.stores=[];state.storeRequestId++;
  if(state.storeCategory){
    updateStoreHint(`${state.storeCategory.label} · ${STORE_RADIUS_LABEL}`);
    $("#storeList").innerHTML='<div class="empty-card">Место выбрано. Обновляем подходящие магазины…</div>';
  }else{
    updateStoreHint("Сначала найдите товар — покажем подходящие магазины");
    $("#storeList").innerHTML='<div class="empty-card">Введите название товара или найдите его по фото.</div>';
  }
}
function loadLocationCache(){try{return JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY)||"{}")||{}}catch{return{}}}
function saveLocationCache(cache){
  const entries=Object.entries(cache).slice(-25);
  try{localStorage.setItem(LOCATION_CACHE_KEY,JSON.stringify(Object.fromEntries(entries)))}catch{}
}
function locationResult(raw){
  const address=raw.address||{};
  const name=raw.name||address.city||address.town||address.village||address.hamlet||address.municipality||address.locality||String(raw.display_name||"").split(",")[0]||"Населённый пункт";
  const region=address.state&&address.state!==name?address.state:"";
  const district=address.state_district||address.county||address.district||"";
  return{lat:Number(raw.lat),lon:Number(raw.lon),label:[name,region].filter(Boolean).join(" · "),name,detail:[district,region].filter((value,index,array)=>value&&array.indexOf(value)===index).join(" · ")||"Россия"};
}
function renderLocationResults(results){
  const list=$("#locationResults");state.locationResults=results;
  list.innerHTML=results.map((item,index)=>`<button class="location-result" type="button" data-location-index="${index}"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.detail)}</small></span><b>›</b></button>`).join("");
}
let lastGeocoderRequest=0;
async function searchLocations(query){
  const key=normalize(query),cache=loadLocationCache();
  if(Array.isArray(cache[key]))return cache[key];
  const wait=Math.max(0,1000-(Date.now()-lastGeocoderRequest));
  if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
  const params=new URLSearchParams({q:query,format:"jsonv2",addressdetails:"1",countrycodes:"ru",layer:"address",featureType:"settlement",limit:"8","accept-language":"ru"});
  lastGeocoderRequest=Date.now();
  const response=await fetch(`${GEOCODER_ENDPOINT}/search?${params}`);
  if(!response.ok)throw new Error();
  const results=(await response.json()).map(locationResult).filter(item=>Number.isFinite(item.lat)&&Number.isFinite(item.lon));
  cache[key]=results;saveLocationCache(cache);return results;
}
async function submitLocationSearch(event){
  event.preventDefault();
  const query=$("#locationSearchInput").value.trim(),button=$("#locationSearchButton"),status=$("#locationSearchStatus");
  if(!query){status.textContent="Введите название населённого пункта.";return}
  button.disabled=true;button.textContent="Ищем…";status.textContent="Поиск по России…";renderLocationResults([]);
  try{
    const results=await searchLocations(query);renderLocationResults(results);
    status.textContent=results.length?`Найдено вариантов: ${results.length}`:"Ничего не найдено. Уточните название или добавьте регион.";
  }catch{status.textContent="Поиск мест временно недоступен. Попробуйте ещё раз."}
  button.disabled=false;button.textContent="Найти";
}
function chooseLocation(location){
  saveLocation(location);$("#locationSheet").hidden=true;resetStores();toast(`Выбрано: ${location.label}`);if(state.query)performSearch(state.query);
}

async function loadStores(){
  if(!state.storeCategory){toast("Сначала найдите товар — затем покажем нужные магазины");return}
  const button=$("#storesButton");button.disabled=true;button.textContent="…";
  const requestId=++state.storeRequestId,category=state.storeCategory;
  const {lat,lon}=state.location,radius=STORE_RADIUS_METERS;
  const selectors=[`nwr(around:${radius},${lat},${lon})[shop~"${category.shops}"];`];
  if(category.amenities)selectors.push(`nwr(around:${radius},${lat},${lon})[amenity~"${category.amenities}"];`);
  const query=`[out:json][timeout:20];(${selectors.join("")});out center tags 60;`;
  updateStoreHint(`Ищем: ${category.label.toLocaleLowerCase("ru")}…`);
  $("#storeList").innerHTML='<div class="empty-card">Ищем подходящие магазины рядом…</div>';
  try{
    let payload=null;
    for(const endpoint of OVERPASS_ENDPOINTS){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),24000);
      try{
        const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({data:query}),signal:controller.signal});
        if(response.ok){payload=await response.json();break}
      }catch{}finally{clearTimeout(timer)}
    }
    if(!payload)throw new Error();
    if(requestId!==state.storeRequestId)return;
    const seen=new Set();
    state.stores=(payload.elements||[]).flatMap(raw=>{
      const id=`${raw.type}-${raw.id}`;if(seen.has(id))return[];seen.add(id);
      const center=raw.center||{},tags=raw.tags||{},storeLat=number(raw.lat??center.lat),storeLon=number(raw.lon??center.lon);
      if(storeLat===null||storeLon===null)return[];
      return[{id,name:tags.name||tags.brand||category.label,address:[tags["addr:street"],tags["addr:housenumber"]].filter(Boolean).join(", "),lat:storeLat,lon:storeLon,distance_km:distanceKm(lat,lon,storeLat,storeLon)}];
    }).sort((a,b)=>a.distance_km-b.distance_km).slice(0,30);
    renderStores(category);
  }catch{if(requestId===state.storeRequestId){$("#storeList").innerHTML='<div class="empty-card">Не удалось загрузить магазины. Нажмите ↻, чтобы повторить.</div>';updateStoreHint(`${category.label} · ${STORE_RADIUS_LABEL}`);toast("Не удалось получить магазины рядом")}}
  if(requestId===state.storeRequestId){button.disabled=false;button.textContent="↻"}
}
function renderStores(category=state.storeCategory){
  const list=$("#storeList");
  updateStoreHint(`${category.label} · найдено ${state.stores.length} · ${STORE_RADIUS_LABEL}`);
  if(!state.stores.length){list.innerHTML=`<div class="empty-card">Подходящих магазинов в радиусе ${STORE_RADIUS_LABEL.replace("до ","")} не найдено.</div>`;return}
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
$("#locationLabel").textContent=state.location.label;
$("#locateButton").addEventListener("click",()=>{$("#locationSheet").hidden=false;setTimeout(()=>$("#locationSearchInput").focus(),50)});$("#storesButton").addEventListener("click",loadStores);
$("#locationSearchForm").addEventListener("submit",submitLocationSearch);
$("#useGeolocationButton").addEventListener("click",locateUser);
$("#locationResults").addEventListener("click",event=>{const button=event.target.closest("[data-location-index]");if(button)chooseLocation(state.locationResults[Number(button.dataset.locationIndex)])});
document.querySelectorAll("[data-location-choice]").forEach(button=>button.addEventListener("click",()=>chooseLocation({lat:Number(button.dataset.lat),lon:Number(button.dataset.lon),label:button.dataset.label,precise:false})));
$("#closeLocationSheet").addEventListener("click",()=>$("#locationSheet").hidden=true);
$("#locationSheet").addEventListener("click",event=>{if(event.target===$("#locationSheet"))$("#locationSheet").hidden=true});
$("#photoInput").addEventListener("change",event=>recognizePhoto(event.target.files?.[0]));
$("#catalogInput").addEventListener("change",event=>importCatalog(event.target.files?.[0]));
applyTheme(themeState.theme,themeState.mode,false);
$("#themeButton").addEventListener("click",()=>{$("#themeSheet").hidden=false;updateThemeControls()});
document.querySelectorAll("[data-theme-choice]").forEach(button=>button.addEventListener("click",()=>applyTheme(button.dataset.themeChoice,themeState.mode)));
document.querySelectorAll("[data-mode-choice]").forEach(button=>button.addEventListener("click",()=>applyTheme(themeState.theme,button.dataset.modeChoice)));
$("#closeThemeSheet").addEventListener("click",()=>$("#themeSheet").hidden=true);$("#doneThemeSheet").addEventListener("click",()=>$("#themeSheet").hidden=true);
$("#themeSheet").addEventListener("click",event=>{if(event.target===$("#themeSheet"))$("#themeSheet").hidden=true});
const updateAutoTheme=()=>{if(themeState.mode==="auto")applyTheme(themeState.theme,"auto",false)};
if(systemColorMode.addEventListener)systemColorMode.addEventListener("change",updateAutoTheme);else systemColorMode.addListener(updateAutoTheme);
$("#installButton").addEventListener("click",()=>$("#installSheet").hidden=false);
$("#closeSheet").addEventListener("click",()=>$("#installSheet").hidden=true);$("#doneSheet").addEventListener("click",()=>$("#installSheet").hidden=true);
$("#installSheet").addEventListener("click",event=>{if(event.target===$("#installSheet"))$("#installSheet").hidden=true});

if("serviceWorker"in navigator){navigator.serviceWorker.register("./sw.js").then(registration=>registration.update()).catch(()=>{})}

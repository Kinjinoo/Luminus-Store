(() => {
const C = window.VERSE_CONFIG;
const $ = s => document.querySelector(s);
const money = n => "฿" + Number(n || 0).toLocaleString("th-TH");
const configured = C.SUPABASE_URL.startsWith("https://") && !C.SUPABASE_URL.includes("ใส่_") && C.SUPABASE_ANON_KEY.length > 30 && !C.SUPABASE_ANON_KEY.includes("ใส่_");
const db = configured ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
let user = null, products = [], cart = JSON.parse(localStorage.getItem("verse-cart") || "[]"), category = "all", toastTimer;
function toast(s){const t=$("#toast");t.textContent=s;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2800)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function openModal(id){$("#"+id).classList.add("show")}
function closeModal(id){$("#"+id).classList.remove("show")}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
function splitOpts(str){return String(str||"").split(",").map(s=>s.trim()).filter(Boolean)}

function getProductOptions(p){
 if(!p || p.category==="accessories") return {colors:[], sizes:[]};
 const cols = splitOpts(p.colors);
 const szs = splitOpts(p.sizes);
 const defaultCols = ["ดำ", "ขาว", "ครีม", "เขียว", "แดง", "น้ำตาล"];
 const defaultSzs = p.category==="shoes" ? ["38", "39", "40", "41", "42", "43", "44"] : ["S", "M", "L", "XL", "2XL"];
 return {
  colors: cols.length ? cols : defaultCols,
  sizes: szs.length ? szs : defaultSzs
 };
 const SIZE_CHARTS = {
  tops: {
    title: "ตารางไซส์เสื้อ (Tops) — หน่วย: นิ้ว",
    headers: ["ไซส์", "รอบอก", "ความยาวเสื้อ", "ไหล่กว้าง"],
    rows: [
      ["S", "36 - 38", "25", "16.5"],
      ["M", "38 - 40", "26", "17.5"],
      ["L", "40 - 42", "27", "18.5"],
      ["XL", "42 - 44", "28", "19.5"]
    ]
  },
  bottoms: {
    title: "ตารางไซส์กางเกง (Bottoms) — หน่วย: นิ้ว",
    headers: ["ไซส์", "รอบเอว", "สะโพก", "ความยาวกางเกง"],
    rows: [
      ["S", "26 - 28", "36", "38"],
      ["M", "28 - 30", "38", "39"],
      ["L", "30 - 32", "40", "40"],
      ["XL", "32 - 34", "42", "41"]
    ]
  },
  dresses: {
    title: "ตารางไซส์เดรส (Dresses) — หน่วย: นิ้ว",
    headers: ["ไซส์", "รอบอก", "รอบเอว", "สะโพก", "ความยาวชุด"],
    rows: [
      ["S", "32 - 34", "26 - 27", "36", "42"],
      ["M", "34 - 36", "28 - 29", "38", "43"],
      ["L", "36 - 38", "30 - 31", "40", "44"],
      ["XL", "38 - 40", "32 - 33", "42", "45"]
    ]
  },
  shoes: {
    title: "ตารางไซส์รองเท้า (Shoes) — หน่วย: เซนติเมตร",
    headers: ["ไซส์ (EU)", "ความยาวเท้า (ซม.)", "เทียบไซส์ US"],
    rows: [
      ["38", "24.0 ซม.", "US 6"],
      ["39", "24.5 ซม.", "US 6.5"],
      ["40", "25.0 ซม.", "US 7"],
      ["41", "25.5 ซม.", "US 8"],
      ["42", "26.0 ซม.", "US 8.5"],
      ["43", "26.5 ซม.", "US 9.5"]
    ]
  }
};

function openSizeChart(cat){
  const chart = SIZE_CHARTS[cat] || SIZE_CHARTS.tops;
  $("#sizeChartContent").innerHTML = `
    <p style="font-weight:600;margin-bottom:8px;font-size:14px">${chart.title}</p>
    <table>
      <thead><tr>${chart.headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${chart.rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  openModal("sizeModal");
}
}

async function init(){
 if($("#bankName"))$("#bankName").textContent=C.BANK_NAME;if($("#bankAccount"))$("#bankAccount").textContent=C.BANK_ACCOUNT;if($("#bankOwner"))$("#bankOwner").textContent=C.BANK_OWNER;
 if(!db){$("#products").innerHTML='<p class="notice">กรุณาตั้งค่า Supabase URL และ Key ในไฟล์ config.js ก่อน</p>';return}
 const {data:{session}}=await db.auth.getSession();user=session?.user||null;await updateAuth();
 db.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;setTimeout(async()=>{await updateAuth();},0)});
 await loadProducts();renderCart();
}
async function updateAuth(){
 $("#userLabel").textContent=user?(user.user_metadata?.full_name||user.email):"ยังไม่ได้เข้าสู่ระบบ";
 $("#authOpen").textContent=user?"บัญชีของฉัน":"เข้าสู่ระบบ";
 $("#signOut").classList.toggle("hidden",!user);
 if(user) await loadOrders();
}
async function loadProducts(){
 const {data,error}=await db.from("products").select("*").eq("active",true).order("created_at",{ascending:false});
 if(error){$("#products").innerHTML=`<p class="notice">${esc(error.message)}</p>`;return}
 products=data||[];applyFilters();renderCart();
}
function applyFilters(){
 const q=$("#search").value.trim().toLowerCase();
 const rows=products.filter(p=>(category==="all"||p.category===category)&&p.name.toLowerCase().includes(q));
 $("#productCount").textContent=`${rows.length} PIECES`;
 $("#products").innerHTML=rows.length?rows.map(p=>{
  const {colors:cols, sizes:szs}=getProductOptions(p);
  const optHtml=(cols.length||szs.length)?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center">
    ${cols.length?`<select data-opt-color="${p.id}" style="padding:4px 8px;font-size:12px;border:1px solid #d6d0c4;border-radius:4px;background:#fff;cursor:pointer">${cols.map(c=>`<option value="${esc(c)}">สี: ${esc(c)}</option>`).join("")}</select>`:""}
    ${szs.length?`<select data-opt-size="${p.id}" style="padding:4px 8px;font-size:12px;border:1px solid #d6d0c4;border-radius:4px;background:#fff;cursor:pointer">${szs.map(s=>`<option value="${esc(s)}">ไซส์: ${esc(s)}</option>`).join("")}</select>`:""}
    <button type="button" class="text-button" data-size-guide="${p.category}" style="font-size:12px">📏 ตารางไซส์</button>
  </div>`:"";
  const optHtml=(cols.length||szs.length)?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
    ${cols.length?`<select data-opt-color="${p.id}" style="padding:4px 8px;font-size:12px;border:1px solid #d6d0c4;border-radius:4px;background:#fff;cursor:pointer">${cols.map(c=>`<option value="${esc(c)}">สี: ${esc(c)}</option>`).join("")}</select>`:""}
    ${szs.length?`<select data-opt-size="${p.id}" style="padding:4px 8px;font-size:12px;border:1px solid #d6d0c4;border-radius:4px;background:#fff;cursor:pointer">${szs.map(s=>`<option value="${esc(s)}">ไซส์: ${esc(s)}</option>`).join("")}</select>`:""}
  </div>`:"";
  return `<article class="product-card"><div class="product-photo"><img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy"><span class="tag">${p.stock>0?"IN STOCK":"SOLD OUT"}</span><button class="quick-add" data-add="${p.id}" ${p.stock<1?"disabled":""}>${p.stock>0?"ADD TO BAG +":"SOLD OUT"}</button></div><div class="product-meta"><span>${esc(p.name)}</span><b>${money(p.price)}</b></div><p class="muted tiny">${esc(p.category.toUpperCase())} · เหลือ ${p.stock}</p>${optHtml}</article>`;
 }).join(""):'<p class="muted">ไม่พบสินค้า</p>';
}
$("#filters").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;category=b.dataset.cat;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));applyFilters()});
$("#search").addEventListener("input",applyFilters);
$("#products").addEventListener("click",e=>{
  const sg=e.target.closest("[data-size-guide]");
  if(sg)return openSizeChart(sg.dataset.sizeGuide);
  const b=e.target.closest("[data-add]");
  if(b)addCart(Number(b.dataset.add));
});
function addCart(id){
 const p=products.find(x=>x.id===id);if(!p||p.stock<1)return toast("สินค้าหมด");
 const {colors:cols, sizes:szs}=getProductOptions(p);
 const color=$(`[data-opt-color="${id}"]`)?.value || cols[0] || "";
 const size=$(`[data-opt-size="${id}"]`)?.value || szs[0] || "";
 const key=`${id}__${color}__${size}`;
 const totalInCart=cart.filter(x=>x.id===id).reduce((s,x)=>s+x.qty,0);
 if(totalInCart>=p.stock)return toast("สินค้าในสต็อกไม่เพียงพอ");
 const item=cart.find(x=>(x.key||String(x.id))===key);
 if(item)item.qty++;
 else cart.push({key,id:p.id,name:p.name,price:p.price,image_url:p.image_url,color,size,qty:1});
 saveCart();toast("เพิ่มสินค้าในตะกร้าแล้ว");
}
function saveCart(){localStorage.setItem("verse-cart",JSON.stringify(cart));renderCart()}
function renderCart(){
 $("#cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
 $("#cartItems").innerHTML=cart.length?cart.map((x,idx)=>{
  const p=products.find(i=>i.id===x.id);
  const {colors:cols, sizes:szs}=getProductOptions(p);
  if(cols.length && !x.color) x.color=cols[0];
  if(szs.length && !x.size) x.size=szs[0];
  const cartOptHtml=(cols.length||szs.length)?`<div style="display:flex;gap:4px;margin:4px 0">
    ${cols.length?`<select data-cart-color="${idx}" style="padding:2px 6px;font-size:12px;border:1px solid #d6d0c4;border-radius:4px;background:#fff">${cols.map(c=>`<option value="${esc(c)}" ${x.color===c?"selected":""}>สี: ${esc(c)}</option>`).join("")}</select>`:""}
    ${szs.length?`<select data-cart-size="${idx}" style="padding:2px 6px;font-size:12px;border:1px solid #d6d0c4;border-radius:4px;background:#fff">${szs.map(s=>`<option value="${esc(s)}" ${x.size===s?"selected":""}>ไซส์: ${esc(s)}</option>`).join("")}</select>`:""}
  </div>`:"";
  return `<div class="cart-line"><img src="${esc(x.image_url)}" alt=""><div><h4>${esc(x.name)}</h4>${cartOptHtml}<p>${money(x.price)}</p><div class="qty"><button data-q="-1" data-idx="${idx}">−</button> ${x.qty} <button data-q="1" data-idx="${idx}">+</button></div><button class="remove" data-r="${idx}">ลบ</button></div></div>`;
 }).join(""):'<p class="empty">ยังไม่มีสินค้าในตะกร้า</p>';
 $("#cartTotal").textContent=money(cart.reduce((s,x)=>s+x.price*x.qty,0));
}
$("#cartItems").addEventListener("change",e=>{
 const cSel=e.target.closest("[data-cart-color]"),sSel=e.target.closest("[data-cart-size]");
 if(cSel){const idx=Number(cSel.dataset.cartColor);cart[idx].color=cSel.value;cart[idx].key=`${cart[idx].id}__${cart[idx].color}__${cart[idx].size}`;saveCart();}
 if(sSel){const idx=Number(sSel.dataset.cartSize);cart[idx].size=sSel.value;cart[idx].key=`${cart[idx].id}__${cart[idx].color}__${cart[idx].size}`;saveCart();}
});
$("#cartItems").addEventListener("click",e=>{
 const q=e.target.closest("[data-q]"),r=e.target.closest("[data-r]");
 if(q){
  const idx=Number(q.dataset.idx),x=cart[idx],p=products.find(i=>i.id===x.id);
  const delta=Number(q.dataset.q);
  if(delta>0){const totalInCart=cart.filter(i=>i.id===x.id).reduce((s,i)=>s+i.qty,0);if(p&&totalInCart>=p.stock)return toast("จำนวนเกินสต็อก")}
  x.qty+=delta;if(x.qty<=0)cart.splice(idx,1);saveCart();
 }
 if(r){cart.splice(Number(r.dataset.r),1);saveCart()}
});
function showCart(v){$("#shade").classList.toggle("show",v);$("#cartDrawer").classList.toggle("open",v)}
$("#cartOpen").onclick=()=>showCart(true);$("#cartClose").onclick=()=>showCart(false);$("#shade").onclick=()=>showCart(false);

function authMode(signup){$("#authTitle").textContent=signup?"สมัครสมาชิก":"เข้าสู่ระบบ";$("#authSubmit").textContent=signup?"สร้างบัญชี":"เข้าสู่ระบบ";$("#nameWrap").classList.toggle("hidden",!signup);$("#authSwitchText").textContent=signup?"มีบัญชีแล้ว?":"ยังไม่มีบัญชี?";$("#authSwitch").textContent=signup?"เข้าสู่ระบบ":"สมัครสมาชิก";$("#authForm").dataset.mode=signup?"signup":"login";$("#authPassword").autocomplete=signup?"new-password":"current-password"}
$("#authOpen").onclick=()=>{if(user){openModal("authModal");$("#authForm").classList.add("hidden");$("#authTitle").textContent="บัญชีของฉัน";$("#signOut").classList.remove("hidden")}else{authMode(false);$("#authForm").classList.remove("hidden");openModal("authModal")}};
$("#authSwitch").onclick=()=>{authMode($("#authForm").dataset.mode!=="signup")};
$("#authForm").addEventListener("submit",async e=>{
 e.preventDefault();const btn=$("#authSubmit"),oldText=btn.textContent;btn.disabled=true;btn.textContent="กำลังดำเนินการ...";
 try{
  const email=$("#authEmail").value.trim(),password=$("#authPassword").value,isSignup=e.currentTarget.dataset.mode==="signup";
  const res=isSignup?await db.auth.signUp({email,password,options:{data:{full_name:$("#authName").value.trim()}}}):await db.auth.signInWithPassword({email,password});
  if(res.error)return toast(res.error.message);user=res.data?.user||null;await updateAuth();closeModal("authModal");toast(isSignup?"สมัครสมาชิกสำเร็จ":"เข้าสู่ระบบแล้ว");
 }finally{btn.disabled=false;btn.textContent=oldText;}
});
$("#signOut").onclick=async()=>{await db.auth.signOut();closeModal("authModal");toast("ออกจากระบบแล้ว")};

$("#checkoutOpen").onclick=()=>{if(!cart.length)return toast("กรุณาเลือกสินค้าก่อน");if(!user){showCart(false);authMode(false);$("#authForm").classList.remove("hidden");openModal("authModal");return toast("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ")}showCart(false);renderSummary();openModal("checkoutModal")};
function renderSummary(){
 const sub=cart.reduce((s,x)=>s+x.price*x.qty,0),ship=sub>=C.FREE_SHIPPING_AT?0:C.SHIPPING_FEE;
 $("#checkoutLines").innerHTML=cart.map(x=>{
  const opt=[x.color?`สี ${esc(x.color)}`:"",x.size?`ไซส์ ${esc(x.size)}`:""].filter(Boolean).join(", ");
  return `<p class="summary-line">${esc(x.name)}${opt?` (${opt})`:""} × ${x.qty}<b>${money(x.price*x.qty)}</b></p>`;
 }).join("");
 $("#sumSubtotal").textContent=money(sub);$("#sumShipping").textContent=ship?money(ship):"ฟรี";$("#sumTotal").textContent=money(sub+ship);
}
$("#slip").onchange=()=>{$("#slipName").textContent=$("#slip").files[0]?.name||"ยังไม่ได้เลือกไฟล์"};
if($("#copyBank"))$("#copyBank").onclick=async()=>{try{await navigator.clipboard.writeText(C.BANK_ACCOUNT);toast("คัดลอกเลขบัญชีแล้ว")}catch{toast("กรุณาคัดลอกเลขบัญชีด้วยตนเอง")}};

$("#checkoutForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!user)return toast("กรุณาเข้าสู่ระบบ");const file=$("#slip").files[0];if(!file||!file.type.startsWith("image/")||file.size>5*1024*1024)return toast("กรุณาแนบรูปสลิปไม่เกิน 5 MB");
 const btn=$("#placeOrder");btn.disabled=true;btn.textContent="กำลังบันทึกคำสั่งซื้อ...";
 try{
  const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-zA-Z0-9]/g,"")||"jpg";
  const orderId=crypto.randomUUID(),path=`${user.id}/${orderId}/${Date.now()}.${ext}`;
  const up=await db.storage.from("payment-slips").upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;
  const payload=cart.map(x=>({product_id:x.id,quantity:x.qty,size:x.size||"",color:x.color||""}));
  const placed=await db.rpc("place_verse_order",{p_order_id:orderId,p_items:payload,p_slip_path:path,p_customer_name:e.target.name.value,p_phone:e.target.phone.value,p_email:e.target.email.value,p_address:e.target.address.value});
  if(placed.error)throw placed.error;
  cart=[];saveCart();e.target.reset();$("#slipName").textContent="ยังไม่ได้เลือกไฟล์";closeModal("checkoutModal");toast("สั่งซื้อสำเร็จ เลขที่ "+String(placed.data).slice(0,8));await Promise.all([loadProducts(),loadOrders()]);$("#orders").scrollIntoView({behavior:"smooth"});
 }catch(err){toast("ไม่สามารถสั่งซื้อได้: "+err.message)}finally{btn.disabled=false;btn.textContent="ยืนยันคำสั่งซื้อ →"}
});

async function loadOrders(){
 if(!user)return;
 const {data,error}=await db.from("orders").select("id,created_at,total,status,order_items(id,product_id,product_name,quantity,size,color)").order("created_at",{ascending:false}).limit(30);
 if(error){$("#myOrders").textContent=error.message;return}
 $("#myOrders").innerHTML=data.length?`<div class="table-wrap"><table><thead><tr><th>เลขคำสั่งซื้อ</th><th>รายการสินค้า</th><th>วันที่</th><th>ยอดรวม</th><th>สถานะ / จัดการ</th></tr></thead><tbody>${data.map(o=>{
  const canEdit=o.status==="รอตรวจสอบสลิป";
  const itemsHtml=(o.order_items||[]).map(i=>{
   const prod=products.find(p=>p.id===i.product_id);
   const {colors:cols, sizes:szs}=getProductOptions(prod);
   const optText=[i.color?`สี: ${esc(i.color)}`:"",i.size?`ไซส์: ${esc(i.size)}`:""].filter(Boolean).join(" · ");
   const editControl=(canEdit&&(cols.length||szs.length))?`<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;align-items:center">
     ${cols.length?`<select data-edit-color="${i.id}" style="padding:2px 4px;font-size:12px">${cols.map(c=>`<option value="${esc(c)}" ${i.color===c?"selected":""}>สี: ${esc(c)}</option>`).join("")}</select>`:""}
     ${szs.length?`<select data-edit-size="${i.id}" style="padding:2px 4px;font-size:12px">${szs.map(s=>`<option value="${esc(s)}" ${i.size===s?"selected":""}>ไซส์: ${esc(s)}</option>`).join("")}</select>`:""}
     <button type="button" class="text-button" style="font-size:12px" data-save-item="${i.id}">บันทึกการเปลี่ยน</button>
   </div>`:"";
   return `<div style="margin-bottom:6px"><b>${esc(i.product_name)}</b> × ${i.quantity}${optText?` <small class="muted">(${optText})</small>`:""}${editControl}</div>`;
  }).join("");
  const actionHtml=canEdit?`<div style="margin-top:6px"><button type="button" class="text-button" style="color:#b91c1c;font-size:12px" data-cancel-order="${o.id}">ยกเลิกคำสั่งซื้อ</button></div>`:"";
  return `<tr><td>${o.id.slice(0,8).toUpperCase()}</td><td>${itemsHtml}</td><td>${new Date(o.created_at).toLocaleDateString("th-TH")}</td><td>${money(o.total)}</td><td>${esc(o.status)}${actionHtml}</td></tr>`;
 }).join("")}</tbody></table></div>`:'<p class="muted">ยังไม่มีคำสั่งซื้อ</p>';
}

$("#myOrders").addEventListener("click",async e=>{
 const saveBtn=e.target.closest("[data-save-item]");
 if(saveBtn){
  const itemId=Number(saveBtn.dataset.saveItem);
  const newColor=$(`[data-edit-color="${itemId}"]`)?.value||"";
  const newSize=$(`[data-edit-size="${itemId}"]`)?.value||"";
  const {error}=await db.rpc("update_verse_order_item",{p_item_id:itemId,p_size:newSize,p_color:newColor});
  if(error)return toast(error.message);
  toast("อัปเดตสี/ไซส์เรียบร้อยแล้ว");await loadOrders();return;
 }
 const cancelBtn=e.target.closest("[data-cancel-order]");
 if(cancelBtn){
  if(!confirm("ยืนยันการยกเลิกคำสั่งซื้อนี้? (ระบบจะคืนสต็อกสินค้าให้อัตโนมัติ)"))return;
  const {error}=await db.rpc("cancel_verse_order",{p_order_id:cancelBtn.dataset.cancelOrder});
  if(error)return toast(error.message);
  toast("ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว");await Promise.all([loadProducts(),loadOrders()]);
 }
});

$("#refreshOrders").onclick=loadOrders;
init();
})();

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
async function init(){
 $("#bankName").textContent=C.BANK_NAME;$("#bankAccount").textContent=C.BANK_ACCOUNT;$("#bankOwner").textContent=C.BANK_OWNER;
 if(!db){$("#products").innerHTML='<p class="notice">กรุณาตั้งค่า Supabase URL และ Key ในไฟล์ config.js ก่อน เว็บไซต์จึงจะโหลดสินค้าและใช้งานระบบสมาชิกได้</p>';return}
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
 const {data,error}=await db.from("products").select("id,name,description,price,category,image_url,stock,active").eq("active",true).order("created_at",{ascending:false});
 if(error){$("#products").innerHTML=`<p class="notice">${esc(error.message)}</p>`;return}
 products=data||[];applyFilters();
}
function applyFilters(){
 const q=$("#search").value.trim().toLowerCase();
 const rows=products.filter(p=>(category==="all"||p.category===category)&&p.name.toLowerCase().includes(q));
 $("#productCount").textContent=`${rows.length} PIECES`;
 $("#products").innerHTML=rows.length?rows.map(p=>`<article class="product-card"><div class="product-photo"><img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy"><span class="tag">${p.stock>0?"IN STOCK":"SOLD OUT"}</span><button class="quick-add" data-add="${p.id}" ${p.stock<1?"disabled":""}>${p.stock>0?"ADD TO BAG +":"SOLD OUT"}</button></div><div class="product-meta"><span>${esc(p.name)}</span><b>${money(p.price)}</b></div><p class="muted tiny">${esc(p.category.toUpperCase())} · เหลือ ${p.stock}</p></article>`).join(""):'<p class="muted">ไม่พบสินค้า</p>';
}
$("#filters").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;category=b.dataset.cat;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));applyFilters()});
$("#search").addEventListener("input",applyFilters);
$("#products").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(b)addCart(Number(b.dataset.add))});
function addCart(id){const p=products.find(x=>x.id===id);if(!p||p.stock<1)return toast("สินค้าหมด");const item=cart.find(x=>x.id===id);if(item){if(item.qty>=p.stock)return toast("สินค้าในสต็อกไม่เพียงพอ");item.qty++}else cart.push({id:p.id,name:p.name,price:p.price,image_url:p.image_url,qty:1});saveCart();toast("เพิ่มสินค้าในตะกร้าแล้ว")}
function saveCart(){localStorage.setItem("verse-cart",JSON.stringify(cart));renderCart()}
function renderCart(){
 $("#cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);$("#cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-line"><img src="${esc(x.image_url)}" alt=""><div><h4>${esc(x.name)}</h4><p>${money(x.price)}</p><div class="qty"><button data-q="-1" data-id="${x.id}">−</button> ${x.qty} <button data-q="1" data-id="${x.id}">+</button></div><button class="remove" data-r="${x.id}">ลบ</button></div></div>`).join(""):'<p class="empty">ยังไม่มีสินค้าในตะกร้า</p>';
 $("#cartTotal").textContent=money(cart.reduce((s,x)=>s+x.price*x.qty,0));
}
$("#cartItems").addEventListener("click",e=>{const q=e.target.closest("[data-q]"),r=e.target.closest("[data-r]");if(q){const x=cart.find(i=>i.id===Number(q.dataset.id)),p=products.find(i=>i.id===x.id);x.qty+=Number(q.dataset.q);if(x.qty<=0)cart=cart.filter(i=>i.id!==x.id);else if(x.qty>p.stock){x.qty=p.stock;toast("จำนวนเกินสต็อก")}saveCart()}if(r){cart=cart.filter(i=>i.id!==Number(r.dataset.r));saveCart()}});
function showCart(v){$("#shade").classList.toggle("show",v);$("#cartDrawer").classList.toggle("open",v)}
$("#cartOpen").onclick=()=>showCart(true);$("#cartClose").onclick=()=>showCart(false);$("#shade").onclick=()=>showCart(false);
function authMode(signup){$("#authTitle").textContent=signup?"สมัครสมาชิก":"เข้าสู่ระบบ";$("#authSubmit").textContent=signup?"สร้างบัญชี":"เข้าสู่ระบบ";$("#nameWrap").classList.toggle("hidden",!signup);$("#authSwitchText").textContent=signup?"มีบัญชีแล้ว?":"ยังไม่มีบัญชี?";$("#authSwitch").textContent=signup?"เข้าสู่ระบบ":"สมัครสมาชิก";$("#authForm").dataset.mode=signup?"signup":"login";$("#authPassword").autocomplete=signup?"new-password":"current-password"}
$("#authOpen").onclick=()=>{if(user){openModal("authModal");$("#authForm").classList.add("hidden");$("#authTitle").textContent="บัญชีของฉัน";$("#signOut").classList.remove("hidden")}else{authMode(false);$("#authForm").classList.remove("hidden");openModal("authModal")}};
$("#authSwitch").onclick=()=>{authMode($("#authForm").dataset.mode!=="signup")};
$("#authForm").addEventListener("submit",async e=>{e.preventDefault();if (!db) {
   return toast("กรุณาตั้งค่า Supabase ใน config.js ก่อน");
 }const email=$("#authEmail").value,password=$("#authPassword").value;let res;if(e.currentTarget.dataset.mode==="signup")res=await db.auth.signUp({email,password,options:{data:{full_name:$("#authName").value}}});else res=await db.auth.signInWithPassword({email,password});if(res.error)return toast(res.error.message);toast(e.currentTarget.dataset.mode==="signup"?"สมัครสมาชิกสำเร็จ":"เข้าสู่ระบบสำเร็จ");closeModal("authModal");});
$("#signOut").onclick=async()=>{await db.auth.signOut();closeModal("authModal");toast("ออกจากระบบแล้ว")};
$("#checkoutOpen").onclick=()=>{if(!cart.length)return toast("กรุณาเลือกสินค้าก่อน");if(!user){showCart(false);authMode(false);$("#authForm").classList.remove("hidden");openModal("authModal");return toast("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ")}showCart(false);renderSummary();openModal("checkoutModal")};
function renderSummary(){const sub=cart.reduce((s,x)=>s+x.price*x.qty,0),ship=sub>=C.FREE_SHIPPING_AT?0:C.SHIPPING_FEE;$("#checkoutLines").innerHTML=cart.map(x=>`<p class="summary-line">${esc(x.name)} × ${x.qty}<b>${money(x.price*x.qty)}</b></p>`).join("");$("#sumSubtotal").textContent=money(sub);$("#sumShipping").textContent=ship?money(ship):"ฟรี";$("#sumTotal").textContent=money(sub+ship)}
$("#slip").onchange=()=>{$("#slipName").textContent=$("#slip").files[0]?.name||"ยังไม่ได้เลือกไฟล์"};
$("#copyBank").onclick=async()=>{try{await navigator.clipboard.writeText(C.BANK_ACCOUNT);toast("คัดลอกเลขบัญชีแล้ว")}catch{toast("กรุณาคัดลอกเลขบัญชีด้วยตนเอง")}};
$("#checkoutForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!user)return toast("กรุณาเข้าสู่ระบบ");const file=$("#slip").files[0];if(!file||!file.type.startsWith("image/")||file.size>5*1024*1024)return toast("กรุณาแนบรูปสลิปไม่เกิน 5 MB");
 const btn=$("#placeOrder");btn.disabled=true;btn.textContent="กำลังบันทึกคำสั่งซื้อ...";
 try{
  const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-zA-Z0-9]/g,"")||"jpg";
  const orderId=crypto.randomUUID(),path=`${user.id}/${orderId}/${Date.now()}.${ext}`;
  const up=await db.storage.from("payment-slips").upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;
  const payload=cart.map(x=>({product_id:x.id,quantity:x.qty}));
  const placed=await db.rpc("place_verse_order",{p_order_id:orderId,p_items:payload,p_slip_path:path,p_customer_name:e.target.name.value,p_phone:e.target.phone.value,p_email:e.target.email.value,p_address:e.target.address.value});
  if(placed.error)throw placed.error;
  cart=[];saveCart();e.target.reset();$("#slipName").textContent="ยังไม่ได้เลือกไฟล์";closeModal("checkoutModal");toast("สั่งซื้อสำเร็จ เลขที่ "+String(placed.data).slice(0,8));await loadOrders();$("#orders").scrollIntoView({behavior:"smooth"});
 }catch(err){toast("ไม่สามารถสั่งซื้อได้: "+err.message)}finally{btn.disabled=false;btn.textContent="ยืนยันคำสั่งซื้อ →"}
});
async function loadOrders(){if(!user)return;const {data,error}=await db.from("orders").select("id,created_at,total,status,customer_name").order("created_at",{ascending:false}).limit(30);if(error){$("#myOrders").textContent=error.message;return}$("#myOrders").innerHTML=data.length?`<div class="table-wrap"><table><thead><tr><th>เลขคำสั่งซื้อ</th><th>วันที่</th><th>ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>${data.map(o=>`<tr><td>${o.id.slice(0,8).toUpperCase()}</td><td>${new Date(o.created_at).toLocaleDateString("th-TH")}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join("")}</tbody></table></div>`:'<p class="muted">ยังไม่มีคำสั่งซื้อ</p>'}
$("#refreshOrders").onclick=loadOrders;
init();
})();

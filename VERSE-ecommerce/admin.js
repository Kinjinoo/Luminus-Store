(() => {
const C=window.VERSE_CONFIG,$=s=>document.querySelector(s),money=n=>"฿"+Number(n||0).toLocaleString("th-TH");
const configured=C.SUPABASE_URL.startsWith("https://")&&!C.SUPABASE_URL.includes("ใส่_")&&C.SUPABASE_ANON_KEY.length>30&&!C.SUPABASE_ANON_KEY.includes("ใส่_");
const db=configured?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
function msg(s){$("#adminMessage").textContent=s}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function start(){
 if(!db){msg("กรุณาตั้งค่า Supabase ใน config.js");return}
 const {data:{session}}=await db.auth.getSession();
 if(!session){msg("กรุณาเข้าสู่ระบบก่อน โดยล็อกอินจากหน้าร้าน แล้วกลับมาหน้านี้");location.href="index.html";return}
 const {data:profile,error}=await db.from("profiles").select("role").eq("id",session.user.id).single();
 if(error||profile?.role!=="admin"){msg("ไม่มีสิทธิ์เข้าถึงหน้านี้ บัญชีนี้ไม่ได้รับสิทธิ์ Admin");return}
 msg("เข้าสู่ระบบผู้ดูแลร้านแล้ว");$("#adminApp").classList.remove("hidden");await refresh();
}
async function refresh(){await Promise.all([loadProducts(),loadOrders()])}
async function loadProducts(){
 const {data,error}=await db.from("products").select("*").order("created_at",{ascending:false});if(error)return msg(error.message);
 $("#statProducts").textContent=data.length;
 $("#adminProducts").innerHTML=`<table><thead><tr><th>สินค้า</th><th>ราคา</th><th>สต็อก</th><th>จัดการ</th></tr></thead><tbody>${data.map(p=>`<tr><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td><button class="mini" data-edit="${p.id}">แก้ไข</button> <button class="mini danger" data-del="${p.id}">ลบ</button></td></tr>`).join("")}</tbody></table>`;
 $("#adminProducts").dataset.rows=JSON.stringify(data);
}
async function loadOrders(){
 const {data,error}=await db.from("orders").select("*,order_items(product_name,quantity,size,unit_price)").order("created_at",{ascending:false}).limit(100);if(error)return msg(error.message);
 $("#statOrders").textContent=data.length;$("#statPending").textContent=data.filter(x=>x.status==="รอตรวจสอบสลิป").length;
 $("#adminOrders").innerHTML=data.length?`<table><thead><tr><th>ออเดอร์ / ลูกค้า</th><th>รายการ</th><th>ยอดรวม</th><th>สลิป</th><th>สถานะ</th></tr></thead><tbody>${data.map(o=>`<tr><td><b>${o.id.slice(0,8).toUpperCase()}</b><br>${esc(o.customer_name)}<br><small>${esc(o.phone)}</small></td><td>${o.order_items.map(i=>`${esc(i.product_name)} × ${i.quantity} (${esc(i.size||"-")})`).join("<br>")}</td><td>${money(o.total)}</td><td><button class="mini" data-slip="${o.id}">ดูสลิป</button></td><td><select data-status="${o.id}">${["รอตรวจสอบสลิป","ชำระเงินแล้ว","กำลังจัดส่ง","จัดส่งสำเร็จ","ยกเลิก"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>`:'<p class="muted">ยังไม่มีคำสั่งซื้อ</p>';
}
$("#productForm").onsubmit=async e=>{e.preventDefault();const id=$("#editId").value;const row={name:$("#pName").value.trim(),price:Number($("#pPrice").value),category:$("#pCategory").value,stock:Number($("#pStock").value),image_url:$("#pImage").value.trim(),active:true};const res=id?await db.from("products").update(row).eq("id",id):await db.from("products").insert(row);if(res.error)return msg(res.error.message);e.target.reset();$("#editId").value="";msg("บันทึกสินค้าเรียบร้อย");await loadProducts()};
$("#adminProducts").onclick=async e=>{
 const rows=JSON.parse($("#adminProducts").dataset.rows||"[]"),edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-del]");
 if(edit){const p=rows.find(x=>x.id===Number(edit.dataset.edit));$("#editId").value=p.id;$("#pName").value=p.name;$("#pPrice").value=p.price;$("#pCategory").value=p.category;$("#pStock").value=p.stock;$("#pImage").value=p.image_url;window.scrollTo({top:0,behavior:"smooth"})}
 if(del&&confirm("ยืนยันลบสินค้านี้?")){const {error}=await db.from("products").delete().eq("id",Number(del.dataset.del));if(error)msg(error.message);else{msg("ลบสินค้าแล้ว");await loadProducts()}}
};
$("#cancelEdit").onclick=()=>{$("#productForm").reset();$("#editId").value=""};
$("#adminOrders").onchange=async e=>{const s=e.target.closest("[data-status]");if(!s)return;const {error}=await db.from("orders").update({status:s.value}).eq("id",s.dataset.status);if(error)msg(error.message);else msg("อัปเดตสถานะแล้ว")};
$("#adminOrders").onclick=async e=>{const b=e.target.closest("[data-slip]");if(!b)return;const {data:order,error}=await db.from("orders").select("slip_path").eq("id",b.dataset.slip).single();if(error)return msg(error.message);const {data,error:signError}=await db.storage.from("payment-slips").createSignedUrl(order.slip_path,90);if(signError)return msg(signError.message);window.open(data.signedUrl,"_blank","noopener")};
$("#reloadAdmin").onclick=refresh;$("#adminLogout").onclick=async()=>{await db.auth.signOut();location.href="index.html"};
start();
})();
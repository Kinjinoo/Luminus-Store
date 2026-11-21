(() => {
const C=window.VERSE_CONFIG,$=s=>document.querySelector(s),money=n=>"฿"+Number(n||0).toLocaleString("th-TH");
const configured=C.SUPABASE_URL.startsWith("https://")&&!C.SUPABASE_URL.includes("ใส่_")&&C.SUPABASE_ANON_KEY.length>30&&!C.SUPABASE_ANON_KEY.includes("ใส่_");
const db=configured?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
function msg(s){$("#adminMessage").textContent=s}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
const STATUSES=["รอตรวจสอบสลิป","ชำระเงินแล้ว","กำลังจัดส่ง","จัดส่งสำเร็จ","ยกเลิก"];
let allOrders=[],filterMonth="",filterDate="";

function toggleVariantInputs(){
  const isBag=$("#pCategory").value==="accessories";
  $("#wrapColors").style.display=isBag?"none":"";
  $("#wrapSizes").style.display=isBag?"none":"";
  if(isBag){$("#pColors").value="";$("#pSizes").value="";}
}
$("#pCategory").onchange=toggleVariantInputs;

function toLocalParts(iso){
  const d=new Date(iso);
  const y=d.toLocaleString("en-CA",{timeZone:"Asia/Bangkok",year:"numeric"});
  const m=d.toLocaleString("en-CA",{timeZone:"Asia/Bangkok",month:"2-digit"});
  const day=d.toLocaleString("en-CA",{timeZone:"Asia/Bangkok",day:"2-digit"});
  const time=d.toLocaleTimeString("th-TH",{timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit"});
  const fullDate=d.toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok",weekday:"long",day:"numeric",month:"long",year:"numeric"});
  return {monthKey:`${y}-${m}`,dateKey:`${y}-${m}-${day}`,time,fullDate};
}
function monthLabel(ym){const [y,m]=ym.split("-");return new Date(Number(y),Number(m)-1,1).toLocaleDateString("th-TH",{month:"long",year:"numeric"});}

async function start(){
  if(!db){msg("กรุณาตั้งค่า Supabase ใน config.js");return}
  const {data:{session}}=await db.auth.getSession();
  if(!session){msg("กรุณาเข้าสู่ระบบก่อน โดยล็อกอินจากหน้าร้าน แล้วกลับมาหน้านี้");location.href="index.html";return}
  const {data:profile,error}=await db.from("profiles").select("role").eq("id",session.user.id).single();
  if(error||profile?.role!=="admin"){msg("ไม่มีสิทธิ์เข้าถึงหน้านี้ บัญชีนี้ไม่ได้รับสิทธิ์ Admin");return}
  msg("เข้าสู่ระบบผู้ดูแลร้านแล้ว");$("#adminApp").classList.remove("hidden");toggleVariantInputs();await refresh();
}
async function refresh(){await Promise.all([loadProducts(),loadOrders()])}

async function loadProducts(){
  const {data,error}=await db.from("products").select("*").order("created_at",{ascending:false});if(error)return msg(error.message);
  $("#statProducts").textContent=data.length;
  $("#adminProducts").innerHTML=`<table><thead><tr><th>สินค้า</th><th>ตัวเลือก (สี / ไซส์)</th><th>ราคา</th><th>สต็อก</th><th>จัดการ</th></tr></thead><tbody>${data.map(p=>{
    const opt=p.category==="accessories"?"- (กระเป๋า)":`สี: ${esc(p.colors||"-")} | ไซส์: ${esc(p.sizes||"-")}`;
    return `<tr><td>${esc(p.name)}</td><td><small class="muted">${opt}</small></td><td>${money(p.price)}</td><td>${p.stock}</td><td><button class="text-button" data-edit="${p.id}">แก้ไข</button> · <button class="text-button" data-del="${p.id}">ลบ</button></td></tr>`;
  }).join("")}</tbody></table>`;
  $("#adminProducts").dataset.rows=JSON.stringify(data);
}

function renderOrders(){
  const months=[...new Set(allOrders.map(o=>toLocalParts(o.created_at).monthKey))];
  const filtered=allOrders.filter(o=>{
    const p=toLocalParts(o.created_at);
    if(filterMonth&&p.monthKey!==filterMonth)return false;
    if(filterDate&&p.dateKey!==filterDate)return false;
    return true;
  });
  const filterBar=`
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px;padding:10px 12px;background:#f7f5f0;border-radius:8px">
      <label style="display:flex;align-items:center;gap:6px;margin:0;font-size:13px">เดือน:
        <select id="filterOrderMonth" style="padding:5px 8px;border:1px solid #ddd;border-radius:6px;background:#fff">
          <option value="">ทุกเดือน (${allOrders.length})</option>
          ${months.map(m=>`<option value="${m}" ${filterMonth===m?"selected":""}>${monthLabel(m)}</option>`).join("")}
        </select>
      </label>
      <label style="display:flex;align-items:center;gap:6px;margin:0;font-size:13px">วันที่:
        <input type="date" id="filterOrderDate" value="${filterDate}" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;background:#fff">
      </label>
      ${(filterMonth||filterDate)?`<button type="button" id="clearOrderFilter" class="text-button" style="font-size:13px">ล้างตัวกรอง</button>`:""}
      <span style="margin-left:auto;font-size:13px;color:#666">แสดง <b>${filtered.length}</b> รายการ · ยอดรวม <b>${money(filtered.reduce((s,x)=>s+Number(x.total||0),0))}</b></span>
    </div>`;
  if(!filtered.length){$("#adminOrders").innerHTML=filterBar+`<p class="muted" style="padding:16px 0">ไม่พบคำสั่งซื้อในช่วงเวลาที่เลือก</p>`;return;}
  const groups=[];
  filtered.forEach(o=>{
    const p=toLocalParts(o.created_at);
    let g=groups.find(x=>x.dateKey===p.dateKey);
    if(!g){g={dateKey:p.dateKey,fullDate:p.fullDate,items:[]};groups.push(g);}
    g.items.push({...o,_time:p.time});
  });
  const rowsHtml=groups.map(g=>{
    const dayTotal=g.items.reduce((s,x)=>s+Number(x.total||0),0);
    const headerRow=`<tr style="background:#f2efe9"><td colspan="5" style="padding:10px 12px;font-weight:600;color:#222;border-top:2px solid #e2ddd3">📅 ${g.fullDate} <span style="font-weight:400;font-size:13px;color:#555;margin-left:8px">(${g.items.length} ออเดอร์ · ยอดรวมวัน ${money(dayTotal)})</span></td></tr>`;
    const itemRows=g.items.map(o=>{
      const items=(o.order_items||[]).map(i=>{
        const detail=[i.color?`สี ${esc(i.color)}`:"",i.size?`ไซส์ ${esc(i.size)}`:""].filter(Boolean).join(", ");
        return `${esc(i.product_name)} × ${i.quantity}${detail?` (${detail})`:""}`;
      }).join("<br>");
      return `<tr>
        <td><strong>${esc(String(o.id).slice(0,8).toUpperCase())}</strong><br><span style="font-size:12px;color:#7a6f63">🕒 สั่งเมื่อ ${o._time} น.</span><br>${esc(o.customer_name)}<br><small class="muted">${esc(o.phone||"")}</small></td>
        <td>${items}</td>
        <td>${money(o.total)}</td>
        <td>${o.slip_path?`<button class="btn outline" style="padding:4px 10px" data-slip="${o.id}">ดูสลิป</button>`:"-"}</td>
        <td><select data-status="${o.id}">${STATUSES.map(st=>`<option value="${st}" ${o.status===st?"selected":""}>${st}</option>`).join("")}</select></td>
      </tr>`;
    }).join("");
    return headerRow+itemRows;
  }).join("");
  $("#adminOrders").innerHTML=filterBar+`<table><thead><tr><th>ออเดอร์ / ลูกค้า</th><th>รายการ</th><th>ยอดรวม</th><th>สลิป</th><th>สถานะ</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

async function loadOrders(){
  const {data,error}=await db.from("orders").select("*,order_items(product_name,quantity,size,color,unit_price)").order("created_at",{ascending:false}).limit(500);
  if(error)return msg(error.message);
  allOrders=data||[];
  $("#statOrders").textContent=allOrders.length;
  $("#statPending").textContent=allOrders.filter(x=>x.status==="รอตรวจสอบสลิป").length;
  renderOrders();
}

$("#productForm").onsubmit=async e=>{
  e.preventDefault();
  const id=$("#editId").value,cat=$("#pCategory").value;
  const row={
    name:$("#pName").value.trim(),
    price:Number($("#pPrice").value),
    category:cat,
    stock:Number($("#pStock").value||0),
    image_url:$("#pImage").value.trim(),
    colors:cat==="accessories"?"":$("#pColors").value.trim(),
    sizes:cat==="accessories"?"":$("#pSizes").value.trim()
  };
  const {error}=id?await db.from("products").update(row).eq("id",Number(id)):await db.from("products").insert(row);
  if(error)return msg(error.message);
  $("#productForm").reset();$("#editId").value="";toggleVariantInputs();msg(id?"แก้ไขสินค้าแล้ว":"เพิ่มสินค้าแล้ว");await loadProducts();
};

$("#adminProducts").onclick=async e=>{
  const rows=JSON.parse($("#adminProducts").dataset.rows||"[]"),edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-del]");
  if(edit){
    const p=rows.find(x=>x.id===Number(edit.dataset.edit));
    $("#editId").value=p.id;$("#pName").value=p.name;$("#pPrice").value=p.price;$("#pCategory").value=p.category;$("#pStock").value=p.stock;$("#pImage").value=p.image_url;
    $("#pColors").value=p.colors||"";$("#pSizes").value=p.sizes||"";toggleVariantInputs();
  }
  if(del&&confirm("ยืนยันลบสินค้านี้?")){const {error}=await db.from("products").delete().eq("id",Number(del.dataset.del));if(error)msg(error.message);else{msg("ลบสินค้าแล้ว");await loadProducts();}}
};

$("#cancelEdit").onclick=()=>{$("#productForm").reset();$("#editId").value="";toggleVariantInputs()};

$("#adminOrders").onchange=async e=>{
  if(e.target.id==="filterOrderMonth"){filterMonth=e.target.value;filterDate="";renderOrders();return;}
  if(e.target.id==="filterOrderDate"){filterDate=e.target.value;if(filterDate)filterMonth=filterDate.slice(0,7);renderOrders();return;}
  const s=e.target.closest("[data-status]");if(!s)return;
  const {error}=await db.from("orders").update({status:s.value}).eq("id",s.dataset.status);
  if(error)msg(error.message);else{msg("อัปเดตสถานะแล้ว");await loadOrders();}
};

$("#adminOrders").onclick=async e=>{
  if(e.target.id==="clearOrderFilter"){filterMonth="";filterDate="";renderOrders();return;}
  const b=e.target.closest("[data-slip]");if(!b)return;
  const {data:order,error}=await db.from("orders").select("slip_path").eq("id",b.dataset.slip).single();
  if(error||!order?.slip_path)return msg("ไม่พบไฟล์สลิป");
  const {data:signed,error:sErr}=await db.storage.from("payment-slips").createSignedUrl(order.slip_path,300);
  if(sErr||!signed?.signedUrl)return msg("เปิดสลิปไม่สำเร็จ");
  window.open(signed.signedUrl,"_blank");
};

$("#reloadAdmin").onclick=refresh;$("#adminLogout").onclick=async()=>{await db.auth.signOut();location.href="index.html"};
start();
})();

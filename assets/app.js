"use strict";
const BACKEND=window.BACKEND===true;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const demo={members:[{id:1,student_id:'414400001',name:'王同學',email:'a@gmail.com',class_name:'資管一甲',status:'啟用',role:'member'},{id:2,student_id:'414400002',name:'林同學',email:'b@gmail.com',class_name:'資管一甲',status:'啟用',role:'member'},{id:3,student_id:'414400003',name:'陳同學',email:'c@gmail.com',class_name:'資管二乙',status:'停用',role:'member'}],news:[{id:1,title:'系學會迎新活動',body:'歡迎大家參加系學會迎新活動。',published_at:'2026-11-10'}],events:[{id:1,title:'系學會交流茶會',event_date:'2026-12-10',capacity:30,description:'歡迎報名參加'}],registrations:[],nextId:10};
let state=BACKEND?null:JSON.parse(localStorage.getItem('mis_demo_v2')||'null')||demo;
// Update the original demo records already saved in this browser.
if(!BACKEND){
  const replacements=[
    {oldId:'11300101',oldName:'王小明',student_id:'414400001',name:'王同學',email:'a@gmail.com'},
    {oldId:'11300102',oldName:'林佳妤',student_id:'414400002',name:'林同學',email:'b@gmail.com'},
    {oldId:'11200103',oldName:'陳柏豪',student_id:'414400003',name:'陳同學',email:'c@gmail.com'}
  ];
  let updated=false;
  for(const replacement of replacements){
    for(const record of [...state.members,...state.registrations]){
      if(String(record.student_id)===replacement.oldId){
        Object.assign(record,{student_id:replacement.student_id,name:replacement.name,email:replacement.email});
        updated=true;
      }
    }
  }
  if(updated)localStorage.setItem('mis_demo_v2',JSON.stringify(state));
}
let current='members',searchTerm='',eventSearchTerm='',statusFilter='全部',me={role:'admin',name:'管理者'};
let registrationQuery=null,selectedDetail=null;
const save=()=>{if(!BACKEND)localStorage.setItem('mis_demo_v2',JSON.stringify(state))};
const endpoint=async(action,payload={})=>{if(!BACKEND)return localAction(action,payload);const res=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action,...payload})});const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'操作失敗');return data.data};
function localAction(a,p){const key=p.type||'members';if(a==='bootstrap')return {...state,me};if(a==='login'){me={name:p.username,role:p.username==='member'?'member':'admin'};return me}if(a==='logout'){me={name:'管理者',role:'admin'};return me}if(a==='list')return state;if(a==='save'){const item={...p.item};if(item.id){const i=state[key].findIndex(x=>x.id==item.id);if(i<0)throw Error('資料不存在');state[key][i]={...state[key][i],...item}}else{item.id=state.nextId++;state[key].push(item)}save();return item}if(a==='delete'){state[key]=state[key].filter(x=>x.id!=p.id);if(key==='events')state.registrations=state.registrations.filter(x=>x.event_id!=p.id);save();return true}if(a==='register'){if(state.registrations.some(x=>x.event_id==p.event_id&&x.student_id===p.student_id))throw Error('此學號已報名');let e=state.events.find(x=>x.id==p.event_id);if(!e)throw Error('活動不存在');if(publicationStatus(e)!=='上架中')throw Error('此活動尚未上架或已下架，無法報名');if(registrationStatus(e)!=='開放報名中')throw Error(registrationStatus(e));if(state.registrations.filter(x=>x.event_id==p.event_id).length>=e.capacity)throw Error('活動已額滿');state.registrations.push({id:state.nextId++,event_id:p.event_id,student_id:p.student_id,name:p.name,email:p.email});save();return true}if(a==='removeRegistration'){if(!admin())throw Error('僅管理者可以刪除報名成員');const registration=state.registrations.find(r=>r.id===p.id);if(!registration)throw Error('報名資料不存在');state.registrations=state.registrations.filter(r=>r.id!==p.id);save();return true}if(a==='cancelRegistration'){const registration=state.registrations.find(r=>r.event_id==p.event_id&&r.student_id===String(p.student_id).trim()&&String(r.email).trim().toLowerCase()===String(p.email).trim().toLowerCase());if(!registration)throw Error('查無符合的報名資料，請確認學號與 Email');if(!confirm(`確定取消 ${registration.name} 的活動報名？`))return false;state.registrations=state.registrations.filter(r=>r.id!==registration.id);save();return true}if(a==='import'){if(!admin())throw Error('僅管理者可以匯入會員');let imported=0,skipped=0;for(const item of p.items){if(state.members.some(x=>String(x.student_id)===item.student_id)){skipped++;continue}state.members.push({...item,id:state.nextId++,status:'啟用',role:'member'});imported++}save();return {imported,skipped}}throw Error('未知操作')}
const admin=()=>me.role==='admin';
const btn=(label,fn,cls='alt')=>`<button class="btn ${cls}" data-act="${fn}">${label}</button>`;
function render(){if((!admin()&&['members','roles'].includes(current))||(admin()&&current==='myRegistrations'))current='news';document.querySelectorAll('.tab').forEach(x=>{const restricted=(!admin()&&['members','roles'].includes(x.dataset.tab))||(admin()&&x.dataset.tab==='myRegistrations');x.classList.toggle('hidden',restricted);x.hidden=restricted;x.classList.toggle('active',x.dataset.tab===current);x.setAttribute('aria-selected',x.dataset.tab===current)});$('#account').innerHTML=`${esc(me.name)}（${admin()?'管理者':'一般會員'}） ${btn('切換帳號','account')}`;const d=window.dataset||state;const welcome=$('#memberWelcome');welcome.hidden=false;welcome.innerHTML=memberWelcome(d);let body='';if(current==='members')body=membersPage(d);if(current==='news')body=newsPage(d);if(current==='events')body=eventsPage(d);if(current==='roles')body=rolesPage(d);if(current==='myRegistrations')body=myRegistrationsPage(d);$('#content').innerHTML=body;if(['news','events'].includes(current))publicationSignature=d[current].map(x=>`${x.id}:${publicationStatus(x)}:${current==='events'?registrationStatus(x):''}`).join('|');bindActions()}
function memberWelcome(d){
  const news=d.news.filter(x=>publicationStatus(x)==='上架中').length;
  const events=d.events.filter(x=>publicationStatus(x)==='上架中'&&registrationStatus(x)==='開放報名中').length;
  return `<div class="welcome-copy"><small>FJU IM Student Association</small><h2>歡迎來到資管系學會</h2><p>掌握系上最新消息、參與活動，與我們一起創造校園回憶。</p></div><div class="welcome-stats"><div><strong>${news}</strong><span>最新公告</span></div><div><strong>${events}</strong><span>開放報名活動</span></div></div>`;
}
function matchingRegistrations(d,query){
  if(!query)return [];
  return d.registrations.filter(r=>String(r.student_id).trim()===query.student_id&&String(r.email).trim().toLowerCase()===query.email);
}
function myRegistrationsPage(d){
  const records=matchingRegistrations(d,registrationQuery);
  return `<div class="head"><div><h2>我的報名</h2><div class="muted">輸入報名時的學號與 Email，查詢已報名的活動。</div></div></div><form id="registrationLookup" class="registration-lookup"><div class="field"><label for="lookupStudent">學號</label><input id="lookupStudent" name="student_id" required value="${esc(registrationQuery?.student_id||'')}" autocomplete="off"></div><div class="field"><label for="lookupEmail">Email</label><input id="lookupEmail" name="email" type="email" required value="${esc(registrationQuery?.email||'')}" autocomplete="off"></div><button class="btn" type="submit">查詢報名</button>${registrationQuery?btn('清除查詢','clearLookup'):''}</form><div class="lookup-results" role="status">${!registrationQuery?'<div class="empty">輸入資料後，即可查看活動日期、報名期間與取消報名。</div>':!records.length?'<div class="empty">查無符合的報名資料，請確認學號與 Email。</div>':`<p class="muted">共 ${records.length} 筆報名</p><div class="cards news-list">${records.map(r=>{const event=d.events.find(x=>x.id===r.event_id);return `<article class="card"><span class="pill">已報名</span><h3>${esc(event?.title||'活動資料已移除')}</h3><p>活動日期：${esc(event?.event_date||'未提供')}</p><p>報名姓名：${esc(r.name)}</p>${event?registrationInfo(event):''}${btn('取消報名','cancelMine:'+r.id,'danger')}</article>`}).join('')}</div>`}</div>`;
}
function membersPage(d){const list=d.members.filter(x=>([x.name,x.student_id,x.email].join(' ').toLowerCase().includes(searchTerm.toLowerCase()))&&(statusFilter==='全部'||x.status===statusFilter));return `<div class="head"><div><h2>會員管理</h2><div class="muted">新增、修改、刪除會員</div></div><div class="actions">${admin()?btn('＋ 新增會員','addMember','')+btn('↑ 批次匯入','import'):''}${btn('↓ 匯出名單','exportMembers')}</div></div><div class="filters"><input id="search" placeholder="搜尋學號 / 姓名 / Email" value="${esc(searchTerm)}"><select id="filter"><option>全部</option><option ${statusFilter==='啟用'?'selected':''}>啟用</option><option ${statusFilter==='停用'?'selected':''}>停用</option></select></div><div class="tablewrap"><table class="members-table"><colgroup><col class="member-id"><col class="member-name"><col class="member-email"><col class="member-class"><col class="member-status"><col class="member-actions"></colgroup><thead><tr><th>學號</th><th>姓名</th><th>Email</th><th>系級</th><th>狀態</th><th>操作</th></tr></thead><tbody>${list.map(x=>`<tr><td>${esc(x.student_id)}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.class_name)}</td><td><span class="pill ${x.status==='停用'?'off':''}">${esc(x.status)}</span></td><td>${admin()?btn('編輯','editMember:'+x.id)+btn('刪除','delMember:'+x.id,'danger'):'—'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">查無會員資料</td></tr>'}</tbody></table></div>`}
function registrationStatus(item,now=Date.now()){
  if(item.registration_start&&now<new Date(item.registration_start).getTime())return '尚未開放報名';
  if(item.registration_end&&now>=new Date(item.registration_end).getTime())return '報名已截止';
  return '開放報名中';
}
function validateRegistration(item){
  validatePublication(item);
  for(const key of ['registration_start','registration_end'])if(item[key]&&!Number.isFinite(new Date(item[key]).getTime()))throw Error('請輸入有效的報名時間');
  if(item.registration_start&&item.registration_end&&new Date(item.registration_end)<=new Date(item.registration_start))throw Error('報名截止時間必須晚於報名開始時間');
  return item;
}
function registrationInfo(item){return `<div class="registration-period"><strong>報名期間</strong><div>${esc(item.registration_start?item.registration_start.replace('T',' '):'即日起')} ～ ${esc(item.registration_end?item.registration_end.replace('T',' '):'不限截止時間')}</div><span class="pill ${registrationStatus(item)==='開放報名中'?'':'off'}">${registrationStatus(item)}</span></div>`}
function publicationStatus(item,now=Date.now()){
  if(item.publish_at&&now<new Date(item.publish_at).getTime())return '未上架';
  if(item.unpublish_at&&now>=new Date(item.unpublish_at).getTime())return '已下架';
  return '上架中';
}
function validatePublication(item){
  for(const key of ['publish_at','unpublish_at'])if(item[key]&&!Number.isFinite(new Date(item[key]).getTime()))throw Error('請輸入有效的上架與下架時間');
  if(item.publish_at&&item.unpublish_at&&new Date(item.unpublish_at)<=new Date(item.publish_at))throw Error('下架時間必須晚於上架時間');
  return item;
}
function publicationInfo(item){return admin()?`<div class="publication-info"><span class="pill ${publicationStatus(item)==='上架中'?'':'off'}">${publicationStatus(item)}</span><small class="muted">上架：${esc(item.publish_at?item.publish_at.replace('T',' '):'立即上架')} ／ 下架：${esc(item.unpublish_at?item.unpublish_at.replace('T',' '):'不自動下架')}</small></div>`:''}
function refreshPublication(){
  if(!['news','events'].includes(current)||!window.dataset)return;
  const items=window.dataset[current];
  const signature=items.map(x=>`${x.id}:${publicationStatus(x)}:${current==='events'?registrationStatus(x):''}`).join('|');
  if(signature!==publicationSignature)render();
}
let publicationSignature='';
function contentPreview(text){const chars=Array.from(String(text||'').replace(/\s+/g,' ').trim());return esc(chars.slice(0,90).join('')+(chars.length>90?'…':''))}
function detailHeader(title){return `<div class="head"><h2>${esc(title)}</h2>${btn('返回列表','backToList')}</div>`}
function newsPage(d){
  const news=d.news.filter(x=>admin()||publicationStatus(x)==='上架中');
  if(selectedDetail?.type==='news'){
    const x=news.find(x=>x.id===selectedDetail.id);
    if(x)return `${detailHeader('消息內容')}<article class="content-detail"><small class="muted">${esc(x.published_at)}</small><h3>${esc(x.title)}</h3><div class="full-content">${esc(x.body)}</div>${publicationInfo(x)}<div class="actions">${admin()?btn('修改','editNews:'+x.id)+btn('刪除','delNews:'+x.id,'danger'):''}</div></article>`;
    selectedDetail=null;
  }
  return `<div class="head"><div><h2>最新消息</h2><div class="muted">學會公告發布與管理</div></div>${admin()?btn('＋ 發布消息','addNews',''):''}</div><div class="cards news-list">${news.map(x=>`<article class="card summary-card"><small class="muted">${esc(x.published_at)}</small><h3>${esc(x.title)}</h3><p>${contentPreview(x.body)}</p><div class="actions">${btn('繼續閱讀','readNews:'+x.id)}</div></article>`).join('')||'<p class="empty">目前沒有公告</p>'}</div>`;
}
function eventsPage(d){
  const visible=d.events.filter(x=>admin()||publicationStatus(x)==='上架中');
  if(selectedDetail?.type==='events'){
    const x=visible.find(x=>x.id===selectedDetail.id);
    if(x)return detailHeader('活動詳情')+eventDetail(d,x);
    selectedDetail=null;
  }
  const keyword=eventSearchTerm.trim().toLowerCase();
  const events=visible.filter(x=>[x.title,x.description].join(' ').toLowerCase().includes(keyword));
  return `<div class="head"><div><h2>活動報名</h2><div class="muted">點開活動，查看完整介紹與報名資訊</div></div>${admin()?btn('＋ 新增活動','addEvent',''):''}</div><div class="filters"><input id="eventSearch" type="search" aria-label="搜尋活動名稱或說明" placeholder="搜尋活動名稱 / 活動說明" value="${esc(eventSearchTerm)}"></div><div class="cards news-list">${events.map(x=>`<article class="card summary-card"><small class="muted">活動日期：${esc(x.event_date)}</small><h3>${esc(x.title)}</h3><p>${contentPreview(x.description)}</p><span class="pill ${registrationStatus(x)==='開放報名中'?'':'off'}">${registrationStatus(x)}</span><div class="actions">${btn('查看活動','readEvent:'+x.id)}</div></article>`).join('')||(keyword?'<p class="empty">查無符合關鍵字的活動</p>':'<p class="empty">目前沒有活動</p>')}</div>`;
}
function eventDetail(d,x){const registrations=d.registrations.filter(r=>r.event_id==x.id);return `<article class="card"><small class="muted">${esc(x.event_date)}</small><h3>${esc(x.title)}</h3><div class="full-content">${esc(x.description)}</div>${publicationInfo(x)}${registrationInfo(x)}<p>已報名 ${registrations.length} / ${esc(x.capacity)} 人</p><div class="actions">${publicationStatus(x)==='上架中'&&registrationStatus(x)==='開放報名中'?btn('報名活動','register:'+x.id,''):''}${admin()?btn('下載名單','exportEvent:'+x.id)+btn('修改','editEvent:'+x.id)+btn('刪除','delEvent:'+x.id,'danger'):btn('取消報名','cancelRegistration:'+x.id,'danger')}</div>${admin()?`<details class="registration-list"><summary>報名成員（${registrations.length}）</summary>${registrations.length?`<ul>${registrations.map(r=>`<li><div><strong>${esc(r.name)}</strong><small>${esc(r.student_id)}</small><small>${esc(r.email)}</small></div>${btn('刪除成員','removeRegistration:'+r.id,'danger')}</li>`).join('')}</ul>`:'<p class="muted">目前尚無報名成員</p>'}</details>`:''}</article>`}


function rolesPage(d){return `<div class="head"><div><h2>權限管理</h2><div class="muted">設定帳號的使用權限</div></div></div><div class="notice">管理者可以管理會員、公告、活動及權限；一般會員僅可查看資料與報名活動。${BACKEND?'帳號登入權限由後端驗證。':''}</div><div class="tablewrap"><table class="roles-table"><colgroup><col class="role-id"><col class="role-name"><col class="role-label"><col class="role-actions"></colgroup><thead><tr><th>學號</th><th>姓名</th><th>角色</th><th>操作</th></tr></thead><tbody>${d.members.map(x=>`<tr><td><div class="role-cell">${esc(x.student_id)}</div></td><td><div class="role-cell">${esc(x.name)}</div></td><td><div class="role-cell">${esc(x.role==='admin'?'管理者':'一般會員')}</div></td><td><div class="role-cell">${admin()?`<select data-role="${x.id}"><option value="member" ${x.role!=='admin'?'selected':''}>一般會員</option><option value="admin" ${x.role==='admin'?'selected':''}>管理者</option></select>`:'—'}</div></td></tr>`).join('')}</tbody></table></div>`}
function fieldsHtml(fields,item={}){return fields.map(f=>`<div class="field ${f.wide?'wide':''}"><label for="f_${f.key}">${esc(f.label)}</label>${f.type==='select'?`<select id="f_${f.key}" name="${f.key}">${f.options.map(o=>`<option ${item[f.key]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`:f.type==='textarea'?`<textarea id="f_${f.key}" name="${f.key}" required>${esc(item[f.key]||'')}</textarea>`:`<input id="f_${f.key}" name="${f.key}" type="${f.type||'text'}" value="${esc(item[f.key]??'')}" ${f.required===false?'':'required'}>`}</div>`).join('')}
const memberFields=[{key:'student_id',label:'學號'},{key:'name',label:'姓名'},{key:'email',label:'Email',type:'email'},{key:'class_name',label:'系級'},{key:'status',label:'狀態',type:'select',options:['啟用','停用']}];
const publicationFields=[{key:'publish_at',label:'上架時間（留空立即上架）',type:'datetime-local',required:false},{key:'unpublish_at',label:'下架時間（留空不自動下架）',type:'datetime-local',required:false}];
const newsFields=[{key:'title',label:'公告標題',wide:true},{key:'published_at',label:'發布日期',type:'date'},{key:'body',label:'公告內容',type:'textarea',wide:true},...publicationFields];
const eventFields=[{key:'title',label:'活動名稱',wide:true},{key:'event_date',label:'活動日期',type:'date'},{key:'capacity',label:'人數上限',type:'number'},{key:'description',label:'活動說明',type:'textarea',wide:true},{key:'registration_start',label:'報名開始時間（留空即日起）',type:'datetime-local',required:false},{key:'registration_end',label:'報名截止時間（留空不限）',type:'datetime-local',required:false},...publicationFields];
function showModal(title,fields,item,submit,submitLabel='儲存'){$('#modalForm button[type="submit"]').textContent=submitLabel;$('#modalTitle').textContent=title;$('#modalFields').innerHTML=fieldsHtml(fields,item);$('#modalForm').onsubmit=async e=>{e.preventDefault();let obj=Object.fromEntries(new FormData(e.target));if(item.id)obj.id=item.id;try{const result=await submit(obj);if(result===false)return;$('#modal').close();await refresh()}catch(err){alert(err.message)}};$('#modal').showModal()}
async function refresh(){window.dataset=await endpoint('list');render()}
function downloadCsv(filename,rows){if(!rows.length){alert('目前沒有資料');return}const keys=Object.keys(rows[0]);const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv='\ufeff'+[keys.map(quote).join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function parseMemberCsv(text){
const rows=[];let row=[],cell='',quoted=false,closed=false;
text=text.replace(/^\ufeff/,'');
for(let i=0;i<text.length;i++){
 const c=text[i];
 if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=c;continue}
 if(c==='"'){if(cell||closed)throw Error('CSV 引號格式不正確');quoted=true;continue}
 if(c===','||c==='\n'||c==='\r'){row.push(cell.trim());cell='';closed=false;if(c!==','){rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++}continue}
 if(closed&&!/\s/.test(c))throw Error('CSV 引號後有多餘文字');
 cell+=c;
}
if(quoted)throw Error('CSV 引號未關閉');
row.push(cell.trim());rows.push(row);
const nonempty=rows.map((cells,index)=>({cells,line:index+1})).filter(x=>x.cells.some(Boolean));
if(!nonempty.length)throw Error('CSV 檔案是空的');
const aliases={'學號':'student_id','姓名':'name','Email':'email','郵件':'email','系級':'class_name'};
const head=nonempty.shift().cells.map(k=>aliases[k]||k);
const required=['student_id','name','email','class_name'];
if(!required.every(k=>head.includes(k)))throw Error('CSV 需包含：學號、姓名、Email、系級（或 student_id,name,email,class_name）');
if(new Set(head).size!==head.length)throw Error('CSV 欄位名稱不可重複');
if(!nonempty.length)throw Error('CSV 沒有可匯入的會員資料');
return nonempty.map(({cells,line})=>{
 if(cells.length!==head.length)throw Error(`第 ${line} 筆 CSV 列的欄位數量不正確`);
 const item=Object.fromEntries(required.map(k=>[k,cells[head.indexOf(k)]]));
 if(required.some(k=>!item[k]))throw Error(`第 ${line} 筆 CSV 列有必填欄位空白`);
 if(!/^\d+$/.test(item.student_id))throw Error(`第 ${line} 筆 CSV 列的學號須為數字`);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email))throw Error(`第 ${line} 筆 CSV 列的 Email 格式不正確`);
 return item;
});
}
async function importCsv(){
if(!admin())throw Error('僅管理者可以匯入會員');
const inp=document.createElement('input');inp.type='file';inp.accept='.csv,text/csv';
inp.onchange=async()=>{const file=inp.files[0];if(!file)return;try{
 const items=parseMemberCsv(await file.text());
 if(!confirm(`準備匯入 ${items.length} 筆會員資料，重複學號將略過。是否繼續？`))return;
 const result=await endpoint('import',{items});searchTerm='';statusFilter='全部';await refresh();
 alert(`匯入完成：新增 ${result.imported} 筆，重複學號略過 ${result.skipped} 筆。`);
}catch(e){alert(e.message)}};inp.click();
}

function bindActions(){const lookup=$('#registrationLookup');if(lookup)lookup.onsubmit=e=>{e.preventDefault();const data=new FormData(e.target);registrationQuery={student_id:String(data.get('student_id')).trim(),email:String(data.get('email')).trim().toLowerCase()};render()};const eventSearch=$('#eventSearch');if(eventSearch){const searchEvents=e=>{if(e.isComposing)return;const input=e.target;eventSearchTerm=input.value;const start=input.selectionStart,end=input.selectionEnd;render();const next=$('#eventSearch');next.focus();next.setSelectionRange(start,end)};eventSearch.addEventListener('input',searchEvents);eventSearch.addEventListener('compositionend',searchEvents)};document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>handle(b.dataset.act));$('#search')?.addEventListener('input',e=>{searchTerm=e.target.value;render();const el=$('#search');el.focus();el.setSelectionRange(el.value.length,el.value.length)});$('#filter')?.addEventListener('change',e=>{statusFilter=e.target.value;render()});document.querySelectorAll('[data-role]').forEach(s=>s.onchange=async()=>{try{const item=window.dataset.members.find(x=>x.id==s.dataset.role);await endpoint('save',{type:'members',item:{...item,role:s.value}});await refresh()}catch(e){alert(e.message);await refresh()}})}
async function handle(act){const [name,idstr]=act.split(':'),id=Number(idstr),d=window.dataset;try{if(name==='readNews'||name==='readEvent'){selectedDetail={type:name==='readNews'?'news':'events',id};render();return}if(name==='backToList'){selectedDetail=null;render();return}if(name==='view'){selectedDetail=null;current=idstr;render();return}if(name==='clearLookup'){registrationQuery=null;render();return}if(name==='cancelMine'){const registration=matchingRegistrations(d,registrationQuery).find(r=>r.id===id);if(!registration)throw Error('請重新查詢報名資料');await endpoint('cancelRegistration',{event_id:registration.event_id,...registrationQuery});await refresh();return}if(name==='account'){registrationQuery=null;selectedDetail=null;if(BACKEND){if(confirm('登出目前帳號？')){await endpoint('logout');location.reload()}}else{me=me.role==='admin'?{name:'會員',role:'member'}:{name:'管理者',role:'admin'};render()}return}if(name==='addMember'||name==='editMember'){const item=d.members.find(x=>x.id===id)||{status:'啟用',role:'member'};showModal(name==='addMember'?'新增會員':'編輯會員',memberFields,item,o=>endpoint('save',{type:'members',item:{...item,...o}}));return}if(name==='addNews'||name==='editNews'){const item=d.news.find(x=>x.id===id)||{published_at:new Date().toISOString().slice(0,10)};showModal(name==='addNews'?'發布消息':'修改消息',newsFields,item,o=>endpoint('save',{type:'news',item:validatePublication({...item,...o})}));return}if(name==='addEvent'||name==='editEvent'){const item=d.events.find(x=>x.id===id)||{capacity:30};showModal(name==='addEvent'?'新增活動':'修改活動',eventFields,item,o=>endpoint('save',{type:'events',item:validateRegistration({...item,...o,capacity:Number(o.capacity)})}));return}if(name.startsWith('del')){const type={delMember:'members',delNews:'news',delEvent:'events'}[name];if(confirm('確定刪除這筆資料？此操作無法復原。')){await endpoint('delete',{type,id});await refresh()}return}if(name==='removeRegistration'){if(!admin())throw Error('僅管理者可以刪除報名成員');const registration=d.registrations.find(r=>r.id===id);if(!registration)throw Error('報名資料不存在');if(confirm(`確定刪除 ${registration.name}（${registration.student_id}）的報名？`)){await endpoint('removeRegistration',{id});await refresh()}return}if(name==='cancelRegistration'){showModal('取消活動報名',[{key:'student_id',label:'報名時的學號'},{key:'email',label:'報名時的 Email',type:'email'}],{},o=>endpoint('cancelRegistration',{event_id:id,...o}),'取消報名');return}if(name==='register'){showModal('活動報名',[{key:'student_id',label:'學號'},{key:'name',label:'姓名'},{key:'email',label:'Email',type:'email'}],{},o=>endpoint('register',{event_id:id,...o}));return}if(name==='exportMembers'){downloadCsv('會員名單.csv',d.members);return}if(name==='exportEvent'){downloadCsv('活動報名名單.csv',d.registrations.filter(x=>x.event_id===id));return}if(name==='import'){await importCsv();return}}catch(e){alert(e.message)}}
$('#cancelModal').onclick=()=>$('#modal').close();document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{current=b.dataset.tab;selectedDetail=null;searchTerm='';render()});
async function start(){try{if(BACKEND){const r=await endpoint('bootstrap');if(!r.authenticated){showLogin();return}me=r.me;window.dataset=r.data}else window.dataset=state;render()}catch(e){$('#content').innerHTML=`<div class="notice">${esc(e.message)}。請確認伺服器與資料庫設定。</div>`}}
function showLogin(){$('#tabs').classList.add('hidden');$('#account').textContent='請先登入';$('#content').innerHTML=`<div class="head"><h2>管理系統登入</h2></div><form id="loginForm" class="formgrid" style="max-width:550px"><div class="field wide"><label>帳號</label><input name="username" autocomplete="username" required></div><div class="field wide"><label>密碼</label><input name="password" type="password" autocomplete="current-password" required></div><button class="btn" type="submit">登入</button></form><p class="muted">首次使用請先依 README 設定資料庫及管理者帳號。</p>`;$('#loginForm').onsubmit=async e=>{e.preventDefault();try{await endpoint('login',Object.fromEntries(new FormData(e.target)));location.reload()}catch(err){alert(err.message)}}}
setInterval(refreshPublication,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPublication()});
start();

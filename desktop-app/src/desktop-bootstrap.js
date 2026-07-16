
import "./desktop-ui.css";
import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY = "shj_infinite_tile_demo_v018_v031";
const isTauri = Boolean(window.__TAURI_INTERNALS__);
let bootInfo = null;
let savePending = null;
let saveBusy = false;
let saveTimer = null;

function seedSnapshot(){
  const initial=window.SHJ_INITIAL_DATA||{metadata:{},objects:[]};
  return {
    objects:initial.objects||[],changes:[],changeArchives:[],appliedRemotePatches:[],remotePatchHistory:[],viewedRemotePatches:[],
    dataVersion:initial.metadata?.dataVersion||"v075-r0001",camera:{x:0,y:0,zoom:.92},selectedId:initial.objects?.[0]?.id||null,
    selectedCell:null,tileProfiles:{},trash:[],trashRetentionDays:0,nextIdCounter:0,dossierMode:"brief",brushKeys:[],brushStrokes:[],viewPreset:"all",compareKeys:[]
  };
}
function toast(message,error=false){
  const n=document.createElement("div");n.className=`desktop-toast${error?" error":""}`;n.textContent=message;document.body.appendChild(n);setTimeout(()=>n.remove(),3200)
}
async function pumpSave(){
  if(saveBusy||!savePending||!isTauri)return;
  saveBusy=true;const payload=savePending;savePending=null;
  try{await invoke("save_workspace",{payload})}catch(err){console.error(err);toast(`桌面数据库保存失败：${err}`,true)}finally{saveBusy=false;if(savePending)pumpSave()}
}
function queueSave(payload){
  savePending=payload;clearTimeout(saveTimer);saveTimer=setTimeout(pumpSave,80)
}
function formatTime(value){try{return new Intl.DateTimeFormat("zh-CN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}catch{return value||""}}
function escapeHtml(v){return String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

async function refreshBackupModal(){
  const status=await invoke("storage_status");
  const backups=await invoke("list_backups",{limit:80});
  document.querySelector("#desktopDbObjects").textContent=String(status.objectCount||0);
  document.querySelector("#desktopDbBackups").textContent=String(backups.length);
  document.querySelector("#desktopDbUpdated").textContent=status.updatedAt?formatTime(status.updatedAt):"尚未保存";
  document.querySelector("#desktopDbPath").textContent=status.databasePath||"";
  const host=document.querySelector("#desktopBackupList");
  host.innerHTML=backups.length?backups.map(b=>`<div class="desktop-backup-row"><div><h3>${escapeHtml(b.label||"备份")}</h3><p>${escapeHtml(formatTime(b.createdAt))} · ${b.objectCount||0}个对象 · ${escapeHtml(b.kind||"")}</p></div><button data-restore-backup="${b.backupId}">恢复</button></div>`).join(""):`<div class="desktop-empty">尚无备份。首次保存后会自动建立备份。</div>`;
}
function setupNativeUi(){
  document.documentElement.classList.add("desktop-shell");
  const actions=document.querySelector(".top-actions");
  if(!actions)return;
  const button=document.createElement("button");button.id="desktopBackupBtn";button.className="btn secondary desktop-native-btn";button.textContent="桌面备份";actions.prepend(button);
  const modal=document.createElement("section");modal.id="desktopBackupModal";modal.className="desktop-native-modal hidden";modal.innerHTML=`<div class="desktop-native-backdrop" data-desktop-close></div><article class="desktop-native-card"><header class="desktop-native-head"><div><span class="eyebrow">NATIVE STORAGE</span><h2>桌面数据库与备份</h2><p>SQLite为主存储，兼容缓存只用于界面快速启动。</p></div><button class="desktop-native-close" data-desktop-close>×</button></header><div class="desktop-native-status"><div class="desktop-native-kpi"><strong id="desktopDbObjects">—</strong><span>当前对象</span></div><div class="desktop-native-kpi"><strong id="desktopDbBackups">—</strong><span>可恢复备份</span></div><div class="desktop-native-kpi"><strong id="desktopDbUpdated">—</strong><span>最近写入</span></div></div><div class="desktop-native-actions"><button class="primary" id="desktopCreateBackup">立即备份</button><button id="desktopCheckDb">检查数据库</button><button id="desktopOpenDataDir">打开数据目录</button><button id="desktopRefreshBackups">刷新</button></div><div class="desktop-backup-list" id="desktopBackupList"></div><footer class="desktop-native-foot" id="desktopDbPath"></footer></article>`;document.body.appendChild(modal);
  const open=async()=>{modal.classList.remove("hidden");try{await refreshBackupModal()}catch(e){toast(`无法读取备份：${e}`,true)}};
  button.addEventListener("click",open);modal.addEventListener("click",async e=>{
    if(e.target.closest("[data-desktop-close]")){modal.classList.add("hidden");return}
    const restore=e.target.closest("[data-restore-backup]");if(restore){const id=Number(restore.dataset.restoreBackup);if(!confirm("恢复该备份会覆盖当前工作区。程序会先自动保存一份恢复前备份。继续吗？"))return;try{const result=await invoke("restore_backup",{backupId:id});localStorage.setItem(STORAGE_KEY,result.payload);location.reload()}catch(err){toast(`恢复失败：${err}`,true)}}
  });
  document.querySelector("#desktopCreateBackup").addEventListener("click",async()=>{try{await pumpSave();await invoke("create_backup",{label:"手动备份"});toast("已创建桌面备份");await refreshBackupModal()}catch(e){toast(`备份失败：${e}`,true)}});
  document.querySelector("#desktopCheckDb").addEventListener("click",async()=>{try{const result=await invoke("check_database");toast(result.ok?`数据库检查通过：${result.message}`:`数据库异常：${result.message}`,!result.ok)}catch(e){toast(`检查失败：${e}`,true)}});
  document.querySelector("#desktopOpenDataDir").addEventListener("click",async()=>{try{await invoke("open_data_directory")}catch(e){toast(`无法打开目录：${e}`,true)}});
  document.querySelector("#desktopRefreshBackups").addEventListener("click",refreshBackupModal);
  const saveState=document.querySelector("#saveState");if(saveState)saveState.textContent=isTauri?"桌面数据库":"浏览器预览";
}

async function start(){
  if(isTauri){
    const legacy=localStorage.getItem(STORAGE_KEY);
    bootInfo=await invoke("bootstrap_workspace",{legacySnapshot:legacy,seedSnapshot:JSON.stringify(seedSnapshot())});
    if(bootInfo.snapshot)localStorage.setItem(STORAGE_KEY,bootInfo.snapshot);
  }
  window.SHJ_DESKTOP={active:isTauri,saveWorkspace:queueSave,flush:pumpSave,bootInfo};
  await new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="/app/app.js";script.onload=resolve;script.onerror=()=>reject(new Error("无法加载地图主程序"));document.body.appendChild(script)});
  setupNativeUi();
  if(!isTauri)toast("当前为浏览器预览模式；SQLite与原生备份未启用。",true);
  window.addEventListener("beforeunload",()=>{if(savePending&&isTauri)navigator.sendBeacon?.("about:blank")},{capture:true});
}
start().catch(err=>{console.error(err);document.body.innerHTML=`<main class="desktop-boot-error"><article><h1>桌面版启动失败</h1><p>程序未能初始化本地数据库。</p><pre>${escapeHtml(err?.stack||err)}</pre></article></main>`});

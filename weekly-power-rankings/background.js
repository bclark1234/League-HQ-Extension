chrome.action.onClicked.addListener(tab=>chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html')+(tab?.id!=null?'?sourceTab='+tab.id:'')}));
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
 if(message?.type==='IFL_RANK_RESULT'){chrome.runtime.sendMessage({type:'IFL_RANK_RESULT_FOR_DASHBOARD',payload:message.payload}).catch(()=>{});return;}
 if(message?.type==='IFL_RANK_START'){
  (async()=>{let target=null;if(Number.isInteger(message.sourceTab)){try{const t=await chrome.tabs.get(message.sourceTab);if(t.url?.startsWith('https://all22pokemon.com/franchise'))target=t;}catch(_){}}
   if(!target){const tabs=await chrome.tabs.query({url:'https://all22pokemon.com/franchise*',lastFocusedWindow:true});target=tabs[0]||null;}
   if(!target){sendResponse({ok:false,error:'Open All22 and enter your active franchise first, then try again.'});return;}
   try{await chrome.tabs.sendMessage(target.id,{type:'IFL_RANK_COLLECT',options:message.options});sendResponse({ok:true});}
   catch(e){sendResponse({ok:false,error:'Could not reach All22. Refresh the franchise page and try again.'});}
  })();return true;
 }
});
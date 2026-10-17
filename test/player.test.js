import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../player.js',import.meta.url),'utf8');
test('AmazingTier channels use a restricted official frame without resolving tokens',()=>{
 const channels={cmtv:'CMTVPT',rtp1:'RTP1',rtp2:'RTP2',rtpafrica:'RTPAfrica',rtp3:'RTP3',tvi:'TVI','tvi-int':'TVI-INT',tvireality:'TVIReality','tvi-ficcao':'TVI_Ficcao',vplustvi:'VPlusTVI',recordeuropa:'RecordEuropa',sic:'SIC','sic-noticias':'SIC-NOTICIAS','tcv-int':'TCV-INT','cnn-pt':'CNN-PT'};
 for(const [channel,provider]of Object.entries(channels)){
  let frame;const video={};const panel={classList:{add(){}}};const document={getElementById:id=>id==='video'?video:id==='panel'?panel:{},createElement:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;}}),querySelector:()=>({appendChild:f=>{frame=f;}})};
  vm.runInNewContext(code,{document,location:{search:'?channel='+channel},URLSearchParams,fetch(){throw Error('Must not resolve');},setInterval(){throw Error('Must not poll');}});
  assert.equal(frame.src,'https://amazingtier.top/player/'+provider);assert.equal(frame.attrs.sandbox,'allow-scripts allow-forms');assert.equal(video.hidden,true);assert.equal(frame.referrerPolicy,'no-referrer');
 }
});
test('WideIPTV channels use a restricted official frame without resolving tokens',()=>{
 const channels={
  btv1: 'BTV1',
  tf1fr: 'TF1FR',
  canalplfr: 'CANALPLFR',
  beinsport1fr: 'BEINSPORT1FR',
  beinsport2fr: 'BEINSPORT2FR',
  beinsport3fr: 'BEINSPORT3FR',
  sptplus: 'SPTPlus',
  spt1: 'SPT1',
  spt2: 'SPT2',
  spt3: 'SPT3',
  spt4: 'SPT4',
  spt5: 'SPT5',
  footplusfr: 'FOOTPLUSFR',
  euro1pt: 'EURO1PT',
  euro2pt: 'EURO2PT',
  abola: 'ABOLA',
  eleven1: 'ELEVEN1',
  eleven2: 'ELEVEN2',
  eleven3: 'ELEVEN3',
  eleven4: 'ELEVEN4',
  eleven5: 'ELEVEN5',
  sporting: 'SPORTING',
  portocanal: 'PortoCanal',
  canal11: 'Canal11',
  m6fr: 'M6FR',
  cnewsfr: 'CNEWSFR',
  canals360: 'CANALS360',
  canalsportfr: 'CANALSPORTFR',
  euro1fr: 'Euro1FR',
  euro2fr: 'Euro2FR',
  rmcsport1fr: 'RMCSPORT1FR',
  rmcsport2fr: 'RMCSPORT2FR',
  er1fr: 'ER1FR',
  canalpldocs: 'CANALPLDOCS'
};
 for(const [channel,provider]of Object.entries(channels)){
  let frame;const video={};const panel={classList:{add(){}}};const document={getElementById:id=>id==='video'?video:id==='panel'?panel:{},createElement:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;}}),querySelector:()=>({appendChild:f=>{frame=f;}})};
  vm.runInNewContext(code,{document,location:{search:'?channel='+channel},URLSearchParams,fetch(){throw Error('Must not resolve');},setInterval(){throw Error('Must not poll');}});
  assert.equal(frame.src,'https://wideiptv.top/player/'+provider);assert.equal(frame.attrs.sandbox,'allow-scripts allow-forms');assert.equal(video.hidden,true);assert.equal(frame.referrerPolicy,'no-referrer');
 }
});


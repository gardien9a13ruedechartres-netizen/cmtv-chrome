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

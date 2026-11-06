const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const html = fs.readFileSync('index.html','utf8');
const fixture = [
 {date:'2025-01-09', title:'Galaxy <em>One</em>',media_type:'image',hdurl:'https://example.org/galaxy.jpg',url:'https://example.org/post',explanation:'<strong>Explanation:</strong> A galaxy. <script>bad()</script>',copyright:'NASA'},
 {date:'2025-01-05',title:'Station video',media_type:'video',url:'https://youtube.com/embed/example',permalink:'https://science.nasa.gov/video/',explanation:'A view from orbit.'}
];
function app(fetchImpl) {
 const dom = new JSDOM(html,{url:'http://localhost',runScripts:'outside-only'});
 const w=dom.window; w.AbortSignal=AbortSignal; w.AbortController=AbortController;
 w.fetch=fetchImpl || (async()=>({ok:true,json:async()=>fixture}));
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 w.eval(fs.readFileSync('js/dateRange.js','utf8'));
 // The original date module uses global lexical constants, kept in the same script scope here.
 w.eval(fs.readFileSync('js/dateRange.js','utf8')+'\n'+fs.readFileSync('js/script.js','utf8'));
 return {dom,w,d:w.document};
}
const settle=()=>new Promise(r=>setTimeout(r,15));
async function search(d,start='2025-01-01',end='2025-01-09'){
 d.querySelector('#startDate').value=start;d.querySelector('#endDate').value=end;
 d.querySelector('form').dispatchEvent(new d.defaultView.Event('submit',{cancelable:true}));await settle();
}
test('NASA image URLs, safe text, video details, sorting, fact refresh and modal closing',async()=>{
 const {dom,d}=app();await settle();await search(d);
 assert.equal(d.querySelectorAll('.card').length,2);
 assert.equal(d.querySelector('.card img').src,'https://example.org/galaxy.jpg');
 assert.equal(d.querySelector('.card h3').textContent,'Galaxy One');
 d.querySelector('.card').click();
 assert.ok(d.querySelector('dialog').hasAttribute('open'));
 assert.equal(d.querySelector('#modalExplanation').textContent,'A galaxy.');
 d.querySelector('#closeModal').click();assert.ok(!d.querySelector('dialog').hasAttribute('open'));
 d.querySelectorAll('.card')[1].click();assert.equal(d.querySelector('.video-message a').href,'https://science.nasa.gov/video/');
 d.querySelector('#sortOrder').value='oldest';d.querySelector('#sortOrder').dispatchEvent(new dom.window.Event('change'));
 assert.equal(d.querySelector('.card h3').textContent,'Station video');
 const fact=d.querySelector('#spaceFact').textContent;d.querySelector('#nextFact').click();assert.notEqual(d.querySelector('#spaceFact').textContent,fact);
 dom.window.close();
});
test('rejects reversed, too early, future and oversized ranges without fetching',async()=>{
 let calls=0;const {dom,d}=app(async()=>{calls++;return{ok:true,json:async()=>[]};});await settle();const initial=calls;
 for(const range of [['2025-02-01','2025-01-01'],['1995-06-15','1995-06-16'],['2024-01-01','2025-12-31'],['2099-01-01','2099-01-02']]){
 await search(d,...range);assert.match(d.querySelector('#status').textContent,/Choose a valid range/);
 }
 assert.equal(calls,initial);dom.window.close();
});
test('shows loading state, recovers through API fallback, and offers retry on failure',async()=>{
 let fail=true;const {dom,d}=app(async()=>{if(fail)throw new Error('Failed to fetch');return{ok:true,json:async()=>fixture};});
 assert.equal(d.querySelector('#gallery').getAttribute('aria-busy'),'true');await settle();
 assert.equal(d.querySelector('#retryButton').hidden,false);assert.equal(d.querySelector('#fetchButton').disabled,false);
 fail=false;await search(d);assert.equal(d.querySelectorAll('.card').length,2);assert.equal(d.querySelector('#retryButton').hidden,true);dom.window.close();
});
test('splits ranges over 25 days and keeps only requested dates',async()=>{
 const calls=[];const {dom,d}=app(async(url)=>{calls.push(url);return{ok:true,json:async()=>fixture};});await settle();calls.length=0;
 await search(d,'2025-01-01','2025-01-31');assert.equal(calls.length,2);
 assert.match(calls[0],/date_from=250101&date_to=250125/);assert.match(calls[1],/date_from=250126&date_to=250131/);
 assert.equal(d.querySelectorAll('.card').length,2);dom.window.close();
});

(function(root){
'use strict';
const endpoint='https://script.google.com/macros/s/AKfycbxENUBm5pd966tRn1g9R7HH0zSXcEI10LGLivzQzN0pn6b0ytZHJdV8HU9i0ihYtHJW/exec';
function shuffle(values){
  const result=[...values];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
function same(a,b){return !!b&&a.length===b.length&&a.every((x,i)=>x===b[i]);}
function patterned(sequence,position){
  const end=[...sequence.slice(-7),position];
  return [1,2,3,4].some(period=>{
    const n=period===1?3:period*2;
    const chunk=end.slice(-n);
    return chunk.length===n&&chunk.slice(period).every((x,i)=>x===chunk[i]);
  })||(end.length>=4&&[1,3].some(step=>end.slice(-4).every((x,i,a)=>x===(a[0]+i*step)%4)));
}
function positions(n){
  const letters=[0,1,2,3], remaining=letters.map(()=>Math.floor(n/4));
  shuffle(letters).slice(0,n%4).forEach(i=>remaining[i]++);
  const order=[];
  function fill(){
    if(order.length===n)return true;
    for(const slot of shuffle(letters)){
      if(!remaining[slot]||patterned(order,slot))continue;
      remaining[slot]--;order.push(slot);
      if(fill())return true;
      order.pop();remaining[slot]++;
    }
    return false;
  }
  fill();
  return order;
}
function plan(bank, proposedOrder, previous, reorder){
  let order=proposedOrder;
  while(same(order,previous?.order))order=reorder();
  const single=order.filter(i=>key(bank[i]).length===1);
  const multiple=order.filter(i=>key(bank[i]).length===2);
  const slots=positions(single.length);
  const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  const pairCycle=shuffle(pairs);
  const balancedPairs=shuffle(multiple.map((_,i)=>pairCycle[i%6]));
  const answers=new Map(single.map((id,i)=>[id,[slots[i]]]));
  multiple.forEach((id,i)=>answers.set(id,balancedPairs[i]));
  const options={};
  for(const id of order){
    const q=bank[id], correct=key(q);
    if(!correct.length)continue;
    const targets=answers.get(id);
    let choices;
    do{
      const yes=shuffle(correct),no=shuffle([0,1,2,3].filter(i=>!correct.includes(i)));
      choices=[0,1,2,3].map(i=>targets.includes(i)?yes.pop():no.pop());
    }while(same(choices,previous?.options[id]));
    options[id]=choices;
  }
  return {order,options};
}
function key(q){return !q.options?[]:Array.isArray(q.answer)?q.answer:[q.answerIndex];}
function start(storageKey,bank,order,reorder){
  const name=storageKey+'_LAST_LAYOUT';
  let previous;
  try{previous=JSON.parse(localStorage.getItem(name));}catch{}
  const next=plan(bank,order,previous,reorder);
  try{localStorage.setItem(name,JSON.stringify(next));}catch{}
  return next;
}
async function send(state,record){
  const name=state.name, period=state.period||'', email=state.email||'';
  if(!name||!email)return {ok:false};
  const id=record.gameId||location.pathname.split('/').pop().replace('.html','');
  const total=record.totalQuestions,score=record.firstPassCorrect;
  const payload={...record,gameId:id,eventType:'review_run_complete',course:'Government',
    assignmentKey:id,assignmentTitle:document.title,action:'submit',status:'submitted',
    student:{name,period,email},name,studentName:name,period,email,total,score,
    firstAttemptScore:score,percent:Math.round(100*score/total),
    startedAt:state.startedAtISO,completedAt:record.endedAt,
    runId:id+'|'+state.startedAtISO,totalAttempts:record.totalAttempts,
    updatedAt:new Date().toISOString()};
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
    if(!response.ok)return {ok:false};
    const data=await response.json();
    return {ok:data.ok===true||data.success===true};
  }catch{return {ok:false};}
}
root.BasicsAudit={shuffle,plan,patterned,start,send,endpoint};
})(typeof window==='undefined'?globalThis:window);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {allocate,normalizeNote,consolidate,feeKeys,cents} from '../lib/ledger.ts';
const source=JSON.parse(fs.readFileSync('data/source.json','utf8'));
assert.equal(source.notes.length,99);
const model=consolidate(source.notes);
assert.equal(model.movements.length,148);
for(const n of source.notes){const rows=normalizeNote(n);for(const k of feeKeys)assert.equal(rows.reduce((s,t)=>s+t.fees[k],0),cents(n.fees[k]),n.number+' '+k);assert(rows.filter(r=>r.side==='buy').every(r=>r.fees.irrf===0));}
assert.deepEqual(allocate(1,[1n,1n,1n]),[1,0,0]);
assert.deepEqual(allocate(100,[1n,2n,3n]),[17,33,50]);
assert.throws(()=>allocate(5,[0n]));
const example=normalizeNote(source.notes.find(n=>n.number==='1547418'));
assert.deepEqual(example.map(t=>t.costFees),[13,81]);
assert.equal(model.issues.length,0);
const selic2023=model.realizedPositions.find(p=>p.asset==='Tesouro Selic 2023');
assert(selic2023);
assert.equal(selic2023.quantity,0);
assert.equal(selic2023.reliable,true);
assert.equal(selic2023.realized,93708);
const sample={id:'a',broker:'TEST',date:'2020-01-01',number:'1',kind:'variable',fees:{settlement:'1',exchange:'0',brokerage:'0',iss:'0',irrf:'0'},trades:[{asset:'TEST3',category:'Ação',side:'buy',quantity:'10',price:'10'}]};
const sell={...sample,id:'b',date:'2020-01-02',number:'2',fees:{...sample.fees,irrf:'0.05'},trades:[{...sample.trades[0],side:'sell',quantity:'4',price:'12'}]};
const result=consolidate([sample,sell]);assert.equal(result.positions[0].quantity,6);assert.equal(result.positions[0].cost,6060);assert.equal(result.positions[0].realized,655);assert.equal(result.positions[0].realizedDetail.fifoQty,4);assert.equal(result.movements[1].net,4695);
const same={...sample,id:'c',date:'2020-01-03',number:'3',trades:[{...sample.trades[0],quantity:'2',price:'11'}]};const sameSell={...sample,id:'d',date:'2020-01-03',number:'4',fees:{...sample.fees,irrf:'0.02'},trades:[{...sample.trades[0],side:'sell',quantity:'2',price:'12'}]};const day=consolidate([same,sameSell]);assert.equal(day.closed[0].realizedDetail.dayTradeQty,2);assert.equal(day.closed[0].realizedDetail.fifoQty,0);
const first={...sample,id:'e',date:'2020-01-05',number:'5',trades:[{...sample.trades[0],quantity:'10',price:'10'}]};const second={...sample,id:'f',date:'2020-01-07',number:'6',trades:[{...sample.trades[0],quantity:'10',price:'20'}]};const partial={...sample,id:'g',date:'2020-01-08',number:'7',trades:[{...sample.trades[0],side:'sell',quantity:'5',price:'30'}]};const fifo=consolidate([first,second,partial]);assert.equal(fifo.positions[0].quantity,15);assert.equal(fifo.positions[0].realizedDetail.lots[0].buyId,'e:0');assert.equal(fifo.positions[0].realizedDetail.lots[0].cost,5050);
console.log(JSON.stringify({notes:99,movements:148,feeReconciliations:495,issues:model.issues.length,tests:'passed'}));


for(const asset of ["ITSA4","Tesouro Selic 2027"]){const closed=model.realizedPositions.find(p=>p.asset===asset);assert(closed,asset+" deve aparecer nas vendas");assert.equal(closed.quantity,0);assert.equal(closed.reliable,true);}
assert.equal(result.realizedPositions.length,1);assert.equal(result.realizedPositions[0].quantity,6);

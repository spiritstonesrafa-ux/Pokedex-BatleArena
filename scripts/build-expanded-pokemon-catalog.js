#!/usr/bin/env node
/* Rebuilds the expanded snapshot from official Pokémon/species/move endpoints. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname, '..');
const Support=require(root+'/assets/js/battle-session/battle-session-constants.js');
let index;
const cache=process.env.PBA_CATALOG_CACHE || path.join(root,'.cache_pokeapi');fs.mkdirSync(cache,{recursive:true});
async function get(url){const file=path.join(cache,url.replace(/[^a-z0-9]/gi,'_')+'.json');if(fs.existsSync(file))return JSON.parse(fs.readFileSync(file));const old=path.join(root,'.cache_pokeapi',path.basename(file));if(fs.existsSync(old))return JSON.parse(fs.readFileSync(old));for(let i=0;i<3;i++){try{const r=await fetch(url);if(!r.ok)throw Error(r.status+' '+url);const d=await r.json();fs.writeFileSync(file,JSON.stringify(d));return d}catch(e){if(i===2)throw e}}}
async function pool(items,fn){let cursor=0,done=0;const out=new Array(items.length);await Promise.all(Array.from({length:12},async()=>{while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i]);if(++done%200===0)console.log('Fetched '+done+'/'+items.length)}}));return out;}
function publish(records) {
  'use strict';
  const entries = Object.freeze(records.map(entry => Object.freeze({
    ...entry, types: Object.freeze(entry.types), stats: Object.freeze(entry.stats),
    moves: Object.freeze(entry.moves.map(Object.freeze))
  })));
  const byId = Object.freeze(Object.fromEntries(entries.map(entry => [entry.id, entry])));
  const api = Object.freeze({ entries, byId, count: entries.length,
    matchesGeneration(id, generation) {
      const entry = byId[Number(id)];
      if (!entry) return false;
      if (generation === 'all') return true;
      if (generation === 'forms') return entry.id > 1025;
      return entry.generation === Number(generation);
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.PBAExpandedCatalog = api;
}

function writeSnapshot(entries) {
  const normalized = entries.map(entry => ({ ...entry,
    battleSupported: entry.moveSource !== 'COLLECTION_ONLY',
    collectionOnly: entry.moveSource === 'COLLECTION_ONLY',
    campaignLimitedMoves: entry.moves.length < 4
  }));
  const code = '/* Generated from PokéAPI. Snapshot date: ' + new Date().toISOString().slice(0,10) + '. */\n(' + publish.toString() + ')(' + JSON.stringify(normalized) + ');\n';
  fs.writeFileSync(path.join(root, 'assets/js/expanded-pokemon-catalog.js'), code);
}

(async()=>{
index={all:await get('https://pokeapi.co/api/v2/pokemon?limit=100000'),species:await get('https://pokeapi.co/api/v2/pokemon-species?limit=100000')};
console.log('Fetching Pokémon records');const raws=await pool(index.all.results,p=>get(p.url));
console.log('Fetching species metadata');const species=await pool(index.species.results,p=>get(p.url));const sm=new Map(species.map(s=>[s.name,s]));const defaults=new Map(raws.filter(p=>p.is_default).map(p=>[p.species.name,p]));
console.log('Fetching move metadata');const moveUrls=[...new Set(raws.flatMap(p=>p.moves.map(x=>x.move.url)))];const rawmoves=await pool(moveUrls,get);const moves=new Map(rawmoves.map(m=>[m.name,m]));
const statsKeys=['hp','attack','defense','specialAttack','specialDefense','speed'];
const entries=raws.map(p=>{const sp=sm.get(p.species.name);const base=defaults.get(p.species.name);const learned=p.moves.length?p.moves:base.moves;const types=p.types.map(t=>t.type.name);let legal=learned.map(m=>moves.get(m.move.name)).filter(m=>m&&Support.isMechanicallySupportedMove(m)&&m.damage_class.name!=='status'&&Number(m.power)>0);legal.sort((a,b)=>(Number(types.includes(b.type.name))-Number(types.includes(a.type.name)))||b.power-a.power||a.id-b.id);let selected=[];for(const m of legal){if(selected.length===4)break;if(!selected.some(x=>x.type.name===m.type.name))selected.push(m)}for(const m of legal){if(selected.length===4)break;if(!selected.some(x=>x.id===m.id))selected.push(m)}const collectionOnly=selected.length===0;if(selected.some(x=>!x))throw Error('No fallback for '+p.name);
return {id:p.id,number:p.id,name:p.name,speciesId:sp.id,generation:Number(sp.generation.url.match(/\/(\d+)\/$/)[1]),types,bst:p.stats.reduce((s,x)=>s+x.base_stat,0),legendary:sp.is_legendary,mythical:sp.is_mythical,sprite:p.sprites.front_default||p.sprites.other?.['official-artwork']?.front_default||base.sprites.front_default,photo:p.sprites.other?.['official-artwork']?.front_default||p.sprites.front_default||base.sprites.front_default,animatedPhoto:p.sprites.other?.showdown?.front_default||p.sprites.front_default||base.sprites.front_default,cry:p.cries?.latest||base.cries?.latest||null,speciesUrl:p.species.url,stats:Object.fromEntries(p.stats.map((x,i)=>[statsKeys[i],x.base_stat])),moves:selected.map(m=>({id:m.id,name:m.name,type:m.type.name,power:m.power,accuracy:m.accuracy,pp:m.pp,damageClass:m.damage_class.name})),moveSource:collectionOnly?'COLLECTION_ONLY':p.moves.length?'FORM_LEARNSET':'SPECIES_LEARNSET',recommendedForEndgame:false};});
entries.sort((a,b)=>a.id-b.id);
writeSnapshot(entries);
console.log(JSON.stringify({records:entries.length,moves:rawmoves.length,missingSprites:entries.filter(e=>!e.sprite).map(e=>e.name),fallbacks:entries.filter(e=>e.moveSource==='COLLECTION_ONLY').map(e=>e.name)}));
})().catch(e=>{console.error(e);process.exitCode=1});

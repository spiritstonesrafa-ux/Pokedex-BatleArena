#!/usr/bin/env node
/* Rebuild from a pinned PokéAPI CSV snapshot; no network or executable source imports. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sourceDir=process.argv[2];if(!sourceDir)throw Error('Usage: node scripts/build-pokemon-learnsets.js <csv-source-directory>');
const read=name=>fs.readFileSync(path.join(sourceDir,name+'.csv'),'utf8');
const rows=name=>{const lines=read(name).trim().split(/\r?\n/),keys=lines.shift().split(',');return lines.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[keys[i],v])));};
const pokemon=rows('pokemon'),moves=Object.fromEntries(rows('moves').map(m=>[m.id,m.identifier])),own={},defaults={};
for(const p of pokemon){own[p.id]=new Set();if(p.is_default==='1')defaults[p.species_id]=Number(p.id);}
for(const row of rows('pokemon_moves'))own[row.pokemon_id]?.add(Number(row.move_id));
const byId={},inherited={};for(const p of pokemon){const id=Number(p.id),base=defaults[p.species_id];byId[id]=[...(own[id].size?own[id]:own[base]||[])].sort((a,b)=>a-b);if(!own[id].size&&base!==id&&byId[id].length)inherited[id]=base;}
const source={...JSON.parse(fs.readFileSync(path.join(sourceDir,'source.json'),'utf8')),policy:'Any recorded version group; default-form inheritance only for empty form learnsets.',files:Object.fromEntries(['pokemon','pokemon_moves','moves'].map(name=>[name+'.csv',crypto.createHash('sha256').update(read(name)).digest('hex')]))};
const code=`/* Generated from versioned PokéAPI CSVs. Rebuild with scripts/build-pokemon-learnsets.js. */
(function(){'use strict';
const source=Object.freeze(${JSON.stringify(source)}),byId=${JSON.stringify(byId)},names=Object.freeze(${JSON.stringify(moves)}),inherited=Object.freeze(${JSON.stringify(inherited)});
for(const list of Object.values(byId))Object.freeze(list);Object.freeze(byId);
const idsByName=Object.freeze(Object.fromEntries(Object.entries(names).map(([id,name])=>[name,Number(id)])));
function moveId(move){return typeof move==='number'?move:typeof move==='string'?idsByName[move]:Number(move?.id)||idsByName[move?.name]||0;}
function canLearn(pokemonId,move){const id=moveId(move),list=byId[Number(pokemonId)];if(!list||!id||typeof move==='object'&&move?.name&&names[id]!==move.name)return false;if(list.includes(id))return true;return ((Number(pokemonId)===10188&&id===781)||(Number(pokemonId)===10189&&id===782))&&list.includes(442);}
const api=Object.freeze({source,byId,names,inherited,moveId,canLearn});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PBAPokemonLearnsets=api;
})();
`;
fs.writeFileSync(path.join(__dirname,'../assets/js/battle/pokemon-learnsets.js'),code);console.log(JSON.stringify({pokemon:pokemon.length,moves:Object.keys(moves).length,inheritedForms:Object.keys(inherited).length,commit:source.commit}));

#!/usr/bin/env node
/* Rebuild the static natural-ability snapshot from official CSVs, without network or executable downloads. */
const fs=require('node:fs'),path=require('node:path');
const [abilityFile,pokemonAbilityFile,pokemonFile,outputArg]=process.argv.slice(2);
if(!abilityFile||!pokemonAbilityFile||!pokemonFile)throw Error('Usage: node scripts/build-p7-pokemon-data.js abilities.csv pokemon_abilities.csv pokemon.csv [output.js]');
const output=outputArg||path.resolve(__dirname,'../assets/js/battle/p7-pokemon-data.js');
const csv=n=>fs.readFileSync(n,'utf8').trim().split(/\r?\n/).slice(1).map(s=>s.split(','));
const names=Object.fromEntries(csv(abilityFile).map(r=>[r[0],r[1]])),byPokemon={};
for(const row of csv(pokemonAbilityFile)){if(!names[row[1]])throw Error('Unknown ability ID '+row[1]);byPokemon[row[0]]||=[];byPokemon[row[0]].push({id:+row[1],name:names[row[1]],hidden:row[2]==='1',slot:+row[3]});}
for(const list of Object.values(byPokemon))list.sort((a,b)=>a.slot-b.slot);
const speciesIds=Object.fromEntries(csv(pokemonFile).map(r=>[r[0],+r[2]]));
fs.writeFileSync(output,`/* Static official PokeAPI snapshot, 2026-10-31: abilities and pokemon_abilities CSVs. */\n(function(){const byPokemon=${JSON.stringify(byPokemon)},speciesIds=${JSON.stringify(speciesIds)},abilityNames=${JSON.stringify(Object.values(names))};for(const list of Object.values(byPokemon)){for(const value of list)Object.freeze(value);Object.freeze(list);}const data=Object.freeze({byPokemon:Object.freeze(byPokemon),speciesIds:Object.freeze(speciesIds),abilityNames:Object.freeze(abilityNames)});if(typeof module!=='undefined'&&module.exports)module.exports=data;else if(typeof window!=='undefined')window.PBAP7PokemonData=data;})();\n`);
console.log('Natural abilities rebuilt for '+Object.keys(byPokemon).length+' Pokemon.');

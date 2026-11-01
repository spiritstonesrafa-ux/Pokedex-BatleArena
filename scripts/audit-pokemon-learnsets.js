#!/usr/bin/env node
/* Checks every shipped move source and the real offline hydration path, without network. */
const fs=require('node:fs'),path=require('node:path');
const Learn=require('../assets/js/battle/pokemon-learnsets'),Expanded=require('../assets/js/expanded-pokemon-catalog'),Fixed=require('../assets/js/campaign/campaign-fixed-battle-catalog'),Draft=require('../assets/js/campaign/campaign-battle-fallback-catalog'),Extras=require('../assets/js/campaign/campaign-move-options-catalog'),Options=require('../assets/js/campaign/campaign-move-options'),Wild=require('../assets/js/campaign/campaign-wild-special-catalog'),{BattleTeamHydrator,getFallbackSpecies}=require('../assets/js/battle-session/battle-team-hydrator');
async function audit(){
 const errors=[],counts={},seen=new Set();let assignments=0;
 function check(source,id,moves){counts[source]=(counts[source]||0)+1;seen.add(Number(id));for(const move of moves){assignments++;if(!Learn.canLearn(id,move))errors.push({source,pokemonId:Number(id),pokemonName:Expanded.byId[id]?.name,moveId:move.id,moveName:move.name});}}
 for(const [source,records] of Object.entries({expanded:Expanded.byId,draft:Draft.byId,fixed:Fixed.byId,extras:Extras.byId,wild:Object.fromEntries(Wild.entries.map(p=>[p.id,p]))}))for(const[id,p]of Object.entries(records))check(source,id,Array.isArray(p)?p:p.moves);
 const hydrator=new BattleTeamHydrator({api:null});for(const id of Object.keys(Fixed.byId)){check('fallback',id,getFallbackSpecies(id).moves);check('campaign-pool',id,Options.getPool(id));check('offline-hydrated',id,(await hydrator.hydratePokemon(Number(id))).moves);}
 const result={source:Learn.source,policy:'Ownership across any recorded version, not a single generation/level ruleset. Empty-form learnsets inherit only the same species default form. Crowned signatures are explicit Iron Head replacements. Battle-only Transform, Sketch, Sleep Talk, Struggle and Max/Z conversions are not initial learnset assignments.',pokemonRecords:Expanded.entries.length,checkedPokemon:seen.size,battleSpecies:Object.keys(Fixed.byId).length,assignments,counts,inheritedForms:Object.keys(Learn.inherited).length,errors};
 return result;
}
if(require.main===module)audit().then(result=>{const report=process.argv[2];if(report)fs.writeFileSync(path.resolve(report),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,source:{commit:result.source.commit}},null,2));if(result.errors.length)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={audit};

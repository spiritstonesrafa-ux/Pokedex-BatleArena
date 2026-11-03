/* Offline coverage inventory. A declaration is not proof that every interaction is FULL. */
const fs=require('node:fs'),path=require('node:path');
const K=require('../assets/js/campaign/campaign-catalog'),F=require('../assets/js/campaign/campaign-fixed-battle-catalog'),C=require('../assets/js/battle/battle-constants'),Facilities=require('../assets/js/campaign/campaign-facilities');
const roadmap=require('../docs/ability-roadmap-catalog.json');
const declared=new Set([...C.P7.abilityNames,...C.P8.abilityNames,...C.Completion.abilityNames]);
const phases=new Map();for(const phase of roadmap.phases)for(const name of phase.abilities){if(phases.has(name))throw Error('Duplicate phase assignment: '+name);phases.set(name,phase.id);}
const focus=new Set([...K.MASTER_SPECIES,...K.SUPER_TEAM,...K.SHADOW_TEAM,...Object.values(K.POSTGAME_TRIALS).flatMap(d=>d.team),...K.LEGENDARY_TRIAL_TEAM,...K.MYTHICAL_TRIAL_TEAM,...K.TITANS_TRIAL_TEAM,...K.CELESTIAL_TRIAL_TEAM].map(p=>p.id).concat([...Facilities.league.map(d=>d.team),...Facilities.classic,...Facilities.free,...Facilities.rentals.map(d=>d.team)].flat()));
const known=new Set(C.P7.Data.abilityNames),inventory=new Map([...known].map(name=>[name,{name,declaredSupported:declared.has(name),status:declared.has(name)?'DECLARED_UNVERIFIED':'PENDING',phase:phases.get(name)||null,pokemon:[],defaultPokemonIds:[],featuredDefaultPokemonIds:[]}]));
for(const p of Object.values(F.byId))for(const ability of C.P7.natural(p.id)){
 if(!inventory.has(ability.name))throw Error('Natural ability missing from dictionary: '+ability.name);
 const row=inventory.get(ability.name),primary=C.P7.defaultAbility(p.id)===ability.name;
 row.pokemon.push({id:p.id,name:p.name,hidden:ability.hidden,slot:ability.slot});
 if(primary){row.defaultPokemonIds.push(p.id);if(focus.has(p.id))row.featuredDefaultPokemonIds.push(p.id);}
}
for(const row of inventory.values())if(!row.declaredSupported){if(!row.pokemon.length)row.status='UNASSIGNED';else if(row.phase==='H10')row.status='BLOCKED_EXTERNAL_SYSTEM';else if(row.phase==='H11')row.status='RULE_CONFIRMED_PENDING_IMPLEMENTATION';}
const abilities=[...inventory.values()].sort((a,b)=>a.name.localeCompare(b.name));
const used=abilities.filter(a=>a.pokemon.length),pending=used.filter(a=>!a.declaredSupported);
const missing=pending.filter(a=>!a.phase);if(missing.length)throw Error('Pending abilities without roadmap phase: '+missing.map(a=>a.name).join(', '));
for(const [name]of phases)if(!known.has(name))throw Error('Unknown roadmap ability: '+name);
const report={baselineDate:roadmap.baselineDate,baselineCommit:roadmap.baselineCommit,scope:'Fixed battle catalogue; normal, hidden and alternate natural abilities. Declared support is not a FULL behavioral audit.',summary:{knownAbilities:known.size,declaredSupported:declared.size,assignedAbilities:used.length,assignedPending:pending.length,unassignedPending:abilities.filter(a=>!a.declaredSupported&&!a.pokemon.length).length,battleRecords:Object.keys(F.byId).length,recordsWithPendingDefault:pending.reduce((sum,a)=>sum+a.defaultPokemonIds.length,0)},phases:roadmap.phases.map(p=>({id:p.id,name:p.name,assignedPending:pending.filter(a=>a.phase===p.id).length,defaultRecordsImpacted:pending.filter(a=>a.phase===p.id).reduce((sum,a)=>sum+a.defaultPokemonIds.length,0)})),abilities};
const destination=path.join(__dirname,'../docs/ability-coverage.json'),output=JSON.stringify(report,null,2)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(destination,output);
if(process.argv.includes('--check')&&(!fs.existsSync(destination)||fs.readFileSync(destination,'utf8')!==output))throw Error('Inventory changed. Review phase assignments and regenerate with --write.');
console.log(JSON.stringify(report.summary,null,2));
console.log('Roadmap covers every pending natural ability assigned to a battle-ready record.');

/* Validated, offline move choices for player-owned campaign Pokémon. */
(function () {
  const Fixed = typeof module !== 'undefined' && module.exports
    ? require('./campaign-fixed-battle-catalog.js') : window.PBACampaign.CampaignFixedBattleCatalog;
  const Extras = typeof module !== 'undefined' && module.exports
    ? require('./campaign-move-options-catalog.js') : window.PBACampaign.CampaignMoveOptionsCatalog;
  const Support = typeof module !== 'undefined' && module.exports
    ? require('../battle-session/battle-session-constants.js') : window.PBABattleSession;

  const Rules=typeof module!=='undefined'&&module.exports?require('../battle/battle-constants.js'):window.PBABattle;
  const Learnsets = typeof module !== 'undefined' && module.exports ? require('../battle/pokemon-learnsets.js') : window.PBAPokemonLearnsets;
  function getPool(id,sketchMoveId) {
    const species = Fixed.byId[Number(id)];
    if (!species) return [];
    const learned=Number(id)===235&&Rules.P8.canSketch(Rules,sketchMoveId)?Rules.P8.canonical(Rules,sketchMoveId):null;
    return [...species.moves, ...(Extras.byId[Number(id)] || []),...(learned&&!species.moves.some(m=>m.id===learned.id)?[learned]:[])]
      .filter(move => Learnsets.canLearn(id,move) || Number(id) === 235 && learned?.id === move.id)
      .map(move => Object.freeze({ ...move }));
  }

  function getDefaultMoveIds(id,sketchMoveId) {
    if(Number(id)===235&&Rules.P8.canSketch(Rules,sketchMoveId))return [Number(sketchMoveId)];
    return (Fixed.byId[Number(id)]?.moves || []).map(move => move.id);
  }

  function validateSelection(id, moveIds,sketchMoveId) {
    const species = Fixed.byId[Number(id)];
    if (!species || !Array.isArray(moveIds) || moveIds.length < 1 || moveIds.length > 4) return null;
    if(Number(id)===235&&moveIds.length!==1)return null;
    const ids = moveIds.map(Number);
    if (ids.some(moveId => !Number.isInteger(moveId) || moveId <= 0) ||
        new Set(ids).size !== ids.length) return null;
    const available = new Map(getPool(id,sketchMoveId).map(move => [move.id, move]));
    const moves = ids.map(moveId => available.get(moveId));
    if (moves.some(move => !move || !Support.isMechanicallySupportedMove(move))) return null;
    return moves;
  }

  function resolveLoadout(id, moveIds,sketchMoveId) {
    return (validateSelection(id, moveIds,sketchMoveId) || validateSelection(id,getDefaultMoveIds(id,sketchMoveId),sketchMoveId) || [])
      .map(move => ({ ...move }));
  }

  function sanitizePreferences(raw, allowedIds,sketchMoves={}) {
    const result = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
    const allowed = new Set(allowedIds || []);
    for (const [key, moveIds] of Object.entries(raw)) {
      const id = Number(key);
      if (!Number.isInteger(id) || !allowed.has(id)) continue;
      const moves = validateSelection(id, moveIds,sketchMoves[id]);
      if (!moves) continue;
      const ids = moves.map(move => move.id);
      if (JSON.stringify(ids) !== JSON.stringify(getDefaultMoveIds(id,sketchMoves[id]))) result[id] = ids;
    }
    return result;
  }

  const api = Object.freeze({ getPool, getDefaultMoveIds, validateSelection,
    resolveLoadout, sanitizePreferences });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    window.PBACampaign = window.PBACampaign || {};
    window.PBACampaign.CampaignMoveOptions = api;
  }
})();

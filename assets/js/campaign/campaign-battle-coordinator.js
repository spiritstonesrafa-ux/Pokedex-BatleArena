(function () {
  let C, Cinematic, Trial;
  if (typeof module !== 'undefined' && module.exports) {
    C = require('./campaign-constants.js');
    Trial = require('./trial-arrival.js');
    try { Cinematic = require('./cinematic-dialogue.js'); } catch { Cinematic = null; }
  } else {
    C = window.PBACampaign;
    Cinematic = window.PBACampaign;
    Trial = window.PBACampaign;
  }

  class CampaignBattleCoordinator {
    constructor(manager, session, cinematicDialogue = null, trialArrival = null) {
      this.manager = manager;
      this.session = session;
      this.cinematicDialogue = cinematicDialogue;
      this.trialArrival = trialArrival;
    }

    start(kind, id, teamIds, options) {
      if (this.starting) return this.starting;
      // Begin Web Audio resume inside the initiating click, before any preparation awaits.
      try { Promise.resolve(this.session.compositeAdapter?.audioController?.unlock?.()).catch(()=>{}); } catch (_) {}
      this.starting = this.startPrepared(kind,id,teamIds,options).finally(()=>{this.starting=null;});
      return this.starting;
    }

    async startPrepared(kind, id, teamIds, options) {
      const config = this.manager.getBattleConfig(kind, id, teamIds, options);
      config.playerSketchMoves=this.manager.getSketchMovesForTeam?.(config.playerTeamIds)||{};
      config.playerBattlePreferences = this.manager.getBattlePreferencesForTeam?.(config.playerTeamIds)||{};
      config.playerMovePreferences = this.manager.getMovePreferencesForTeam?.(config.playerTeamIds) || {};
      await this.session.prepareBattle(config);

      const cinematic = this.cinematicDialogue ||
        (typeof window !== 'undefined' && window.cinematicDialogue) ||
        (Cinematic && Cinematic.cinematicDialogue) || null;

      const sceneKey = id || kind;

      if (Trial?.TrialArrival?.supports(kind)) {
        if (typeof window !== 'undefined' && typeof window.switchAppTab === 'function') window.switchAppTab('battle');
        const arrival = this.trialArrival || new Trial.TrialArrival({audio:this.session.compositeAdapter?.audioController});
        this.activeTrialArrival = arrival;
        let completed = true;
        try { completed = await arrival.play(kind,this.session.enemyTeam); }
        catch (error) { arrival.close?.(false); console.warn('Trial opening could not be displayed:',error); }
        finally { this.activeTrialArrival = null; }
        if (completed === false) { const error = new Error('Entrada do desafio cancelada.'); error.name='AbortError'; throw error; }
      } else if (cinematic && typeof cinematic.hasScene === 'function' && cinematic.hasScene(sceneKey, 'INTRO')) {
        if (typeof window !== 'undefined' && typeof window.switchAppTab === 'function') {
          window.switchAppTab('battle');
        }
        try {
          await cinematic.play(sceneKey, 'INTRO', {audioController:this.session.compositeAdapter?.audioController});
        } catch (err) {
          console.warn('Cinematic intro dialogue failed to play:', err);
        }
      }

      await this.session.startBattle();
      return config;
    }
  }

  const api = { CampaignBattleCoordinator };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.PBACampaign = window.PBACampaign || {};
    Object.assign(window.PBACampaign, api);
  }
})();

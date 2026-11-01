(function () {
  let C, Cinematic;
  if (typeof module !== 'undefined' && module.exports) {
    C = require('./campaign-constants.js');
    try { Cinematic = require('./cinematic-dialogue.js'); } catch { Cinematic = null; }
  } else {
    C = window.PBACampaign;
    Cinematic = window.PBACampaign;
  }

  class CampaignBattleCoordinator {
    constructor(manager, session, cinematicDialogue = null) {
      this.manager = manager;
      this.session = session;
      this.cinematicDialogue = cinematicDialogue;
    }

    async start(kind, id, teamIds, options) {
      const config = this.manager.getBattleConfig(kind, id, teamIds, options);
      config.playerBattlePreferences = this.manager.getBattlePreferencesForTeam?.(config.playerTeamIds)||{};
      config.playerMovePreferences = this.manager.getMovePreferencesForTeam?.(config.playerTeamIds) || {};
      await this.session.prepareBattle(config);

      const cinematic = this.cinematicDialogue ||
        (typeof window !== 'undefined' && window.cinematicDialogue) ||
        (Cinematic && Cinematic.cinematicDialogue) || null;

      const sceneKey = id || kind;

      if (cinematic && typeof cinematic.hasScene === 'function' && cinematic.hasScene(sceneKey, 'INTRO')) {
        if (typeof window !== 'undefined' && typeof window.switchAppTab === 'function') {
          window.switchAppTab('battle');
        }
        try {
          await cinematic.play(sceneKey, 'INTRO');
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

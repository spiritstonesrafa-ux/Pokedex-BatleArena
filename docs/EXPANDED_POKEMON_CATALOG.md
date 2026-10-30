# Expanded Pokémon catalog

Snapshot from the official PokéAPI on 2026-10-30: 1,025 species and 1,351 Pokémon records (326 alternate forms). Canonical campaign coverage grows from 507 to 1,351 records: all 518 previously missing species plus 326 forms.

- The Pokédex supports every snapshot record in search, favorites, type filters and the new alternate-forms selector. Generation-based search associates forms with the generation of their species. The nine generation lists keep their original base-species pagination; alternate forms are browsable through All or Forms.
- Campaign initial draft, master teams, rewards, trials and bosses retain their existing configuration. Normal expansion species appear in thematic wild pools without the old draft-only/BST restriction. Electric encounters are included in Region 1's meadow. Legendary and mythical forms share the existing special rarity bucket; reserved reward IDs remain excluded during the story.
- Alternate forms are standalone combatants with their own API stats, types and compatible moves. No Mega Evolution, Power Construct, Gigantamax transformation, items or ability activation mechanics are added.
- 1,343 records have 1–4 supported offensive moves and are hydrated offline. Existing curated loadouts take precedence. New forms use their own learnsets; empty form learnsets inherit their default species learnset, recorded in moveSource.
- Ditto, Unown, Wobbuffet, Smeargle, Wynaut, Pyukumuku, Cosmog and Cosmoem have no supported offensive move. They are available for collection capture without battle, use empty combat move lists, and cannot be selected for battle or join the Final Stand army. This behavior was explicitly requested by the user.
- Story limits remain three captures per point. After completing the campaign, Continue exploring opens the collection map and lifts point capacity to the number of eligible records. All 1,351 records become encounter-eligible by local type, including rewards not chosen during the story. Collection captures use the existing ball chance, result flow, duplicate exclusion, save validation and capture tracking. Existing saves do not need resetting.

## Rebuild and verification

Run node --use-system-ca scripts/build-expanded-pokemon-catalog.js when the system CA is required, or node scripts/build-expanded-pokemon-catalog.js otherwise. Requests use the development-only .cache_pokeapi directory. Rebuilding does not alter the game engine. Snapshot changes require a review of catalog counts and tests.

Tests cover all records' reachability, offline hydration for every battle-ready record, form-specific stats, collection capture/reload/battle exclusion for all eight exceptions, and postgame collection past the previous cap.

Sources: https://pokeapi.co/api/v2/pokemon?limit=100000 ; https://pokeapi.co/api/v2/pokemon-species?limit=100000 ; individual pokemon, species and move records.

# Game Concept: Persistent World & AI Invasions

## Summary of Key Game Mechanics
- Multiplayer co-op defense game with cyclical Peace (~10min) / Invasion (~30min) phases.
- Players defend a central Shrine within a circular city protected by Perimeter Walls & an LLM/vote-funded destructible Iron Dome.
- Players choose a Hero Class (Tech/Wizard), earn personal Money, manage land tenure, collect Artifacts, build personal bases, and control Troops.
- 50% of earnings go to a City Money pool managed by the LLM via player votes.
- The Invading AI faction operates from a predefined, indestructible Base structure, manages AI Resources, and uses LLM guidance to buy invader units.

## Revised Game Mechanics Plan
### City Layout & Exterior
- Center: Shrine (LLM embodiment, builds Communal Combat Units).
- Inner Ring (Communal Zone): Circular area around the Shrine. No player building. Houses communal buildings.
- Middle Ring (Player Zone): Annular zone around the Inner Ring containing Player Land Plots. Players build personal bases here.
- Outer Ring (Perimeter): Location of the circular Communal Perimeter Walls and Gates.
- Sky: "Iron Dome" Energy Shield projected over the entire city up to the perimeter walls. Destructible with HP. Rebuilt via City Money/Votes.
- Exterior: Area outside the circular walls. Contains the AI Base: a predefined, visually distinct, impassable fortress structure with effectively infinite HP defenses.

### Player Experience & Mechanics
- Views: Seamless FPS/Third-Person/RTS switching.
- Hero Unit: Player-controlled, class-based (Tech/Wizard). Potential temporary intra-game progression.
- Initial Core Active Abilities:
  - Tech/Engineer: 1. EMP Grenade (Control), 2. Rivet Gun (Damage), 3. Deploy Mini-Turret (Utility/Damage).
  - Wizard/Technomancer: 1. Ice Ability (Control), 2. Lightning Ability (Utility/Burst), 3. Fire Ability (Damage).
- Troops/Minions (Personal Robots): Built via Command Post. Max 5. Equip 1 Artifact. Lost if CP destroyed. Upgrades deferred.
- Assistant AI Bots: ~10 communal humanoid robots funded by City Money. Perform maintenance. Consume City Money. Tasked based on LLM analysis/votes.

### Economy
- Personal Money: Players receive 50% of Money from Invasion contribution + Troop earnings.
- City Money: Communal pool (50% invasion earnings + leaver funds). Managed by LLM via player votes.
- AI Resources: Separate pool for invaders. Base amount = Function(Total Human Money) * Win/Loss Multiplier * Player Count Multiplier.

### Democratic Spending (City Money)
- LLM polled (~30s). If confidence close between top options, proposes up to 5 options for player vote (~10s window, non-intrusive UI, equal weight, random tie-break).
- Winning option funded. Occurs in Peace & Invasion.

### Land Ownership (Tenure System)
- Cyclical repurchase using personal Money for city plots. Structures inherited/reimbursed on transfer.

### Building (Personal)
- Hybrid system (Modular: Fences, Walls, Floors, Doors, Windows, Stairs + Presets/Blueprints). HP/Destructible. Built using personal Money.

### Building (Communal)
- Bots build/repair communal structures (City Money). Shrine builds Communal Combat Units (City Money).

### Exploration
- Outside city walls. Encounters & Rewards (Money, Artifacts, Intel). AI scouts/units may be present and hostile during Peace.

### Combat System
- HP-based. Player performance generates Money (split 50/50 Player/City). Low-violence feedback. Global kill announcements for bosses.

### Strategy Focus
- Cooperative defense, economics, base layout, customization (Artifacts), voting, tactical combat.

### UI
- Minimap, Fog of War (resets peripherally), Market view, Inventory/Equipment view, HP bars, Personal/City Money displays, Donation UI, Voting Interface, LLM Proposal/Spending Log?, Kill Announcements, Troop Command/Mode UI, Building Interface, Iron Dome Status Indicator?, Phase Countdown Timers.

## Game Loop & AI
### Cycle
- Variable length (~10 min Peace / ~30 min Invasion). Indicated by countdown timers.

### Continuous LLM Analysis (City)
- LLM polls state (~30s), potentially triggers votes for City Money spending.

### Continuous LLM Analysis (Invaders)
- Head Entity AI queries LLM periodically for strategic guidance (unit composition based on available AI Resources).

### Peace Phase
- Land repurchase, building/repairing, upgrading, trading, donating, social, exploration, intel gathering. LLM/Votes direct City Money spending.

### Invasion Phase
- AI units spawn from AI Base and attack city based on LLM strategy. Defend Shrine/defeat Head Entity. Generate Money. Collect Artifacts.

### AI Invasion
- Unit Production: Head Entity uses AI Resources to "buy" units based on LLM guidance & unit costs. Spawned from AI Base.

### Invader Unit Types & Behavior
- Defined roles (Wasp: Anti-Air/Dome, Scuttler: Swarm/Anti-Gate, Bulwark: Siege) + Sergeants/Head (bosses).

### Hierarchical Command (LLM/Head -> Sergeants -> Troops)
- Dynamic Difficulty Scaling: Based on player count, total player team Money, AI Resource generation.

### LLM Integration
- Directs Invasion strategy (incl. unit comp for AI), Manages City Money via proposing voted options, tasks Assistant Bots.

### Invasion Dynamics & Win/Loss Conditions
- Player Win Condition: Defeat "Head Entity" OR survive invasion timer.
- Player Loss Condition: AI destroys central "Shrine".

## Architectural Principles (High Priority)
- Server Authority: Server manages state, validates actions/votes/LLM results.
- Modularity & Abstraction: Clean code structure.
- Code File Size Guideline: Aim for < 1000 lines per file.
- Robust Fallback Logic: For all LLM-dependent systems.
- LLM Availability Monitoring: To trigger fallback logic.

## Technology Stack & Implementation Details
- Networking: Colyseus (Node.js)
- Persistence: Database (Type TBD)
- AI Interface: Local/Outsourced LLM via API.
- Platform: PC Client (via Electron/Tauri wrapper), potential Mobile later.
- Hosting: Cloud servers (e.g., DO), static hosting (e.g., Vercel).

## Key Implementation Points
- Split-screen rendering, state sync, DB schema, LLM API (incl. City spending/AI strategy), gamepad input, building/snapping, land tenure/market, Artifact system, Fog of War reset, combat mechanics, Assistant Bot logic, Communal Combat Unit logic, Contribution Tracking, Money Distribution (50/50), Leaver Money Handling, Voting System, AI Resource System & Scaling Formula Logic, AI Unit Purchasing/Spawning Logic, AI Base Functionality (spawn), AI Peacetime Scouting/Attack Logic, Phase Countdown Timers, Command Post Relocation Mechanics, Building Placement Rules, Troop Building/Management System, Kill Announcement System, LLM Fallback Systems, LLM Availability Monitoring, Circular City Layout Generation/Logic, Iron Dome mechanics, Join-in-Progress Logic, Initial Hero Abilities Defined, Troop Mode System, Initial Troop Stats/Costs/Behaviors defined, Initial Communal Unit Stats/Costs/Behaviors defined, Invading AI Unit logic & specific behaviors (incl. fallbacks for Wasp, Scuttler, Bulwark).

## Questions & Clarifications
- Any missing game mechanics from the design document?
- Should `ShrineStructure` definitions be loaded dynamically or hardcoded?
- Preferred approach for loading `npcDefinitions`: function or static array?
- How to handle player disconnections during Invasion Phase?
- What is the expected behavior for AI units when encountering a destroyed Command Post?
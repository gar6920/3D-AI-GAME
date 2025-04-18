// Smoke test for core schemas and classes

// Schemas
const { Structure } = require('../server/core/schemas/Structure');
const { NPCSchema } = require('../server/core/schemas/NPCSchema');
const { StructureDefinition } = require('../server/core/schemas/StructureDefinition');
const { GameState } = require('../server/core/schemas/GameState');
const { GameConfigSchema } = require('../server/core/schemas/GameConfigSchema');

// Core classes
const { ResourceManager } = require('../server/core/ResourceManager');
const { GamePhaseManager } = require('../server/core/GamePhaseManager');
const { BaseRoom } = require('../server/core/BaseRoom');
const { BaseGameRoom } = require('../server/core/BaseGameRoom');

console.log('Smoke test: All core modules imported successfully.');

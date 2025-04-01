const { BaseRoom } = require("../../core/BaseRoom");
const { TreeEntitySchema } = require("../../core/schemas/TreeEntitySchema");

class Test1Room extends BaseRoom {
    onCreate(options) {
        super.onCreate(options);
        
        // Create a tree entity using the schema
        const tree = new TreeEntitySchema();
        tree.x = 5;
        tree.y = 0;
        tree.z = 5;
        tree.scale = 1;
        tree.rotation = 0;
        
        // Add the tree entity to the room state
        this.state.entities.set("tree1", tree);
        
        console.log("Test1Room: Added tree entity to the room");
    }
}

module.exports = { Test1Room }; 
const schema = require('@colyseus/schema');
const Schema = schema.Schema;

class TreeEntitySchema extends Schema {
    constructor() {
        super();
        this.type = "tree";
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.scale = 1;
        this.rotation = 0;
    }
}

schema.defineTypes(TreeEntitySchema, {
    type: "string",
    x: "number",
    y: "number",
    z: "number",
    scale: "number",
    rotation: "number"
});

module.exports = { TreeEntitySchema }; 
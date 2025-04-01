const { Test1Room } = require("./Test1Room");

const implementation = {
    name: "test1",
    roomType: "test1",
    description: "Test implementation with a tree on the map"
};

module.exports = {
    implementation,
    DefaultRoom: Test1Room
}; 
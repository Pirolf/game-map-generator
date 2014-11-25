var Center = function(loc, polygon, idx){
	this.idx = idx;

	this.corners = []; //vertices of the polygon
	this.neighbors = []; //adjacent polygons, if two polygons share at edge, then they are adjacent
	this.borders = [];//edges

	this.loc = loc;//{x: , y:}


	this.perlinVal = null;

	this.water = null;        // lake or ocean
    this.ocean = null;        // ocean
    this.coast = null;       // land polygon touching an ocean
    this.border = null;       // at the edge of the map
    this.biome = null;          // biome type 
    this.elevation = null;     // 0.0-1.0

}
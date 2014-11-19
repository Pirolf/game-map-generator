var Center = function(loc, polygon, idx){
	this.idx = idx;

	this.corners = []; //vertices of the polygon
	this.neighbors = []; //adjacent polygons, if two polygons share at edge, then they are adjacent
	this.borders = [];//edges

	this.loc = loc;//{x: , y:}

	this.isOcean = false;
	this.isLand = false;
	this.perlinVal = null;

}
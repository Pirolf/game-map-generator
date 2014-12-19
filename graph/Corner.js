var Corner = function(x, y, idx){
	this.touches = [];//a set of polygons touching this corner
	this.protrudes = []; //edges touching the corner
	this.adjacent = [];//corners connected to this one
	
	this.x = x;
	this.y = y;

	this.idx = idx;

	this.water = null;  // lake or ocean
	this.ocean = null;
	this.coast = null;  // touches ocean and land polygons
	this.border = null;  // at the edge of the map
	this.elevation = null;  // 0.0-1.0
	this.downslope = idx; //for rivers
	this.watershed = null;
	this.watershedSize = null;
	this.river = 0;
	this.moisture = null;  // 0.0-1.0

	this.equals = function(other){
		return (other.x == this.x && other.y == this.y);
	}
}
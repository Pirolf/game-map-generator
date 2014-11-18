var Corner = function(x, y, idx){
	this.touches = [];//a set of polygons touching this corner
	this.protrudes = []; //edges touching the corner
	this.adjacent = [];//corners connected to this one
	this.x = x;
	this.y = y;
	this.idx = idx;
	
	this.equals = function(other){
		return (other.x == this.x && other.y == this.y);
	}
}
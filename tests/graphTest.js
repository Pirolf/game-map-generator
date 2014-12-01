function runTests(){
	console.log(test_centers());
	console.log( test_edges_are_unique());
	console.log( test_corners_are_unique());
	console.log(test_corners_has_unique_members());
}
//test centers actually built
function test_centers(){
	for(var i=0; i < centers.length; i++){
		var c = centers[i];
		//print idx
		console.log(c.idx);
		//print corners
		/*var cors = c.corners;
		var corIndices = "";
		for(var j=0; j < cors.length; j++){
			corIndices += cors[j] + ", ";
		}
		console.log(corIndices);	*/

		if(!test_center_has_diff_corners(c))return false;
		if(!test_center_has_diff_neighbors(c))return false;
	}
	return true;
}

function test_center_has_diff_corners(c){
	var cors = c.corners;
	for(var i=0; i < cors.length; i++){
		for(var j=i+1; j<cors.length; j++){
			if(cors[i] === cors[j]){
				return false;
			}
		}
	}
	return true;
}
function test_center_has_diff_neighbors(c){
	var neis = c.neighbors;
	for(var i=0;i<neis.length;i++){
		for(var j=i+1; j<neis.length;j++){
			if(neis[i] ===neis[j])return false;
		}
	}
	return true;
}
function test_edges_are_unique(){
	for(var i=0;i<edges.length;i++){
		for(var j=i+1; j<edges.length;j++){
			if(edges[i].v0 === edges[j].v1 && edges[i].v1 === edges[j].v0
				|| edges[i].v0 === edges[j].v0 && edges[i].v1 === edges[j].v1){

				return i + ", " + j;
			}
		}
	}
	return true;
}
function test_corners_are_unique(){
	for(var i=0;i<corners.length;i++){
		for(var j=i+1; j<corners.length;j++){
			if(corners[i].x == corners[j].x && corners[i].y == corners[j].y
				/*&& arraysEqual(corners[i].touches, corners[j].touches)*/){
				return i + ", " + j;
			}	
		}
	}
	return true;
}
function test_corners_has_unique_members(){
	for(var i=0;i<corners.length;i++){
		var ts = corners[i].touches;
		var ps = corners[i].protrudes;
		var as = corners[i].adjacent;
		for(var j=0;j<ts.length;j++){
			for(var k=j+1; k < ts.length;k++){
				if(ts[j] === ts[k]){
					return false;
				}
			}
		}
		for(var j=0;j<ps.length;j++){
			for(var k=j+1; k < ps.length;k++){
				if(ps[j] === ps[k]){
					return false;
				}
			}
		}
		for(var j=0;j<as.length;j++){
			for(var k=j+1; k < as.length;k++){
				if(as[j] === as[k]){
					return false;
				}
			}
		}
	}
	return true;
}
function arraysEqual(a, b) {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length != b.length) return false;

	// If you don't care about the order of the elements inside
	// the array, you should sort both arrays here.

	for (var i = 0; i < a.length; ++i) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}
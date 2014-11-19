var w = 1200, h = 800;
 
var vertices = d3.range(3000).map(function(d) {
 	  return [Math.random() * w, Math.random() * h];
});
  
var svg = d3.select("#voronoi-map")
	.append("svg:svg")
	.attr("width", w)
	.attr("height", h)
	.attr("class", "PiYG")
	.on("mousemove", update);

//a 2d array with n points, each as a size-2 array for x,y
var vCells = d3.geom.voronoi(vertices);
//do a second pass: lloyd relaxtion
var finalCells = runLloyd(vCells, 10);
var finalCentroids = calcCentroids(finalCells);

//build graph
var centers = [];
var corners = [];
var edges = [];

buildGraph(finalCells);
doPerlin();
draw(finalCells);

svg.selectAll("circle")
	.data(finalCentroids.slice(1))
	.enter().append("svg:circle")
	.attr("transform", function(d) { return "translate(" + d + ")"; })
	.attr("r", 2);


//ps: polygons
function buildGraph(ps){
	for(var i=0;i<ps.length;i++){
		var p = ps[i];
		//create center
		var c = new Center(centroid(p), p, centers.length);

		for(var j=0;j<p.length;j++){
			var v = p[j];
			var cornerShared = hasCorner(v[0], v[1]);
			if(cornerShared === false){
				var cor = new Corner(v[0], v[1], corners.length);

				cor.touches.push(c.idx);
				corners.push(cor);
				//center.corners done
				c.corners.push(cor.idx);
			}else{
				//already has this cornor
				//touches done
				console.log(cornerShared);
				corners[cornerShared].touches.push(c.idx);
				c.corners.push(cornerShared);
			}
		}//end inner for
		centers.push(c);
		//now add edges, for every corner of the current center
		for(var j=0;j<c.corners.length;j++){
			//each neighoring pair is an voronoi edge
			var v1 = c.corners[j];
			var v2 = c.corners[(j+1)%c.corners.length];
			var e = new Edge(edges.length);
			//set v0, v1
			e.v0 = v1;
			e.v1 = v2;
			var edgeExists = hasVoronoiEdge(e);
			if(edgeExists === false){
				//add borders
				c.borders.push(e.idx);
				//fill in d0
				e.d0 = c.idx;

				edges.push(e);
				//update protrudes (edges)
				corners[v1].protrudes.push(e.idx);
				corners[v2].protrudes.push(e.idx);
				//update adjacent
				corners[v1].adjacent.push(v2);
				corners[v2].adjacent.push(v1);
			}else{
				//fill in d1
				edges[edgeExists].d1 = c.idx;
				c.borders.push(edgeExists);
			}

		}//end inner for
	}
	//populate centers' neighbors
	populateNeighbors();
} 
function populateNeighbors(){
	for(var i=0;i<centers.length;i++){
		var c1 = centers[i];
		for(var j=i+1;j<centers.length;j++){
			var c2 = centers[j];
			var sharedE = shareVEdges(c1, c2);
			if(sharedE){
				c1.neighbors.push(c2.idx);
				c2.neighbors.push(c1.idx);
			}
		}
	}
}
function shareVEdges(center1, center2){
	//actually <=> have a corner in common
	var vs = [];
	var counter = 0;
	for(var i=0;i<center1.borders.length ;i++){
		var e1 = center1.borders[i];
		for(var j=0;j<center2.borders.length; j++){
			var e2 = center2.borders[j];
			if(e2== e1){
				return true;
			}
		}
	}
	return false;
}
//if already has cornor return its index in the corners array
//else false
function hasCorner(x, y){
	for(var i=0;i<corners.length;i++){
		var c = corners[i];
		if(c.x === x && c.y === y){
			return c.idx;
		}
	}
	return false;
}
function hasVoronoiEdge(e){
	for(var i=0;i<edges.length;i++){
		if(e.v0 == edges[i].v0 && e.v1 == edges[i].v1
			|| e.v0 == edges[i].v1 && e.v1 == edges[i].v0){
			return i;
		}
	}
	return false;
}

function calcCentroids(ps){
	cs = [];
	for(var i=0;i<ps.length;i++){
		var c = centroid(ps[i]);
		cs.push([c.x, c.y]);
	}
	return cs;
}
//calculate centroid of a polygon
function centroid(p){
	var sx = 0, sy = 0; //sum
	for(var i=0; i < p.length; i++){
		var v = p[i];
		sx += v[0];
		sy += v[1]; 
	}
	return {x: sx/p.length, y: sy/p.length};
}
function runLloyd(polygons, n){
	for(var i=0;i<n;i++){
		polygons = lloydRelaxation(polygons);
	}
	
	return polygons;
}
function lloydRelaxation(polygons){
	var newSites = [];
	for(var i=0;i<polygons.length; i++){
		var p = polygons[i];
		var c = 	centroid(p);
		newSites.push([c.x, c.y]);
	}
	vCellsNew = d3.geom.voronoi(newSites);

	return vCellsNew;
}
//assign a perlin value to each center
function doPerlin(){
	noise.seed(Math.random());
	for (var i = 0; i < centers.length; i++) {
		// All noise functions return values in the range of -1 to 1.

		// noise.simplex2 and noise.perlin2 for 2d noise
		var perlinValue = noise.simplex2(centers[i].loc.x / 100, centers[i].loc.y / 100);
		centers[i].perlinVal = perlinValue;
	}
}
function draw(polygons){
	svg.selectAll("path")
		.data(polygons)
		.enter().append("svg:path")
		//.attr("class", function(d, i) { return i ? "q" + (i % 9) + "-9" : null; })
		.attr("class", function(d, i) { if(centers[i].loc.x * centers[i].loc.x + centers[i].loc.y+centers[i].loc.y < 1000*500*2)return "land"})
		.attr("d", function(d) { return "M" + d.join("L") + "Z"; });
}
function update() {/*
	vertices[0] = d3.mouse(this);
	svg.selectAll("path")
	.data(d3.geom.voronoi(vertices)
	.map(function(d) { return "M" + d.join("L") + "Z"; }))
	.filter(function(d) { return this.getAttribute("d") != d; })
	.attr("d", function(d) { return d; });*/
}
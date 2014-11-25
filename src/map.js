//size :{x: y:}
var Map = function(size){
	this.sz = {width: size.x, height:size.y};
	this.perlin = [];
	var m = this;

	this.makePerlin = function(){
		var seed = 1459164690;
		
	    m.perlin = makePerlinNoise(256, 256, 1.0, 1.0, 1.0, seed, 8, 0.5);
        console.log(m.perlin[1][0]);
	};
	
	//this.islandShape = null;//this is a function
	this.islandShape = function(q){
		
			var oceanRatio = 0.5;
		    var landRatioMinimum = 0.1;
		    var landRatioMaximum = 0.5;
		    oceanRatio = ((landRatioMaximum - landRatioMinimum) * oceanRatio) + landRatioMinimum;  //min: 0.1 max: 0.5
	    //q: corner
	    //return function (q) {
	    	var row = ((q.x + 1) * 128) | 0; // |0 to int
	    	var col = (((q.y + 1) * 128 ) | 0 ) & 0xff; 
            console.log("loc x: ", q.x, " y: ", q.y)
	    	console.log("r: " , row , ", c: " , col );

	    	var c;
	    	if (_(m.perlin[row]).isUndefined()) {
	            c = null;
	        }else{
	        	c = m.perlin[col][row] / 255.0;
                //c = m.perlin[q.y % 256 | 0][q.x % 256 | 0];
	        	console.log("color:" , c)
	        }
	        
	        var retVal = c > (oceanRatio + 
	        	oceanRatio * (q.x * q.x + q.y * q.y)
	        	);
	        console.log("right: ", oceanRatio + 
	        	oceanRatio * (q.x * q.x + q.y * q.y));
	       // console.log("islandShape: ", retVal);
	        
	        return retVal;
	    //};
	};
	this.corners = [];
	this.edges = [];
	this.centers = [];

	this.setIslandShape = function(is){
		m.islandShape = is;
	};

	this.assignElevations = function(){
		var lakeThreashold = 0.65;
		m.assignCornerElevations();
		m.assignOceanCoastAndLand(lakeThreashold);

		var cornerLocs = m.landCorners();
		m.redistributeElevations(cornerLocs);

        // Assign elevations to non-land corners
        _.each(m.corners,function (c){
            if (c.ocean || c.coast) {
                c.elevation = 0.0;
            }
        });

        // Polygon elevations are the average of their corners
        m.assignPolygonElevations();
	};

	this.assignCornerElevations = function(){
		var queue = []; // Array<Corner>

        _.each(m.corners, function (corner) {
            //var corner = m.corners[cidx];

            corner.water = !m.inside({x: corner.x, y:corner.y});
            console.log("corner is water: ", corner.water);
            //c.water = c.idx > 100;
        });

        _.each(m.corners, function (c) {
            // The edges of the map are elevation 0
            //var c = m.corners[cidx];
            if (c.border == true) {
                console.log("Im border");
                c.elevation = 0.0;
                queue.push(c);
            } else {
                c.elevation = Number.POSITIVE_INFINITY;
            }
        });
        // Traverse the graph and assign elevations to each point. As we
        // move away from the map border, increase the elevations. This
        // guarantees that rivers always have a way down to the coast by
        // going downhill (no local minima).
        while (queue.length > 0) {
            var c = queue.shift();
            for (var i = 0; i < c.adjacent.length; i++) {
                var sidx = c.adjacent[i];
                var s = m.corners[sidx];
                
                // Every step up is epsilon over water or 1 over land. The
                // number doesn't matter because we'll rescale the
                // elevations later.
                var newElevation = 0.01 + c.elevation;
                if (!c.water && !s.water) {
                    newElevation += 1;/*
                    if (pub.needsMoreRandomness) {
                        newElevation += pub.mapRandom.nextDouble();
                    }*/

                }
                console.log(s.elevation, "new ele: ", newElevation);
                // If this point changed, we'll add it to the queue so
                // that we can process its neighbors too.
                if (newElevation < s.elevation) {
                    s.elevation = newElevation;
                    queue.push(s);
                }
            }
        }//end while
	};//end assign corner elevation

	//point: corner.point
	this.inside = function(point){
		var retVal =  m.islandShape({ 
			//x:point.x, y:point.y
				x: 2 * (point.x / m.sz.width - 0.5),
				y: 2 * (point.y / m.sz.height - 0.5) 
			});
		console.log("is inside: ", retVal)
		return retVal;
	};

	this.assignOceanCoastAndLand = function(lakeThreshold){
		// Compute polygon attributes 'ocean' and 'water' based on the
        // corner attributes. Count the water corners per
        // polygon. Oceans are all polygons connected to the edge of the
        // map. In the first pass, mark the edges of the map as ocean;
        // in the second pass, mark any water-containing polygon
        // connected an ocean as ocean.
        var queue = []; // Array<Center>
        var p, numWater;
      
      	_.each(m.centers,function (p){
            numWater = 0;
            _.each(p.corners, function (cidx){
                var c = m.corners[cidx];
                if (c.border == true) {
                    p.border = true;
                    p.ocean = true;
                    c.water = true;
                    queue.push(p);
                }
                if (c.water) {
                    numWater += 1;
                }
            });
            p.water = (p.ocean || numWater >= p.corners.length * lakeThreshold);
        });

        while (queue.length > 0) {
            p = queue.shift();
            for (var i = 0; i < p.neighbors.length; i++) {
                var ridx = p.neighbors[i];
                var r = m.centers[ridx];
                if (r.water && !r.ocean) {
                    r.ocean = true;
                    queue.push(r);
                }
            }
        }
      
        // Set the polygon attribute 'coast' based on its neighbors. If
        // it has at least one ocean and at least one land neighbor,
        // then this is a coastal polygon.
        _.each(m.centers, function (p){
            var numOcean = 0;
            var numLand = 0;
            _.each(p.neighbors, function (ridx){
                var r = m.centers[ridx];
                numOcean += intFromBoolean(r.ocean);
                numLand += intFromBoolean(!r.water);
            });
            p.coast = (numOcean > 0) && (numLand > 0);
        });


        // Set the corner attributes based on the computed polygon
        // attributes. If all polygons connected to this corner are
        // ocean, then it's ocean; if all are land, then it's land;
        // otherwise it's coast.
        _.each(m.corners, function (c){
            var numOcean = 0;
            var numLand = 0;
            _.each(c.touches, function (pidx){
                var p = m.centers[pidx];

                numOcean += intFromBoolean(p.ocean);
                numLand += intFromBoolean(!p.water);
            });
            c.ocean = (numOcean === c.touches.length);
            c.coast = (numOcean > 0) && (numLand > 0);
            c.water = c.border || ((numLand !== c.touches.length) && !c.coast);
        });
	};

	this.assignPolygonElevations = function(){
		var sumElevation;
		_.each(m.centers, function (p){
            sumElevation = 0.0;
            _.each(p.corners, function (cidx){
                var c = m.corners[cidx];
                sumElevation += c.elevation;
            });
            p.elevation = sumElevation / p.corners.length;
        });
	};

	this.landCorners = function () {
        var locations = [];
        _.each(m.corners, function (c){
            if (!c.ocean && !c.coast) {
                locations.push(c);
            }
        });
        return locations;
    };

    this.redistributeElevations = function(locations){
    	// SCALE_FACTOR increases the mountain area. At 1.0 the maximum
        // elevation barely shows up on the map, so we set it to 1.1.
        var SCALE_FACTOR = 1.1;
        var i, y, x;

        locations.sort(function (c1, c2) {
            if (c1.elevation > c2.elevation) { return 1; }
            if (c1.elevation < c2.elevation) { return -1; }
            if (c1.idx > c2.idx) { return 1; }
            if (c1.idx < c2.idx) { return -1; }
            return 0;
        });
      
        for (i = 0; i < locations.length; i++) {
            // Let y(x) be the total area that we want at elevation <= x.
            // We want the higher elevations to occur less than lower
            // ones, and set the area to be y(x) = 1 - (1-x)^2.
            y = i / (locations.length - 1);
            // Now we have to solve for x, given the known y.
            //  *  y = 1 - (1-x)^2
            //  *  y = 1 - (1 - 2x + x^2)
            //  *  y = 2x - x^2
            //  *  x^2 - 2x + y = 0
            // From this we can use the quadratic equation to get:
            x = Math.sqrt(SCALE_FACTOR) - Math.sqrt(SCALE_FACTOR * (1 - y));
            if (x > 1.0) { x = 1.0; }  
            locations[i].elevation = x;
        }
    };
};//end map

function intFromBoolean(b){
	return b?1:0;
}


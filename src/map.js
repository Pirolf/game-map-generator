//size :{x: y:}
var Map = function(size){
	this.sz = {width: size.x, height:size.y};
	this.perlin = [];
	var m = this;
            this.oceanRatio = false;
            this.mapRandom = new prng();

	this.makePerlin = function(seed){
	    //var seed = 628708549;	
	    m.perlin = makePerlinNoise(256, 256, 1.0, 1.0, 1.0, seed, 8, 0.5);
	};
	
	//this.islandShape => this is a function
	this.islandShape = function(q){
		
                //var oceanRatio = 0.7;
                /*if(this.oceanRatio === false)*/this.oceanRatio = 0.7;
                var landRatioMinimum = 0.1;
                var landRatioMaximum = 0.5;
                this.oceanRatio = ((landRatioMaximum - landRatioMinimum) * this.oceanRatio) + landRatioMinimum;  //min: 0.1 max: 0.5
	    //q: corner
	    //return function (q) {
	    	var row = ((q.x + 1) * 128) | 0; // |0 to int
	    	var col = (((q.y + 1) * 128 ) | 0 ) & 0xff; 
           // console.log("loc x: ", q.x, " y: ", q.y)
	    	//console.log("r: " , row , ", c: " , col );

	    	var c;
	    	if (_(m.perlin[col]).isUndefined()) {
	            c = null;
	        }else{
	        	c = m.perlin[col][row] / 255.0;
	        	//console.log("color:" , c)
	        }
	        
	        var retVal = c > (this.oceanRatio + 
	        	this.oceanRatio * (q.x * q.x + q.y * q.y)
	        	);/*
	        console.log("right: ", oceanRatio + 
	        	oceanRatio * (q.x * q.x + q.y * q.y));*/
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
    //1
	this.assignElevations = function(){
                       var lakeThreashold = 0.5;
		//var lakeThreashold = this.oceanRatio / 10;
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
    //2
    this.assignMoisture = function(riverChance){
        //determine downslope paths
        m.calcDownslopes();
        m.calcWatersheds();
        m.createRivers(riverChance);
        
        m.assignCornerMoisture();
        m.redistributeMoisture(m.landCorners());
        m.assignPolygonMoisture();
    };
    //3
    this.decorateMap = function () {
        m.assignBiomes();
    };
    //4
    this.assignBiomes = function () {
        _(m.centers).each(function (p) {
            p.biome = m.getBiome(p);
        });
    };

    
    // Polygon moisture is the average of the moisture at corners
    this.assignPolygonMoisture = function () {
        var sumMoisture;
        _.each(m.centers, function (p){
            sumMoisture = 0.0;
            _.each(p.corners, function (qidx){
                var q = m.corners[qidx];
                if (q.moisture > 1.0) { q.moisture = 1.0; }
                sumMoisture += q.moisture;
            })
            p.moisture = sumMoisture / p.corners.length;
            //if(p.moisture > 0.3 && !p.water)console.log("moi: " + p.moisture)
        });
        
    };
    // Change the overall distribution of moisture to be evenly distributed.
    //corner locations
    this.redistributeMoisture = function (locations) {
        var i;
      
        locations.sort(function (c1, c2) {
            if (c1.moisture > c2.moisture) { return 1; }
            if (c1.moisture < c2.moisture) { return -1; }
            if (c1.index > c2.index) { return 1; }
            if (c1.index < c2.index) { return -1; }
            return 0;
        });
      
        for (i = 0; i < locations.length; i++) {
            locations[i].moisture = i / (locations.length - 1);
        }
    };
    // Calculate moisture. Freshwater sources spread moisture: rivers
    // and lakes (not oceans). Saltwater sources have moisture but do
    // not spread it (we set it at the end, after propagation).
    this.assignCornerMoisture = function(){
        var q, newMoisture;
        var queue = []; // Array<Corner>
        // Fresh water
        _.each(m.corners, function (q){
            if ((q.water || q.river > 0) /*&& !q.ocean*/) {
                if(q.river > 0){
                    q.moisture = Math.min(3.0, (0.2 * q.river));
                }else{
                    q.moisture = 1.0;
                }
                queue.push(q);
            } else {
                q.moisture = 0.0;
            }
        });

        while (queue.length > 0) {
            q = queue.shift();

            for (var aidx = 0; aidx  < q.adjacent.length; aidx ++) {
                var ridx = q.adjacent[aidx];
                var r = m.corners[ridx];

                newMoisture = q.moisture * 0.9;
                if (newMoisture > r.moisture) {
                    r.moisture = newMoisture;
                    queue.push(r);
                }
            }
        }
        // Salt water
        _.each(m.corners, function (q){
            if (q.ocean || q.coast) {
                q.moisture = 1.0;
            }
        });
    };
    // Calculate downslope pointers.  At every point, we point to the
    // point downstream from it, or to itself.  This is used for
    // generating rivers and watersheds.
    this.calcDownslopes = function () {
        var r;
      
        _(m.corners).each(function (q) {
            r = q;
            _(q.adjacent).each(function (s) {
                if (m.corners[s].elevation <= r.elevation) {
                    r = m.corners[s];
                }
            });
            q.downslope = r.idx;
        });
    };

    // Calculate the watershed of every land point. The watershed is
    // the last downstream land point in the downslope graph.
    this.calcWatersheds = function(){
        var r, i, changed;
      
        // Initially the watershed pointer points downslope one step.    
        for(i=0; i < m.corners.length; i++){
            var cor = m.corners[i];
            cor.watershed = i;
            if(!cor.ocean && !cor.coast){
                cor.watershed = cor.downslope;
            }
        }
        // Follow the downslope pointers to the coast. Limit to 100
        // iterations although most of the time with numPoints==2000 it
        // only takes 20 iterations because most points are not far from
        // a coast. 

        var cornerIndex, cor, ws;//watershed
        for (i = 0; i < 100; i++) {
            changed = false;
            for (cornerIndex = 0; cornerIndex < m.corners.length; cornerIndex++) {
                cor = m.corners[cornerIndex];

                if (!cor.ocean && !cor.coast && !(m.corners[cor.watershed]).coast) {
                    r = (m.corners[cor.downslope]).watershed;//this is an index
                    ws = m.corners[r];
                    if (!ws.ocean) { cor.watershed = r; }
                    changed = true;
                }
            }
            if (!changed) { break; }
        }
        // How big is each watershed?
        for (cornerIndex = 0; cornerIndex < m.corners.length; cornerIndex++) {
            cor = m.corners[cornerIndex];
            r = cor.watershed;
            m.corners[r].watershedSize = 1 + (m.corners[r].watershedSize || 0);
        }
        console.log("clac watersheds done");
    };

    // Create rivers along edges. Pick a random corner point,
    // then move downslope. Mark the edges and corners as rivers.
    // riverChance: Higher = more rivers.
    // riverChance: 0 = no rivers, > 0 = more rivers, default = map area / 4
    this.createRivers = function(riverChance){
        //riverChance 
        //= core.coalesce(riverChance, core.toInt((pub.SIZE.width + pub.SIZE.height) / 4));

        riverChance = ((m.sz.width + m.sz.height) / 4.0) | 0;

        var i, q, edge;
      
        for (i = 0; i < riverChance; i++) {

            q = m.corners[m.mapRandom.nextIntRange(0, m.corners.length - 1)];
            //console.log(q.idx);
            if (q.ocean || q.elevation < 0.3 || q.elevation > 0.9) { continue; }
            // Bias rivers to go west: if (q.downslope.x > q.x) continue;
            var j = 0;
            while(!q.coast && j < 50) {
                if (q.idx === q.downslope) {
                    break;
                }
                var cor = m.corners[q.downslope];
                edge = m.lookupEdgeFromCorner(q, cor);
                //if(edge === null){break;}
                edge.river = edge.river + 1;
                q.river = (q.river || 0) + 1;
                m.corners[q.downslope].river 
                    = (m.corners[q.downslope].river || 0) + 1;  

                q = m.corners[q.downslope];
                j++;
            }
        }
        console.log("create rivers done");
    };
    this.lookupEdgeFromCorner = function (q, s) {
        for (var i = 0; i < q.protrudes.length; i++) {
            var eidx = q.protrudes[i];
            var edge = m.edges[eidx];

            if (edge.v0 === s.idx || edge.v1  === s.idx) { return edge; }
        }
        return null;
    };
    this.assignCornerElevations = function(){
	var queue = []; // Array<Corner>

        _.each(m.corners, function (corner) {
            corner.water = !m.inside({x: corner.x, y:corner.y});
        });

        _.each(m.corners, function (c) {
            // The edges of the map are elevation 0
            if (c.border ===true) {
                //console.log("Im border");
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
                //console.log(s.elevation, "new ele: ", newElevation);
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
			x: 2 * (point.x / m.sz.width - 0.5),
			y: 2 * (point.y / m.sz.height - 0.5) 
		});
	//console.log("is inside: ", retVal)
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
                if (c.border) {
                    p.border = true;
                    p.ocean = true;
                    c.water = true;
                    queue.push(p);
                }
                if (c.water === true) {
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
                if (r.water === true && r.ocean === false) {
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
                numOcean += intFromBoolean(r.ocean || r.water);
                numLand += intFromBoolean(!r.water);
            });
            p.coast = (numOcean > 0) && (numLand > 0);
            if(p.coast === true)console.log("coast");
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
    // Assign a biome type to each polygon. If it has
    // ocean/coast/water, then that's the biome; otherwise it depends
    // on low/high elevation and low/medium/high moisture. This is
    // roughly based on the Whittaker diagram but adapted to fit the
    // needs of the island map generator.
    this.getBiome = function (p) {
        if (p.ocean === true) {
            //console.log("ocean");
            return 'OCEAN';
        } else if (p.water === true) {
            //if (p.elevation < 0.1) { return 'MARSH'; }
            if (p.elevation > 0.8) { return 'ICE'; }
            return 'LAKE';
        } else if (p.coast === true) {
            return 'BEACH';
        } else if (p.elevation > 0.9) {
            //return 'SNOW';
            if (p.moisture > 0.50) { return 'SNOW'; }
            else if (p.moisture > 0.01) { return 'TUNDRA'; }
            else if (p.moisture > 0.01) { return 'BARE'; }
            else { return 'SCORCHED'; }
        } else if (p.elevation > 0.75) {
            //return 'TAIGA';
            if (p.moisture > 0.36) { return 'TAIGA'; }
            else if (p.moisture > 0.01) { return 'SHRUBLAND'; }
            else { return 'TEMPERATE_DESERT'; }
        } else if (p.elevation > 0.4) {
            //return 'TEMPERATE_DECIDUOUS_FOREST';
            if (p.moisture > 0.5) { return 'TEMPERATE_RAIN_FOREST'; }
            else if (p.moisture > 0.3) { return 'TEMPERATE_DECIDUOUS_FOREST'; }
            else if (p.moisture > 0.01) { return 'GRASSLAND'; }
            else { return 'TEMPERATE_DESERT'; }
        } else {
            //return 'TROPICAL_SEASONAL_FOREST';
            if (p.moisture > 0.5) { return 'TROPICAL_RAIN_FOREST'; }
            else if (p.moisture > 0.1) { return 'TROPICAL_SEASONAL_FOREST'; }
            else if (p.moisture > 0.05) { return 'GRASSLAND'; }
            else { return 'SUBTROPICAL_DESERT'; }
        }
    };
};//end map

function intFromBoolean(b){
	return b?1:0;
}


const 
    width = 1000,
		height = 600;
		
const svg = d3.select('#map')
	.append('svg')
	.attr('width', width)
	.attr('height', height);

var usaMap = svg
	.append("g")
	.attr("id", "mapGroup");

const USATOPO = "https://d3js.org/us-10m.v1.json";

d3.json(USATOPO)
	.then(usa => {

		usaMap.selectAll("path")
			.data(topojson.feature(usa, usa.objects.states).features)
			.enter().append("path")
			.attr("d", d3.geoPath())
			.style('fill', 'lightgray')
			.style('stroke', 'white')
			.on('mouseover', function(d) {
				d3.select(this)
					.style('fill', 'rgb(255, 220, 149)');
			})
			.on('mouseout', function(d) {
				d3.select(this)
					.style('fill', 'lightgray');
			});
	})
	.catch(exception => {console.log(exception);});

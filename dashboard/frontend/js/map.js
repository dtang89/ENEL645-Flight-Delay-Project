const 
	width = 1000,
	height = 600,
	USATOPO = './frontend/lib/us-10m.v1.json',
	svg = d3.select('#map')
		.append('svg')
		.attr('width', width)
		.attr('height', height);

var usaMap = svg.append('g');

d3.json(USATOPO)
	.then(usa => {
		usaMap.selectAll('path')
			.data(topojson.feature(usa, usa.objects.states).features)
			.enter().append('path')
			.attr('d', d3.geoPath())
			.attr('class', 'usaMap');
	})
	.catch(exception => {console.log(exception);});

const DATAPATH = './frontend/FeaturesLabels201001.csv'

d3.csv(DATAPATH, d=>{
  var formatTime = d3.timeFormat('%Y-%m')
  d.date = formatTime(new Date(+d.YEAR, +d.MONTH-1))
  return d;
})
	.then(d => {
		console.log(d);
	})
  .catch(exception => {console.log(exception);})

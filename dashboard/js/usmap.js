class Usmap{
  constructor(){

    this.offsetX = 0;
    this.offsetY = 0;
    this.mapWidth = 1600;
    this.mapHeight = 1050;

    this.projection = d3.geoAlbersUsa()
      .translate([this.mapWidth / 2, this.mapHeight / 2])
      .scale([this.mapWidth * 1.36]);
    
  }

  importData(airports) {

    this.airports = airports;
    this.airportsmap = {};

    for (let i = 0; i < this.airports.length; i++) {
      if (this.projection([this.airports[i].lon, this.airports[i].lat]) == null) {
        this.airports.splice(i, 1);
        i--;
      }
      else {
        this.airportsmap[this.airports[i].iata_code] = this.projection([this.airports[i].lon, this.airports[i].lat]);
      }
    }
  }

  makeMap(){
    let projection = this.projection;

    //Set map to be responsive
    let usmap = d3.select("#usmap")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", this.offsetX+" "+this.offsetY+" "+this.mapWidth+" "+this.mapHeight)

    //draw map
    let path = d3.geoPath()
      .projection(projection);

    let pathgroup = usmap.append("g")
      .attr("id", "path");

    d3.json("dataset/us-states.json", function(json) {
      pathgroup.selectAll("path")
        .data(json.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "mappath");
    });

    //draw legend
    let linearSize = d3.scaleOrdinal()
      .domain(["Small Airport", "Medium Airport", "Large Airport"])
      .range([2, 5, 15]);

    let legendgroup = usmap.append("g")
      .attr("id", "maplegend")
      .attr("transform", "translate("+ this.mapWidth * 0.87+","+ this.mapHeight * 0.7 +")");

    let legendSize = d3.legendSize()
      .scale(linearSize)
      .shape('circle')
      .shapePadding(20)
      .labelOffset(10)
      .orient('vertical');

    legendgroup.call(legendSize);

    // Delay probability tooltip
    d3.select('body')
      .append('div')
        .attr('class', 'route-tip');
  }

  makeSpots() {
    let airports = this.airports;
    let airportsmap = this.airportsmap;
    let projection = this.projection;

    let updateSpots = this.updateSpots;
    let updateLine = this.updateLine;
    let updateInfo = this.updateInfo;
    let updateSummary = this.updateSummary;

    let usmap = d3.select("#usmap");

    //creading tooltip
    let tip = d3.tip()
      .attr('class', 'force-tip')
      .offset([-10, -5])
      .html(function(d) {
        return "<h8><strong>"+ d.name+"</strong></h8>"+
            "<table>"+
            "<tr>"+
            "<td class='tooltipindex'>City: </td>"+
            "<td>"+d.municipality+", "+d.iso_region.slice(3)+"</td>"+
            "</tr>"+
            "</table>";
      })
    usmap.call(tip);

    //remove elements first
    usmap.select("#spots").remove();
    usmap.select("#routes").remove();

    //draw spots
    let spotsGroup = usmap.append("g")
      .attr("id", "spots");
    let spots = spotsGroup.selectAll("circle")
      .data(airports);
    spots.enter().append("circle")
      .attr("cx", function (d) {
        return projection([d.lon, d.lat])[0];
      })
      .attr("cy", function (d) {
        return projection([d.lon, d.lat])[1];
      })
      .attr("r", function (d) {
        if (d.type == "small_airport") return 2;
        else if (d.type == "medium_airport") return 5;
        else if (d.type == "large_airport") return 15;
        else return 0;
      })
      .attr("class", d => {return d.iata_code === 'IAH' ? 'spotIAH' : 'spot'})
      .on("mouseover", tip.show)
      .on("mouseout", tip.hide)
      .on("click", function (d) {
        updateSpots(d, d3.select(this));
        updateLine(d, projection, airportsmap);
        updateInfo(d);
        updateSummary(d);
        let checkbox = document.getElementById('checkboxTomCruise');
        if (checkbox.checked){
          let audio = new Audio('./audio/top-gun-quote.mp3');
          audio.play();
        }
      });
  }

  clearRoutes() {
    d3.select("#routes").remove();

    d3.select("#spots").selectAll("circle")
        .attr("class", d => {return d.iata_code === 'IAH' ? 'spotIAH' : 'spot'});
    d3.select("#force").selectAll("circle")
        .attr("class", "forcenode")
    d3.select("#force").selectAll("line")
        .attr("class", "forcelink")
  }

  simulateClick(d, x) {
    this.updateSpots(d, x);
    this.updateLine(d, this.projection, this.airportsmap);
    this.updateInfo(d);
    this.updateSummary(d);
  }

  updateSpots(d, x) {
    //remove class for all the spots
    d3.select("#spots").selectAll("circle")
      .attr("class", d => {return d.iata_code === 'IAH' ? 'spotIAH' : 'spot'});
    d3.select("#force").selectAll("circle")
      .attr("class", "forcenode")

    //set class for the selected spots on the map
    x.attr("class", "clicked");

    //set class for the selected spots on the other map
    if (d.Count == null) {
      d3.select("#force").selectAll("circle")
        .classed("clicked", function (n) {
          return n.iata_code == d.iata_code;
        })
    } else {
      d3.select("#spots").selectAll("circle")
        .classed("clicked", function (n) {
          return n.iata_code == d.iata_code;
        })
    }
  }

  updateLine(d, projection, airportsmap) {
    d3.select("#routes").remove();
    d3.select('#tomCruise-img').remove();

    let routesGroup = d3.select("#usmap").append("g")
      .attr("id", "routes");

    d3.csv("dataset/airportconnection.csv", function (connections) {
      let airportconnection = connections.filter(function (c) {
        return c.Origin == d.iata_code;
      });
      let routes = routesGroup.selectAll("line")
        .data(airportconnection);

      routes
        .enter()
        .append('line')
          .on('click', (a)=>{
            let x = event.pageX,
              y = event.pageY;
            var dest = a.Dest === 'IAH' ? a.Origin : a.Dest;
            d3.csv('dataset/new_summary.csv', function(summary){
              let data = null;
              for (let i = 0; i < summary.length; i++) {
                if (dest === summary[i].DEST) {
                  data = summary[i];
                  break;
                }
              }
              d3.select('.route-tip')
                .style('left', x+'px')
                .style('top', y-50+'px')
                .style('opacity', 0.8)
                .html(`${data.ORIGIN} to ${data.DEST} has a 
                  ${parseFloat((1-data.ON_TIME/data.TOTAL)*100).toFixed(2)}
                  % chance of being delayed!`
                )
                .transition()
                .delay(2000)
                .duration(1500)
                .style('opacity',0);
            });
          })
          .style('pointer-events', 'all')
          .attr("x1", function () {
            return projection([d.lon, d.lat])[0];
          })
          .attr("y1", function () {
              return projection([d.lon, d.lat])[1];
          })
          .attr("x2", function () {
            return projection([d.lon, d.lat])[0];
          })
          .attr("y2", function () {
            return projection([d.lon, d.lat])[1];
          })
          .transition()
          .duration(1000)
          .delay((d,i)=>(i-1)*25)
          .attr("x2", function (a) {
            let dest = airportsmap[a.Dest];
            return dest == null ? projection([d.lon, d.lat])[0] : dest[0];
          })
          .attr("y2", function (a) {
            let dest = airportsmap[a.Dest];
            return dest == null ? projection([d.lon, d.lat])[1] : dest[1];
          })
          .attr("class", "route");
          

      let checkbox = document.getElementById('checkboxTomCruise');
      if (checkbox.checked){
        d3.select('#usmap').append('g')
          .attr('id', 'tomCruise-img')
          .selectAll('#tomCruise')
          .data(airportconnection)
          .enter()
          .append('svg:image')
            .attr('id', 'tomCruise')
            .attr('x', projection([d.lon, d.lat])[0] - 25)
            .attr('y', projection([d.lon, d.lat])[1] - 25)
            .style('opacity', 1)
            .style('pointer-events', 'none')
            .attr('width', 50)
            .attr('height', 50)
            .attr('xlink:href', 'https://pixel.nymag.com/imgs/daily/vulture/2017/06/14/14-tom-cruise.w700.h700.jpg')
            .transition()
            .duration(1000)
            .delay((d,i) =>(i-1)*25)
            .attr("x", function (a) {
              let dest = airportsmap[a.Dest];
              let end = dest == null ? projection([d.lon, d.lat])[0] : dest[0]
              return end - 25;
            })
            .attr("y", function (a) {
              let dest = airportsmap[a.Dest];
              let end =  dest == null ? projection([d.lon, d.lat])[1] : dest[1]
              return end - 25;
            })
            .transition()
            .duration(100)
            .delay(100)
            .style('opacity', 0);
        }
      });
  }

  updateInfo(d) {
    let card = d3.select("#paneldiv")
      .attr("class", "col-xl-3 card panel panelafter")
    let title = d3.select("#card_title")
      .text(d.name)
    let code = d3.select("#card_code")
      .text("IATA: "+d.iata_code+"\xa0\xa0\xa0\xa0\xa0"+"ICAO: "+d.icao_code)
    let municipality = d3.select('#card_municipality')
      .text(d.municipality+", "+d.iso_region.substring(3))

    let point = new GeoPoint(Math.abs(d.lon), Math.abs(d.lat));
    let longitude = d3.select("#card_longitude")
      .text(point.getLonDeg() + (d.lon < 0 ? 'W' : 'E'))
    let latitude = d3.select("#card_latitude")
      .text(point.getLatDeg() + (d.lat < 0 ? 'S' : 'N'))

    let elevation = d3.select("#card_elevation")
      .text(d.elevation_ft+" ft")
  }

  updateSummary(d) {

    //remove elements first
    d3.select("#piechart").selectAll("g").remove();
    d3.select("#cardlist").selectAll(".litoberemoved").remove();

    //fetch the corresponding data from summary.csv regarding the iata_code
    d3.csv("dataset/new_summary.csv", function (summary) {
      let data = null;
      for (let i = 0; i < summary.length; i++) {
        if (d.iata_code === summary[i].DEST) {
          data = summary[i];
          break;
        }
      }
      if (data == null) {
        return;
      }

      //annual flights
      let count = d3.select("#cardlist").append("li")
        .attr("class", "list-group-item reducedpadding litoberemoved")
      count.append("span")
        .attr("class", "font-weight-bold")
        .text("Total Flights: ")
      let countTable = count.append("table")
        .attr("class", 'inlinetable')
      countTable.append("tr").append("td")
        .text(data.TOTAL+" (departure)");


      //15min delay rate
      let _15min = d3.select("#cardlist").append("li")
        .attr("class", "list-group-item reducedpadding litoberemoved")
      _15min.append("span")
        .attr("class", "font-weight-bold")
        .text("15+ min Delay: ")
      let _15minTable = _15min.append("table")
        .attr("class", 'inlinetable')
      _15minTable.append("tr").append("td")
        .text((parseFloat(data.DELAYED15MIN / data.TOTAL) * 100).toFixed(2)+"% (departure)");

      //cancel rate
      let cancel = d3.select("#cardlist").append("li")
        .attr("class", "list-group-item reducedpadding litoberemoved")
      cancel.append("span")
        .attr("class", "font-weight-bold")
        .text("Cancel Rate: ")
      cancel.append("span")
        .text((parseFloat(data.CANCELLED / data.TOTAL) * 100).toFixed(2)+"%")

      //cause of delay
      let cause = d3.select("#cardlist").append("li")
        .attr("class", "list-group-item reducedpadding litoberemoved")
      cause.append("span")
        .attr("class", "font-weight-bold")
        .text("Delay Types:")

      let dataset = [
          {legend: "Delayed 15+ min", value: data.DELAYED15MIN},
          {legend: "Diverted", value: data.DIVERTED},
          {legend: "Cancelled", value: data.CANCELLED},
      ];

      let width = 400;
      let height = 220;
      let colorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(Array.from(dataset, function (d) {
          return d.legend
        }));

      //Set piechart to be responsive
      let piechart = d3.select("#piechart")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox","0 0 "+width+" "+height);

      //creading tooltip
      let tip = d3.tip()
        .attr('class', 'pie-tip')
        .offset([0, 0])
        .html(function(d) {
          return "<span><strong>"+ d.data.legend+": </strong></span>"+
                  "<span>"+ (d.data.value)+" Flights</span>"
        })
      piechart.call(tip);

      //draw pie chart
      let chartgroup = piechart.append("g")
        .attr("transform", "translate(100, 120)");

      let arc = d3.arc()
        .outerRadius(80)
        .innerRadius(0);

      let pie = d3.pie()
        .sort(null)
        .value(function (d) {
            return d.value;
        });

      let groups = chartgroup.selectAll("g")
        .data(pie(dataset))
        .enter()
        .append("g");

        //draw legend
      let legendgroup = piechart.append("g")
        .attr("transform", "translate(220, 70)");

      let legendOrdinal = d3.legendColor()
        .shape("path", d3.symbol().type(d3.symbolSquare).size(100)())
        .shapePadding(7)
        .scale(colorScale);

      legendgroup.call(legendOrdinal);

      groups.append("path")
        .attr("d", arc)
        .attr("stroke", "#FFFFFF")
        .attr("fill", function (d) {
            return colorScale(d.data.legend);
        })
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide)
        .transition()
        .duration(1000)
        .attrTween('d', d => {
          var i = d3.interpolate(d.startAngle, d.endAngle);
          return (t) => {
              d.endAngle = i(t);
          return arc(d);
        }});
    });
  }
}
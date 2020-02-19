// Tooltip
// =======
var tooltip = d3.select("body").append("div")
    .attr("class", "hidden tooltip")
var hoveredCountryIdx = 0;

// Grille
// ======
var gridMargin = { top: 40, right: 40, bottom: 50, left: 40 },
    gridWidth = 900 - gridMargin.left - gridMargin.right,
    gridHeight = 600 - gridMargin.top - gridMargin.bottom;

var grid = d3.select("#grid")
    .append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 " + (gridWidth + gridMargin.left + gridMargin.right) + " " + (gridHeight + gridMargin.top + gridMargin.bottom))
    .classed("svg-content-responsive", true)
    .append("g")
    .attr("transform", "translate(" + gridMargin.left + ", " + gridMargin.top + ")")
    .attr("class", "grid")

// Chart
// =====
var chartMargin = { top: 40, right: 40, bottom: 50, left: 40 },
	chartWidth = 900 - chartMargin.left - chartMargin.right,
    chartHeight = 600 - chartMargin.top - chartMargin.bottom;

var chart = d3.select("#chart")
	.append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 " + (chartWidth + chartMargin.left + chartMargin.right) + " " + (chartHeight + chartMargin.top + chartMargin.bottom))
    .classed("svg-content-responsive", true)
    .append("g")
    .attr("transform", "translate(" + gridMargin.left + ", " + gridMargin.top + ")")
    .attr("class", "chart")

// Echelles
// ========
// Grid: Couleur des températures
var color = d3.scaleSequential().interpolator(d3.interpolateTurbo);

// Chart: Axe Y des températures
var tempeartureScale = d3.scaleLinear().range([chartHeight, 0]);

// Chart: Axe X du temps
var yearScale = d3.scaleLinear().range([0, chartWidth]);

// Autres variables
// ================
var data = [];
var rememberRecord = 30;
var tempToShow = "";
var clickedCountryIdx = undefined;

// Charger le fichier : il faudrait qu'on puisse charger différents fichiers et laisser l'utilisateur choisir s'il veut des villes ou des pays
d3.csv("https://raw.githubusercontent.com/vdng/heat-bulbs/dev-vincent/GlobalLandTemperaturesByCountry.csv", function(data_csv) {

    // Parse le temps : 1985-10-23
    var parse = d3.timeParse("%Y-%m-%d");
    var minYear = 2000, maxYear = 0;
    var minTemp = 50, maxTemp = -50;

    data_csv.forEach(d => {
        d.dt = parse(d.dt);
        let year = d.dt.getFullYear();
        d.AverageTemperature = d.AverageTemperature ? Number(d.AverageTemperature) : null; 
        d.AverageTemperatureUncertainty = d.AverageTemperatureUncertainty? Number(d.AverageTemperatureUncertainty) : null; 
        let temp = d.AverageTemperature;
        if (year < minYear) minYear = year;
        if (year > maxYear) maxYear = year;
        if (temp < minTemp) minTemp = temp;
        if (temp > maxTemp) maxTemp = temp;
    })

    console.log("data_csv", data_csv);

    color.domain([minTemp, maxTemp]);
    tempeartureScale.domain([minTemp, maxTemp]);
    yearScale.domain([minYear, maxYear]);

    var xAxis = d3.axisBottom().scale(yearScale);
    var yAxis = d3.axisLeft().scale(tempeartureScale);

    console.log('minYear', minYear, 'maxYear', maxYear);
    console.log('minTemp', minTemp, 'maxTemp', maxTemp);

    // nest pour formater les données
    var dataPerCountry = d3.nest()
        .key(d => d.Country)
        .entries(data_csv)

    var countries = dataPerCountry.map(d => d.key);

    console.log('countries', countries);
    console.log('dataPerCountry', dataPerCountry);


    // TODO éventuellement : dynamique sur pas que les années mais aussi par saison ou autre période
    var tempPerCountryPerYear = d3.nest()
        .key(d => d.Country)
        .key(d => d.dt.getFullYear())
        .rollup(d => { return d3.mean(d, function(e) { return e.AverageTemperature; }) })
        .entries(data_csv)

    console.log('tempPerCountryPerYear', tempPerCountryPerYear);

    var limitPerCountry = d3.nest()
        .key(d => d.Country)
        .rollup(d => { return { 'minYear': d3.min(d, v => v.dt.getFullYear()), 
        						'maxYear': d3.max(d, v => v.dt.getFullYear()), 
        						'minTemp': d3.min(d, v => v.AverageTemperature), 
        						'maxTemp': d3.max(d, v => v.AverageTemperature) 
        					  } 
        			  })
        .entries(data_csv)


    console.log('limitPerCountry', limitPerCountry)

    for (var i = 0; i < countries.length; i++) {
        data[i] = {
            "country": countries[i],
            "yearTemperatures": tempPerCountryPerYear[i].values,
            "currentMax": tempPerCountryPerYear[i].values[0].value,
            "lastBeaten": rememberRecord,
            "currentYearAvailable": false,
            "minYear": limitPerCountry[i].value.minYear,
            "maxYear": limitPerCountry[i].value.maxYear,
            "minTemp": limitPerCountry[i].value.minTemp,
            "maxTemp": limitPerCountry[i].value.maxTemp        }
    }

    console.log('data', data);


    // Création de la grille
    var n = Math.ceil(Math.sqrt(data.length)); // Nombre de colonnes
    var square_length = Math.floor(gridWidth / n); // longueur d'un côté d'un carré de la grille
    var rect_width = Math.floor(gridWidth / n);
    var rect_height = Math.floor(gridHeight / n);

    //console.log(maxPerCountry);

	var line = d3.line()
		.x(v => yearScale(v.key))
		.y(v => tempeartureScale(v.value))
		.curve(d3.curveCardinal);

	line.defined(d => d.value != null)

    //Grille par défaut
    grid.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("width", rect_width)
        .attr("height", rect_height)
        .attr("x", (d, i) => rect_width * (i % n))
        .attr("y", (d, i) => rect_height * Math.floor(i / n))
        .attr("stroke", "none")
        .attr("fill", "white")
        .on('mouseover', function(d, i) {
            d3.select(this)
                .attr("stroke", "black")

            tempToShow = d.currentYearAvailable ? showTemp(d.yearTemperatures[0].value) : ""

            tooltip
                .classed("hidden", false)
                .html(countries[i] + '<br>' + tempToShow);

            hoveredCountryIdx = i;
        })
        .on('mouseout', function(d, i) {
            tooltip.classed("hidden", true);
            d3.select(this)
                .attr("stroke", "none")
        })
        .on('mousemove', function() {
            tooltip.attr("style", "left:" + (d3.event.pageX + 5) + "px; top:" + (d3.event.pageY - 60) + "px");
        })
        .on('click', function(d, i) {
        	clickedCountryIdx = i;

        	tempeartureScale.domain([d.minTemp, d.maxTemp])
        	chart.select(".y-axis")
        		.transition()
        		.duration(200)
        		.call(yAxis)

        	chart.select("path")
        		.data([d.yearTemperatures])
        		.transition()
        		.duration(200)
        		.attr("d", line)
        })

    //Modification de l'affichage de la grille à chaque frame
    var yearCount = 0;
    var numYear = maxYear - minYear;

    let windowsDuration = 100;
    setInterval(update, windowsDuration) // Durée d'affichage de chaque année

    function update() {
    	// Parcours des pays pour voir si on dépasse le max
        // Pour le moment, pas ouf : les premières frames affichent beaucoup d'ampoules allumées. C'est normal, il y a beaucoup de chances de casser son record quand on n'a peu de données : il faudrait pas commencer de la première année mais de la n-ème années en initialisant le max au max des 50 premières années
        //Bug à partir de 60 ans : trouver pourquoi
        for (var i = 0; i < countries.length; i++) 
        {
            /*if (data[i].yearTemperatures[yearCount] != undefined) */
            if (data[i].minYear - minYear <= yearCount) 
            {
                data[i].currentYearAvailable = true;
	            if (data[i].currentMax < data[i].yearTemperatures[yearCount + minYear - data[i].minYear].value) 
	            { // Si on dépasse le max
	                data[i].currentMax = data[i].yearTemperatures[yearCount + minYear - data[i].minYear].value;
	                data[i].lastBeaten = 0; // Conseil donné par Théo (pas moi, le doctorant) : faire le calcul du booléen maintenant et pas sur le moment de l'affichage
	            } 
	            else
	            {
	                data[i].lastBeaten += 1;
	            }
	        }
            else
            {
                data[i].currentYearAvailable = false;
	            data[i].lastBeaten += 1;
            }
        }

        grid.selectAll("rect")
            .transition()
            .duration(windowsDuration)
            .attr("fill", (d, i) => {
                // Allumage ou pas de la case
                if (!d.currentYearAvailable) return "#eee"
                if (d.lastBeaten < rememberRecord) return color(Number(d.yearTemperatures[yearCount + minYear - d.minYear].value))
                else return d3.color('white')
            })
            .attr("fill-opacity", (d, i) => {
                if (!d.currentYearAvailable) return 1;
                return d.lastBeaten < rememberRecord ? 1 - d.lastBeaten / rememberRecord : 0
            })

        // Affichage texte de l'année
        d3.select('#year').html('Année : ' + (minYear + yearCount))

        let hoveredCountry = data[hoveredCountryIdx];
        tempToShow = hoveredCountry.currentYearAvailable ? showTemp(hoveredCountry.yearTemperatures[yearCount + minYear - hoveredCountry.minYear].value) : ""
        tooltip.html(hoveredCountry.country + '<br>' + tempToShow);
        /*            if (hoveredCountryIdx != undefined){
                        var d = data[hoveredCountryIdx];
                        var tempToShow = '';
                                if (d.currentYearAvailable){
                                    tempToShow = Math.floor(10 * d.yearTemperatures[minYear + yearCount]) / 10 + '°C';
                                } 

                        tooltip.html(d.country+'<br>'+tempToShow);
                    }*/

        if (clickedCountryIdx != undefined) 
        {
        	let clickedCountry = data[clickedCountryIdx];
        	chart.select("circle")
        		.transition()
        		.duration(200)
        		.attr("cx", yearScale(minYear + yearCount))
        		.attr("cy", v => clickedCountry.currentYearAvailable ? tempeartureScale(clickedCountry.yearTemperatures[yearCount + minYear - clickedCountry.minYear].value) : tempeartureScale(0))
        }

        yearCount++;

        if (yearCount % numYear == 0) 
        {
        	console.log("reset")
        	yearCount = 0;
            for (var i = 0; i < countries.length; i++) 
            {
                data[i].currentMax = tempPerCountryPerYear[i].values[0].value;
                data[i].lastBeaten = rememberRecord;
                data[i].currentYearAvailable = false;
            }
        }
    } // function update()

    // Chart
    // =====
    chart.append("path")
		.attr("fill", "none")
		.attr("stroke", "#3ac")
		.attr("stroke-width", 2)

    chart.append("g")
    	.attr("class", "x-axis")
    	.attr("transform", "translate(0, " + chartHeight + ")")
		.call(xAxis)

	chart.append("g")
	    .attr("class", "y-axis")
	    .call(yAxis)

	chart.append("circle")
		.attr("r", 5)
		.attr("fill", "blue")
		.attr("stroke", "blue")
})

function showTemp(temp) {
    return Math.floor(10 * temp) / 10 + '°C'
}
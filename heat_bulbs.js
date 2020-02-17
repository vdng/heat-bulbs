var margin = { top: 40, right: 40, bottom: 50, left: 40 },
    width = 900 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

var tooltip = d3.select("body").append("div")
    .attr("class", "hidden tooltip")
var currentCountryIndice;

// Grille
var grid = d3.select(".svg-container")
    .append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
    .classed("svg-content-responsive", true)
    .append("g")
    .attr("transform", "translate(" + margin.left + ", " + margin.top + ")")
    .attr("class", "grid")


// Echelle de couleur pour les temperatures (juste pour le début, pour visualiser l'évolution des températures sans notion de record)
var color = d3.scaleSequential().interpolator(d3.interpolateTurbo);

var data = [];
var rememberRecord = 30;
var tempToShow = "";

// Charger le fichier : il faudrait qu'on puisse charger différents fichiers et laisser l'utilisateur choisir s'il veut des villes ou des pays
d3.csv("https://raw.githubusercontent.com/vdng/heat-bulbs/dev-vincent/GlobalLandTemperaturesByCountry.csv", function(data_csv) {

    // Parse le temps : 1985-10-23
    var parse = d3.timeParse("%Y-%m-%d");
    var minYear = 2000,
        maxYear = 0;
    var minTemp = 50,
        maxTemp = -50;

    data_csv.forEach(d => {
        d.dt = parse(d.dt);
        let year = d.dt.getFullYear();
        let temp = Number(d.AverageTemperature);
        if (year < minYear) minYear = year;
        if (year > maxYear) maxYear = year;
        if (temp < minTemp) minTemp = temp;
        if (temp > maxTemp) maxTemp = temp;
    })


    color.domain([minTemp, maxTemp]);

    console.log('minYear', minYear, 'maxYear', maxYear);
    console.log('minTemp', minTemp, 'maxTemp', maxTemp);

    // nest pour formater les données
    var dataPerCountry = d3.nest()
        .key(d => d.Country)
        .entries(data_csv)

    var countries = dataPerCountry.map(d => d.key);

    console.log('countries', countries);
    console.log('dataPerCountry', dataPerCountry);


    // TODO : Mettre NULL si pas de donnée 
    // TODO éventuellement : dynamique sur pas que les années mais aussi par saison ou autre période
    //Nest pour formater les données : regroupées par pays et par année (et on a la moyenne de l'année)
    var tempPerCountryPerYear = d3.nest()
        .key(d => d.Country)
        .key(d => d.dt.getFullYear())
        .rollup(d => { return d3.mean(d, function(e) { return e.AverageTemperature; }) })
        .object(data_csv)

    console.log('tempPerCountryPerYear', tempPerCountryPerYear);

    var limitPerCountry = d3.nest()
        .key(d => d.Country)
        .rollup(d => { return { 'minYear': d3.min(d, v => v.dt.getFullYear()), 'maxYear': d3.max(d, v => v.dt.getFullYear()) } })
        .object(data_csv)


    console.log('limitPerCountry', limitPerCountry)

    // TODO : année de référence
    for (var i = 0; i < countries.length; i++) {
        data[i] = {
            "country": countries[i],
            "yearTemperatures": tempPerCountryPerYear[countries[i]],
            "currentMax": tempPerCountryPerYear[countries[i]][limitPerCountry[countries[i]].minYear],
            "lastBeaten": rememberRecord,
            "currentYearAvailable": false,
            "minYear": limitPerCountry[countries[i]].minYear,
            "maxYear": limitPerCountry[countries[i]].maxYear
        }
    }

    console.log('data', data);


    // Création de la grille
    var n = Math.ceil(Math.sqrt(data.length)); // Nombre de colonnes
    var square_length = Math.floor(width / n); // longueur d'un côté d'un carré de la grille
    var rect_width = Math.floor(width / n);
    var rect_height = Math.floor(height / n);

    //console.log(maxPerCountry);

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

            tempToShow = d.currentYearAvailable ? showTemp(d.yearTemperatures[minYear + yearCount % numYear]) : ""

            tooltip
                .classed("hidden", false)
                .html(countries[i] + '<br>' + tempToShow);

            currentCountryIndice = i;
        })
        .on('mouseout', function(d, i) {
            tooltip.classed("hidden", true);
            d3.select(this)
                .attr("stroke", "none")
        })
        .on('mousemove', function() {
            tooltip.attr("style", "left:" + (d3.event.pageX + 5) + "px; top:" + (d3.event.pageY - 60) + "px");
        })

    //Modification de l'affichage de la grille à chaque frame
    var yearCount = 0;
    var numYear = maxYear - minYear;

    let windowsDuration = 100;
    setInterval(update, windowsDuration) // Durée d'affichage de chaque année

    function update() {
        grid.selectAll("rect")
            .transition()
            .duration(windowsDuration)
            .attr("fill", (d, i) => {
                // Allumage ou pas de la case
                if (!d.currentYearAvailable) return "#eee"
                if (d.lastBeaten < rememberRecord) return color(Number(d.yearTemperatures[minYear + yearCount % numYear]))
                else return d3.color('white')
            })
            .attr("fill-opacity", (d, i) => {
                if (!d.currentYearAvailable) return 1;
                return d.lastBeaten < rememberRecord ? 1 - d.lastBeaten / rememberRecord : 0
            })

        // Affichage texte de l'année
        d3.select('#year').html('Année : ' + (minYear + yearCount % numYear))

        var d = data[currentCountryIndice];
        if (d) {
            tempToShow = d.currentYearAvailable ? showTemp(d.yearTemperatures[minYear + yearCount % numYear]) : ""
            tooltip.html(d.country + '<br>' + tempToShow);
        }
        /*            if (currentCountryIndice != undefined){
                        var d = data[currentCountryIndice];
                        var tempToShow = '';
                                if (d.currentYearAvailable){
                                    tempToShow = Math.floor(10 * d.yearTemperatures[minYear + yearCount % numYear]) / 10 + '°C';
                                } 

                        tooltip.html(d.country+'<br>'+tempToShow);
                    }*/

        yearCount++;

        // Parcours des pays pour voir si on dépasse le max
        // Pour le moment, pas ouf : les premières frames affichent beaucoup d'ampoules allumées. C'est normal, il y a beaucoup de chances de casser son record quand on n'a peu de données : il faudrait pas commencer de la première année mais de la n-ème années en initialisant le max au max des 50 premières années
        //Bug à partir de 60 ans : trouver pourquoi
        for (var i = 0; i < countries.length; i++) {

            if (data[i].yearTemperatures[minYear + yearCount % numYear]) {
                data[i].currentYearAvailable = true;
            } else
                data[i].currentYearAvailable = false;

            if (data[i].currentMax < data[i].yearTemperatures[minYear + yearCount % numYear]) { //Si on dépasse le max
                data[i].currentMax = data[i].yearTemperatures[minYear + yearCount % numYear];
                data[i].lastBeaten = 0; // Conseil donné par Théo (pas moi, le doctorant) : faire le calcul du booléen maintenant et pas sur le moment de l'affichage
            } else
                data[i].lastBeaten += 1;
        }

        if (yearCount % numYear == 0) {
            for (var i = 0; i < countries.length; i++) {
                data[i].currentMax = tempPerCountryPerYear[countries[i]][limitPerCountry[countries[i]].minYear];
            }
        }
    }
})

function showTemp(temp) {
    return Math.floor(10 * temp) / 10 + '°C'
}
document.addEventListener('DOMContentLoaded', function() {

// Tooltip
// =======
var tooltip = d3.select("body").append("div")
    .attr("class", "hidden tooltip")
var hoveredCountryIdx = 0;


//Bouton de pause
// ==============
var strButton = 'pause';
var buttonOnPlay = true;


// Slider
// ======
 var slider = d3.select("#slider")


// Grille
// ======
var gridMargin = { top: 20, right: 30, bottom: 50, left: 40 },
    gridWidth = 600 - gridMargin.left - gridMargin.right,
    gridHeight = 400 - gridMargin.top - gridMargin.bottom;

var grid = d3.select("#grid")
    .append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 " + (gridWidth + gridMargin.left + gridMargin.right) + " " + (gridHeight + gridMargin.top + gridMargin.bottom))
    .classed("svg-content-responsive", true)
    .append("g")
    .attr("transform", "translate(" + gridMargin.left + ", " + gridMargin.top + ")")
    .attr("class", "grid")

var hexbin = d3.hexbin()


// Chart
// =====
var chartMargin = { top: 20, right: 40, bottom: 50, left: 40 },
    chartWidth = 600 - chartMargin.left - chartMargin.right,
    chartHeight = 400 - chartMargin.top - chartMargin.bottom;

var chart = d3.select("#chart")
    .append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 " + (chartWidth + chartMargin.left + chartMargin.right) + " " + (chartHeight + chartMargin.top + chartMargin.bottom))
    .classed("svg-content-responsive", true)
    .append("g")
    .attr("transform", "translate(" + gridMargin.left + ", " + gridMargin.top + ")")
    .attr("class", "chart")

// Incertitude des températures
chart.append("path")
    .attr("class", "temperatureUncertainty")
    .attr("fill", "#ffe0b2")
    .attr("stroke", "none")

// Températures
chart.append("path")
    .attr("class", "temperatureLine")
    .attr("fill", "none")
    .attr("stroke", "#ef6c00")
    .attr("stroke-width", 2)

// Barre verticale suivant l'année en cours
chart.append("path")
    .attr("class", "temperatureUndefined")
    .attr("fill", "none")
    .attr("stroke", "#ef6c00")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "2, 2")

chart.append("path")
    .attr("class", "yearLine")
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5,5")
    .attr("d", "M0 0" + " L0 " + chartHeight)

// Rond suivant l'année en cours
chart.append("circle")
    .attr("class", "yearCircle")
    .attr("r", 5)
    .attr("fill", "grey")
    .attr("stroke", "grey")
    .attr("opacity", 0)

// Echelles
// ========

// Grid: Couleur des températures
var color = d3.scaleSequential().interpolator(d3.interpolateTurbo);

// Chart: Axe Y des températures
var temperatureScale = d3.scaleLinear().range([chartHeight, 0]);

// Chart: Axe X du temps
var yearScale = d3.scaleLinear().range([0, chartWidth]);

// Autres variables
// ================
var data = [];// Liste dans laquelle il y aura toutes les données
var rememberRecord = 30; // Nombre d'années après le dernier record pour que la couleur d'un pays soit effacée
var tempToShow = ""; //Température qui apparaîtra dans le tooltip du pays sélectionné
var clickedCountryIdx = undefined; // Pays qu'on a sélectionné (en cliquant dessus ou avec la barre de recherche)



d3.csv("https://raw.githubusercontent.com/vdng/heat-bulbs/dev-vincent/GlobalLandTemperaturesByCountry.csv", function(data_csv) {

    
    var parse = d3.timeParse("%Y-%m-%d"); 

    // Initialisation des extrema de temps avant de les calculer
    var minYear = 2000, maxYear = 0;
    var minTemp = 50, maxTemp = -50;


    // Calcul des extrema de température et d'années
    data_csv.forEach(d => {
        d.dt = parse(d.dt);
        let year = d.dt.getFullYear();
        d.AverageTemperature = d.AverageTemperature ? Number(d.AverageTemperature) : null;
        d.AverageTemperatureUncertainty = d.AverageTemperatureUncertainty ? Number(d.AverageTemperatureUncertainty) : null;
        let temp = d.AverageTemperature;
        if (year < minYear) minYear = year;
        if (year > maxYear) maxYear = year;
        if (temp < minTemp) minTemp = temp;
        if (temp > maxTemp) maxTemp = temp;
    })

    // Initialisation du slider à partir des extrema calculés
    slider
        .attr("value", minYear)
        .attr("min", minYear)
        .attr("max", maxYear)

    // Définition des domaines pour les échelles
    color.domain([minTemp, maxTemp]);
    temperatureScale.domain([minTemp, maxTemp]);
    yearScale.domain([minYear, maxYear]);



    // Echelle de couleurs
    // ========

    // Canva d'arrière-plan pour dessiner toutes les lignes de la légende de couleurs
    var canvas = d3.select("#legend")
        .append("canvas")
        .attr("width", 50)
        .attr("height", gridHeight);

    var cty = canvas.node().getContext("2d");

    var drawscale = d3.select("#legend")
        .append("svg")
        .attr("width", 50)
        .attr("height", gridHeight)
        .style("position", "absolute")
        .style("left", "40px")

    var yDrawScale = d3.scaleLinear().domain([maxTemp, minTemp]).range([0, gridHeight]);

    // Axe de  l'échelle de couleur
    drawscale.append("g")
        .attr("transform", "translate(0, 0)")
        .style('font-size','12px')
        .call(d3.axisRight(yDrawScale));

    // Coloriage de l'échelle de couleurs
    d3.range(minTemp, maxTemp, 0.00424)
        .forEach(function (d) {
            cty.beginPath();
            cty.strokeStyle = color(d);
            cty.moveTo(10, yDrawScale(d));
            cty.lineTo(30, yDrawScale(d));      
            cty.stroke();
        });




    // Axes de la courbe
    // =======
    var xAxis = d3.axisBottom().scale(yearScale).tickFormat(d => d);
    var yAxis = d3.axisLeft().scale(temperatureScale).ticks(5);

    chart.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0, " + chartHeight + ")")
        .call(xAxis)

    chart.append("g")
        .attr("class", "y-axis")
        .call(yAxis)



    // Nestpar pays pour formater les données p
    var dataPerCountry = d3.nest()
        .key(d => d.Country)
        .entries(data_csv)


    var countries = dataPerCountry.map(d => d.key);


    // Autocomplete countries
    // ======================
    function onTextInput(value) {
        let i = countries.indexOf(value);
        selectCountry(data[i], i);
    }

    var elem = document.querySelector('.autocomplete');
    var options = {
        "onAutocomplete": () => onTextInput(elem.value)
    }

    var autocomplete = M.Autocomplete.init(elem, options);
    var autocompleteData = {}

    for (var i = 0; i < countries.length; i++) {
        autocompleteData[countries[i]] = null;
    }

    autocomplete.updateData(autocompleteData);


    // Nest des données par pays et par année
    var tempPerCountryPerYear = d3.nest()
        .key(d => d.Country)
        .key(d => d.dt.getFullYear())
        .rollup(d => {
                    return {
                        temperature: d3.mean(d, function(e) { return e.AverageTemperature; }),
                        uncertainty: d3.mean(d, function(e) { return e.AverageTemperatureUncertainty; })
                        }
                    })
        .entries(data_csv)


    // Calcul des extrema de dates et de températures pour chaque pays
    var limitPerCountry = d3.nest()
        .key(d => d.Country)
        .rollup(d => { return { 'minYear': d3.min(d, v => v.dt.getFullYear()),
                                'maxYear': d3.max(d, v => v.dt.getFullYear()),
                                'minTemp': d3.min(d, v => v.AverageTemperature),
                                'maxTemp': d3.max(d, v => v.AverageTemperature)
                              }
                      })
        .entries(data_csv)


    // Création  de la grille hexagonale
    // =================================
    var n = Math.ceil(Math.sqrt(countries.length)); // Nombre de colonnes
    var hexRadius = d3.min([gridWidth/((n + 0.5) * Math.sqrt(3)), gridHeight/((n + 1 / 3) * 1.5)]);
    hexbin.radius(hexRadius)

    let ringNumber = 1;

    for (var i = 0; i < countries.length; i++) {

        let hexPosition = [0, 0];
        if (i != 0) 
        {
            let firstIdxInRing = 6 * ringNumber * (ringNumber -1) / 2 + 1; 
            let numHexInRing = 6 * ringNumber;
            if (i == firstIdxInRing + numHexInRing) 
            {
                ringNumber++;
                numHexInRing = 6 * ringNumber;
                firstIdxInRing = 6 * ringNumber * (ringNumber - 1) / 2 + 1;
            }


            let idxInRing = i - firstIdxInRing;
            let tempIdx = idxInRing < numHexInRing / 2 ? idxInRing : idxInRing - numHexInRing / 2;
            let x = 0, y = 0;

            if (tempIdx < ringNumber) y = tempIdx;
            else if (tempIdx <= 2 * ringNumber) y = ringNumber;
            else y = numHexInRing / 2 - tempIdx;

            if (idxInRing >= numHexInRing / 2) y = - y;

            let rotation = Math.floor(numHexInRing / 4);
            let shiftedIdx = (idxInRing + rotation) % numHexInRing;
            tempIdx = shiftedIdx < numHexInRing / 2 ? shiftedIdx : shiftedIdx - numHexInRing / 2;

            if (tempIdx <= ringNumber / 2) 
            {
                x = tempIdx;
                if (ringNumber % 2 != 0) x += 0.5;
            }
            else if (tempIdx < numHexInRing / 2 - Math.floor((ringNumber + 1) / 2)) 
            {
                x = ringNumber - Math.abs(rotation - tempIdx) / 2;
            }
            else 
            {
                x = numHexInRing / 2 - tempIdx;
                if (ringNumber % 2 != 0) x -= 0.5;
            }

            if (shiftedIdx >= numHexInRing / 2) x = - x;

            hexPosition = [x * Math.sqrt(3) * hexRadius, y * 1.5 * hexRadius]
        }




        // Rassemblement de toutes les données dans une même liste de dictionnaires
        data[i] = {
            "country": countries[i],
            "yearTemperatures": tempPerCountryPerYear[i].values,
            "currentMax": tempPerCountryPerYear[i].values[0].value.temperature,
            //"lastBeaten": rememberRecord,
            "currentYearAvailable": false,
            "minYear": limitPerCountry[i].value.minYear,
            "maxYear": limitPerCountry[i].value.maxYear,
            "minTemp": limitPerCountry[i].value.minTemp,
            "maxTemp": limitPerCountry[i].value.maxTemp,
            "hex": [gridWidth / 2 + hexPosition[0], gridHeight / 2 + hexPosition[1] ]
        }
    }


    // Les données sont chargées, on peut afficher
    d3.select("#main-section")
        .classed("hidden", false)

    d3.select(".preloader-background")
        .remove()



    var line = d3.line()
        .x(d => yearScale(d.key))
        .y(d => temperatureScale(d.value.temperature))
        .curve(d3.curveCardinal);

    line.defined(d => d.value.temperature != null)


    var area = d3.area()
        .x(d => yearScale(d.key))
        .y0(d => temperatureScale(d.value.temperature - d.value.uncertainty))
        .y1(d => temperatureScale(d.value.temperature + d.value.uncertainty))

    area.defined(d => d.value.temperature != null)

    // Grille par défaut
    grid.selectAll("path")
        .data(data)
        .enter()
        .append("path")
        .attr("d", function(d) { return "M" + d.hex[0] + "," + d.hex[1] + hexbin.hexagon(); })
        .attr("class", "countryBulb")
        .attr("id", (d, i) => "bulb-" + i)
        .attr("stroke", "#E5E5E5FF")
        .attr("fill", "white")
        .on('mouseover', function(d, i) { // Passage de la souris sur un pays
            d3.select(this)
                .raise()
                .attr("stroke", "#5B5B5B")

            // Récupération de la température du pays à afficher (par défaut la première)
            tempToShow = d.currentYearAvailable ? showTemp(d.yearTemperatures[0].value.temperature) : ""

            // Affichage du Tooltip de température
            tooltip
                .classed("hidden", false)
                .html(countries[i] + '<br>' + tempToShow);

            hoveredCountryIdx = i;
        })
        .on('mouseout', function(d, i) { // On recache le tooltip si on n'est sur aucun pays
            tooltip.classed("hidden", true);

            if (clickedCountryIdx != i) {
                d3.select(this)
                    .lower()
                    .attr("stroke", "#E5E5E5FF")
            }
        })
        .on('mousemove', function() {
            tooltip.attr("style", "left:" + (d3.event.pageX + 5) + "px; top:" + (d3.event.pageY - 60) + "px");
        })
        .on('click', selectCountry) // Sélection du pays pour afficher la courbe


    // Sélection du pays pour afficher sa courbe
   function selectCountry(d, i) {
        if (i < 0) return;
        clickedCountryIdx = i;

        d3.selectAll(".countryBulb")
            .attr("stroke", "#E5E5E5FF") 

        d3.select("#bulb-" + i) // On conserve un marqueur sur l'hexagone sélectionné
            .raise()
            .attr("stroke", "black")

        temperatureScale.domain([d.minTemp, d.maxTemp]) // Adaptation de l'échelle de températures sur la courbe
        
        chart.select(".y-axis")
            .transition()
            .duration(200)
            .call(yAxis)

        // Affichage de l'incertitude
        chart.select(".temperatureUncertainty")
            .data([d.yearTemperatures])
            .transition()
            .duration(200)
            .attr("d", area)

        // Affichage de la température
        var filteredData = d.yearTemperatures.filter(line.defined());

        chart.select('.temperatureUndefined')
            .transition()
            .duration(200)        
            .attr("d", line(filteredData))

        chart.select(".temperatureLine")
            .data([d.yearTemperatures])
            .transition()
            .duration(200)
            .attr("d", line)

        d3.select("#country-input") 
            .select("label")
            .classed("active", true)

        d3.select("#selectedCountry") // Affichage du pays dans la barre de recherche
            .property("value", data[clickedCountryIdx].country)

        d3.select("#chart") // Affichafe du chart
            .classed("hidden", false)
    }



    // Barre de recherche
    d3.select("#selectedCountry").on("input", function() {
        onTextInput(this.value)
    });


    // Modification de l'affichage de la grille à chaque frame
    // =======================================================

    var currentYear = minYear; // Année actuelle

    let windowsDuration = 100;
    var evol = setInterval(update, windowsDuration); // Durée d'affichage de chaque année


    // Fonction de mise à jour de tout : grid, affichage de l'année, slider, courbe
    // ============================================================================
    function update() {
        // Parcours des pays pour voir si on dépasse le max du pays pendant cette année
        // ============================================================================
        for (var i = 0; i < countries.length; i++)
        {
            if (data[i].minYear <= currentYear && !isNaN(data[i].yearTemperatures[currentYear - data[i].minYear].value.temperature))
            {
                data[i].currentYearAvailable = true; // On indique si l'annéeest disponible
                if (data[i].currentMax < data[i].yearTemperatures[currentYear - data[i].minYear].value.temperature)
                { // Si on dépasse le max, on le met à jour
                    data[i].currentMax = data[i].yearTemperatures[currentYear - data[i].minYear].value.temperature;
                }
            }
            else
            {
                data[i].currentYearAvailable = false;
            }
        }

        // Parcours des bulbs pour les colorier
        // ====================================
        grid.selectAll(".countryBulb")
            .transition()
            .duration(windowsDuration)
            .attr("fill-opacity", (d, i) => { //Contrôle de l'opacité
                return opacityWithLastRecord(d); 
            })
            .attr("fill", (d, i) => { // Couleur à afficher
                if (!d.currentYearAvailable) return "#eee" // Cas où on n'a pas de données
                else if (opacityWithLastRecord(d) > 0) // Suite à un léger problème d'affichage, on contrôle d'abord si on est bien censé afficher la bulb 
                    return color(Number(d.yearTemperatures[currentYear - d.minYear].value.temperature))
                else
                    return "white"
            })            


        // Affichage de l'année
        // ====================
        d3.select('#year').html(currentYear)


        // Pays sur lequel la souris est : affichage du tooltip
        // ====================================================
        let hoveredCountry = data[hoveredCountryIdx];
        tempToShow = hoveredCountry.currentYearAvailable ? showTemp(hoveredCountry.yearTemperatures[currentYear - hoveredCountry.minYear].value.temperature) : ""
        tooltip.html(hoveredCountry.country + '<br>' + tempToShow);



        // Pays sélectionné
        // ================

        // Gestion de la ligne suivant l'année
        let xyear = yearScale(currentYear);
        chart.select(".yearLine")
            .transition()
            .duration(200)
            .attr("d", "M" + xyear + " 0" + " L" + xyear + " " + chartHeight)


        // Gestion du rond suivant l'année
        if (clickedCountryIdx >= 0 && data[clickedCountryIdx].currentYearAvailable)
        {
            let clickedCountry = data[clickedCountryIdx];
            chart.select(".yearCircle") 
                .transition()
                .duration(200)
                .attr("opacity", 1)
                .attr("cx", yearScale(currentYear))
                .attr("cy", temperatureScale(clickedCountry.yearTemperatures[currentYear - clickedCountry.minYear].value.temperature))
        }
        else
        {
            chart.select(".yearCircle")
                .transition()
                .duration(200)
                .attr("opacity", 0)
        }


        // Mise à jour de l'année courante (y compris pour le slider)
        if (buttonOnPlay){
            currentYear++;
            slider.property("value", currentYear); 
        }

        // On reprend à 0 une fois arrivé à la fin : on remet toutes les données à 0
        if (currentYear == maxYear + 1)
        {
            currentYear = minYear;
            for (var i = 0; i < countries.length; i++)
            {
                data[i].currentMax = tempPerCountryPerYear[i].values[0].value.temperature;
                data[i].currentYearAvailable = false;
            }
        }
    } 



    // Fonction de calcul de l'opacité
    // Opacité à 1 si on bat à record, puis décroissante
    // =================================================
    function opacityWithLastRecord(d){
        var listYears = d.yearTemperatures // Liste des températures par année
        var nbAnneesNonVides = 0; // Données disponibles avant l'année courante
        var okShowTemp = false; // Booléen pour savoir si on affiche le record
        if (!d.currentYearAvailable){ // Si il n'y a pas de donnée, on affiche en gris, l'opacité vaut 1
            return 1 
        } else {
            //Initialisaton du maximum de température et de l'année correspondante
            var maxTemp = -50;
            var argMaxTemp = minYear;

            for (let i = minYear; i <= currentYear; i++){ // Parcours des années
                var tempTest = d.yearTemperatures[i - d.minYear]; // Année du parcours
                if ( (tempTest != undefined) && (!isNaN(tempTest.value.temperature))) {
                    nbAnneesNonVides++; // On met à jour le nombre de données non vides précédant l'année courante
                    if (Number(tempTest.value.temperature) > maxTemp){ // Si un record est battu
                        maxTemp = Number(tempTest.value.temperature); // Mise jour du max
                        argMaxTemp = i; // et de l'année
                        okShowTemp = (nbAnneesNonVides >= 30); // Le record ne sera affiché que si on avait déjà rencontré assez de données avant l'établissement du record 
                    }
                }
            }
            if (okShowTemp){
                return 1 - (currentYear-argMaxTemp)/rememberRecord;
            } else {
                return 0
            }
                    
        }
    }




    //Bouton de pause : click
    // ======================
    d3.select('#pause').select("i")
        .on('click', function() {
            changeStatusButton();
            d3.select('#pause').select("i").html(strButton)
        })


    // Fonction de l'événement de click sur le bouton de pause
    // =======================================================
    function changeStatusButton(){
        if (buttonOnPlay){ // Si on est en Play, on passe en Pause
            buttonOnPlay = false;
            strButton = 'play_arrow'
        } else { // Sinon, on passe en Play
            buttonOnPlay = true;
            strButton = 'pause';
        }
    }


  // Slider
  // =======
    slider.on("input", function(val) {
	       updateSlider(this.value); // Mise à jour du slider selon où on a cliqué
           if (buttonOnPlay){ // Mise en pause si on touche au slider
                changeStatusButton();
                d3.select('#pause').select("i").html(strButton)
           }
	    })

    // Mise à jour du slider
    function updateSlider(value){
        currentYear = Number(value); // L'année change
        update(); // On met donc tout à jour
    }

})


function showTemp(temp) {
    return Math.floor(10 * temp) / 10 + '°C'
}

});

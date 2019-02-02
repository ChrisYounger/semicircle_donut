define([
    'jquery',
    'api/SplunkVisualizationBase',
    'api/SplunkVisualizationUtils',
    'chart.js'
],
function(
    $,
    SplunkVisualizationBase,
    vizUtils,
    chartjs
) {
    return SplunkVisualizationBase.extend({
        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            var theme = 'light';
            var fontColor = '#666';
            if (typeof vizUtils.getCurrentTheme === "function") {
                theme = vizUtils.getCurrentTheme();
            }
            if (theme === 'dark') {
                fontColor = '#ddd';
            }
            this.colors = ["#006d9c", "#4fa484", "#ec9960", "#af575a", "#b6c75a", "#62b3b2"];
            if (typeof vizUtils.getColorPalette === "function") {
                this.colors = vizUtils.getColorPalette("splunkCategorical", theme);
            }
            this.$el = $(this.el);
            this.errordiv = $('<div style="text-align:center; font-size: 16px;"></div>');
            this.$el.append(this.errordiv);
            this.canvas = $('<canvas></canvas>');
            this.$el.append(this.canvas);            
            this.canvas[0].width = this.$el.width()
            this.canvas[0].height = this.$el.height();
			this.ctx = this.canvas[0].getContext('2d');
            this.donutCfg = {
                type: 'doughnut',
                data: {
                    datasets: [],
                    labels: []
                },
                options: {
                    circumference: Math.PI,
                    rotation: -Math.PI,                   
                    maintainAspectRatio: false,
                    responsive: true,
                    legend: {
                        position: 'top',
                        labels: {
                            fontColor: fontColor
                        }
                    },
                    title: {
                        display: false,
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    },
                    layout: {
                        padding: {
                            left: 4,
                            right: 4,
                            top: 4,
                            bottom: 6
                        }
                    },
                    tooltips: {
                        callbacks: {
                            label: function(tooltipItem, data) {
                                var label = data['labels'][tooltipItem['index']] + ': ';
                                if (data.datasets[tooltipItem.datasetIndex].label) {
                                    label += data.datasets[tooltipItem.datasetIndex].label + ': ';
                                }
                                label += Math.round(parseFloat(data.datasets[tooltipItem.datasetIndex].data[tooltipItem['index']]) * 100) / 100;
                                return label;
                            } 
                        }
                    }                                
                }
            };
			this.myDoughnut = new Chart(this.ctx, this.donutCfg);            
        },

        formatData: function(data) {
            return data;
        },

        updateView: function(data, config) {
            var i;
            //console.log(data,config);
            this.donutCfg.data.labels = [];
            var ignoreField = -1;
            var colors = this.colors;
            for (i = 1; i < data.fields.length; i++) {
                if (config.hasOwnProperty("display.visualizations.custom.semicircle_donut.semicircle_donut.colorField") && config["display.visualizations.custom.semicircle_donut.semicircle_donut.colorField"] === data.fields[i].name) {
                    ignoreField = i;
                    colors = [];
                    for (j = 0; j < data.columns[i].length; j++) {
                        colors.push(data.columns[i][j]);
                    }
                } else {
                    if (this.donutCfg.data.datasets.length < i) {
                        this.donutCfg.data.datasets.push({});
                    }
                    this.donutCfg.data.datasets[(i-1)].data = [];
                    this.donutCfg.data.datasets[(i-1)].backgroundColor = [];
                    this.donutCfg.data.datasets[(i-1)].label = data.fields[i].name;
                }
            }
            var foundNumeric = false;
            for (i = 0; i < data.columns.length; i++) {
                for (j = 0; j < data.columns[i].length; j++) {
                    if (i == 0) {
                        this.donutCfg.data.labels.push(data.columns[i][j]);
                    } else if (i !== ignoreField) {
                        if (! isNaN(Number(data.columns[i][j]))) {
                            foundNumeric = true;
                        }                        
                        this.donutCfg.data.datasets[(i-1)].data.push(data.columns[i][j]);
                        this.donutCfg.data.datasets[(i-1)].backgroundColor.push(colors[j % colors.length]);
                    }
                }
            }
            if (config.hasOwnProperty("display.visualizations.custom.semicircle_donut.semicircle_donut.type") && config["display.visualizations.custom.semicircle_donut.semicircle_donut.type"] !== "half") {
                this.myDoughnut.options.circumference = 2 * Math.PI;
                this.myDoughnut.options.rotation = -Math.PI / 2;
            } else {
                this.myDoughnut.options.circumference = Math.PI;
                this.myDoughnut.options.rotation = -Math.PI;
            }
            if (config.hasOwnProperty("display.visualizations.custom.semicircle_donut.semicircle_donut.legendPosition")) {
                if (config["display.visualizations.custom.semicircle_donut.semicircle_donut.legendPosition"] === "none") {
                    this.myDoughnut.options.legend.display = false;
                } else {
                    this.myDoughnut.options.legend.display = true;
			        this.myDoughnut.options.legend.position = config["display.visualizations.custom.semicircle_donut.semicircle_donut.legendPosition"];
                }
            }
            if (config.hasOwnProperty("display.visualizations.custom.semicircle_donut.semicircle_donut.cutoutPercentage")) {
			    this.myDoughnut.options.cutoutPercentage = parseFloat(config["display.visualizations.custom.semicircle_donut.semicircle_donut.cutoutPercentage"]);
            }

            if (! data.columns.length) {
                this.errordiv.html("No data");
                this.errordiv.css("display", "block");
                this.canvas.css("display", "none");

            } else if (! foundNumeric) {
                this.errordiv.html("Numeric data required");
                this.errordiv.css("display", "block");
                this.canvas.css("display", "none");

            } else {
                this.myDoughnut.update(); 
                this.errordiv.css("display", "none");
                this.canvas.css("display", "block");
            }
        },

        // Search data params
        getInitialDataParams: function() {
            return ({
                outputMode: SplunkVisualizationBase.COLUMN_MAJOR_OUTPUT_MODE,
                count: 10000
            });
        },

        // Override to respond to re-sizing events
        reflow: function() {
        }
    });
});
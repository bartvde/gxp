/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires data/PrintNGProvider.js
 * @requires widgets/PrintNGPanel.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = PrintNG
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: PrintNG(config)
 *
 *    Provides an action to print the map using the GeoServer extension printNG
 */
gxp.plugins.PrintNG = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = gxp_printng */
    ptype: "gxp_printng",

    /** api: config[printService]
     *  ``String``
     *  URL of the printNG print service.
     */
    printService: null,

    /** api: config[templateService]
     *  ``String``
     *  URL of the printNG template source.
     *  Do NOT include a trailing slash
     */
    templateService: null,

    /** api: config[menuText]
     *  ``String``
     *  Text for print menu item (i18n).
     */
    menuText: "Print Map",

    /** api: config[tooltip]
     *  ``String``
     *  Text for print action tooltip (i18n).
     */
    tooltip: "Print Map",

    /** api: config[text]
     *  ``String``
     *  Text for print action button (i18n).
     */
    buttonText: "Print",

    /** private: property[printProvider]
     *   ``gxp.data.PrintNGProvider``
     */
    printProvider: null,

    /** api: method[addActions]
     */
    addActions: function() {
        // don't add any action if there is no print service configured
        if(this.printService !== null) {
            this.printProvider = new gxp.data.PrintNGProvider(Ext.apply({
                printService: this.printService,
                templateService: this.templateService
            }, this.initialConfig));
            var actions = [{
                menuText: this.menuText,
                buttonText: this.buttonText,
                tooltip: this.tooltip,
                iconCls: "gxp-icon-print",
                scope: this
            }];
            this.outputAction = 0;
            if (!this.outputTarget) {
                this.outputTarget = this.target.mapPanel.id;
            }
            gxp.plugins.PrintNG.superclass.addActions.call(this, actions);
        }
    },

    addOutput: function(config) {
        var winHeight = parseInt(this.target.mapPanel.getHeight() * 0.75, 10);
        config = Ext.applyIf(config || {}, {
            title: this.menuText,
            modal: true,
            border: false,
            layout: 'fit',
            width: (winHeight - 75) / 0.707,
            height: winHeight,
            xtype: 'window'
        });
        this.outputConfig = this.outputConfig ? Ext.apply(this.outputConfig, config) : config;
        Ext.apply(this.outputConfig, {
            items:[{
                xtype: 'gxp_printngpanel',
                width: 360,
                printProvider: this.printProvider,
                map: this.target.mapPanel,
                /* TODO: this is very GeoNode specific, make this more generic */
                mapId: this.target.mapID
            }]
        });
        var output = Ext.create(this.outputConfig);
        gxp.plugins.PrintNG.superclass.addOutput.apply(this, [output]);
    }
});

Ext.preg(gxp.plugins.PrintNG.prototype.ptype, gxp.plugins.PrintNG);

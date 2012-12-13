/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

Ext.namespace("gxp.data");

/** api: (define)
 *  module = gxp.data
 *  class = PrintNGProvider
 *  extends = Ext.util.Observable
 *  base_link = `Ext.util.Observable <http://dev.sencha.com/deploy/dev/docs/?class=Ext.util.Observable>`_
 */

/** api: constructor
 *  .. class:: PrintNGProvider(config)
 *  
 *  Provides an interface to the PrintNG GeoServer extension:
 *  https://github.com/opengeo/geoserver-exts/blob/master/printng/doc/api.rst
 */
gxp.data.PrintNGProvider = Ext.extend(Ext.util.Observable, {

    /** api: config[printService]
     *  ``String``
     *  URL of the PrintNG print service.
     */
    printService: null,

    /** api: config[templateService]
     *  ``String``
     *  URL of the PrintNG print template source.
     *  Do NOT include a trailing slash
     */
    templateService: null,

    /** api: config[pageUnits]
     *  ``String`` Units to use for dimensions in the print.
     */
    pageUnits: 'mm',

    /** api: config[pageSize]
     *  ``String|Array`` Page size to use for the print.
     *  See: http://www.w3.org/TR/css3-page/#page-size for possible values.
     *  Can also be specified as an Array with pageUnits as the dimension.
     */
    pageSize: 'A4',

    /** api: config[pageOrientation]
     *  ``String|`` Page orientation to use for the print.
     *  Can be one of 'landscape' or 'portrait'. Currently not supported.
     */
    pageOrientation: 'landscape',

    /** api: config[pageMargins]
     *  ``Array`` Page margins to use in the print.
     */
    pageMargins: null,

    /** private: property[activeTemplate]
     *  ``Object`` The currently used template.
     */
    activeTemplate: null,

    /** private: property[templates]
     *  ``Ext.data.Store``
     */
    templates: null,

    /** private:  method[constructor]
     *  Private constructor override.
     */
    constructor: function(config) {
        this.initialConfig = config;
        Ext.apply(this, config);

        if(!this.customParams) {
            this.customParams = {};
        }

        this.addEvents(
            /** api: event[loadtemplates]
             *  Triggered when the template store has finished loading.
             *
             *  Listener arguments:
             *
             *  * printProvider - :class:`gxp.data.PrintNGProvider` this
             *    PrintProvider
             *  * templates - ``Array[Ext.data.Record]`` the cache of template records
             */
            "loadtemplates",

            /** api: event[optionschange]
             *  Triggered when the print options are changed.
             *  Only triggered when using `setOptions` or other accessor method. Will
             *  NOT be triggered if you directly modify an option attribute
             *
             *  Listener arguments:
             *
             *  * printProvider - :class:`gxp.data.PrintNGProvider` this
             *    PrintProvider
             *  * option - ``Object`` the modified print option key:value pairs
             */
            "optionschange",

            /** api: event[beforeprint]
             *  Triggered when the print method is called.
             *
             *  Listener arguments:
             *
             *  * printProvider - :class:`gxp.data.PrintNGProvider` this
             *    PrintProvider
             *  * map - ``OpenLayers.Map`` the map being printed
             *  * options - ``Object`` the options to the print command
             */
            "beforeprint",

            /** api: event[printexception]
             *  Triggered when when the print backend returns an exception.
             *
             *  Listener arguments:
             *
             *  * printProvider - :class:`gxp.data.PrintNGProvider` this
             *    PrintProvider
             *  * response - ``Object`` the response object of the XHR
             */
            "printexception",

            /** api: events[beforedownload]
             *  Triggered before the PDF is downloaded. By returning false from
             *  a listener, the default handling of the PDF can be cancelled
             *  and applications can take control over downloading the PDF.
             *  TODO: rename to beforeprint after the current beforeprint event
             *  has been renamed to beforeencode.
             *
             *  Listener arguments:
             *  * printProvider - :class:`gxp.data.PrintNGProvider` this
             *    PrintProvider
             *  * url - ``String`` the url of the print document
             */
            "beforedownload"
        );

        gxp.data.PrintNGProvider.superclass.constructor.apply(this, arguments);

        if(this.templateService && this.initialConfig.autoLoad !== false) {
            this.loadTemplates();
        }
    },

    /** api: method[print]
     *  :param map: ``GeoExt.MapPanel`` or ``OpenLayers.Map`` The map to print.
     *  :param options: ``Object`` of additional options, see below.
     *  
     *  Sends the print command to the print service and opens a new window
     *  with the resulting PDF.
     */
    print: function(map, options) {
        var printCb = this.download.createDelegate(this);
        if(options) {
            printCb = options.callback || options.success || printCb;
            delete options.callback;
            delete options.success;
            this.setOptions(options);
        } else {
            options = {};
        }
        if(this.fireEvent('beforeprint', this, map, options) !== false) {
            var mapId = options.mapId;
            var styleEl;
            var rulesTxt = this.buildPageStyle();
            styleEl = Ext.DomHelper.createDom({
                tag: 'style',
                type: 'text/css',
                cn: rulesTxt
            });
            var mapEl = (map.getEl) ? map.getEl() : map;
            Ext.Ajax.request({
                url: this.printService + this.activeTemplate.id + '/' + mapId,
                success: function(response) {
                    var url = Ext.decode(response.responseText).getURL;
                    printCb(url);
                },
                failure: function(response) {
                    this.fireEvent("printexception", this, response);
                },
                method: 'POST',
                params: {
                    styles: styleEl.outerHTML,
                    map_html: mapEl.dom.outerHTML,
                    width: options.width ? options.width : mapEl.getWidth() || undefined,
                    height: options.height ? options.height : mapEl.getHeight() || undefined
                },
                scope: this
            });
        }

    },

    /** private: method[download]
     *  :param url: ``String``
     */
    download: function(url){
        if(this.fireEvent('beforedownload', this, url) !== false) {
            // Requires user to un-block popups for this site to work properly
            window.open(url);
        }
    },

    /** private: method[loadTemplates]
     */ 
    loadTemplates: function() {
        this.templates = new Ext.data.JsonStore({
            idProperty: 'id',
            fields: ['id', 'title', 'contents', 'url'],
            root: null,
            url: this.templateService,
            listeners: {
                load: function(store, recs) {
                    this.fireEvent('loadtemplates', this, recs);
                    this.activeTemplate = this.templates.getAt(1);
                },
                scope: this
            }
        });
        this.templates.load();
    },

    /** api: method[setOptions]
     *  :param options: ``Object``
     */
    setOptions: function(options) {
        Ext.apply(this, options);
        this.fireEvent('optionschange', this, Ext.apply({}, options));
    },

    /** private: method: [buildPageStyle]
     *  :param options: ``Object``
     */
    buildPageStyle: function(options) {
        if(options) {
            this.setOptions(options);
        }
        var units = this.pageUnits;
        var size = this.pageSize;
        var orientation = this.pageOrientation;
        var margins = this.pageMargins;
        if(Ext.isArray(size)) {
            size = '' + size[0] + units + ' ' + size[1] + units;
        }
        if(Ext.isArray(margins)) {
            for(var mtxt = '', i = margins.length - 1; i >= 0; i--) {
                if(Ext.isString(margins[i])) {
                    mtxt += margins[i] + ' ';
                } else {
                    mtxt += margins[i] + units + ' ';
                }
            }
            margins = mtxt;
        }
        var pageStyle = '@page{ size:' + size + /*' ' + orientation +*/ '; ';
        pageStyle += 'fit: meet; fit-position: center; page-break-after: avoid; page-break-inside: avoid; ';
        if(margins) {
            pageStyle += 'margins: ' + margins + '; ';
        }
        pageStyle += ' }';
        return pageStyle;
    }

});

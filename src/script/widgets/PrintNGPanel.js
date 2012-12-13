/**
 * Copyright (c) 2008-2012 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires data/PrintNGProvider.js
 */

/** api: (define)
 *  module = gxp
 *  class = PrintNGPanel
 *  base_link = `Ext.Panel <http://extjs.com/deploy/dev/docs/?class=Ext.Panel>`_
 */
Ext.namespace("gxp");

/** api: constructor
 *  .. class:: PrintNGPanel(config)
 *
 *    A panel to interact with the PrintNG service (GeoServer extensions).
 *    https://github.com/opengeo/geoserver-exts/blob/master/printng/doc/api.rst
 */
gxp.PrintNGPanel = Ext.extend(Ext.Panel, {

    /* begin i18n */
    paperSizeText: "Paper size:",
    printTemplateText: "Template:",
    resolutionText: "Resolution:",
    emptyPaperListText: "Paper Sizes",
    emptyTemplateListText: "Select a Template",
    printText: "Print",
    emptyTitleText: "Enter map title here.",
    includeLegendText: "Include legend?",
    emptyCommentText: "Enter comments here.",
    creatingPdfText: "Creating PDF...",
    orientationText: "Orientation",
    portraitText: "Portrait",
    landscapeText: "Landscape",
    noTemplateTitle: "Error",
    noTemplateMsg: "Please select a template first",
    /* end i18n */

    /** api: config[printProvider]
     *  ``gxp.data.PrintNGProvider``
     */
    printProvider: null,

    /** api: config[paperSizes]
     *  ``Array`` Array of objects to use as paper size.
     *  Objects should have a name, size and units property.
     *  Defaults to: A4, letter, ledger, A3, B4 and legal.
     */
    paperSizes: null,

    /** api: config[map]
     *  ``OpenLayers.Map|GeoExt.MapPanel``
     */
    map: null,

    /** private:  method[constructor]
     *  Private constructor override.
     */
    constructor: function(config) {
        config = config || {};
        var defPaperArray = [
            {name: 'A4', size: [210, 297], units: 'mm'},
            {name: 'letter', size: [8.5, 11], units: 'in'},
            {name: 'ledger', size: [11, 17], units: 'in'},
            {name: 'A3', size: [297, 420], units: 'mm'},
            {name: 'B4', size: [250, 353], units: 'mm'},
            {name: 'legal', size: [8.5, 14], units: 'in'}
        ];
        var defDpiArray = [
            [96, '96 dpi']
            /* The flying saucer printer is only printing
            at 96 dpi for the moment
            ,
            [150, '150 dpi'],
            [300, '300 dpi']
            */
        ];
        var paperArray = config.paperSizes || defPaperArray;
        config.dpis = config.dpis || defDpiArray;
        delete config.paperSizes;
        this.paperSizes = new Ext.data.JsonStore({
            data: paperArray,
            fields: ['name', 'size', 'units'],
            idProperty: 'name'
        });
        gxp.PrintNGPanel.superclass.constructor.call(this, config);
    },

    /** private */
    initComponent: function() {
        var optionsToolbarConfig = {
            xtype: 'toolbar',
            ref: 'printOptions',
            items: [{
                xtype: 'container',
                layout: 'table',
                layoutConfig: {
                    columns: 2
                },
                frame: false,
                defaults: {
                    xtype: 'combo',
                    forceSelection: true,
                    lazyInit: false,
                    selectOnFocus: true,
                    triggerAction: 'all',
                    mode: 'local',
                    bodyStyle: 'padding: 2px 15px;'
                },
                items: [{
                    xtype: 'label',
                    text: this.paperSizeText
                }, {
                    ref: '../pageSizeSelect',
                    width: 120,
                    store: this.paperSizes,
                    valueField: 'size',
                    displayField: 'name',
                    emptyText: this.emptyPaperListText,
                    listEmptyText: this.emptyPaperListText,
                    listeners: {
                        'select': this.onPageSizeSelect,
                        'render': this.onPageComboRender,
                        scope: this
                    }
                }, {
                    xtype: 'label',
                    text: this.printTemplateText
                }, {
                    ref: '../templateSelect',
                    width: 120,
                    store: this.printProvider.templates,
                    valueField: 'id',
                    displayField: 'title',
                    emptyText: this.emptyTemplateListText,
                    lazyInit: true,
                    listEmptyText: this.emptyTemplateListText,
                    listeners: {
                        'select': this.onTemplateSelect,
                        scope: this
                    }
                }]
            }, {
                xtype: 'spacer',
                width: 20
            }, {
                xtype: 'container',
                layout: 'table',
                layoutConfig: {
                    columns: 2
                },
                frame: false,
                defaults: {
                    xtype: 'combo',
                    forceSelection: true,
                    lazyInit: false,
                    selectOnFocus: true,
                    triggerAction: 'all',
                    mode: 'local',
                    bodyStyle: 'padding: 2px 15px;'
                },
                items: [{
                    xtype: 'label',
                    text: this.resolutionText
                }, {
                    ref: '../resolutionSelect',
                    width: 120,
                    store: this.dpis,
                    value: this.dpis[0] && this.dpis[0].length && this.dpis[0][0],
                    listeners: {
                        'select': this.onResolutionSelect,
                        scope: this
                    }
                }]
            }, '->',
            {
                xtype: 'buttongroup',
                width: 120,
                frame: false,
                items: [{
                    xtype: 'buttongroup',
                    columns: 2,
                    title: this.orientationText,
                    defaults: {
                        scale: 'large',
                        width: 60,
                        iconAlign: 'top',
                        allowDepress: true,
                        enableToggle: true,
                        toggleGroup: 'orientation',
                        handler: this.onOrientationChange,
                        scope: this
                    },
                    items: [{
                        text: this.portraitText,
                        iconCls: 'gxp-icon-orient-portrait',
                        value: 'portrait'
                    }, {
                        text: this.landscapeText,
                        iconCls: 'gxp-icon-orient-landscape',
                        value: 'landscape',
                        pressed: true
                    }]
                }, {
                    xtype: 'button',
                    width: 120,
                    iconAlign: 'right',
                    scale: 'large',
                    text: this.printText,
                    iconCls: "gxp-icon-print",
                    handler: function() {
                        if(this.lastPrintLink) {
                            this.printProvider.download(null, this.lastPrintLink);
                        } else {
                            Ext.Msg.alert(this.noTemplateTitle, this.noTemplateMsg).setIcon(Ext.MessageBox.ERROR);
                        }
                    },
                    scope: this
                }]
            }]
        };
        var previewPanelConfig = {
            xtype: 'box',
            disabled: true,
            anchor: '100%, 100%',
            tpl: '<iframe style="width:100%;height:100%" src={url}></iframe>',
            ref: 'printPreview'
        };

        Ext.apply(this, {
            layout: 'vbox',
            layoutConfig: {
                align: 'stretch',
                pack: 'start'
            },
            items: [optionsToolbarConfig, previewPanelConfig]
        });

        gxp.PrintNGPanel.superclass.initComponent.apply(this, arguments);
    },

    /** private: method[onTemplateSelect]
     *  :param cmp: ``Ext.form.ComboBox``
     *  :param rec: ``Ext.data.Record``
     *  :param index: ``Integer``
     */
    onTemplateSelect: function(cmp, rec, index) {
        this.printProvider.setOptions({
            activeTemplate: rec
        });
        this.getPreview();
    },

    /** private: method[onResolutionSelect]
     *  :param cmp: ``Ext.form.ComboBox``
     *  :param rec: ``Ext.data.Record``
     *  :param index: ``Integer``
     */
    onResolutionSelect: function(cmp, rec, index) {
        this.getPreview();
    },

    /** private: method[onPageSizeSelect]
     *  :param cmp: ``Ext.form.ComboBox``
     *  :param rec: ``Ext.data.Record``
     *  :param index: ``Integer``
     */
    onPageSizeSelect: function(cmp, rec, index) {
        var pgSize = cmp.getValue();
        if(this.printProvider.pageOrientation == 'landscape'){
            pgSize = pgSize.reverse();
        }
        this.printProvider.setOptions({
            pageSize: pgSize,
            pageUnits: rec.get('units')
        });
        this.getPreview();
    },

    /** private: method[onOrientationChange]
     *  :param cmp: ``Ext.Button``
     */
    onOrientationChange: function(cmp) {
        this.printProvider.setOptions({
            pageOrientation: cmp.value
        });
        this.getPreview();
    },

    /** private: method[onPageComboRender]
     *  :param cmp: ``Ext.form.ComboBox``
     */
    onPageComboRender: function(cmp) {
        if (this.printProvider) {
            var size = this.printProvider.pageSize;
            var ndx = this.paperSizes.find('name', size);
            var paperSelect = this.printOptions.pageSizeSelect;
            if (ndx > -1) {
                paperSelect.expand();
                paperSelect.setValue(paperSelect.store.getAt(ndx)[paperSelect.valueField]);
            }
        }
    },

    /** private: method[readyToPrint]
     *  :return: ``Boolean``
     */
    readyToPrint: function() {
        var ready = false;
        var frm = this.printOptions,
            fields = [frm.pageSizeSelect, frm.templateSelect];
        Ext.each(fields, function(cmp) {
            ready = cmp.selectedIndex > -1 && cmp.getValue() != cmp.emptyText;
            return ready;
        });
        return ready;
    },

    /** private: method[getPreview]
     */
    getPreview: function() {
        if(this.readyToPrint()) {
            this.printPreview.enable();
            if(!this.busyMask) {
                this.busyMask = new Ext.LoadMask(this.printPreview.getEl(), {
                    msg: this.creatingPdfText
                });
            }
            this.busyMask.show();
            Ext.getBody(false).appendChild(
                Ext.DomHelper.createDom({
                    tag: 'div',
                    id: 'printMap',
                    style: 'position:absolute; left: -5000px; top: 0px;'
                })
            );
            var olmap = this.createPrinterMap();
            var mapEl = new Ext.Element(olmap.div).setLeft(0);
            this.printProvider.print(mapEl,{
                mapId: this.mapId,
                callback: this.showPreview.createDelegate(this),
                width: olmap.size.width,
                height: olmap.size.height
            });
            Ext.removeNode(mapEl.dom);
        }
    },

    /**
     * private: method[createPrinterMap]
     * :return: ``OpenLayers.Map``
     */
    createPrinterMap: function() {
        var olmap = this.map.map;
        var opts = this.printOptions;
        var that = this;
        var dpi = opts.resolutionSelect.getValue();
        var paperDim = opts.pageSizeSelect.getValue();
        var paperRec = opts.pageSizeSelect.findRecord(opts.pageSizeSelect.valueField, paperDim);
        var paperUnits = paperRec.get('units');

        //convert paperDim to printer map dimension array
        var cfact = OpenLayers.INCHES_PER_UNIT[paperUnits] * dpi;
        var pmapDim = [parseInt(paperDim[0] * cfact, 10), parseInt(paperDim[1] * cfact, 10)];

        //get and preserve the original map center & zoom
        var origCZ = {
            center: olmap.getCenter().clone(),
            zoom: olmap.zoom
        };
        //create a correctly sized map clone
        var pmapDiv = Ext.DomQuery.selectNode('#printMap');
        var pmapEl = new Ext.Element(pmapDiv);
        pmapEl.setSize(pmapDim[0], pmapDim[1]);
        var mapConfig = Ext.apply(olmap.options, {
            center: undefined,
            zoom: undefined,
            layers: []
        });
        Ext.each(olmap.layers, function(lyr) {
            if (lyr.getVisibility() && lyr.grid){
                var lyr_clone = lyr.clone();
                lyr_clone.queueTileDraw = undefined;
                mapConfig.layers.push(lyr_clone);
            }
        });
        var pmap = new OpenLayers.Map(pmapDiv, mapConfig);
        pmap.setCenter(origCZ.center, origCZ.zoom);
        return pmap;
    }

});

/** api: xtype = gxp_printngpanel */
Ext.reg('gxp_printngpanel', gxp.PrintNGPanel);

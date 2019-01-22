/*
 * ${copyright}
 */
sap.ui.define([
	'./SelectionPlugin',
	'./SelectionModelPlugin',
	'./BindingSelectionPlugin',
	'../library'
], function(
	SelectionPlugin,
	SelectionModelPlugin,
	BindingSelectionPlugin,
	library
) {

	"use strict";

	var SelectionMode = library.SelectionMode;

	/**
	 * Constructs an instance of sap.ui.table.plugins.MultiSelectionPlugin
	 *
	 * @class  Implements a plugin to enable a special multi-selection behavior:
	 * <ul>
	 * <li>No Select All button, select all can only be done via range selection</li>
	 * <li>Dedicated button to clear the selection</li>
	 * <li>The number of items which can be selected in a range is defined with the limit property by the application.
	 * If the user tries to select more items, the selection is automatically limited, and the table scrolls back to the last selected item</li>
	 * <li>If not already loaded, the table loads the selected items up to the given limit</li>
	 * <li>Multiple consecutive selections are possible</li>
	 * </ul>
	 *
	 * When this plugin is applied to the table, the selection mode is automatically set to MultiToggle and cannot be changed.
	 *
	 * @extends sap.ui.table.plugins.SelectionPlugin
	 * @constructor
	 * @public
	 * @since 1.64
	 * @experimental As of version 1.64
	 * @author SAP SE
	 * @alias sap.ui.table.plugins.MultiSelectionPlugin
	 */
	var MultiSelectionPlugin = SelectionPlugin.extend("sap.ui.table.plugins.MultiSelectionPlugin", {metadata: {
		properties: {
			/**
			 * Number of items which can be selected in a range.
			 */
			limit: {type: "int", group: "Behavior", defaultValue: 200}
		},
		events: {
			/**
			 * This event is fired when the selection is changed.
			 */
			selectionChange: {
				parameters: {

					/**
					 * Array of indices whose selection has been changed (either selected or deselected).
					 */
					indices: {type: "int[]"},

					/**
					 * Indicates whether the selection limit has been reached.
					 */
					limitReached: {type: "boolean"}
				}
			}
		}
	}});

	/**
	 * Sets up the initial values.
	 */
	MultiSelectionPlugin.prototype.init = function() {
		SelectionPlugin.prototype.init.call(this);
		this._bLimitReached = false;
	};

	/**
	 * Returns an object containing the selection type of the header selector and a default icon.
	 *
	 * @return {{headerSelector: {type: string, icon: string}}}
	 */
	MultiSelectionPlugin.prototype.getRenderConfig = function() {
		return {
			headerSelector: {
				type: "clear",
				icon: "sap-icon://sys-cancel"
			}
		};
	};

	/**
	 * This hook is called by the table when the header selector is pressed.
	 *
	 * @return {boolean}
	 */
	MultiSelectionPlugin.prototype.onHeaderSelectorPress = function() {
		this.clearSelection();
		return true;
	};

	/**
	 * This hook is called by the table when the "select all" keyboard shortcut is pressed.
	 *
	 * @param sType
	 * @return {boolean}
	 */
	MultiSelectionPlugin.prototype.onKeyboardShortcut = function(sType) {
		this.clearSelection();
		if (sType === "toggle") {
			return true;
		}
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.addSelectionInterval = function(iIndexFrom, iIndexTo) {
		if (!this.oSelectionPlugin) {
			return;
		}

		var iLimit = this.getLimit();
		var iLength = iIndexTo - iIndexFrom + 1;
		var that = this;
		var oBinding = this._getBinding();

		this.setLimitReached(false);
		if (iLength > iLimit) {
			iIndexTo = iIndexFrom + iLimit - 1;
			iLength = iLimit;
			this.setLimitReached(true);
		}

		if (oBinding && iIndexFrom >= 0 && iLength > 0) {
			loadMultipleContexts(oBinding, iIndexFrom, iLength).then(function () {
				that.oSelectionPlugin.addSelectionInterval(iIndexFrom, iIndexTo);
			});
		}
	};

	function loadMultipleContexts(oBinding, iStartIndex, iLength){
		return new Promise(function(resolve){
			loadContexts(oBinding, iStartIndex, iLength, resolve);
		});
	}

	function loadContexts(oBinding, iStartIndex, iLength, fResolve) {
		var aContexts = oBinding.getContexts(iStartIndex, iLength);
		var bLoadItems = false;

		for (var i = 0; i < aContexts.length; i++) {
			if (!aContexts[i]) {
				bLoadItems = true;
				break;
			}
		}
		if (!bLoadItems && !aContexts.dataRequested) {
			fResolve(aContexts);
			return;
		}

		oBinding.attachEventOnce("dataReceived", function() {
			aContexts = oBinding.getContexts(iStartIndex, iLength);
			if (aContexts.length == iLength) {
				fResolve(aContexts);
			} else {
				loadContexts(oBinding, iStartIndex, iLength, fResolve);
			}
		});
	}

	/**
	 * Returns <code>true</code> if the selection limit has been reached (only the last selection), <code>false</code> otherwise.
	 *
	 * @return {boolean}
	 */
	MultiSelectionPlugin.prototype.isLimitReached = function() {
		return this._bLimitReached;
	};

	/**
	 * Sets the value.
	 *
	 * @param bLimitReached
	 */
	MultiSelectionPlugin.prototype.setLimitReached = function(bLimitReached) {
		this._bLimitReached = bLimitReached;
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.clearSelection = function() {
		if (this.oSelectionPlugin) {
			this.oSelectionPlugin.clearSelection();
		}
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.getSelectedIndex = function() {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin.getSelectedIndex();
		}
		return -1;
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.getSelectedIndices = function() {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin.getSelectedIndices();
		}
		return [];
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.getSelectableCount = function() {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin.getSelectableCount();
		}
		return 0;
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.getSelectedCount = function() {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin.getSelectedCount();
		}
		return 0;
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.isIndexSelectable = function(iIndex) {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin.isIndexSelectable(iIndex);
		}
		return false;
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.isIndexSelected = function(iIndex) {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin.isIndexSelected(iIndex);
		}
		return false;
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.removeSelectionInterval = function(iIndexFrom, iIndexTo) {
		if (this.oSelectionPlugin) {
			this.oSelectionPlugin.removeSelectionInterval(iIndexFrom, iIndexTo);
		}
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.setSelectedIndex = function(iIndex) {
		if (this.oSelectionPlugin) {
			var that = this;
			var oBinding = this._getBinding();
			if (oBinding && iIndex >= 0) {
				loadMultipleContexts(oBinding, iIndex, 1).then(function () {
					that.oSelectionPlugin.setSelectedIndex(iIndex);
				});
			}
		}
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.setSelectionInterval = function(iIndexFrom, iIndexTo) {
		if (!this.oSelectionPlugin) {
			return;
		}

		var iLimit = this.getLimit();
		var iLength = iIndexTo - iIndexFrom + 1;
		var that = this;
		var oBinding = this._getBinding();

		this.setLimitReached(false);
		if (iLength > iLimit) {
			iIndexTo = iIndexFrom + iLimit - 1;
			iLength = iLimit;
			this.setLimitReached(true);
		}

		if (oBinding && iIndexFrom >= 0 && iLength > 0) {
			loadMultipleContexts(oBinding, iIndexFrom, iLength).then(function () {
				that.oSelectionPlugin.setSelectionInterval(iIndexFrom, iIndexTo);
			});
		}
	};

	/**
	 * @override
	 * @inheritDoc
	 */
	MultiSelectionPlugin.prototype.setParent = function(oParent) {
		var vReturn = SelectionPlugin.prototype.setParent.apply(this, arguments);

		if (this.oSelectionPlugin) {
			this.oSelectionPlugin.destroy();
			this.oSelectionPlugin.detachEvent("selectionChange", this._onSelectionChange);
			this.oSelectionPlugin = null;
		}
		if (oParent) {
			this.oSelectionPlugin = new oParent._SelectionAdapterClass();
			this.oSelectionPlugin.attachEvent("selectionChange", this._onSelectionChange, this);
			oParent.setSelectionMode(SelectionMode.MultiToggle);
		}

		return vReturn;
	};

	/**
	 * Fires the _onSelectionChange event.
	 *
	 * @param oEvent
	 * @private
	 */
	MultiSelectionPlugin.prototype._onSelectionChange = function(oEvent) {
		var aRowIndices = oEvent.getParameter("rowIndices");

		this.fireSelectionChange({
			rowIndices: aRowIndices,
			limitReached: this.isLimitReached()
		});
	};

	/**
	 * Returns the last existing index of the binding.
	 *
	 * @return {int} Last index of the binding
	 * @private
	 */
	MultiSelectionPlugin.prototype._getLastIndex = function() {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin._getLastIndex();
		}
		return 0;
	};

	/**
	 * Returns the binding of the associated table.
	 *
	 * @return {*}
	 * @private
	 */
	MultiSelectionPlugin.prototype._getBinding = function() {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin._getBinding();
		}
		return null;
	};

	/**
	 * Sets the binding of the associated table.
	 *
	 * @override
	 * @param {sap.ui.model.Binding} oBinding
	 * @private
	 */
	MultiSelectionPlugin.prototype._setBinding = function(oBinding) {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin._setBinding(oBinding);
		}
	};

	/**
	 * The event is fired when the binding of the table is changed.
	 *
	 * @param {sap.ui.base.Event} oEvent
	 * @private
	 */
	MultiSelectionPlugin.prototype._onBindingChange = function(oEvent) {
		if (this.oSelectionPlugin) {
			return this.oSelectionPlugin._onBindingChange(oEvent);
		}
	};

	return MultiSelectionPlugin;
});
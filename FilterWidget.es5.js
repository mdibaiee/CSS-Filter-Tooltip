"use strict";

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

var _toConsumableArray = function (arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } };

/**
  * This is a CSS Filter Editor widget used
  * for Rule View's filter swatches
  */

var DEFAULT_FILTER_TYPE = "length";
var UNIT_MAPPING = {
  percentage: "%",
  length: "px",
  angle: "deg",
  string: ""
};

var FAST_VALUE_MULTIPLIER = 10;
var SLOW_VALUE_MULTIPLIER = 0.1;
var DEFAULT_VALUE_MULTIPLIER = 1;

var LIST_PADDING = 7;
var LIST_ITEM_HEIGHT = 32;

var filterList = [{
  name: "blur",
  range: [0, Infinity],
  type: "length"
}, {
  name: "brightness",
  range: [0, Infinity],
  type: "percentage"
}, {
  name: "contrast",
  range: [0, Infinity],
  type: "percentage"
}, {
  name: "drop-shadow",
  placeholder: "x y radius color",
  type: "string"
}, {
  name: "grayscale",
  range: [0, 100], // You can go over that, but it gives the same results as 100%
  type: "percentage"
}, {
  name: "hue-rotate",
  range: [0, 360],
  type: "angle"
}, {
  name: "invert",
  range: [0, 100],
  type: "percentage"
}, {
  name: "opacity",
  range: [0, 100],
  type: "percentage"
}, {
  name: "saturate",
  range: [0, Infinity],
  type: "percentage"
}, {
  name: "sepia",
  range: [0, 100],
  type: "percentage"
}, {
  name: "url",
  placeholder: "example.svg#c1",
  type: "string"
}];

/**
 * A CSS Filter editor widget used to add/remove/modify
 * filters.
 *
 * Normally, it takes a CSS filter value as input, parses it
 * and creates the required elements / bindings.
 *
 * You can, however, use add/remove/update methods manually
 * see each method's comments for more details
 *
 * @param nsIDOMNode el
 *        The widget container.
 * @param string value
 *        CSS filter value
 */
function CSSFilterEditorWidget(el) {
  var value = arguments[1] === undefined ? "" : arguments[1];

  this.doc = el.ownerDocument;
  this.win = window;
  this.el = el;
  this._onChange = function () {};

  this._addButtonClick = this._addButtonClick.bind(this);
  this._removeButtonClick = this._removeButtonClick.bind(this);
  this._mouseMove = this._mouseMove.bind(this);
  this._mouseUp = this._mouseUp.bind(this);
  this._mouseDown = this._mouseDown.bind(this);
  this._keyDown = this._keyDown.bind(this);
  this._keyUp = this._keyUp.bind(this);

  this._initMarkup();
  this._buildFilterItemMarkup();
  this._addEventListeners();

  this.filters = [];
  this.setCssValue(value);
}

CSSFilterEditorWidget.prototype = {
  _initMarkup: function _initMarkup() {
    var list = this.el.querySelector(".filters");
    this.el.appendChild(list);
    this.el.insertBefore(list, this.el.firstChild);
    this.container = this.el;
    this.list = list;

    this.filterSelect = this.el.querySelector("select");
    this._populateFilterSelect();
  },

  /**
    * Creates <option> elements for each filter definition
    * in filterList
    */
  _populateFilterSelect: function _populateFilterSelect() {
    var _this = this;

    var select = this.filterSelect;
    filterList.forEach(function (filter) {
      var option = _this.doc.createElement("option");
      option.innerHTML = option.value = filter.name;
      select.appendChild(option);
    });
  },

  /**
    * Creates a template for filter elements which is cloned and used in render
    */
  _buildFilterItemMarkup: function _buildFilterItemMarkup() {
    var base = this.doc.createElement("div");
    base.className = "filter";

    var name = this.doc.createElement("div");
    name.className = "filter-name";

    var value = this.doc.createElement("div");
    value.className = "filter-value";

    var drag = this.doc.createElement("i");
    drag.title = "Drag up or down to re-order filters";

    var label = this.doc.createElement("label");
    label.title = "Drag left or right to decrease or increase the value";

    name.appendChild(drag);
    name.appendChild(label);

    var input = this.doc.createElement("input");

    value.appendChild(input);

    var removeButton = this.doc.createElement("button");
    removeButton.className = "remove-button";
    value.appendChild(removeButton);

    base.appendChild(name);
    base.appendChild(value);

    this._filterItemMarkup = base;
  },

  _addEventListeners: function _addEventListeners() {
    var select = this.filterSelect;

    this.addButton = this.el.querySelector("#add-filter");
    this.addButton.addEventListener("click", this._addButtonClick);
    this.list.addEventListener("click", this._removeButtonClick);
    this.list.addEventListener("mousedown", this._mouseDown);

    // These events are event delegators for
    // drag-drop re-ordering and label-dragging
    this.win.addEventListener("mousemove", this._mouseMove);
    this.win.addEventListener("mouseup", this._mouseUp);
    // These events are used for label-dragging
    this.win.addEventListener("keydown", this._keyDown);
    this.win.addEventListener("keyup", this._keyUp);
  },

  _mouseDown: function _mouseDown(e) {
    var tagName = e.target.tagName.toLowerCase();

    // drag handle
    if (tagName === "i") {
      var li = e.target.parentNode.parentNode;
      li.classList.add("dragging");
      li.startingY = e.pageY;

      this.container.classList.add("dragging");
    } else if (tagName === "label") {
      var label = e.target,
          li = label.parentNode.parentNode,
          input = li.querySelector("input"),
          index = [].concat(_toConsumableArray(this.list.children)).indexOf(li);

      this._dragging = {
        index: index, label: label, input: input,
        startX: e.pageX,
        startValue: parseFloat(input.value),
        multiplier: DEFAULT_VALUE_MULTIPLIER
      };

      if (e.altKey) {
        this._dragging.multiplier = SLOW_VALUE_MULTIPLIER;
      } else if (e.shiftKey) {
        this._dragging.multiplier = FAST_VALUE_MULTIPLIER;
      }
    }
  },

  _keyDown: function _keyDown(e) {
    var dragging = this._dragging;
    if (!dragging) {
      return;
    }

    var input = dragging.input;

    if (e.altKey) {
      dragging.multiplier = SLOW_VALUE_MULTIPLIER;
    } else if (e.shiftKey) {
      dragging.multiplier = FAST_VALUE_MULTIPLIER;
    }

    dragging.startValue = parseFloat(input.value);
    dragging.startX = dragging.lastX;
  },

  _keyUp: function _keyUp(e) {
    var dragging = this._dragging;
    if (!dragging) {
      return;
    }

    var input = dragging.input;

    dragging.multiplier = DEFAULT_VALUE_MULTIPLIER;
    dragging.startValue = parseFloat(input.value);
    dragging.startX = dragging.lastX;
  },

  _addButtonClick: function _addButtonClick(e) {
    var select = this.filterSelect;
    if (!select.value) {
      return;
    }

    var key = select.value;
    var def = this._definition(key);
    // UNIT_MAPPING[string] is an empty string (falsy), so
    // using || doesn't work here
    var unitLabel = typeof UNIT_MAPPING[def.type] == "undefined" ? UNIT_MAPPING[DEFAULT_FILTER_TYPE] : UNIT_MAPPING[def.type];

    if (!unitLabel) {
      this.add(key, "");
    } else {
      this.add(key, (def.range[0] || "0") + unitLabel);
    }

    this.render();
    this._onChange(this.getCssValue());
  },

  _removeButtonClick: function _removeButtonClick(e) {
    var isRemoveButton = e.target.classList.contains("remove-button");
    if (!isRemoveButton) {
      return;
    }

    var li = e.target.parentNode.parentNode;
    var index = [].concat(_toConsumableArray(this.list.children)).indexOf(li);
    this.removeAt(index);
  },

  _dragFilterElement: function _dragFilterElement(e) {
    var rect = this.list.getBoundingClientRect(),
        top = e.pageY - LIST_PADDING,
        bottom = e.pageY + LIST_PADDING;
    // don't allow dragging over top/bottom of list
    if (top < rect.top || bottom > rect.bottom) {
      return;
    }

    var dragging = this.list.querySelector(".dragging");

    var delta = e.pageY - dragging.startingY;
    dragging.style.top = delta + "px";

    // change is the number of _steps_ taken from initial position
    // i.e. how many elements we have passed
    var change = delta / LIST_ITEM_HEIGHT;
    change = change > 0 ? Math.floor(change) : change < 0 ? Math.round(change) : change;

    var children = this.list.children;
    var index = [].concat(_toConsumableArray(children)).indexOf(dragging);
    var destination = index + change;

    // If we're moving out, or there's no change at all, stop and return
    if (destination >= children.length || destination < 0 || change === 0) {
      return;
    }

    // Re-order filter objects
    swapArrayIndices(this.filters, index, destination);

    // Re-order the dragging element in markup
    var target = change > 0 ? this.list.children[destination + 1] : this.list.children[destination];
    if (target) {
      this.list.insertBefore(dragging, target);
    } else {
      this.list.appendChild(dragging);
    }

    var currentPosition = change * LIST_ITEM_HEIGHT;
    // This line moves the dragging element to it's previous *visual* position
    // after it has been re-ordered in markup to avoid flickers
    dragging.style.top = delta - currentPosition + "px";

    dragging.startingY = e.pageY + currentPosition - delta;
  },

  _dragLabel: function _dragLabel(e) {
    var dragging = this._dragging;

    var input = dragging.input;

    dragging.lastX = e.pageX;
    var delta = e.pageX - dragging.startX;
    var value = dragging.startValue + delta * dragging.multiplier;

    var _definition$range = _slicedToArray(this._definition(this.filters[dragging.index].name).range, 2);

    var min = _definition$range[0];
    var max = _definition$range[1];

    value = value < min ? min : value > max ? max : value;

    input.value = fixFloat(value);

    this.updateValueAt(this._dragging.index, value);
  },

  _mouseMove: function _mouseMove(e) {
    var draggingElement = this.list.querySelector(".dragging"),
        draggingLabel = this._dragging;

    if (draggingElement) {
      this._dragFilterElement(e);
    } else if (draggingLabel) {
      this._dragLabel(e);
    }
  },

  _mouseUp: function _mouseUp(e) {
    // Label-dragging is disabled on mouseup
    this._dragging = null;

    // Filter drop needs more cleaning
    var dragging = this.list.querySelector(".dragging");
    if (!dragging) {
      return;
    }

    dragging.classList.remove("dragging");
    this.container.classList.remove("dragging");
    dragging.removeAttribute("style");

    dragging.classList.remove("dragging");

    this._onChange(this.getCssValue());
    this.render();
  },

  /**
   * Clears the list and renders filters, binding required events.
   * There are some delegated events bound in _addEventListeners method
   */
  render: function render() {
    var _this = this;

    if (!this.filters.length) {
      this.list.innerHTML = "<p> No Filter Specified <br />\n                                 Add a filter using the list below </p>";

      return;
    }

    this.list.innerHTML = "";

    var base = this._filterItemMarkup;

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = this.filters.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var _step$value;

        var _el$children;

        var _name$children;

        var _ref;

        var _ref2;

        (function () {
          _step$value = _slicedToArray(_step.value, 2);
          var index = _step$value[0];
          var filter = _step$value[1];

          var def = _this._definition(filter.name);

          var el = base.cloneNode(true);

          _el$children = _slicedToArray(el.children, 2);
          var name = _el$children[0];
          var value = _el$children[1];_name$children = _slicedToArray(name.children, 2);
          var drag = _name$children[0];

          var label = _name$children[1];
          var input = value.children[0];

          var min = undefined,
              max = undefined;
          if (def.range) {
            _ref = def.range;
            _ref2 = _slicedToArray(_ref, 2);
            min = _ref2[0];
            max = _ref2[1];
          }

          label.textContent = filter.name;

          switch (def.type) {
            case "percentage":
            case "angle":
            case "length":
              input.type = "number";
              input.min = min;
              if (max !== Infinity) {
                input.max = max;
              }
              input.step = "0.1";
              input.classList.add("devtools-textinput");
              break;
            case "string":
              input.type = "text";
              input.placeholder = def.placeholder;
              input.classList.add("devtools-textinput");
              break;
          }

          // use photoshop-style label-dragging
          // and show their unit next to their input
          if (def.type !== "string") {
            var unitPreview = _this.doc.createElement("span");
            unitPreview.textContent = filter.unit;

            value.insertBefore(unitPreview, input.nextElementSibling);

            label.classList.add("devtools-draglabel");

            label.addEventListener("mousedown", function (e) {});
          }

          input.value = filter.value;

          _this.list.appendChild(el);

          (function (index) {
            input.addEventListener("input", function (e) {
              if (def.type !== "string") {
                e.target.value = fixFloat(e.target.value);
              }
              _this.updateValueAt(index, e.target.value);
            });
          })(index);
        })();
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"]) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  },

  /**
    * returns definition of a filter as defined
    * in filterList
    *
    * @param string name
    *        filter name (e.g. blur)
    * @return Object
    *        filter's definition
    */
  _definition: function _definition(name) {
    return filterList.find(function (a) {
      return a.name === name;
    });
  },

  /**
    * Parses the CSS value specified,
    * updating widget's filters
    *
    * @param string value
    *        css value to be parsed
    */
  setCssValue: function setCssValue(value) {
    if (!value) {
      throw new Error("Missing CSS filter string value in setCSS");
    }

    this.filters = [];

    if (value === "none") {
      this._onChange(this.getCssValue());
      return;
    }

    // Apply filter to a temporary element
    // and get the computed value to make parsing
    // easier
    var computedValue = value;

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = tokenizeComputedFilter(computedValue)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var _step$value = _step.value;
        var _name = _step$value.name;
        var _value = _step$value.value;

        this.add(_name, _value);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"]) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    this._onChange(this.getCssValue());
    this.render();
  },

  /**
    * Creates a new [name] filter record with value
    *
    * @param string name
    *        filter name (e.g. blur)
    * @param string value
    *        value of the filter (e.g. 30px, 20%)
    * @return number
    *        The index of the new filter in the current list of filters
    */
  add: function add(name, value) {
    var def = this._definition(name);
    if (!def) {
      return false;
    }

    var unit = def.type === "string" ? "" : /[a-zA-Z%]+/.exec(value);
    unit = unit ? unit[0] : "";

    if (def.type !== "string") {
      value = parseFloat(value);

      if (def.type === "percentage" && unit === "") {
        value = value * 100;
        unit = "%";
      }

      var _def$range = _slicedToArray(def.range, 2);

      var min = _def$range[0];
      var max = _def$range[1];

      if (min && value < min) {
        value = min;
      }
      if (max && value > max) {
        value = max;
      }
    }

    this._onChange(this.getCssValue());
    return this.filters.push({ value: value, unit: unit, name: def.name }) - 1;
  },

  /**
    * returns value + unit of the specified filter
    *
    * @param number index
    *        filter index
    * @return string
    *        css value of filter
    */
  getValueAt: function getValueAt(index) {
    var filter = this.filters[index];
    if (!filter) {
      return null;
    }

    var val = filter.value || (filter.unit ? "0" : ""),
        unit = filter.unit || "";

    return val + unit;
  },

  removeAt: function removeAt(index) {
    if (!this.filters[index]) {
      return null;
    }

    this.filters.splice(index, 1);

    this._onChange(this.getCssValue());
    this.render();
  },

  /**
    * Generates css value for filters of the widget
    *
    * @return string
    *        css value of filters
    */
  getCssValue: function getCssValue() {
    var _this = this;

    return this.filters.map(function (filter, i) {
      return "" + filter.name + "(" + _this.getValueAt(i) + ")";
    }).join(" ") || "none";
  },

  /**
    * Updates the filter setting it's value
    *
    * @param number index
    *        The index of the filter in the current list of filters
    * @param number/string value
    *        value to set, string for string-typed filters
    *        number for the rest (unit automatically determined)
    */
  updateValueAt: function updateValueAt(index, value) {
    var filter = this.filters[index];
    if (!filter) {
      return false;
    }

    filter.value = filter.unit ? fixFloat(value, true) : value;

    this._onChange(this.getCssValue());
  },

  _removeEventListeners: function _removeEventListeners() {
    this.addButton.removeEventListener("click", this._addButtonClick);
    this.list.removeEventListener("click", this._removeButtonClick);
    this.list.removeEventListener("mousedown", this._mouseDown);

    // These events are used for drag drop re-ordering
    this.win.removeEventListener("mousemove", this._mouseMove);
    this.win.removeEventListener("mouseup", this._mouseUp);

    // These events are used for label dragging
    this.win.removeEventListener("keydown", this._keyDown);
    this.win.removeEventListener("keyup", this._keyUp);
  },

  _destroyMarkup: function _destroyMarkup() {
    this._filterItemMarkup.remove();
    this.el.remove();
    this.el = this.list = this.container = this._filterItemmarkup = null;
  },

  destroy: function destroy() {
    this._removeEventListeners();
    this._destroyMarkup();
  }
};

// Fixes JavaScript's float precision
function fixFloat(a, number) {
  var fixed = parseFloat(a).toFixed(1);
  return number ? parseFloat(fixed) : fixed;
}

/**
 * Used to swap two filters' indexes
 * after drag/drop re-ordering
 *
 * @param array array
 *        the array to swap elements of
 * @param number a
 *        index of first element
 * @param number b
 *        index of second element
 */
function swapArrayIndices(array, a, b) {
  array[a] = array.splice(b, 1, array[a])[0];
}

/**
  * Tokenizes CSS Filter value and returns
  * an array of {name, value} pairs
  *
  * This is only a very simple tokenizer that only works its way through
  * parenthesis in the string to detect function names and values.
  * It assumes that the string actually is a well-formed filter value
  * (e.g. "blur(2px) hue-rotate(100deg)").
  *
  * @param string css
  *        CSS Filter value to be parsed
  * @return array
  *        An array of {name, value} pairs
  */
function tokenizeComputedFilter(css) {
  var filters = [];
  var current = "";
  var depth = 0;

  if (css === "none") {
    return filters;
  }

  while (css.length) {
    var char = css[0];

    switch (char) {
      case "(":
        depth++;
        if (depth === 1) {
          filters.push({ name: current.trim() });
          current = "";
        } else {
          current += char;
        }
        break;
      case ")":
        depth--;
        if (depth === 0) {
          filters[filters.length - 1].value = current.trim();
          current = "";
        } else {
          current += char;
        }
        break;
      default:
        current += char;
        break;
    }

    css = css.slice(1);
  }

  return filters;
}
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


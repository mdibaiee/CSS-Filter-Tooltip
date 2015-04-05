/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
  * This is a CSS Filter Editor widget used
  * for Rule View's filter swatches
  */

const DEFAULT_FILTER_TYPE = "length";
const UNIT_MAPPING = {
  percentage: "%",
  length: "px",
  angle: "deg",
  string: ""
};

const FAST_VALUE_MULTIPLIER = 10;
const SLOW_VALUE_MULTIPLIER = 0.1;
const DEFAULT_VALUE_MULTIPLIER = 1;

const LIST_PADDING = 7;
const LIST_ITEM_HEIGHT = 32;

const filterList = [
  {
    "name": "blur",
    "range": [0, Infinity],
    "type": "length"
  },
  {
    "name": "brightness",
    "range": [0, Infinity],
    "type": "percentage"
  },
  {
    "name": "contrast",
    "range": [0, Infinity],
    "type": "percentage"
  },
  {
    "name": "drop-shadow",
    "placeholder": "x y radius color",
    "type": "string"
  },
  {
    "name": "grayscale",
    "range": [0, 100], // You can go over that, but it gives the same results as 100%
    "type": "percentage"
  },
  {
    "name": "hue-rotate",
    "range": [0, 360],
    "type": "angle"
  },
  {
    "name": "invert",
    "range": [0, 100],
    "type": "percentage"
  },
  {
    "name": "opacity",
    "range": [0, 100],
    "type": "percentage"
  },
  {
    "name": "saturate",
    "range": [0, Infinity],
    "type": "percentage"
  },
  {
    "name": "sepia",
    "range": [0, 100],
    "type": "percentage"
  },
  {
    "name": "url",
    "placeholder": "example.svg#c1",
    "type": "string"
  }
];

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
function CSSFilterEditorWidget(el, value = "") {
  this.doc = el.ownerDocument;
  this.win = window;
  this.el = el;
  this._onChange = function() {}

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
  _initMarkup: function() {
    let list = this.el.querySelector(".filters");
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
  _populateFilterSelect: function() {
    let select = this.filterSelect;
    filterList.forEach(filter => {
      let option = this.doc.createElement("option");
      option.innerHTML = option.value = filter.name;
      select.appendChild(option);
    });
  },

  /**
    * Creates a template for filter elements which is cloned and used in render
    */
  _buildFilterItemMarkup: function() {
    let base = this.doc.createElement("div");
    base.className = "filter";

    let name = this.doc.createElement("div");
    name.className = "filter-name";

    let value = this.doc.createElement("div");
    value.className = "filter-value";

    let drag = this.doc.createElement("i");
    drag.title = "Drag up or down to re-order filters"

    let label = this.doc.createElement("label")
    label.title = "Drag left or right to decrease or increase the value";

    name.appendChild(drag);
    name.appendChild(label);

    let input = this.doc.createElement("input");

    value.appendChild(input);

    let removeButton = this.doc.createElement("button");
    removeButton.className = "remove-button";
    value.appendChild(removeButton);

    base.appendChild(name);
    base.appendChild(value);

    this._filterItemMarkup = base;
  },

  _addEventListeners: function() {
    let select = this.filterSelect;

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

  _mouseDown: function(e) {
    const tagName = e.target.tagName.toLowerCase();

    // drag handle
    if (tagName === "i") {
      let li = e.target.parentNode.parentNode;
      li.classList.add("dragging");
      li.startingY = e.pageY;

      this.container.classList.add("dragging");
    } else if (tagName === "label") {
      let label = e.target,
          li = label.parentNode.parentNode,
          input = li.querySelector("input"),
          index = [...this.list.children].indexOf(li);

      this._dragging = {
        index, label, input,
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

  _keyDown: function(e) {
    let dragging = this._dragging;
    if (!dragging) {
      return;
    }

    let input = dragging.input;

    if (e.altKey) {
      dragging.multiplier = SLOW_VALUE_MULTIPLIER;
    } else if (e.shiftKey) {
      dragging.multiplier = FAST_VALUE_MULTIPLIER;
    }

    dragging.startValue = parseFloat(input.value);
    dragging.startX = dragging.lastX;
  },

  _keyUp: function(e) {
    let dragging = this._dragging;
    if (!dragging) {
      return;
    }

    let input = dragging.input;

    dragging.multiplier = DEFAULT_VALUE_MULTIPLIER;
    dragging.startValue = parseFloat(input.value);
    dragging.startX = dragging.lastX;
  },

  _addButtonClick: function(e) {
    let select = this.filterSelect;
    if (!select.value) {
      return;
    }

    let key = select.value;
    let def = this._definition(key);
    // UNIT_MAPPING[string] is an empty string (falsy), so
    // using || doesn't work here
    let unitLabel = typeof UNIT_MAPPING[def.type] == "undefined" ?
                           UNIT_MAPPING[DEFAULT_FILTER_TYPE] :
                           UNIT_MAPPING[def.type];

    if (!unitLabel) {
      this.add(key, "");
    } else {
      this.add(key, (def.range[0] || "0") + unitLabel);
    }

    this.render();
    this._onChange(this.getCssValue());
  },

  _removeButtonClick: function(e) {
    const isRemoveButton = e.target.classList.contains("remove-button");
    if (!isRemoveButton) {
      return;
    }

    let li = e.target.parentNode.parentNode;
    let index = [...this.list.children].indexOf(li);
    this.removeAt(index);
  },

  _dragFilterElement: function(e) {
    const rect = this.list.getBoundingClientRect(),
          top = e.pageY - LIST_PADDING,
          bottom = e.pageY + LIST_PADDING;
    // don't allow dragging over top/bottom of list
    if (top < rect.top || bottom > rect.bottom) {
      return;
    }

    let dragging = this.list.querySelector(".dragging");

    let delta = e.pageY - dragging.startingY;
    dragging.style.top = delta + "px";

    // change is the number of _steps_ taken from initial position
    // i.e. how many elements we have passed
    let change = delta / LIST_ITEM_HEIGHT;
    change = change > 0 ? Math.floor(change) :
             change < 0 ? Math.round(change) : change;

    let children = this.list.children;
    let index = [...children].indexOf(dragging);
    let destination = index + change;

    // If we're moving out, or there's no change at all, stop and return
    if (destination >= children.length || destination < 0 || change === 0) {
      return;
    }

    // Re-order filter objects
    swapArrayIndices(this.filters, index, destination);

    // Re-order the dragging element in markup
    let target = change > 0 ? this.list.children[destination + 1] : this.list.children[destination];
    if (target) {
      this.list.insertBefore(dragging, target);
    } else {
      this.list.appendChild(dragging);
    }

    const currentPosition = change * LIST_ITEM_HEIGHT;
    // This line moves the dragging element to it's previous *visual* position
    // after it has been re-ordered in markup to avoid flickers
    dragging.style.top = delta - currentPosition + "px";

    dragging.startingY = e.pageY + currentPosition - delta;
  },

  _dragLabel: function(e) {
    let dragging = this._dragging;

    let input = dragging.input;

    dragging.lastX = e.pageX;
    let delta = e.pageX - dragging.startX;
    let value = dragging.startValue + delta * dragging.multiplier;

    let [min, max] = this._definition(this.filters[dragging.index].name).range;
    value = value < min ? min :
            value > max ? max : value;

    input.value = fixFloat(value);

    this.updateValueAt(this._dragging.index, value);
  },

  _mouseMove: function(e) {
    let draggingElement = this.list.querySelector(".dragging"),
        draggingLabel = this._dragging;

    if (draggingElement) {
      this._dragFilterElement(e);
    } else if (draggingLabel) {
      this._dragLabel(e);
    }
  },

  _mouseUp: function(e) {
    // Label-dragging is disabled on mouseup
    this._dragging = null;

    // Filter drop needs more cleaning
    let dragging = this.list.querySelector(".dragging");
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
  render: function() {
    if (!this.filters.length) {
      this.list.innerHTML = `<p> No Filter Specified <br />
                                 Add a filter using the list below </p>`;

      return;
    }

    this.list.innerHTML = "";

    let base = this._filterItemMarkup;

    for (let [index, filter] of this.filters.entries()) {
      let def = this._definition(filter.name);

      let el = base.cloneNode(true);

      let [name, value] = el.children,
          [drag, label] = name.children,
          input = value.children[0];

      let min, max;
      if (def.range) {
        [min, max] = def.range;
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
        let unitPreview = this.doc.createElement("span");
        unitPreview.textContent = filter.unit;

        value.insertBefore(unitPreview, input.nextElementSibling);

        label.classList.add("devtools-draglabel");

        label.addEventListener("mousedown", e => {
        });
      }

      input.value = filter.value;

      this.list.appendChild(el);

      (index => {
        input.addEventListener("change", e => {
          this.updateValueAt(index, e.target.value);
        });
      })(index);
    }

    let el = this.list.querySelector(`.filter:last-of-type input`);
    if (el) {
      el.focus();
      // move cursor to end of input
      el.setSelectionRange(el.value.length, el.value.length);
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
  _definition: function(name) {
    return filterList.find(a => a.name === name);
  },

  /**
    * Parses the CSS value specified,
    * updating widget's filters
    *
    * @param string value
    *        css value to be parsed
    */
  setCssValue: function(value) {
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
    let tmp = this.doc.createElement("i");
    tmp.style.filter = value;
    let computedValue = this.win.getComputedStyle(tmp).filter;

    for (let {name, value} of tokenizeComputedFilter(computedValue)) {
      this.add(name, value);
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
  add: function(name, value) {
    let def = this._definition(name);
    if (!def) {
      return false;
    }

    let unit = def.type === "string" ? "" : /[a-zA-Z%]+/.exec(value);
    unit = unit ? unit[0] : "";

    if (def.type !== "string") {
      value = parseFloat(value);

      if(def.type === "percentage" && unit === "") {
        value = value * 100;
        unit = "%";
      }

      let [min, max] = def.range;
      if (min && value < min) {
        value = min;
      }
      if (max && value > max) {
        value = max;
      }
    }

    this._onChange(this.getCssValue());
    return this.filters.push({value, unit, name: def.name}) - 1;
  },

  /**
    * returns value + unit of the specified filter
    *
    * @param number index
    *        filter index
    * @return string
    *        css value of filter
    */
  getValueAt: function(index) {
    let filter = this.filters[index];
    if (!filter) {
      return null;
    }

    let val = filter.value || (filter.unit ? "0" : ""),
        unit = filter.unit || "";

    return val + unit;
  },

  removeAt: function(index) {
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
  getCssValue: function() {
    return this.filters.map((filter, i) => {
      return `${filter.name}(${this.getValueAt(i)})`;
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
  updateValueAt: function(index, value) {
    let filter = this.filters[index];
    if (!filter) {
      return false;
    }

    filter.value = filter.unit ? fixFloat(value, true) : value;

    this._onChange(this.getCssValue());
  },

  _removeEventListeners: function() {
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

  _destroyMarkup: function() {
    this._filterItemMarkup.remove();
    this.el.remove();
    this.el = this.list = this.container = this._filterItemmarkup = null;
  },

  destroy: function() {
    this._removeEventListeners();
    this._destroyMarkup();
  }
};

// Fixes JavaScript's float precision
function fixFloat(a, number) {
  let fixed = parseFloat(a).toFixed(1);
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
  let filters = [];
  let current = "";
  let depth = 0;

  if (css === "none") {
    return filters;
  }

  while (css.length) {
    let char = css[0];

    switch (char) {
      case "(":
        depth ++;
        if (depth === 1) {
          filters.push({name: current.trim()});
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
"use strict";

const LIST_ITEM_HEIGHT = 32;

function FilterToolTip(el, value = "") {
  this.el = el;
  this.val = value;

  let list = el.querySelector(".filters");
  el.appendChild(list);
  el.insertBefore(list, el.firstChild);
  this.container = el;
  this.list = list;
  this.filters = [];

  this.setCSS(value);

  // Event Listeners
  let select = this.filterSelect = el.querySelector("select");
  this.populateFilterSelect();

  let addButton = el.querySelector("#add-filter");
  addButton.addEventListener("click", e => {
    if (!select.value) return;

    let key = select.value;
    let def = this._definition(key);
    let u = "";
    switch (def.type) {
      case "percentage":
        u = "%";
        break;
      case "length":
        u = "px";
        break;
      case "angle":
        u = "deg";
        break;
      case "string":
        u = "";
        break;
      default:
        u = "px";
    }

    this.add(key, (def.range[0] || "0") + u);
    this.render();
  });
  this.list.addEventListener("click", e => {
    if (e.target.tagName.toLowerCase() === "button") {
      let li = e.target.parentNode.parentNode;
      let id = parseInt(li.id.slice(7), 10);
      this.remove(id);
      this.render();
    }
  });

  this.list.addEventListener("mousemove", e => {
    let dragging = this.list.querySelector(".dragging");
    if (!dragging) return;

    let delta = e.pageY - dragging.startingY;
    dragging.style.top = delta + "px";

    let push = delta / LIST_ITEM_HEIGHT;
    if  (push > 0) push = Math.floor(push);
    else if  (push < 0) push = Math.round(push);


    let index = Array.prototype.indexOf.call(this.list.children, dragging);
    let dest = index + push;

    if (push === 0 || // there's no change
       push === 1 && index === this.list.children.length-1 || // moving down the last element
       push === -1 && index === 0) return; // moving up the first element

    if  (dest < 0 ||
       dest > this.list.children.length) return;

    let target = push > 0 ? this.list.children[dest+1] : this.list.children[dest];

    this._swapIndex(index, dest);

    if (target)
      this.list.insertBefore(dragging, target);
    else
      this.list.appendChild(dragging);

    dragging.style.top = delta - push*LIST_ITEM_HEIGHT + "px";
    dragging.startingY = e.pageY + push*LIST_ITEM_HEIGHT - delta;
  });
  this.list.addEventListener("mouseup", e => {
    let dragging = this.list.querySelector(".dragging");
    if (!dragging) return;

    dragging.classList.remove("dragging");
  });
}

FilterToolTip.prototype = {
  render() {
    this.list.innerHTML = "";
    let base = document.createElement("div");
    base.className = "filter";

    let name = document.createElement("div");
    name.className = "filter-name";

    let value = document.createElement("div");
    value.className = "filter-value";

    name.appendChild(document.createElement("i"));
    name.appendChild(document.createElement("label"));

    value.appendChild(document.createElement("input"));

    let removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    value.appendChild(removeButton);

    base.appendChild(name);
    base.appendChild(value);

    if (!this.filters.length) {
      this.list.innerHTML = "<p>No filter specified <br/> Add a filter using the list below</p>";
    }

    let sorted = this.filters.sort((a, b) => a.index - b.index);

    for(let [index, filter] of sorted.entries()) {
      let def = this._definition(filter.name);

      let el = base.cloneNode(true);

      let [name, value] = el.children,
          [drag, label] = name.children,
          input = value.children[0];

      let [min, max] = def.range;

      label.className = "item-label";
      label.textContent = filter.name;

      input.classList.add("item-editor");

      drag.addEventListener("mousedown", e => {
        el.classList.add("dragging");
        this.container.classList.add("dragging");
        el.startingY = e.pageY;
      });

      drag.addEventListener("mouseup", e => {
        el.classList.remove("dragging");
        this.container.classList.remove("dragging");
        el.removeAttribute("style");
      });

      switch (def.type) {
        case "percentage":
        case "angle":
        case "length":
          input.type = "number";
          input.min = min;
          input.step = "0.1";
          input.classList.add("devtools-textinput");
        break;
        case "string":
          input.type = "text";
          input.classList.add("devtools-textinput");
        break;
      }

      if (min !== null) input.min = min;
      if (max !== null) input.max = max;
      if (def.type !== "string") { // use photoshop-style label-dragging
        let startX = 0,
            lastX = 0,
            startValue = 0,
            multiplier = 1;

        label.classList.add("devtools-draglabel");

        label.addEventListener("mousedown", e => {
          startX = e.clientX;
          startValue = parseFloat(input.value);

          if (e.altKey) {
            multiplier = 0.1;
          } else if (e.shiftKey) {
            multiplier = 10;
          }

          const mouseMove = e => {
            if (startX === null) return;
            lastX = e.clientX;
            let delta = e.clientX - startX;
            let value = startValue + delta*multiplier;

            if (min !== null && value < min) value = min;
            if (max !== null && value > max) value = max;

            input.value = fixFloat(value);
          };

          const mouseUp = e => {
            removeEventListener("mousemove", mouseMove);
            removeEventListener("mouseup", mouseUp);
            removeEventListener("keydown", keyDown);
            removeEventListener("keyup", keyUp);
            let event = new UIEvent("change");
            input.dispatchEvent(event);
          };

          const keyDown = e => {
            if (e.altKey) {
              multiplier = 0.1;
              startValue = parseFloat(input.value);
              startX = lastX;
            } else if (e.shiftKey) {
              multiplier = 10;
              startValue = parseFloat(input.value);
              startX = lastX;
            }
          };

          const keyUp = e => {
            multiplier = 1;
            startValue = parseFloat(input.value);
            startX = lastX;
          };

          addEventListener("keydown", keyDown);
          addEventListener("keyup", keyUp);
          addEventListener("mouseup", mouseUp);
          addEventListener("mousemove", mouseMove);
        });
      }

      input.value = filter.value;
      el.id = "filter-"+index;

      this.list.appendChild(el);
      if(filter.unit !== "string") {
        input.addEventListener("input", e => {
          e.target.value = fixFloat(e.target.value);
        });
      }
      input.addEventListener("change", this._updateEvent.bind(this));
    }

    let el = document.querySelector("#filter-"+(sorted.length-1)+" input");
    if(el) {
      el.focus();
      // move cursor to end of input
      el.setSelectionRange(el.value.length, el.value.length);
    }
  },
  _swapIndex(a, b) {
    let first = this.filters.find(x => x.index === a),
        second = this.filters.find(x => x.index === b);

    let tmp = first.index;
    first.index = second.index;
    second.index = tmp;
  },
  _updateEvent(e) {
    let li = e.target.parentNode.parentNode;
    let id = parseInt(li.id.slice(7), 10);
    let value = fixFloat(e.target.value, true);
    this.update(id, value);
  },
  _definition(name) {
    return filterList.find(a => a.name === name);
  },
  get(id) {
    return this.filters[id];
  },
  add(name, value) {
    let def = this._definition(name);
    if (!def) return false;

    let unit = def.type === "string" ? "" : /\D+/.exec(value);
    unit = unit ? unit[0] : "";

    if (def.type !== "string") {
      value = parseFloat(value);

      let [min, max] = def.range;
      if (min && value < min) value = min;
      if (max && value > max) value = max;
    }

    this.filters.push({value, unit, name: def.name, index: this.filters.length});
  },
  value(id) {
    let filter = this.get(id);
    if (!filter) return false;

    let val = filter.value || (filter.unit ? "0" : ""),
        unit = filter.unit || "";

    return val + unit;
  },
  remove(id) {
    this.filters.splice(id, 1);
    for(let filter of this.filters.slice(id)) {
      filter.index--;
    }
  },
  css() {
    return this.filters.map((filter, i) => {
      return filter.name + "(" + this.value(i) + ")";
    }).join(" ") || "none";
  },
  setCSS(value) {
    value.replace(/\s{2,}/g, " ").split(" ").forEach(a => {
      let [key, value] = a.split("(");
      value = value.slice(0, -1); // remove the last parantheses
      this.add(key, value);
    });
  },
  update(id, value) {
    let filter = this.get(id);
    filter.value = filter.unit ? parseFloat(value) : value;
  },
  populateFilterSelect() {
    let select = this.filterSelect;
    filterList.forEach(function(filter) {
      let option = document.createElement("option");
      option.innerHTML = option.value = filter.name;
      select.appendChild(option);
    });
  }
};

function fixFloat(a, number) {
  let fixed = parseFloat(a).toFixed(1);
  return number ? parseFloat(fixed) : fixed;
}



// Test

let tp = new FilterToolTip(document.getElementById("editor"), "blur(30px) grayscale(200%) drop-shadow(salam)");

tp.render();












document.getElementById("switch").addEventListener("click", e => {
  var theme = document.body.className == "theme-dark" ? "theme-light" : "theme-dark";
  document.body.className = theme;

  document.querySelector("#theme-stylesheet").href = "chrome://browser/skin/devtools/" + (theme == "theme-dark" ? "dark-theme" : "light-theme") + ".css";
});


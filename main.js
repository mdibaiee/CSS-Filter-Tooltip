'use strict';

function FilterToolTip(el, value = '') {
  this.el = el;
  this.value = value;

  let list = document.createElement('ul');
  el.appendChild(list);
  el.insertBefore(list, el.firstChild);
  this.container = el;
  this.list = list;
  this.filters = [];

  this.setCSS(value);

  // Event Listeners
  let select = el.querySelector('select'),
      form = select.parentNode;
  this.container.querySelector('#add-filter').addEventListener('click', e => {
    select.style.display = 'block';
    select.value = '';
  });
  select.addEventListener('change', e => {
    if(!select.value) return;
    select.style.display = 'none';
    let key = select.value;
    let def = this._definition(key);
    let u = '';
    switch (def.unit) {
      case 'percentage':
        u = '%';
        break;
      case 'length':
        u = 'px';
        break;
      case 'angle':
        u = 'deg';
        break;
      default:
        u = 'px';
    }
    this.add(key, def.range[0] + u);
    this.render();
  });
  this.list.addEventListener('click', e => {
    if(e.target.tagName.toLowerCase() === 'button') {
      let key = e.target.previousElementSibling.previousElementSibling.textContent;
      this.remove(e.target.previousElementSibling.id);
      this.render();
    }
  });
}

FilterToolTip.prototype = {
  render() {
    this.list.innerHTML = '';
    let base = document.createElement('li');

    base.appendChild(document.createElement('label'));
    base.appendChild(document.createElement('input'));
    base.appendChild(document.createElement('button'));

    for(let [index, filter] of this.filters.entries()) {
      let def = this._definition(filter.name);

      let el = base.cloneNode(true);
      let [label, input] = el.children;
      let [min, max] = def.range;

      label.textContent = filter.name;

      input.type = 'range';
      if(min !== null) input.min = min;
      if(max !== null) input.max = max;
      input.value = filter.value;
      input.id = index;

      this.list.appendChild(el);
      input.addEventListener('change', this._updateEvent.bind(this));
    }
  },
  _updateEvent(e) {
    this.update(e.target.id, e.target.value);
  },
  _definition(name) {
    return filterList.find(a => a.name === name);
  },
  get(name) {
    return this.filters.find(a => a.name === name);
  },
  getIndex(name) {
    return this.filters.findIndex(a => a.name === name);
  },
  add(name, value) {
    let filter = this._definition(name);
    if(!filter) return false;
    let [min, max] = filter.range;

    let unit = /\D+/.exec(value);
    unit = unit ? unit[0] : '';
    value = parseInt(value, 10);

    if(min && value < min) value = min;
    if(max && value > max) value = max;

    this.filters.push({value, unit, name: filter.name});
  },
  value(name) {
    let filter = this._definition(name);
    if(!filter) return false;

    let current = this.get(name);
    if(!current) return '';
    return (current.value || '0') + current.unit;
  },
  remove(id) {
    this.filters.splice(id, 1);
  },
  css(name) {
    return this.filters.map(filter => {
      return filter.name + '(' + filter.value + filter.unit + ')';
    }).join(' ');
  },
  setCSS(value) {
    value.replace(/\s{2,}/g, ' ').split(' ').forEach(a => {
      let [key, value] = a.split('(');
      value = value.slice(0, -1); // remove the last parantheses
      this.add(key, value);
    });    
  },
  update(id, value) {
    let filter = this.filters[id];
    filter.value = parseInt(value, 10);
  }
};


// Test

let tp = new FilterToolTip(document.getElementById('editor'), 'blur(30px) grayscale(200%)');

tp.render();












document.getElementById('switch').addEventListener('click', e => {
  let style = document.createElement('style');

  style.innerHTML = `:root:root {
    --theme-body-background: #14171a;
    --theme-body-color: #8fa1b2;
    --theme-highlight-red: #eb5368;
  }`;

  document.head.appendChild(style);
});


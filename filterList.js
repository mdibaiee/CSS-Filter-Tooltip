let filterList = [
  {
    "name": "blur",
    "range": [0,null],
    "type": "length"
  },
  {
    "name": "brightness",
    "range": [0, null],
    "type": "percentage"
  },
  {
    "name": "contrast",
    "range": [0, null],
    "type": "percentage"
  },
  {
    "name": "drop-shadow",
    "range": [null, null],
    "type": "string" // Well it's length, but it's also a special case
  },
  {
    "name": "grayscale",
    "range": [0, 100], // You can go over that, but it gives the same results as 100%
    "type": "percentage"
  },
  {
    "name": "hue-rotate",
    "range": [0,360],
    "type": "angle"
  },
  {
    "name": "invert",
    "range": [0,100],
    "type": "percentage"
  },
  {
    "name": "opacity",
    "range": [0, 100],
    "type": "percentage"
  },
  {
    "name": "saturate",
    "range": [0, null],
    "type": "percentage"
  },
  {
    "name": "sepia",
    "range": [0, 100],
    "type": "percentage"
  },
  {
    "name": "url",
    "range": [null, null],
    "type": "string"
  }
];
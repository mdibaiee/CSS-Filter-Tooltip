let filterList = [
  {
    "name": "blur",
    "range": [0,null],
    "unit": "length"
  },
  {
    "name": "brightness",
    "range": [0, null],
    "unit": "percentage"
  },
  {
    "name": "contrast",
    "range": [0, null],
    "unit": "percentage"
  },
  {
    "name": "drop-shadow",
    "range": [0, null],
    "unit": "string" // Well it's length, but it's also a special case
  },
  {
    "name": "grayscale",
    "range": [0, 100], // You can go over that, but it gives the same results as 100%
    "unit": "percentage"
  },
  {
    "name": "hue-rotate",
    "range": [0,360],
    "unit": "angle"
  },
  {
    "name": "invert",
    "range": [0,100],
    "unit": "percentage"
  },
  {
    "name": "opacity",
    "range": [0, 100],
    "unit": "percentage"
  },
  {
    "name": "saturate",
    "range": [0, null],
    "unit": "percentage"
  },
  {
    "name": "sepia",
    "range": [0, 100],
    "unit": "percentage"
  },
  {
    "name": "url",
    "range": [null, null],
    "unit": "string"
  }
];
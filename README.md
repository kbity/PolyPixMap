# PolyPixMap
PolyPixMap (`polypixmap.js`, `polypixmap.min.js`) is a near-complete JavaScript Polyfill for the PNM (`P1/P2/P3/P4/P5/P6`) image formats, allowing for these formats to be used on websites without conversion to another format.
> Note: PolyPixMap does not currently support the P7/PAM format
## usage
To use PolyPixMap, then you use a pnm file in an img as you would any other image format (e.g. png, jpg), then add a script object that points to the PolyPixMap code after your img elements.

```js
<img src="clouds.ppm">
<img src="photograph.pgm">
<img src="icon.pgm">

<script src="/misc/polypixmap.min.js"></script> // use AFTER all ppm <img> elements
```

PolyPixMap will replace it with a PNG blob, and put the original source url for the image into the `data-orig` property of the img element.

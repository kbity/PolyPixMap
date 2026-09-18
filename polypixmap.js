function headerCheck(headr) {
  if (headr[0] === 0x50 && headr[1] === 0x36) {
    return 6;
  }
  if (headr[0] === 0x50 && headr[1] === 0x35) {
    return 5;
  }
  if (headr[0] === 0x50 && headr[1] === 0x34) {
    return 4;
  }
  if (headr[0] === 0x50 && headr[1] === 0x33) {
    return 3;
  }
  if (headr[0] === 0x50 && headr[1] === 0x32) {
    return 2;
  }
  if (headr[0] === 0x50 && headr[1] === 0x31) {
    return 1;
  }
  throw new Error("Header unknown!")
}

function bufferToPixel(tuple_buffer, mode, tultype, maxval) {
  const ws = [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0x85, 0xA0]; // all 1-byte whitespace characters
  const num = [0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39] // all ascii numbers

  // Most common modes
  if (mode === 6 && tultype === 2) {
    r = Math.round(tuple_buffer[0] * 255/maxval)
    g = Math.round(tuple_buffer[1] * 255/maxval)
    b = Math.round(tuple_buffer[2] * 255/maxval)
    return [r, g, b]
  }
  if (mode === 5 && tultype === 2) {
    r = Math.round(tuple_buffer[0] * 255/maxval)
    return [r, r, r]
  }

  // High bit depth modes
  if (mode === 6 && tultype === 3) {
    r = Math.round((((tuple_buffer[0] << 8) | tuple_buffer[1]) * 65535/maxval)/256)
    g = Math.round((((tuple_buffer[2] << 8) | tuple_buffer[3]) * 65535/maxval)/256)
    b = Math.round((((tuple_buffer[4] << 8) | tuple_buffer[5]) * 65535/maxval)/256)
    return [r, g, b]
  }
  if (mode === 5 && tultype === 3) {
    r = Math.round((((tuple_buffer[0] << 8) | tuple_buffer[1]) * 65535/maxval)/256)
    return [r, r, r]
  }

  // P2 yeah
  if (mode === 2) {
    txt = new TextDecoder().decode(new Uint8Array(tuple_buffer))
    dec = parseInt(txt)
    r = Math.round((dec * 65535/maxval)/256)
    return [r, r, r]
  }

  if (mode === 3) {
    split = [[], [], []]
    sel = 0
    for (chr in tuple_buffer) {
      if (tuple_buffer[chr] == null) {sel++}
      else if (ws.includes(chr)) {}
      else {split[sel].push(tuple_buffer[chr])}
    }

    rtxt = new TextDecoder().decode(new Uint8Array(split[0]))
    rdec = parseInt(rtxt)
    r = Math.round((rdec * 65535/maxval)/256)

    gtxt = new TextDecoder().decode(new Uint8Array(split[1]))
    gdec = parseInt(gtxt)
    g = Math.round((gdec * 65535/maxval)/256)

    btxt = new TextDecoder().decode(new Uint8Array(split[2]))
    bdec = parseInt(btxt)
    b = Math.round((bdec * 65535/maxval)/256)
    return [r, g, b]
  }

  // P4 and P1 are quirky
  if (mode === 4) {
    pck = tuple_buffer[0]
    r1 = Math.floor(pck/128)
    r2 = Math.floor(pck%128/64)
    r3 = Math.floor(pck%64/32)
    r4 = Math.floor(pck%32/16)
    r5 = Math.floor(pck%16/8)
    r6 = Math.floor(pck%8/4)
    r7 = Math.floor(pck%4/2)
    r8 = pck%2
    return [r1, r2, r3, r4, r5, r6, r7, r8]
  }

  if (mode === 1) {
    val = 0
    if (tuple_buffer[0] === 0x30) {val = 255}
    return [val, val, val]
  }
}

function parsePPM(data) {
  const bytes = new Uint8Array(data);
  mode = null // PPM mode
  headr = [] // Header Buffer
  width = [] // Width Buffer
  heigh = [] // Height Buffer
  maxvl = [] // Maxval Buffer

  w = null // Width String
  h = null // Height String
  m = null // Maxval String

  wid = null // Width Int
  hei = null // Height Int
  max = null // Maxval Int

  // start at 0,0
  x = 0
  y = 0

  pixmap = [] // blank list, [y][x] format

  parse_target = 0 // 0 - header, 1 - width, 2 - height, 3 - maxval, 4 - bitmap
  tultype = 0 // 0 - ?, 1 - implicit (mode 1/2/3/4), 2 - uint8, 3 - uint16be
  lastcharwhite = false // dont advance on blobs of whitespace
  stopparse = false // halt parsing until a newline (0x0A) is reached. turn on after 0x23 (#)
  header_parsed = false // sets to true once wid, hei, and max (ints from header) are populated

  tuple_ready = false // true when a tuple is ready to be passed
  tuple_buffer = []
  // max is 6 for P6 uint16be
  // max is 3 for P6 uint8
  // max is 2 for P5 uint16be
  // unused for P5 uint8
  // unused for P4
  // P3 is annoying as hell
  // max is 5 for P2
  // unused for P1

  const ws = [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0x85, 0xA0]; // all 1-byte whitespace characters
  const onezero = [0x31, 0x30]; // ascii codes for 1 and 0

  for (byte of bytes) {
    if (parse_target === 4) {
      if (!header_parsed) {
        wid = parseInt(w)
        hei = parseInt(h)
        max = parseInt(m)
        if (tultype === 0) {
          if (max>255) {tultype=3} else {tultype=2}
        }
        
        for (he of Array(hei).keys()) {
          pixmap.push([])
          for (wi of Array(wid).keys()) {
            pixmap[he].push(null)
          }
        }
        header_parsed = true
      }
      if (mode === 1) {tuple_buffer = [byte]} else if (mode === 3) {if (!ws.includes(byte)) {tuple_buffer.push(byte); lastcharwhite = false}} else {tuple_buffer.push(byte)}

      if (tultype === 3 && mode === 6 && tuple_buffer.length === 6) {tuple_ready=true}
      if (tultype === 3 && mode === 5 && tuple_buffer.length === 2) {tuple_ready=true}

      if (tultype === 2 && mode === 6 && tuple_buffer.length === 3) {tuple_ready=true}
      if (tultype === 2 && mode === 5) {tuple_ready=true}

      if (mode === 4) {tuple_ready=true}

      if (mode === 1 && onezero.includes(tuple_buffer[0])) {tuple_ready=true}

      if (mode === 2 && ws.includes(byte)) {
        if (tuple_buffer.length > 1) {tuple_ready=true}
        tuple_buffer.pop() // remove whitespace character
      }

      if (mode === 3 && ws.includes(byte) && !lastcharwhite) {
        if (tuple_buffer.filter(x => x==null).length == 2) {tuple_ready=true}
        if (!tuple_ready) {tuple_buffer.push(null)} // add null for delimiting unless 2 exist
        lastcharwhite = true
      }

      if (tuple_ready) {
        if (mode === 4) { // needs special handling
          pixels = bufferToPixel(tuple_buffer, mode, tultype, max)
          for (px in pixels) {
            if (x < wid && y < hei) {pixmap[y][x] = [255-(pixels[px]*255), 255-(pixels[px]*255), 255-(pixels[px]*255)]}
            x++
          }
          if (x >= wid) {
            x = 0
            y++
          }
          tuple_buffer = []
          tuple_ready = false
        } else {
          if (y < hei) {pixmap[y][x] = bufferToPixel(tuple_buffer, mode, tultype, max)}
          tuple_buffer = []
          tuple_ready = false
          x++
          if (x >= wid) {
            x = 0
            y++
          }
        }
      }
    } else {
      if (stopparse) {
        if (byte == 0x0A) {stopparse = false}
      } else {
        if (byte == 0x23) {stopparse = true
        } else {
          if (ws.includes(byte)) {
            if (headr.length !== 2) {throw new Error("Header invalid or blank!")} else {mode = headerCheck(headr)};
            if (!lastcharwhite) {
              parse_target++
              if (parse_target === 3 && (mode === 1 || mode === 4)) {
                parse_target = 4
                tultype = 1
              } else if (mode === 2 || mode === 3 ) {tultype = 1}
              lastcharwhite = true
            }
            if (parse_target === 4) {
              w = new TextDecoder().decode(new Uint8Array(width));
              h = new TextDecoder().decode(new Uint8Array(heigh));
              m = new TextDecoder().decode(new Uint8Array(maxvl));
            }
          } else {
            lastcharwhite = false
            if (parse_target === 0) {
              headr.push(byte)
            }
            if (parse_target === 1) {
              width.push(byte)
            }
            if (parse_target === 2) {
              heigh.push(byte)
            }
            if (parse_target === 3) {
              maxvl.push(byte)
            }
          }
        }
      }
    }
  }
  return [pixmap, w, h];
}

document.querySelectorAll("img").forEach(async img => {
  if (!img.src.endsWith(".ppm") && !img.src.endsWith(".pgm") && !img.src.endsWith(".pbm") && !img.src.endsWith(".pnm"))
      return;

  const old_src = img.src

  const response = await fetch(img.src);
  const data = await response.arrayBuffer();

  const pnm = parsePPM(data);
  const canvas = document.createElement("canvas");
  canvas.width = pnm[1];
  canvas.height = pnm[2];

  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(pnm[1], pnm[2]);
  for (let y = 0; y < pnm[2]; y++) {
    for (let x = 0; x < pnm[1]; x++) {
      const i = (y*pnm[1]+x)*4;
      imageData.data[i] = pnm[0][y][x][0];   // R
      imageData.data[i+1] = pnm[0][y][x][1]; // G
      imageData.data[i+2] = pnm[0][y][x][2]; // B
      imageData.data[i+3] = 255;             // A
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise(resolve =>
    canvas.toBlob(resolve, "image/png")
  );

  img.dataset.orig = old_src;
  img.src = URL.createObjectURL(blob);
});

// DOM Elements
const canvas = document.getElementById('renderCanvas');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const addressLine1Input = document.getElementById('address-line1');
const addressLine2Input = document.getElementById('address-line2');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const datetimeInput = document.getElementById('datetime');
const locationPresets = document.getElementById('locationPresets');
const addPresetBtn = document.getElementById('addPresetBtn');
const fileInput = document.getElementById('fileInput');
const generateBtn = document.getElementById('generateBtn');

let addl1 = 'Place, State, Country', addl2 = 'Place, City Pin, State, Country';
let locationPresetsList = JSON.parse(localStorage.getItem('locationPresetsList') || '[]');
let lastImage = null;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  let lines = [], line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? ' ' : '') + words[n];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line); line = words[n];
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawRoundedRect(ctx, x, y, width, height, r) {
  const { tl, tr, br, bl } = typeof r === 'object' ? r : { tl: r, tr: r, br: r, bl: r };
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
  ctx.lineTo(x + width, y + height - br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
  ctx.lineTo(x + bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
  ctx.fill();
}

function getBannerLines(ctx, address1, address2, latVal, lngVal, dateStr, timeStr, tz, maxTextWidth, w) {
  const address1Font = `${Math.round(w * 0.03)}px Roboto`;
  const normalFont = `${Math.round(w * 0.02)}px Roboto`;
  const lineHeight = Math.round(w * 0.025);
  let wrappedLines = [];
  ctx.font = address1Font;
  wrappedLines = wrappedLines.concat(wrapText(ctx, address1, maxTextWidth).map(line => ({ text: line, font: address1Font, lineHeight: lineHeight * 1.5 })));
  ctx.font = normalFont;
  [address2, `Lat ${latVal}°, Long ${lngVal}°`, `${dateStr} ${timeStr} ${tz}`].forEach(line => {
    wrappedLines = wrappedLines.concat(wrapText(ctx, line, maxTextWidth).map(l => ({ text: l, font: normalFont, lineHeight: lineHeight })));
  });
  return wrappedLines;
}

function getBannerHeight(wrappedLines, padding) {
  return wrappedLines.reduce((sum, l) => sum + l.lineHeight, 2 * padding);
}

function updatePresetsDropdown() {
  locationPresets.innerHTML = '<option value="">-- Select a preset --</option>';
  for (let idx = 0; idx < locationPresetsList.length; idx++) {
    const preset = locationPresetsList[idx];
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = preset.name || `${preset.address1}, ${preset.address2}`;
    locationPresets.appendChild(opt);
  }
}

function applyPresetToFields(preset) {
  addressLine1Input.value = preset.address1 || '';
  addressLine2Input.value = preset.address2 || '';
  latitudeInput.value = preset.latitude || '';
  longitudeInput.value = preset.longitude || '';
}

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      lastImage = img;
      canvas.width = img.width;
      canvas.height = img.height;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

generateBtn.addEventListener('click', () => {
  if (!lastImage) return;
  canvas.width = lastImage.width;
  canvas.height = lastImage.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(lastImage, 0, 0, canvas.width, canvas.height);
  drawOverlay(ctx, canvas.width, canvas.height);
});

function drawOverlay(ctx, width, height) {
  ctx.textBaseline = 'top';
  const padding = Math.round(width * 0.0156);
  const bannerX = padding, bannerYPad = padding;
  const bannerWidth = width - 2 * bannerX, maxTextWidth = bannerWidth - 2 * padding;
  const address1 = addressLine1Input.value || addl1;
  const address2 = addressLine2Input.value || addl2;
  const latVal = latitudeInput.value || 'N/A';
  const lngVal = longitudeInput.value || 'N/A';
  const dt = datetimeInput.value ? new Date(datetimeInput.value) : new Date();
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  const dateStr = `${day}/${month}/${year}`;
  let hours = dt.getHours();
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12; hours = hours ? hours : 12;
  const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  const tz = 'GST +5:30';
  const wrappedLines = getBannerLines(ctx, address1, address2, latVal, lngVal, dateStr, timeStr, tz, maxTextWidth, width);
  const bannerHeight = getBannerHeight(wrappedLines, padding);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  const bannerRadius = padding / 2;
  const bannerY = height - bannerHeight - (bannerYPad * 1.5);
  drawRoundedRect(ctx, bannerX, bannerY, bannerWidth, bannerHeight + (bannerYPad / 2), { tl: bannerRadius, tr: 0, br: bannerRadius, bl: bannerRadius });
  
  const appBannerFont = `${Math.round(width * 0.015)}px Roboto Black`;
  const topBannerHeight = Math.round(width * 0.044);
  // Calculate topBannerWidth based on app name width
  ctx.font = appBannerFont;
  const appName = 'GPS Map Camera';
  const iconPadding = Math.round(width * 0.00625);
  const iconHeight = Math.round(width * 0.03125);
  const textWidth = ctx.measureText(appName).width;
  const topBannerWidth = iconPadding + iconHeight + iconPadding + textWidth + iconPadding;
  const topBannerX = bannerX + bannerWidth - topBannerWidth;
  const topBannerY = bannerY - topBannerHeight;
  const topBannerRadius = padding / 4;
  drawRoundedRect(ctx, topBannerX, topBannerY, topBannerWidth, topBannerHeight, { tl: topBannerRadius, tr: topBannerRadius, br: 0, bl: 0 });
  const iconImg = new Image();
  iconImg.src = 'UTQCGPSMCPM5k.png';
  iconImg.onload = function() {
    ctx.drawImage(iconImg, topBannerX + iconPadding, topBannerY + iconPadding, iconHeight, iconHeight);
    ctx.font = appBannerFont;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(appName, topBannerX + iconPadding + iconHeight + iconPadding, topBannerY + topBannerHeight / 2);
    ctx.fillStyle = '#fff';
    let y = height - bannerHeight - bannerYPad + (padding * 2);
    for (const lineObj of wrappedLines) {
      ctx.font = lineObj.font;
      ctx.fillText(lineObj.text, bannerX + padding, y);
      y += lineObj.lineHeight;
    }
  };
  if (iconImg.complete) iconImg.onload();
}

function getCanvasDataUrl() {
  return canvas.toDataURL('image/png');
}

downloadBtn.addEventListener('click', () => {
  const url = getCanvasDataUrl();
  const a = document.createElement('a');
  a.href = url;
  a.download = 'capture.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

shareBtn.addEventListener('click', async () => {
  if (navigator.canShare) {
    const url = getCanvasDataUrl();
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], 'capture.png', { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: 'Captured Image', text: 'Shared from GPS Map Camera' });
    } catch (e) {
      alert('Share cancelled or failed.');
    }
  } else {
    alert('Sharing not supported on this device/browser.');
  }
});

locationPresets.addEventListener('change', () => {
  const idx = locationPresets.value;
  if (idx !== '' && locationPresetsList[idx]) applyPresetToFields(locationPresetsList[idx]);
});

addPresetBtn.addEventListener('click', () => {
  const preset = {
    name: `${addressLine1Input.value} | ${addressLine2Input.value}`,
    address1: addressLine1Input.value,
    address2: addressLine2Input.value,
    latitude: latitudeInput.value,
    longitude: longitudeInput.value
  };
  locationPresetsList.push(preset);
  localStorage.setItem('locationPresetsList', JSON.stringify(locationPresetsList));
  updatePresetsDropdown();
});

updatePresetsDropdown();

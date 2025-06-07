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
const savePresetBtn = document.getElementById('savePresetBtn');
const mapInput = document.getElementById('mapInput');
const mapImagePreview = document.getElementById('mapImagePreview');
const fileInput = document.getElementById('fileInput');
const mapInputBtn = document.getElementById('mapInputBtn');
const fileInputBtn = document.getElementById('fileInputBtn');
const generateBtn = document.getElementById('generateBtn');

let addl1 = 'Place, State, Country', addl2 = 'Place, City Pin, State, Country';
let locationPresetsList = JSON.parse(localStorage.getItem('locationPresetsList') || '[]');
let lastImage = null;
let mapImageLoaded = false;
const outputImageName = 'Authentic GPS Tagged Photo.png';

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
  const address1Font = `${Math.round(w * 0.042)}px Roboto`;
  const normalFont = `${Math.round(w * 0.026)}px Roboto`;
  const lineHeight = Math.round(w * 0.032);
  let wrappedLines = [];
  ctx.font = address1Font;
  wrappedLines = wrappedLines.concat(wrapText(ctx, address1, maxTextWidth).map(line => ({ text: line, font: address1Font, lineHeight: Math.round(w * 0.046) })));
  ctx.font = normalFont;
  [address2, `Lat ${latVal}°, Long ${lngVal}°`, `${dateStr} ${timeStr} ${tz}`].forEach(line => {
    wrappedLines = wrappedLines.concat(wrapText(ctx, line, maxTextWidth).map(l => ({ text: l, font: normalFont, lineHeight: lineHeight })));
  });
  return wrappedLines;
}

function getTextHeight(wrappedLines) {
  return wrappedLines.reduce((sum, l) => sum + l.lineHeight, 0);
}

function updatePresetsDropdown() {
  locationPresets.innerHTML = '<option value="">Select a preset location</option>';
  for (let idx = 0; idx < locationPresetsList.length; idx++) {
    const preset = locationPresetsList[idx];
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = preset.name;
    locationPresets.appendChild(opt);
  }
}

function applyPresetToFields(preset) {
  addressLine1Input.value = preset.address1 || '';
  addressLine2Input.value = preset.address2 || '';
  latitudeInput.value = preset.latitude || '';
  longitudeInput.value = preset.longitude || '';
}

mapInput.addEventListener('change', (event) => {
  const map = event.target.files[0];
  if (!map) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    mapImagePreview.onload = function () {
      mapImageLoaded = true;
      mapImagePreview.style.display = 'block';
    };
    mapImagePreview.src = e.target.result;
  };
  reader.readAsDataURL(map);
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      lastImage = img;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(lastImage, 0, 0, canvas.width, canvas.height);
      generateBtn.disabled = false;
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
  if (downloadBtn) downloadBtn.disabled = false;
  if (shareBtn) shareBtn.disabled = false;
});

function drawOverlay(ctx, width, height) {
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
  const tz = 'GST +05:30';

  ctx.textBaseline = 'bottom';
  const padding = Math.round(width * 0.0156);
  const mapWidth = mapImageLoaded ? Math.round(width * 0.2) : 0;
  const bannerWidth = width - 2 * padding - (mapImageLoaded ? mapWidth + padding : 0);
  const maxTextWidth = bannerWidth - 2 * padding;
  const wrappedLines = getBannerLines(ctx, address1, address2, latVal, lngVal, dateStr, timeStr, tz, maxTextWidth, width);
  const textHeight = getTextHeight(wrappedLines);
  const bannerHeight = Math.max(textHeight, Math.round(width * 0.12)) + padding * 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  const bannerRadius = padding / 2;
  const bannerX = padding + (mapImageLoaded ? mapWidth + padding : 0);
  const bannerY = height - bannerHeight - padding;
  drawRoundedRect(ctx, bannerX, bannerY, bannerWidth, bannerHeight, { tl: bannerRadius, tr: 0, br: bannerRadius, bl: bannerRadius });

  const appBannerFont = `${Math.round(width * 0.02)}px Roboto Black`;
  const appBannerHeight = Math.round(width * 0.044);
  // Calculate topBannerWidth based on app name width
  ctx.font = appBannerFont;
  const appName = 'GPS Map Camera';
  const iconPadding = Math.round(width * 0.00625);
  const iconHeight = Math.round(width * 0.03125);
  const appBannerWidth = iconPadding + iconHeight + iconPadding + ctx.measureText(appName).width + iconPadding;
  const appBannerX = bannerX + bannerWidth - appBannerWidth;
  const appBannerY = bannerY - appBannerHeight;
  const appBannerRadius = padding / 4;
  drawRoundedRect(ctx, appBannerX, appBannerY, appBannerWidth, appBannerHeight, { tl: appBannerRadius, tr: appBannerRadius, br: 0, bl: 0 });

  if (mapImageLoaded) ctx.drawImage(mapImagePreview, padding, bannerY, mapWidth, bannerHeight);

  ctx.fillStyle = '#fff';
  let y = bannerY + (bannerHeight - textHeight) / 2;
  for (const lineObj of wrappedLines) {
    ctx.font = lineObj.font;
    y += lineObj.lineHeight;
    ctx.fillText(lineObj.text, bannerX + padding, y);
  }

  ctx.font = appBannerFont;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(appName, appBannerX + iconPadding + iconHeight + iconPadding, appBannerY + appBannerHeight / 2);

  const iconImg = new Image();
  iconImg.src = 'icon.png';
  iconImg.onload = function () {
    ctx.drawImage(iconImg, appBannerX + iconPadding, appBannerY + iconPadding, iconHeight, iconHeight);
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
  a.download = outputImageName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

shareBtn.addEventListener('click', async () => {
  if (navigator.canShare) {
    const url = getCanvasDataUrl();
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], outputImageName, { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: outputImageName, text: 'Shared from GPS Map Camera' });
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

savePresetBtn.addEventListener('click', () => {
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

const settingsPopup = document.getElementById('settingsPopup');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsPopupBtn');

function openSettingsPopup() {
  settingsPopup.style.display = 'flex';
}
function closeSettingsPopup() {
  settingsPopup.style.display = 'none';
}

settingsBtn.addEventListener('click', openSettingsPopup);
closeSettingsBtn.addEventListener('click', closeSettingsPopup);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSettingsPopup();
});

const aboutPopup = document.getElementById('aboutPopup');
const aboutBtn = document.getElementById('aboutBtn');
const closeAboutBtn = document.getElementById('closeAboutPopupBtn');

function openAboutPopup() {
  aboutPopup.style.display = 'flex';
}
function closeAboutPopup() {
  aboutPopup.style.display = 'none';
}

aboutBtn.addEventListener('click', openAboutPopup);
closeAboutBtn.addEventListener('click', closeAboutPopup);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAboutPopup();
});

mapInputBtn.addEventListener('click', () => mapInput.click());
fileInputBtn.addEventListener('click', () => fileInput.click());

updatePresetsDropdown();

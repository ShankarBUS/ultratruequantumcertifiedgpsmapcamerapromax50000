// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPopup = document.getElementById('settingsPopup');
const closeSettings = document.getElementById('closeSettings');
const imagePopup = document.getElementById('imagePopup');
const closeImage = document.getElementById('closeImage');
const capturedImage = document.getElementById('capturedImage');
const downloadLink = document.getElementById('downloadLink');
const shareBtn = document.getElementById('shareBtn');
const addressLine1Input = document.getElementById('address-line1');
const addressLine2Input = document.getElementById('address-line2');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const datetimeInput = document.getElementById('datetime');
const flipCameraBtn = document.getElementById('flipCameraBtn');

let lat = null, lng = null;
let addl1 = 'Place, State, Country', addl2 = 'Place, City Pin, State, Country', timezone = 'GMT +05:30';
let currentFacingMode = 'environment';
let currentStream = null;

async function startCamera(facingMode) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
    video.srcObject = stream;
    currentStream = stream;
  } catch (e) {
    alert('Camera access denied or not available.');
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  let lines = [];
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? ' ' : '') + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      lines.push(line);
      line = words[n];
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawRoundedRect(ctx, x, y, width, height, radii) {
  // radii: {tl: number, tr: number, br: number, bl: number}
  const { tl, tr, br, bl } = typeof radii === 'object' ? radii : { tl: radii, tr: radii, br: radii, bl: radii };
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

function getBannerLines(ctx, address1, address2, latVal, lngVal, dateStr, timeStr, tz, maxTextWidth, canvasHeight) {
  const address1Font = `${Math.round(canvasHeight * 0.05)}px Arial`;
  const normalFont = `${Math.round(canvasHeight * 0.03)}px Arial`;
  const lineHeight = Math.round(canvasHeight * 0.035);
  let wrappedLines = [];

  ctx.font = address1Font;
  const address1Wrapped = wrapText(ctx, address1, maxTextWidth).map(line => ({ text: line, font: address1Font, lineHeight: lineHeight * 1.5 }));
  wrappedLines = wrappedLines.concat(address1Wrapped);

  ctx.font = normalFont;
  [address2, `Lat ${latVal}°, Long ${lngVal}°`, `${dateStr} ${timeStr} ${tz}`].forEach(line => {
    const linesWrapped = wrapText(ctx, line, maxTextWidth).map(l => ({ text: l, font: normalFont, lineHeight: lineHeight }));
    wrappedLines = wrappedLines.concat(linesWrapped);
  });
  return wrappedLines;
}

function getBannerHeight(wrappedLines, padding) {
  return wrappedLines.reduce((sum, l) => sum + l.lineHeight, 2 * padding);
}

captureBtn.addEventListener('click', async () => {
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  ctx.textBaseline = 'top';
  const padding = 10;
  const bannerX = 10;
  const bannerYPad = 10;
  const bannerWidth = canvas.width - 2 * bannerX;
  const maxTextWidth = bannerWidth - 2 * padding;

  const address1 = addressLine1Input.value || addl1;
  const address2 = addressLine2Input.value || addl2;
  const latVal = latitudeInput.value || 'N/A';
  const lngVal = longitudeInput.value || 'N/A';
  const dt = datetimeInput.value ? new Date(datetimeInput.value) : new Date();
  // Format date as DD/MM/YYYY
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  const dateStr = `${day}/${month}/${year}`;
  // Format time as hh:mm AM/PM
  let hours = dt.getHours();
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  const tz = 'GST +5:30';

  // Prepare lines and banner height
  const wrappedLines = getBannerLines(ctx, address1, address2, latVal, lngVal, dateStr, timeStr, tz, maxTextWidth, canvas.height);
  const bannerHeight = getBannerHeight(wrappedLines, padding);

  // Draw banner as rounded rect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  const bannerRadius = 10;
  const bannerY = canvas.height - bannerHeight - bannerYPad - 10
  drawRoundedRect(ctx, bannerX, bannerY, bannerWidth, bannerHeight + 10, { tl: bannerRadius, tr: 0, br: bannerRadius, bl: bannerRadius });

  // Draw small top-left banner with icon and text
  const topBannerHeight = 36;
  const topBannerWidth = 190;
  const topBannerX = bannerX + bannerWidth - topBannerWidth;
  const topBannerY = bannerY - topBannerHeight;
  const topBannerRadius = 6;
  drawRoundedRect(ctx, topBannerX, topBannerY, topBannerWidth, topBannerHeight, { tl: topBannerRadius, tr: topBannerRadius, br: 0, bl: 0 });

  // Draw icon.png (24x24) and text in the top banner
  const iconImg = new Image();
  iconImg.src = 'icon.png';
  iconImg.onload = function() {
    ctx.drawImage(iconImg, topBannerX + 6, topBannerY + 6, 24, 24);
    ctx.font = `bold ${Math.round(canvas.height * 0.035)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText('GPS Map Camera', topBannerX + 36, topBannerY + topBannerHeight / 2);
    // Draw text for main banner (after icon loads)
    ctx.fillStyle = '#fff';
    let y = canvas.height - bannerHeight - bannerYPad + padding + 10;
    wrappedLines.forEach(lineObj => {
      ctx.font = lineObj.font;
      ctx.fillText(lineObj.text, bannerX + padding, y);
      y += lineObj.lineHeight;
    });
    // Show in popup
    const imageURL = canvas.toDataURL('image/png');
    capturedImage.src = imageURL;
    downloadLink.href = imageURL;
    imagePopup.classList.remove('hidden');
  };
  // Prevent drawing text before icon loads
  if (!iconImg.complete) return;
});

// Download link is handled by href
downloadLink.addEventListener('click', () => {
  if (!capturedImage.src) return;
  const a = document.createElement('a');
  a.href = capturedImage.src;
  a.download = 'capture.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// Share Button
shareBtn.addEventListener('click', async () => {
  if (navigator.canShare && capturedImage.src) {
    const res = await fetch(capturedImage.src);
    const blob = await res.blob();
    const file = new File([blob], 'capture.png', { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: 'Captured Image', text: 'Shared from GPS Camera App' });
    } catch (e) {
      alert('Share cancelled or failed.');
    }
  } else {
    alert('Sharing not supported on this device/browser.');
  }
});

// Settings Popup
settingsBtn.addEventListener('click', () => {
  settingsPopup.classList.remove('hidden');
});
closeSettings.addEventListener('click', () => {
  settingsPopup.classList.add('hidden');
});
closeImage.addEventListener('click', () => {
  imagePopup.classList.add('hidden');
});

flipCameraBtn.addEventListener('click', () => {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  startCamera(currentFacingMode);
});

// Replace initial camera start with function call
startCamera(currentFacingMode);

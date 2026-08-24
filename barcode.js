"use strict";

const form = document.getElementById("barcode-form");
const input = document.getElementById("sscc");
const message = document.getElementById("validation-message");
const label = document.getElementById("label");
const emptyState = document.getElementById("empty-state");
const actions = document.getElementById("actions");
const humanReadable = document.getElementById("human-readable");
const svg = document.getElementById("barcode");
let currentSscc = "";

function calculateGs1CheckDigit(first17Digits) {
  const sum = first17Digits.split("").reduce((total, digit, index) => {
    return total + Number(digit) * (index % 2 === 0 ? 3 : 1);
  }, 0);
  return String((10 - (sum % 10)) % 10);
}

function validateSscc(value) {
  if (!value) return "Ange ett SSCC-nummer.";
  if (!/^\d+$/.test(value)) return "SSCC-numret får endast innehålla siffror.";
  if (value.length !== 18) return "SSCC-numret måste bestå av exakt 18 siffror.";
  const expected = calculateGs1CheckDigit(value.slice(0, 17));
  if (value.at(-1) !== expected) return `Fel kontrollsiffra. Korrekt kontrollsiffra är ${expected}.`;
  return "";
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
  input.classList.toggle("invalid", type === "error");
  input.setAttribute("aria-invalid", type === "error" ? "true" : "false");
}

function showEmptyState() {
  label.hidden = true;
  actions.hidden = true;
  emptyState.hidden = false;
  currentSscc = "";
}

function renderBarcode(sscc) {
  JsBarcode(svg, sscc, {
    format: "CODE128",
    displayValue: false,
    height: 106,
    width: 1.25,
    margin: 0,
    background: "#ffffff",
    lineColor: "#000000"
  });
  humanReadable.textContent = sscc;
  currentSscc = sscc;
  emptyState.hidden = true;
  label.hidden = false;
  actions.hidden = false;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const sscc = input.value.replace(/\s+/g, "");
  input.value = sscc;
  const error = validateSscc(sscc);
  if (error) {
    showEmptyState();
    setMessage(error, "error");
    input.focus();
    return;
  }
  renderBarcode(sscc);
  setMessage("SSCC-numret är giltigt.", "success");
});

input.addEventListener("input", () => {
  input.value = input.value.replace(/\D/g, "").slice(0, 18);
  if (message.textContent) setMessage("");
});

function svgToCanvas(scale = 4) {
  return new Promise((resolve, reject) => {
    const clone = svg.cloneNode(true);
    const widthPx = Math.round((36 / 25.4) * 96 * scale);
    const heightPx = Math.round((28 / 25.4) * 96 * scale);
    clone.setAttribute("width", String(widthPx));
    clone.setAttribute("height", String(heightPx));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round((40 / 25.4) * 96 * scale);
      canvas.height = Math.round((60 / 25.4) * 96 * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const x = (canvas.width - widthPx) / 2;
      const y = Math.round((13 / 25.4) * 96 * scale);
      ctx.drawImage(image, x, y, widthPx, heightPx);
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = `bold ${Math.round((9 / 72) * 96 * scale)}px Arial`;
      ctx.fillText(currentSscc, canvas.width / 2, y + heightPx + Math.round((3 / 25.4) * 96 * scale));
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Kunde inte rendera barcode-bilden."));
    };
    image.src = url;
  });
}

function download(dataUrl, fileName) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

document.getElementById("download-png").addEventListener("click", async () => {
  if (!currentSscc) return;
  try {
    const canvas = await svgToCanvas();
    download(canvas.toDataURL("image/png"), `SSCC-${currentSscc}-40x60mm.png`);
  } catch (error) { setMessage(error.message, "error"); }
});

document.getElementById("download-pdf").addEventListener("click", async () => {
  if (!currentSscc) return;
  try {
    const canvas = await svgToCanvas();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [40, 60], compress: true });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 40, 60, undefined, "FAST");
    pdf.save(`SSCC-${currentSscc}-40x60mm.pdf`);
  } catch (error) { setMessage(error.message, "error"); }
});

document.getElementById("print-label").addEventListener("click", () => {
  if (currentSscc) window.print();
});

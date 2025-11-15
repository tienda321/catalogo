// ========================================
//   config.js completo - Firebase + Cloudinary + Mapa + Debug
// ========================================

// Import Firebase modular SDK (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getDatabase,
  ref as dbRef,
  set,
  get,
  child,
  onValue
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// --- Firebase config (tu proyecto) ---
const firebaseConfig = {
  apiKey: "AIzaSyAPWpHKVWMMQhC0HNpSAHi4nptlcHm1e8o",
  authDomain: "catalogo-web-4a53c.firebaseapp.com",
  projectId: "catalogo-web-4a53c",
  storageBucket: "catalogo-web-4a53c.firebasestorage.app",
  messagingSenderId: "434380197926",
  appId: "1:434380197926:web:57753ba235d198462b16e7",
  databaseURL: "https://catalogo-web-4a53c-default-rtdb.firebaseio.com/"
};

// --- Cloudinary (tu cuenta) ---
const CLOUDINARY = {
  cloud_name: "dr8mjndur",
  api_key: "584257163614871", // no se usa para uploads unsigned, lo dejo por referencia
  upload_preset: "DatosWeb"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Helper DOM
const $ = id => document.getElementById(id);

// Inputs y toggles
const inputs = {
  whatsapp: $('whatsappInput'),
  phone: $('phoneInput'),
  instagram: $('instagramInput'),
  facebook: $('facebookInput'),
  email: $('emailInput'),
  bgColor: $('bgColorInput'),
  btnColor: $('btnColorInput'),
  textColor: $('textColorInput'),
  logoStore: $('logoStoreInput'),
  logoSearch: $('logoSearchInput'),
  whatsappMessage: $('whatsappMessageInput')
};

const toggles = {
  whatsapp: $('showWhatsapp'),
  telefono: $('showTelefono'),
  instagram: $('showInstagram'),
  facebook: $('showFacebook'),
  email: $('showEmail'),
  map: $('showMap')
};

const logoStorePreview = $('logoStorePreview');
const logoSearchPreview = $('logoSearchPreview');
const addressDisplay = $('addressDisplay');
const saveBtn = $('saveBtn');
const saveLocalBtn = $('saveLocalBtn');

let currentLat = parseFloat(localStorage.getItem('lat')) || -32.0;
let currentLng = parseFloat(localStorage.getItem('lng')) || -64.0;

// ----------------------
// Consola visual debug
// ----------------------
function debugLog(msg) {
  const box = $('debugConsole');
  if (!box) return;
  const time = new Date().toLocaleTimeString();
  box.textContent += `[${time}] ${msg}\n`;
  box.scrollTop = box.scrollHeight;
}
debugLog("Consola de depuración activa.");

window.onerror = function (msg, src, line, col, err) {
  debugLog("ERROR GLOBAL: " + msg);
  if (err && err.stack) debugLog(err.stack);
};

// ----------------------
// Preview archivos locales
// ----------------------
if (inputs.logoStore) {
  inputs.logoStore.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    logoStorePreview.src = URL.createObjectURL(file);
    debugLog("Preview logoStore listo.");
  });
}
if (inputs.logoSearch) {
  inputs.logoSearch.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    logoSearchPreview.src = URL.createObjectURL(file);
    debugLog("Preview logoSearch listo.");
  });
}

// ----------------------
// Inicializar mapa (Leaflet) + Geosearch
// ----------------------
const map = L.map('mapConfig').setView([currentLat, currentLng], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
const marker = L.marker([currentLat, currentLng], { draggable: true }).addTo(map);

const updateAddressDisplay = async (lat, lng) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const addr = data.address || {};

    addressDisplay.innerHTML = '';
    const fields = [
      { label: 'Calle', value: addr.road },
      { label: 'Número', value: addr.house_number },
      { label: 'Barrio', value: addr.suburb },
      { label: 'Municipio', value: addr.city || addr.town || addr.village },
      { label: 'Departamento', value: addr.county },
      { label: 'Provincia', value: addr.state },
      { label: 'Código Postal', value: addr.postcode },
      { label: 'País', value: addr.country }
    ];

    fields.forEach(f => {
      if (f.value) {
        const p = document.createElement('p');
        const labelSpan = document.createElement('span');
        labelSpan.textContent = `${f.label}: `;
        labelSpan.style.color = '#2c7a7b';
        labelSpan.style.fontWeight = 'bold';
        const valueSpan = document.createElement('span');
        valueSpan.textContent = f.value;
        p.appendChild(labelSpan);
        p.appendChild(valueSpan);
        p.style.margin = '2px 0';
        p.style.fontSize = '14px';
        p.style.textAlign = 'left';
        addressDisplay.appendChild(p);
      }
    });

    debugLog('Dirección actualizada desde Nominatim.');
  } catch (err) {
    addressDisplay.innerHTML = '<p>Dirección no disponible</p>';
    debugLog('Error reverse geocode: ' + err);
  }
};

updateAddressDisplay(currentLat, currentLng);

const provider = new window.GeoSearch.OpenStreetMapProvider();
const searchControl = new window.GeoSearch.GeoSearchControl({
  provider,
  style: 'bar',
  showMarker: false,
  autoComplete: true,
  autoCompleteDelay: 250
});
map.addControl(searchControl);

map.on('geosearch/showlocation', async (result) => {
  const { x: lng, y: lat } = result.location;
  currentLat = lat;
  currentLng = lng;
  marker.setLatLng([lat, lng]);
  map.setView([lat, lng], 16);
  await updateAddressDisplay(lat, lng);
});

marker.on('dragend', async () => {
  const pos = marker.getLatLng();
  currentLat = pos.lat;
  currentLng = pos.lng;
  await updateAddressDisplay(currentLat, currentLng);
});

// ----------------------
// Upload Cloudinary unsigned
// ----------------------
async function uploadToCloudinary(file) {
  if (!file) return null;
  debugLog("Subiendo a Cloudinary...");

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloud_name}/image/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY.upload_preset);
  fd.append('folder', 'catalogo');

  try {
    const res = await fetch(url, { method: 'POST', body: fd });
    const data = await res.json();
    debugLog("Cloudinary response: " + (data.secure_url ? data.secure_url : JSON.stringify(data)));
    return data.secure_url || null;
  } catch (err) {
    debugLog("Cloudinary upload failed: " + err);
    return null;
  }
}

// ----------------------
// Cargar config desde Realtime DB al formulario
// ----------------------
const loadConfigToForm = async () => {
  try {
    debugLog("Cargando configuración desde Firebase...");
    const snapshot = await get(child(dbRef(database), 'config'));
    if (snapshot.exists && snapshot.exists()) {
      const cfg = snapshot.val ? snapshot.val() : snapshot;
      // compat: if snapshot.val exists (modular)
      const data = typeof snapshot.val === 'function' ? snapshot.val() : snapshot;
      const configObj = (data && data.val) ? data.val() : (snapshot.val ? snapshot.val() : snapshot);
      const finalCfg = (typeof configObj === 'object' && configObj !== null) ? (configObj.val ? configObj.val() : (snapshot.val ? snapshot.val() : configObj)) : configObj;
      const cfgData = (snapshot.val ? snapshot.val() : finalCfg);

      // Now apply values safely:
      const mapping = {
        whatsapp: cfgData.whatsapp,
        whatsappMessage: cfgData.whatsappMessage,
        phone: cfgData.phone,
        instagram: cfgData.instagram,
        facebook: cfgData.facebook,
        email: cfgData.email,
        bgColor: cfgData.bgColor,
        btnColor: cfgData.btnColor,
        textColor: cfgData.textColor,
        showWhatsapp: cfgData.showWhatsapp,
        showTelefono: cfgData.showTelefono,
        showInstagram: cfgData.showInstagram,
        showFacebook: cfgData.showFacebook,
        showEmail: cfgData.showEmail,
        showMap: cfgData.showMap,
        lat: cfgData.lat,
        lng: cfgData.lng,
        address: cfgData.address
      };

      Object.keys(mapping).forEach(key => {
        const el = document.getElementById(key + (key.endsWith('Message') ? '' : 'Input'));
        // handle names used in this form:
        const idsMap = {
          whatsapp: 'whatsappInput',
          whatsappMessage: 'whatsappMessageInput',
          phone: 'phoneInput',
          instagram: 'instagramInput',
          facebook: 'facebookInput',
          email: 'emailInput',
          bgColor: 'bgColorInput',
          btnColor: 'btnColorInput',
          textColor: 'textColorInput',
          showWhatsapp: 'showWhatsapp',
          showTelefono: 'showTelefono',
          showInstagram: 'showInstagram',
          showFacebook: 'showFacebook',
          showEmail: 'showEmail',
          showMap: 'showMap',
          lat: 'lat',
          lng: 'lng',
          address: 'addressDisplay'
        };
        const idToUse = idsMap[key];
        if (!idToUse) return;
        const domEl = document.getElementById(idToUse);
        if (!domEl) return;
        if (domEl.type === 'checkbox') {
          domEl.checked = !!cfgData[key];
        } else if (domEl.tagName === 'DIV' && idToUse === 'addressDisplay') {
          domEl.textContent = cfgData.address || domEl.textContent;
        } else {
          domEl.value = cfgData[key] !== undefined ? cfgData[key] : domEl.value;
        }
      });

      // Logos
      if (cfgData.logoStoreURL) logoStorePreview.src = cfgData.logoStoreURL;
      if (cfgData.logoSearchURL) logoSearchPreview.src = cfgData.logoSearchURL;

      // Map
      if (cfgData.lat && cfgData.lng) {
        currentLat = cfgData.lat;
        currentLng = cfgData.lng;
        marker.setLatLng([currentLat, currentLng]);
        map.setView([currentLat, currentLng], 15);
        updateAddressDisplay(currentLat, currentLng);
      }

      debugLog("Formulario poblado con datos de Firebase.");
    } else {
      debugLog("No hay configuración guardada (snapshot vacío).");
    }
  } catch (err) {
    debugLog("Error cargando config: " + err);
  }
};

// Use onValue to keep form in sync if changed elsewhere
onValue(dbRef(database, 'config'), (snap) => {
  if (!snap.exists()) {
    debugLog("onValue: no existe config.");
    return;
  }
  const cfg = snap.val();
  // populate form minimal safe
  if (cfg.whatsapp && document.getElementById('whatsappInput')) document.getElementById('whatsappInput').value = cfg.whatsapp;
  if (cfg.whatsappMessage && document.getElementById('whatsappMessageInput')) document.getElementById('whatsappMessageInput').value = cfg.whatsappMessage;
  if (cfg.phone && document.getElementById('phoneInput')) document.getElementById('phoneInput').value = cfg.phone;
  if (cfg.instagram && document.getElementById('instagramInput')) document.getElementById('instagramInput').value = cfg.instagram;
  if (cfg.facebook && document.getElementById('facebookInput')) document.getElementById('facebookInput').value = cfg.facebook;
  if (cfg.email && document.getElementById('emailInput')) document.getElementById('emailInput').value = cfg.email;
  if (cfg.bgColor && document.getElementById('bgColorInput')) document.getElementById('bgColorInput').value = cfg.bgColor;
  if (cfg.btnColor && document.getElementById('btnColorInput')) document.getElementById('btnColorInput').value = cfg.btnColor;
  if (cfg.textColor && document.getElementById('textColorInput')) document.getElementById('textColorInput').value = cfg.textColor;
  if (typeof cfg.showWhatsapp !== 'undefined' && document.getElementById('showWhatsapp')) document.getElementById('showWhatsapp').checked = !!cfg.showWhatsapp;
  if (typeof cfg.showTelefono !== 'undefined' && document.getElementById('showTelefono')) document.getElementById('showTelefono').checked = !!cfg.showTelefono;
  if (typeof cfg.showInstagram !== 'undefined' && document.getElementById('showInstagram')) document.getElementById('showInstagram').checked = !!cfg.showInstagram;
  if (typeof cfg.showFacebook !== 'undefined' && document.getElementById('showFacebook')) document.getElementById('showFacebook').checked = !!cfg.showFacebook;
  if (typeof cfg.showEmail !== 'undefined' && document.getElementById('showEmail')) document.getElementById('showEmail').checked = !!cfg.showEmail;
  if (typeof cfg.showMap !== 'undefined' && document.getElementById('showMap')) document.getElementById('showMap').checked = !!cfg.showMap;
  if (cfg.logoStoreURL) logoStorePreview.src = cfg.logoStoreURL;
  if (cfg.logoSearchURL) logoSearchPreview.src = cfg.logoSearchURL;
  if (cfg.address && document.getElementById('addressDisplay')) document.getElementById('addressDisplay').textContent = cfg.address;
});

// ----------------------
// Guardar en Firebase (subir imágenes si hace falta)
// ----------------------
saveBtn.addEventListener('click', async () => {
  debugLog("Botón guardar presionado.");

  try {
    // Construir objeto cfg desde inputs y toggles
    const cfg = {
      whatsapp: inputs.whatsapp.value.trim(),
      whatsappMessage: inputs.whatsappMessage.value.trim(),
      phone: inputs.phone.value.trim(),
      instagram: inputs.instagram.value.trim(),
      facebook: inputs.facebook.value.trim(),
      email: inputs.email.value.trim(),
      bgColor: inputs.bgColor.value || '#ffffff',
      btnColor: inputs.btnColor.value || '#28a745',
      textColor: inputs.textColor.value || '#000000',
      logoStoreURL: logoStorePreview.src && !logoStorePreview.src.startsWith('blob:') ? logoStorePreview.src : '',
      logoSearchURL: logoSearchPreview.src && !logoSearchPreview.src.startsWith('blob:') ? logoSearchPreview.src : '',
      showWhatsapp: !!toggles.whatsapp.checked,
      showTelefono: !!toggles.telefono.checked,
      showInstagram: !!toggles.instagram.checked,
      showFacebook: !!toggles.facebook.checked,
      showEmail: !!toggles.email.checked,
      showMap: !!toggles.map.checked,
      lat: currentLat,
      lng: currentLng,
      address: addressDisplay.textContent || ''
    };

    // Subir archivos si hay nuevos (archivo local)
    if (inputs.logoStore.files && inputs.logoStore.files[0]) {
      debugLog("Subiendo logoStore a Cloudinary...");
      const url = await uploadToCloudinary(inputs.logoStore.files[0]);
      if (url) cfg.logoStoreURL = url;
      else debugLog("No se obtuvo URL para logoStore.");
    }

    if (inputs.logoSearch.files && inputs.logoSearch.files[0]) {
      debugLog("Subiendo logoSearch a Cloudinary...");
      const url = await uploadToCloudinary(inputs.logoSearch.files[0]);
      if (url) cfg.logoSearchURL = url;
      else debugLog("No se obtuvo URL para logoSearch.");
    }

    debugLog("Intentando guardar en Realtime Database...");
    await set(dbRef(database, 'config'), cfg);
    debugLog("✔ Guardado exitoso en Firebase.");
    alert("Configuración guardada correctamente.");
  } catch (err) {
    debugLog("ERROR guardando configuración: " + err);
    alert("Error guardando configuración. Revisa la consola de depuración.");
  }
});

// ----------------------
// (Opcional) Guardar local — útil para pruebas sin Firebase
// ----------------------
if (saveLocalBtn) {
  saveLocalBtn.addEventListener('click', () => {
    try {
      const cfgLocal = {
        whatsapp: inputs.whatsapp.value,
        phone: inputs.phone.value,
        instagram: inputs.instagram.value,
        facebook: inputs.facebook.value,
        email: inputs.email.value,
        bgColor: inputs.bgColor.value,
        btnColor: inputs.btnColor.value,
        textColor: inputs.textColor.value,
        lat: currentLat,
        lng: currentLng
      };
      localStorage.setItem('config_local', JSON.stringify(cfgLocal));
      localStorage.setItem('configUpdate', Date.now());
      debugLog("Guardado local en localStorage.");
      alert("Guardado local en navegador.");
    } catch (e) {
      debugLog("Error guardando local: " + e);
    }
  });
}

// ----------------------
// Cargar config inicial al abrir
// ----------------------
loadConfigToForm();
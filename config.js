/* ============================================================
   CONSOLA DE DEPURACIÓN VISUAL
============================================================ */

function debug(msg) {
    const box = document.getElementById("debugConsole");
    if (!box) return;
    const h = new Date().toLocaleTimeString();
    box.value += `[${h}] ${msg}\n`;
    box.scrollTop = box.scrollHeight;
}

window.addEventListener("error", (e) => {
    debug("ERROR GLOBAL: " + e.message);
});

/* ============================================================
   FIREBASE CONFIG
============================================================ */

// IMPORTANTE: Esto debe coincidir con tu proyecto real
const firebaseConfig = {
    apiKey: "AIzaSyAPWpHKVWMMQhC0HNpSAHi4nptlcHm1e8o",
    authDomain: "catalogo-web-4a53c.firebaseapp.com",
    databaseURL: "https://catalogo-web-4a53c-default-rtdb.firebaseio.com",
    projectId: "catalogo-web-4a53c",
    storageBucket: "catalogo-web-4a53c.appspot.com",
    messagingSenderId: "434380197926",
    appId: "1:434380197926:web:57753ba235d198462b16e7"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

debug("Firebase inicializado.");

/* ============================================================
   CLOUDINARY CONFIG
============================================================ */

const CLOUD_NAME = "dr8mjndur";
const UPLOAD_PRESET = "DatosWeb"; // Asegurate que exista en Cloudinary

async function uploadImage(file) {
    try {
        debug("Subiendo imagen a Cloudinary...");

        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", UPLOAD_PRESET);

        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            { method: "POST", body: form }
        );

        const data = await res.json();

        debug("Cloudinary → " + JSON.stringify(data));

        return data.secure_url || null;

    } catch (err) {
        debug("❌ Error al subir imagen: " + err.message);
        return null;
    }
}

/* ============================================================
   LOAD SAVED CONFIG FROM FIREBASE
============================================================ */

async function loadConfig() {
    debug("Cargando configuración desde Firebase...");

    db.ref("config").once("value", (snap) => {
        const data = snap.val();

        if (!data) {
            debug("⚠ No hay datos guardados todavía.");
            return;
        }

        // Cargar inputs
        document.getElementById("whatsapp").value = data.whatsapp || "";
        document.getElementById("nombreTienda").value = data.nombreTienda || "";
        document.getElementById("ubicacion").value = data.ubicacion || "";
        document.getElementById("colorFondo").value = data.colorFondo || "#ffffff";

        // Logo
        if (data.logo) {
            document.getElementById("previewLogo").src = data.logo;
        }

        debug("✔ Configuración cargada correctamente.");
    });
}

/* ============================================================
   SAVE CONFIG TO FIREBASE
============================================================ */

async function saveConfig() {
    debug("== BOTÓN GUARDAR PRESIONADO ==");

    const whatsapp = document.getElementById("whatsapp").value;
    const nombreTienda = document.getElementById("nombreTienda").value;
    const ubicacion = document.getElementById("ubicacion").value;
    const colorFondo = document.getElementById("colorFondo").value;

    // Subir logo si existe
    const file = document.getElementById("logoFile").files[0];
    let logoURL = null;

    if (file) {
        logoURL = await uploadImage(file);
    } else {
        debug("No se seleccionó una imagen nueva.");
    }

    const data = {
        whatsapp,
        nombreTienda,
        ubicacion,
        colorFondo,
        logo: logoURL || document.getElementById("previewLogo").src || null
    };

    debug("Guardando en Firebase...");

    db.ref("config").set(data)
        .then(() => {
            debug("✔ Configuración guardada con éxito.");
        })
        .catch(err => {
            debug("❌ Error guardando en Firebase: " + err.message);
        });
}

/* ============================================================
   MAPA LEAFLET + GEOSEARCH
============================================================ */

function initMap() {
    const mapDiv = document.getElementById("map");

    if (!mapDiv) {
        debug("⚠ No se encontró el div #map.");
        return;
    }

    try {
        const map = L.map("map").setView([-34.6037, -58.3816], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19
        }).addTo(map);

        debug("✔ Mapa cargado.");

        // GeoSearch con protección
        setTimeout(() => {
            try {
                const provider = new window.GeoSearch.OpenStreetMapProvider();

                const searchControl = new window.GeoSearch.GeoSearchControl({
                    provider,
                    style: "bar",
                    autoComplete: true,
                });

                map.addControl(searchControl);

                debug("✔ Control de búsqueda cargado.");

            } catch (e) {
                debug("❌ Error GeoSearch: " + e.message);
            }
        }, 500);

    } catch (err) {
        debug("❌ Error inicializando mapa: " + err.message);
    }
}

/* ============================================================
   EVENTOS
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    debug("Consola de depuración activa.");
    loadConfig();
    initMap();
});

document.getElementById("guardarBtn").addEventListener("click", saveConfig);

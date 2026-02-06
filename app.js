function abrirLibro() {
  window.open(
    "https://anayamultimedia.es/primer_capitulo/el-libro-del-hacker-edicion-2022.pdf",
    "_blank"
  );
}

async function verIP() {
  const ipDiv = document.getElementById("ipResultado");
  ipDiv.innerHTML = "Obteniendo IP...";

  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    ipDiv.innerHTML = "Tu IP es: <span>" + data.ip + "</span>";
  } catch (e) {
    ipDiv.innerHTML = "Error obteniendo IP";
  }
}

async function medirInternet() {
  const out = document.getElementById("speedResultado");
  out.innerHTML = "Midiendo velocidad...";

  try {
    const downloadStart = performance.now();
    await fetch("https://speed.cloudflare.com/__down?bytes=5000000");
    const downloadEnd = performance.now();

    const downloadMbps =
      (5 * 8) / ((downloadEnd - downloadStart) / 1000);

    const uploadData = new Uint8Array(2_000_000);
    const uploadStart = performance.now();
    await fetch("https://speed.cloudflare.com/__up", {
      method: "POST",
      body: uploadData
    });
    const uploadEnd = performance.now();

    const uploadMbps =
      (2 * 8) / ((uploadEnd - uploadStart) / 1000);

    out.innerHTML = `
      ↓ Bajada: ${downloadMbps.toFixed(2)} Mbps<br>
      ↑ Subida: ${uploadMbps.toFixed(2)} Mbps
    `;
  } catch (e) {
    out.innerHTML = "Error midiendo velocidad";
  }
}

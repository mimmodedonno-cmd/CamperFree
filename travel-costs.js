(() => {
  const STORAGE_KEY = "camperfreeTravelCosts";

  function money(value) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(Number(value) || 0);
  }

  function numberValue(id) {
    return Math.max(0, Number(document.getElementById(id)?.value) || 0);
  }

  function routeDistance() {
    const text = document.getElementById("routeMeta")?.textContent || "";
    const match = text.match(/([\d.]+)\s*km/i);
    return match ? Number(match[1].replace(".", "")) : 0;
  }

  function calculateCosts() {
    const km = routeDistance();
    const consumption = numberValue("costConsumption");
    const fuelPrice = numberValue("costFuelPrice");
    const tolls = numberValue("costTolls");
    const permits = numberValue("costPermits");
    const ferries = numberValue("costFerries");
    const other = numberValue("costOther");
    const liters = km * consumption / 100;
    const fuelTotal = liters * fuelPrice;
    const total = fuelTotal + tolls + permits + ferries + other;

    document.getElementById("costDistance").textContent = km
      ? `${km} km`
      : "Pianifica prima un percorso";
    document.getElementById("costLiters").textContent = `${liters.toFixed(1)} litri`;
    document.getElementById("costFuelTotal").textContent = money(fuelTotal);
    document.getElementById("costGrandTotal").textContent = money(total);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      consumption,
      fuelPrice,
      tolls,
      permits,
      ferries,
      other
    }));
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .costGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .costResult{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px}
      .costBox{background:#eef3ee;border-radius:14px;padding:11px}
      .costBox span{display:block;color:#68736d;font-size:12px;margin-bottom:4px}
      .costBox strong{font-size:17px}
      .costTotal{background:#123f33;color:#fff}.costTotal span{color:#dce9e3}
      @media(max-width:600px){.costGrid{grid-template-columns:1fr}.costResult{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function addInterface() {
    const trip = document.getElementById("screen-trip");
    if (!trip || document.getElementById("travelCostsCard")) return;
    addStyles();

    const card = document.createElement("div");
    card.id = "travelCostsCard";
    card.className = "card";
    card.innerHTML = `
      <div class="routeTitle">💶 Spese di viaggio</div>
      <div class="muted" style="margin:5px 0 10px">Stima modificabile del costo complessivo del viaggio.</div>
      <div class="costGrid">
        <div><div class="label">Consumo camper (litri/100 km)</div><input id="costConsumption" type="number" min="0" step="0.1" value="10"></div>
        <div><div class="label">Prezzo carburante (€/litro)</div><input id="costFuelPrice" type="number" min="0" step="0.01" value="1.80"></div>
        <div><div class="label">Pedaggi e caselli (€)</div><input id="costTolls" type="number" min="0" step="0.01" value="0"></div>
        <div><div class="label">Vignette e permessi (€)</div><input id="costPermits" type="number" min="0" step="0.01" value="0"></div>
        <div><div class="label">Traghetti (€)</div><input id="costFerries" type="number" min="0" step="0.01" value="0"></div>
        <div><div class="label">Altre spese (€)</div><input id="costOther" type="number" min="0" step="0.01" value="0"></div>
      </div>
      <div class="costResult">
        <div class="costBox"><span>Distanza</span><strong id="costDistance">—</strong></div>
        <div class="costBox"><span>Carburante necessario</span><strong id="costLiters">0,0 litri</strong></div>
        <div class="costBox"><span>Costo carburante</span><strong id="costFuelTotal">€ 0,00</strong></div>
        <div class="costBox costTotal"><span>Totale stimato</span><strong id="costGrandTotal">€ 0,00</strong></div>
      </div>
      <div class="muted" style="margin-top:9px">La cifra è una stima. Pedaggi, vignette, zone ambientali e traghetti devono essere verificati prima della partenza.</div>
    `;

    trip.appendChild(card);

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const fields = {
      costConsumption: saved.consumption,
      costFuelPrice: saved.fuelPrice,
      costTolls: saved.tolls,
      costPermits: saved.permits,
      costFerries: saved.ferries,
      costOther: saved.other
    };
    Object.entries(fields).forEach(([id, value]) => {
      if (value !== undefined) document.getElementById(id).value = value;
    });

    card.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", calculateCosts);
    });

    const routeMeta = document.getElementById("routeMeta");
    if (routeMeta) {
      new MutationObserver(calculateCosts).observe(routeMeta, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
    calculateCosts();
  }

  addInterface();
})();

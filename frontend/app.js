const DB = "http://localhost:8080/pokemons",
  API = "https://pokeapi.co/api/v2/pokemon";
const H = {
  "Content-Type": "application/json",
  Authorization: "Basic " + btoa("admin:secret"),
};
const COLORS = {
  normal: "#a8a77a",
  fire: "#ee8130",
  water: "#6390f0",
  electric: "#f7d02c",
  grass: "#7ac74c",
  ice: "#96d9d6",
  fighting: "#c22e28",
  poison: "#a33ea1",
  ground: "#e2bf65",
  flying: "#a98ff3",
  psychic: "#f95587",
  bug: "#a6b91a",
  rock: "#b6a136",
  ghost: "#735797",
  dragon: "#6f35fc",
  dark: "#705746",
  steel: "#b7b7ce",
  fairy: "#d685ad",
};
let data = [],
  barChart,
  donutChart;
const $ = (id) => document.getElementById(id);
function message(text, error = false) {
  const n = $("notice");
  n.textContent = text;
  n.hidden = false;
  n.className = error ? "error" : "";
  setTimeout(() => (n.hidden = true), 5000);
}
function normalize(d) {
  return {
    ...d,
    id: d._id?.$oid || d._id || d.id,
    nome: d.nome || "",
    tipos: Array.isArray(d.tipos) ? d.tipos : [],
    numero: +d.numero || 0,
    ataque: +d.ataque || 0,
    defesa: +d.defesa || 0,
    hp: +d.hp || 0,
    favorito: !!d.favorito,
  };
}
async function read() {
  const r = await fetch(DB + "?pagesize=1000", { headers: H });
  if (!r.ok)
    throw Error(
      `Falha ao ler coleção (HTTP ${r.status}). Confira Docker e /pokemons.`,
    );
  const x = await r.json();
  return (Array.isArray(x) ? x : x._embedded || []).map(normalize);
}
async function refresh(show = false) {
  try {
    data = await read();
    render();
    if (show) message(`Dados atualizados: ${data.length} Pokémon.`);
  } catch (e) {
    message(e.message, true);
  }
}
async function collection() {
  const r = await fetch(DB, { method: "PUT", headers: H });
  if (!r.ok && r.status !== 409)
    throw Error(`Falha ao criar coleção (HTTP ${r.status}).`);
}
async function importData() {
  for (const id of ["import"]) $(id).disabled = true;
  message("Buscando na PokéAPI e salvando no MongoDB…");
  try {
    await collection();
    const before = await read(),
      r = await fetch(API + "?limit=30&offset=0");
    if (!r.ok) throw Error(`PokéAPI respondeu HTTP ${r.status}.`);
    const { results } = await r.json();
    let added = 0;
    for (const item of results) {
      if (before.some((p) => p.nome === item.name)) continue;
      const q = await fetch(item.url);
      if (!q.ok) throw Error(`Falha na PokéAPI (HTTP ${q.status}).`);
      const p = await q.json();
      const doc = {
        nome: p.name,
        numero: p.id,
        tipos: p.types.map((t) => t.type.name),
        ataque: p.stats.find((s) => s.stat.name === "attack").base_stat,
        defesa: p.stats.find((s) => s.stat.name === "defense").base_stat,
        hp: p.stats.find((s) => s.stat.name === "hp").base_stat,
        altura: p.height,
        peso: p.weight,
        imagem:
          p.sprites.other["official-artwork"].front_default ||
          p.sprites.front_default ||
          "",
        favorito: false,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };
      const saved = await fetch(DB, {
        method: "POST",
        headers: H,
        body: JSON.stringify(doc),
      });
      if (!saved.ok)
        throw Error(`Falha ao salvar ${p.name} (HTTP ${saved.status}).`);
      added++;
    }
    data = await read();
    render();
    message(`Importação concluída: ${added} novo(s), ${data.length} no total.`);
  } catch (e) {
    message(e.message, true);
  } finally {
    $("import").disabled = false;
  }
}
function render() {
  stats();
  charts();
  ranking();
  filters();
  cards();
}
function stats() {
  const n = data.length,
    avg = n ? data.reduce((s, p) => s + p.ataque, 0) / n : 0,
    top = [...data].sort((a, b) => b.ataque - a.ataque)[0];
  $("total").textContent = n;
  $("average").textContent = n ? avg.toFixed(1) : "—";
  $("max").textContent = top ? top.ataque : "—";
  $("maxName").textContent = top ? top.nome : "entre os cadastrados";
  $("favorites").textContent = n
    ? `${((data.filter((p) => p.favorito).length / n) * 100).toFixed(0)}%`
    : "—";
}
function groups() {
  const o = {};
  data.flatMap((p) => p.tipos).forEach((t) => (o[t] = (o[t] || 0) + 1));
  return Object.entries(o).sort((a, b) => b[1] - a[1]);
}
function charts() {
  const g = groups(),
    labels = g.map((x) => x[0]),
    vals = g.map((x) => x[1]),
    colors = g.map((x) => COLORS[x[0]] || "#999");
  if (barChart) barChart.destroy();
  if (donutChart) donutChart.destroy();
  barChart = new Chart($("bars"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ data: vals, backgroundColor: colors, borderRadius: 5 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
  donutChart = new Chart($("donut"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: vals,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "right",
          labels: { boxWidth: 10, font: { size: 10 } },
        },
      },
    },
  });
}
function ranking() {
  const top = [...data].sort((a, b) => b.ataque - a.ataque).slice(0, 5);
  $("ranking").innerHTML = top.length
    ? top
        .map(
          (p, i) =>
            `<li><b>${i + 1}.</b><img src="${p.imagem || sprite(p)}" alt=""><span>${p.nome}</span><strong>${p.ataque}</strong></li>`,
        )
        .join("")
    : '<li class="empty">Importe dados para ver o ranking.</li>';
}
function sprite(p) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.numero}.png`;
}
function cards() {
  let term = $("search").value.toLowerCase(),
    type = $("type").value,
    sort = $("sort").value;
  let list = data.filter(
    (p) =>
      (!term ||
        p.nome.includes(term) ||
        p.tipos.some((t) => t.includes(term))) &&
      (!type || p.tipos.includes(type)),
  );
  list.sort((a, b) =>
    sort === "ataque"
      ? b.ataque - a.ataque
      : sort === "nome"
        ? a.nome.localeCompare(b.nome)
        : a.numero - b.numero,
  );
  $("count").textContent = list.length;
  $("grid").innerHTML = list.length
    ? list
        .map(
          (p) =>
            `<article class="card"><div class="cardtop">#${String(p.numero).padStart(3, "0")}<button data-act="fav" data-id="${p.id}" class="heart ${p.favorito ? "on" : ""}">♥</button></div><img class="sprite" src="${p.imagem || sprite(p)}" alt="${p.nome}" onerror="this.src='${sprite(p)}'"><h3>${p.nome}</h3><div class="chips">${p.tipos.map((t) => `<span style="color:${COLORS[t] || "#777"};background:${COLORS[t] || "#777"}22">${t}</span>`).join("")}</div><div class="statsline">ATQ <b>${p.ataque}</b>　DEF <b>${p.defesa}</b>　HP <b>${p.hp}</b></div><div class="cardactions"><button data-act="edit" data-id="${p.id}">Editar</button><button data-act="delete" data-id="${p.id}">Excluir</button></div></article>`,
        )
        .join("")
    : '<div class="empty">Nenhum Pokémon corresponde à busca.</div>';
}
function filters() {
  const s = $("type"),
    old = s.value,
    types = [...new Set(data.flatMap((p) => p.tipos))].sort();
  s.innerHTML =
    '<option value="">Todos os tipos</option>' +
    types.map((t) => `<option>${t}</option>`).join("");
  s.value = types.includes(old) ? old : "";
}
function openForm(p) {
  $("form").reset();
  $("id").value = p?.id || "";
  $("title").textContent = p ? "Editar Pokémon" : "Cadastrar Pokémon";
  $("mode").textContent = p ? "EDIÇÃO COMPLETA · PUT" : "NOVO DOCUMENTO · POST";
  $("name").value = p?.nome || "";
  $("number").value = p?.numero || "";
  $("types").value = p?.tipos.join(", ") || "";
  $("attack").value = p?.ataque ?? "";
  $("defense").value = p?.defesa ?? "";
  $("hp").value = p?.hp ?? "";
  $("image").value = p?.imagem || "";
  $("favorite").checked = p?.favorito || false;
  $("modal").showModal();
}
async function save(e) {
  e.preventDefault();
  const id = $("id").value,
    old = data.find((p) => p.id === id) || {},
    doc = {
      nome: $("name").value.trim().toLowerCase(),
      numero: +$("number").value,
      tipos: $("types")
        .value.split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
      ataque: +$("attack").value,
      defesa: +$("defense").value,
      hp: +$("hp").value,
      altura: old.altura ?? null,
      peso: old.peso ?? null,
      imagem: $("image").value.trim(),
      favorito: $("favorite").checked,
      criadoEm: old.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
  try {
    const r = await fetch(id ? `${DB}/${id}` : DB, {
      method: id ? "PUT" : "POST",
      headers: H,
      body: JSON.stringify(doc),
    });
    if (!r.ok) throw Error(`Falha ao salvar (HTTP ${r.status}).`);
    $("modal").close();
    await refresh();
    message(id ? "Documento substituído com PUT." : "Pokémon criado com POST.");
  } catch (e) {
    message(e.message, true);
  }
}
$("import").onclick = importData;
$("refresh").onclick = () => refresh(true);
$("new").onclick = $("new2").onclick = () => openForm();
$("close").onclick = $("cancel").onclick = () => $("modal").close();
$("form").onsubmit = save;
["search", "type", "sort"].forEach((id) =>
  $(id).addEventListener(id === "search" ? "input" : "change", cards),
);
$("grid").onclick = async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const p = data.find((x) => x.id === b.dataset.id);
  try {
    if (b.dataset.act === "edit") return openForm(p);
    if (b.dataset.act === "fav") {
      const r = await fetch(`${DB}/${p.id}`, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({
          favorito: !p.favorito,
          atualizadoEm: new Date().toISOString(),
        }),
      });
      if (!r.ok) throw Error(`Falha PATCH (HTTP ${r.status}).`);
      await refresh();
      message("Favorito atualizado com PATCH.");
    }
    if (
      b.dataset.act === "delete" &&
      confirm(`Excluir ${p.nome}? Esta ação não pode ser desfeita.`)
    ) {
      const r = await fetch(`${DB}/${p.id}`, { method: "DELETE", headers: H });
      if (!r.ok && r.status !== 204)
        throw Error(`Falha DELETE (HTTP ${r.status}).`);
      await refresh();
      message("Documento removido com DELETE.");
    }
  } catch (err) {
    message(err.message, true);
  }
};
refresh();

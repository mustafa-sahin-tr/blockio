/* Blockio: Time Rush booklet: language memory, site search, level filter. Progressive: every
   page is fully pre-rendered and works without this script. Edit Tools/booklet/static/booklet.js. */
(function () {
  "use strict";
  var STORAGE_KEY = "blockio-lang";
  var root = document.documentElement;
  var body = document.body;
  var lang = root.getAttribute("data-lang") || "en";

  function store(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* storage blocked: ignore */ }
  }

  // Remember an explicit language choice; the switch links already keep the current page.
  var langLinks = document.querySelectorAll("[data-lang-link]");
  for (var i = 0; i < langLinks.length; i++) {
    langLinks[i].addEventListener("click", function () { store(this.getAttribute("data-lang-link")); });
  }

  // Contents panel: open on wide screens, folded on phones.
  var side = document.querySelector(".side details");
  if (side && window.matchMedia && window.matchMedia("(min-width: 960px)").matches) { side.open = true; }

  function norm(text) {
    return String(text).toLocaleLowerCase(lang).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
  }

  function getJson(url, done) {
    var request = new XMLHttpRequest();
    request.open("GET", url);
    request.onload = function () {
      if (request.status >= 200 && request.status < 300) {
        try { done(JSON.parse(request.responseText)); } catch (e) { /* bad data: leave the no-JS view */ }
      }
    };
    request.send();
  }

  // ---- site search ------------------------------------------------------------------------
  var input = document.getElementById("q");
  if (input) {
    var box = input.parentNode;
    var list = document.getElementById("q-results");
    var base = body.getAttribute("data-base") || "";
    var index = null;
    var loading = false;
    box.hidden = false;

    var pending = null;
    var load = function (then) {
      if (index) { then(); return; }
      pending = then; // the latest caller wins: typing while the index loads still renders
      if (loading) { return; }
      loading = true;
      getJson(body.getAttribute("data-search"), function (entries) {
        index = [];
        for (var e = 0; e < entries.length; e++) { index.push([norm(entries[e][0]), entries[e]]); }
        if (pending) { pending(); }
      });
    };

    var render = function () {
      var query = norm(input.value.trim());
      list.innerHTML = "";
      if (!query || !index) { return; }
      var starts = [];
      var contains = [];
      for (var e = 0; e < index.length && starts.length < 20; e++) {
        var at = index[e][0].indexOf(query);
        if (at === 0) { starts.push(index[e][1]); }
        else if (at > 0 && contains.length < 20) { contains.push(index[e][1]); }
      }
      var hits = starts.concat(contains).slice(0, 20);
      if (!hits.length) {
        var none = document.createElement("li");
        var span = document.createElement("span");
        span.textContent = body.getAttribute("data-none");
        none.appendChild(span);
        list.appendChild(none);
        return;
      }
      for (var h = 0; h < hits.length; h++) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = base + hits[h][2];
        a.textContent = hits[h][0];
        var kind = document.createElement("small");
        kind.textContent = hits[h][1];
        a.appendChild(kind);
        li.appendChild(a);
        list.appendChild(li);
      }
    };

    input.addEventListener("focus", function () { load(function () {}); });
    input.addEventListener("input", function () { load(render); });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { input.value = ""; list.innerHTML = ""; }
      if (event.key === "Enter") {
        var first = list.querySelector("a");
        if (first) { window.location.href = first.href; }
      }
      if (event.key === "ArrowDown") {
        var link = list.querySelector("a");
        if (link) { event.preventDefault(); link.focus(); }
      }
    });
    list.addEventListener("keydown", function (event) {
      var current = document.activeElement;
      if (!current || current.tagName !== "A") { return; }
      var item = current.parentNode;
      if (event.key === "ArrowDown" && item.nextSibling) { event.preventDefault(); item.nextSibling.firstChild.focus(); }
      if (event.key === "ArrowUp") { event.preventDefault(); (item.previousSibling ? item.previousSibling.firstChild : input).focus(); }
      if (event.key === "Escape") { input.focus(); list.innerHTML = ""; }
    });
    document.addEventListener("click", function (event) {
      if (!box.contains(event.target)) { list.innerHTML = ""; }
    });
  }

  // ---- level filter (levels page) ---------------------------------------------------------
  var form = document.getElementById("lv-filter");
  if (form) {
    var results = document.getElementById("lv-results");
    var status = document.getElementById("lv-status");
    var data = null;
    var MAX_SHOWN = 100;
    form.hidden = false;

    var fmt = function (value) {
      try { return new Intl.NumberFormat(data.locale).format(value); } catch (e) { return String(value); }
    };
    var pageOf = function (number) {
      var page = Math.floor((number - 1) / data.perPage) + 1;
      return "levels-" + (page < 10 ? "0" : "") + page + ".html#lv-" + number;
    };
    var el = function (tag, className, text) {
      var node = document.createElement(tag);
      if (className) { node.className = className; }
      if (text !== undefined) { node.textContent = text; }
      return node;
    };
    var icon = function (src, size) {
      var image = el("img");
      image.src = src; image.width = size; image.height = size; image.alt = ""; image.loading = "lazy";
      return image;
    };
    var row = function (lv) {
      var li = el("li", "lv");
      li.appendChild(icon(lv[2], 48));
      var wrap = el("div");
      var head = el("div", "lv-head");
      var num = el("a", "lv-num", data.levelLabel.replace("{0}", lv[0]));
      num.href = pageOf(lv[0]);
      head.appendChild(num);
      head.appendChild(el("b", "", lv[1]));
      head.appendChild(el("span", "tag diff-" + lv[4], data.difficulties[lv[4]]));
      wrap.appendChild(head);
      var goals = el("ul", "goals");
      for (var g = 0; g < lv[3].length; g++) {
        var goal = data.goals[lv[3][g][0]];
        var item = el("li");
        item.title = goal[0];
        if (goal[2]) { item.appendChild(icon(goal[2], 20)); }
        item.appendChild(document.createTextNode(goal[1].replace("{0}", fmt(lv[3][g][1]))));
        goals.appendChild(item);
      }
      wrap.appendChild(goals);
      wrap.appendChild(el("div", "lv-region", data.regions[lv[5]]));
      li.appendChild(wrap);
      return li;
    };

    var apply = function () {
      if (!data) { return; }
      var n = form.elements.n.value.trim();
      var g = form.elements.g.value;
      var d = form.elements.d.value;
      var r = form.elements.r.value;
      results.innerHTML = "";
      status.textContent = "";
      if (!n && !g && !d && !r) { return; }
      var hits = [];
      for (var l = 0; l < data.levels.length; l++) {
        var lv = data.levels[l];
        if (n && String(lv[0]).indexOf(n) !== 0) { continue; }
        if (d && lv[4] !== d) { continue; }
        if (r && lv[5] !== r) { continue; }
        if (g) {
          var found = false;
          for (var k = 0; k < lv[3].length; k++) { if (lv[3][k][0] === g) { found = true; break; } }
          if (!found) { continue; }
        }
        hits.push(lv);
      }
      var text = form.getAttribute("data-count").replace("{0}", fmt(hits.length));
      if (hits.length > MAX_SHOWN) { text += " · " + form.getAttribute("data-more").replace("{0}", fmt(MAX_SHOWN)); }
      status.textContent = text;
      for (var s = 0; s < hits.length && s < MAX_SHOWN; s++) { results.appendChild(row(hits[s])); }
    };

    form.addEventListener("input", apply);
    form.addEventListener("change", apply);
    form.addEventListener("submit", function (event) { event.preventDefault(); apply(); });
    getJson(form.getAttribute("data-src"), function (loaded) { data = loaded; apply(); });
  }
})();

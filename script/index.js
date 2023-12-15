let data = [];

let from, to;

function onLoad() {
    fetch("./res/list.json", {
        "cache": "force-cache"
    }).then(res => res.json()).then(res => {
        data = res;
        rerollFrom();
        rerollTo();
    });
}

function choice(l) {
    return l[Math.floor(Math.random() * l.length)];
}

function rerollFrom() {
    if (data.length == 0) return;

    from = choice(data);

    let l = document.getElementById("selection-from");
    l.innerText = from.replaceAll('_', ' ');
    l.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(from)}`;
}

function rerollTo() {
    if (data.length == 0) return;

    to = choice(data);

    let l = document.getElementById("selection-to");
    l.innerText = to.replaceAll('_', ' ');
    l.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(to)}`;
}

function goToGame() {
    if (from && to) {
        window.location = `./game.html?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
}
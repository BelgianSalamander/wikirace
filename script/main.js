let currentArticle;
let articlePath = [];
let startTime = Date.now();

let origin_title;
let target_title;

let origin_url;
let target_url;

let won = false;

window.onbeforeunload = () => "Are you sure you want to leave this page? Your progress will be lost!";

function urlToTitle(s) {
    return decodeURIComponent(s).replaceAll("_", " ")
}

function onLoad() {
    const searchParams = new URLSearchParams(window.location.search);

    const from_url = searchParams.get("from");
    const to_url = searchParams.get("to");

    const title = urlToTitle(from_url) + " → " + urlToTitle(to_url);
    origin_title = urlToTitle(from_url);
    target_title = urlToTitle(to_url);
    origin_url = from_url;
    target_url = to_url;

    document.getElementById("target").innerText = title;

    loadContent(from_url);

    //Disable Ctrl+F
    window.addEventListener("keydown",function (e) {
        if (e.keyCode === 114 || (e.ctrlKey && e.keyCode === 70)) { 
            e.preventDefault();
        }
    });

    setInterval(() => {
        if (won) return true;
        const millis = Date.now() - startTime;
        const seconds = Math.floor(millis / 1000);
        document.getElementById("timer").innerText = `${seconds} Second${articlePath.length == 2 ? "" : "s"} Elapsed`;
    }, 10);
}

function recurseDOM(element, callback) {
    if (callback(element)) return;

    for (child of element.children) {
        recurseDOM(child, callback);
    }
}

function requestGoTo(target) {
    console.log(target);

    loadContent(target).then(() => {
        if (urlToTitle(target) == target_title) {
            win();
        }
    });
}

function makeLink(id, text, url) {
    let res = document.createElement("a");
    res.innerText = text;
    res.href = url;
    res.id = id;

    return res;
}

function win() {
    won = true;
    const finalTimeMillis = Date.now() - startTime;

    let popup = document.getElementById("win-popup");
    popup.style.display = "block";

    let content = document.getElementById("wikipedia-content");
    content.style.opacity = 0.4;
    content.style.pointerEvents = "none";

    let fromLink = document.getElementById("win-from-link");//makeLink("from-link", origin_title, `https://en.wikipedia.org/w/${origin_url}`);
    let toLink = document.getElementById("win-to-link"); //makeLink("to-link", origin_title, `https://en.wikipedia.org/w/${target_url}`);

    fromLink.innerText = origin_title;
    fromLink.href = `https://en.wikipedia.org/wiki/${origin_url}`;

    toLink.innerText = target_title;
    toLink.href = `https://en.wikipedia.org/wiki/${target_url}`;

    fromLink.setAttribute("target", "_blank");
    fromLink.setAttribute("rel", "noreferrer noopener");

    toLink.setAttribute("target", "_blank");
    toLink.setAttribute("rel", "noreferrer noopener");

    document.getElementById("win-num-seconds").innerText = finalTimeMillis / 1000;
    document.getElementById("win-num-clicks").innerText = articlePath.length - 1;

    const pathTable = document.getElementById("path-table");

    const images = {};

    for (let i = 0; i < articlePath.length; i++) {
        let row = document.createElement("tr");

        let idx = document.createElement("td");
        idx.innerText = i + 1;
        row.appendChild(idx);

        let article = document.createElement("td");
        let articleLink = document.createElement("a");
        articleLink.href = `https://en.wikipedia.org/wiki/${articlePath[i]}`;
        articleLink.innerText = urlToTitle(articlePath[i]);
        articleLink .setAttribute("target", "_blank");
        articleLink .setAttribute("rel", "noreferrer noopener");
        article.appendChild(articleLink);
        row.appendChild(article);

        const imageContainer = document.createElement("td");
        const img = document.createElement("img");
        img.classList.add("list-thumbnail");
        images[urlToTitle(articlePath[i])] = img;
        imageContainer.appendChild(img);
        row.appendChild(imageContainer);

        pathTable.appendChild(row);
    }

    fetch(`https://en.wikipedia.org/w/api.php?origin=*&action=query&titles=${articlePath.join("|")}&prop=pageimages&format=json&pithumbsize=100`).then(res => res.json()).then(res => {
        for (page_k in res.query.pages) {
            let page = res.query.pages[page_k];
            if ("thumbnail" in page) {
                let image = images[page.title];
                image.src = page.thumbnail.source;
            }
        }
    });
}

function loadContent(article) {
    const parts = article.split("#");
    console.log(parts);
    article = parts[0];
    const url = `https://en.wikipedia.org/w/api.php?origin=*&action=parse&formatversion=2&page=${article}&prop=text&format=json`

    const pageElement = document.getElementById("wikipedia-content");

    //pageElement.innerHTML = "";

    return fetch(url, {
        "credentials": "omit"
    }).then(res => res.json()).then(res => {
        console.log("Got document");
        var doc = new DOMParser().parseFromString(res.parse.text, "text/html");

        let pageContent = doc.getElementsByTagName("body")[0];

        let redirect = doc.getElementsByClassName("redirectText");
        if (redirect.length) {
            redirect = redirect[0];
            console.log("Redirecting!");
            requestGoTo(redirect.firstChild.firstChild.getAttribute("href").substring(6));
            return;
        }
        
        recurseDOM(pageContent, e => {
            /*for (t of e.classList) {
                e.classList.replace(t, "wikipedia-" + t);
            }*/

            e.classList.add("copied-wikipedia-element");
        });

        let articleHeader = document.createElement("h1");
        articleHeader.id = "article-header";
        articleHeader.innerText = urlToTitle(article);
        
        pageContent.insertBefore(articleHeader, pageContent.firstChild);

        recurseDOM(pageContent, e => {
            if (e.tagName == "A") {
                const link = e.getAttribute("href");

                if (link && link.startsWith("/wiki/")) {
                    const target = link.substring(6);

                    e.setAttribute("href", "javascript:void(0)");
                    e.onclick = (ev) => {
                        if (ev.ctrlKey) {
                            window.open("https://en.wikipedia.org/wiki/" + target, "_blank").focus();
                        } else {
                            requestGoTo(target);
                        }

                        return false;
                    }
                } else {
                    e.setAttribute("target", "_blank");
                    e.setAttribute("rel", "noreferrer noopener");
                }
            }
        });

        const removeTargets = ["Citations", "References", "Footnotes", "Notes", "References/External_links"];
        for (removeTarget of removeTargets) {
            const targetSpan = doc.getElementById(removeTarget);
            console.log(targetSpan);
            if (targetSpan) {
                let p = targetSpan;
                while (p && p.tagName != "H2") {
                    p = p.parentElement;
                }

                if (!p) continue;
                

                while (p.nextElementSibling) {
                    p.parentElement.removeChild(p.nextElementSibling);
                }
                p.parentElement.removeChild(p);
            }
        }

        pageElement.innerHTML = "";
        pageElement.appendChild(pageContent);

        if (article != currentArticle) {
            articlePath.push(article);
        }

        currentArticle = article;

        document.getElementById("num-clicks").innerText = `${articlePath.length - 1} Click${articlePath.length == 2 ? "" : "s"}`;

        window.scrollTo(0, 0);

        if (parts.length > 1) {
            let anchor = parts[1];

            let e = document.getElementById(anchor);
            console.log(e);
            window.scrollTo(0, e.offsetTop);
        }
    })
}
const $ = (type, classes = "", content = undefined) => {
    let el = document.createElement(type);
    if (classes.length > 0) {
        for (let claz of classes.split(" ")) {
            el.classList.add(claz);
        }
    }
    if (content) {
        if (type === "img") {
            let data = content.split(" ");
            el.src = data[0];
            el.alt = data[1];
        } else if (typeof (content) === "string") {
            el.textContent = content;
        } else if (typeof (content) === "function") {
            el.innerHTML = content();
        } else if (Array.isArray(content)) {
            for (let child of content) {
                el.append(child);
            }
        }
    }
    return el;
}
const dataCols = {
    "id": 1,
    "name": 2,
    "manacost": 3,
    "cmc": 4,
    "typeline": 5,
    "set-symbol": 6,
    "set": 7,
    "rarity": 8,
    "oracle": 9,
    "power": 10,
    "toughness": 11,
    "loyalty": 12,
    "color_identity": 13,
    "watermark": 15,
    "art": 17,
    "artist": 18,
    "flavour": 19
};
const tsvURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQ5wlrazSE80LIK94JgVbm6h_EvPjwT4nkBQbAiPSJiO6wzY8yVhzkhfA-tETI0zuhHH841f6tQwXJ/pub?gid=50856066&single=true&output=tsv';
let cardDb = {};
fetch(tsvURL)
    .then(x => x.text())
    .then(processTSV);

function applyMTGSymbols(el) {
    el.innerHTML = el.innerHTML.replace(
        /(\{)([wubregcxyz0-9]{1})(\})/gi,
        (s, a, b, c) => `<i class="ms ms-cost ms-shadow ms-${b}"></i>`.toLowerCase()
    ).replace(
        /(\{)(tap)?([tT]?)(\})/gi,
        (s, a, b, c) => `<i class="ms ms-cost ms-shadow ms-tap"></i>`.toLowerCase()
    ).replace(
        /(\{)([wubregcxyz0-9]{1})(\/)([wubregcxyz0-9]{1})(\})/gi,
        (s, a, b, c, d, e) => `<i class="ms ms-cost ms-shadow ms-${b}${d}"></i>`.toLowerCase()
    ).replace(
        /(\{)(art)(\})/gi,
        (s, a, b, c) => `<i class="ms ms-artist-nib"></i>`.toLowerCase()
    );
}

function subCardName(cardEl, name) {
    cardEl.innerHTML = cardEl.innerHTML.replace(/\{\{CARD NAME\}\}/g, name);
}

function processRow(rowValues) {
    let cardData = {};
    for (let dataName in dataCols) {
        if (dataName === `set-symbol` || dataName === `art` || dataName === `watermark`) {
            cardData[dataName] = `//drive.google.com/uc?id=${rowValues[dataCols[dataName]]}`;
        } else {
            cardData[dataName] = rowValues[dataCols[dataName]];
        }
    }
    return cardData;
}

function processTSV(data) {
    let rows = data.split('\n');
    let id = 0;
    for (let i = 2; i < rows.length; i++) {
        let row = rows[i];
        let cardData = processRow(row.split('\t'));
        cardDb[id++] = cardData;
    }
    for (let cardName in cardDb) {
        document.body.append(generateCard(cardDb[cardName]));
    }
}

function getColor(colorData) {
    let color_id = colorData["color_identity"]
    let color = []
    if (color_id.length === 0 || colorData["typeline"].includes("Land"))
        color.push("colorless");
    if (color_id.includes("{W}"))
        color.push("white");
    if (color_id.includes("{U}"))
        color.push("blue");
    if (color_id.includes("{B}"))
        color.push("black");
    if (color_id.includes("{R}"))
        color.push("red");
    if (color_id.includes("{G}"))
        color.push("green");
    if (color.length > 1)
        color.push("gold");
    return color.join(' ');
}

function generateCard(cardData) {
    let color = getColor(cardData)
    let planeswalker = cardData[`loyalty`];

    let name = $(`p`, `card-name`, cardData[`name`])
    let manacost = $(`p`, `manacost`, cardData[`manacost`])
    let nameBar = $(`div`, `bar top`, [name, manacost]);

    let art = $(`img`, ``, cardData.art + ` art`);
    let art_crop = $(`div`, `card-image`, [art])

    let type = $(`div`, `type`, cardData[`typeline`])
    let setSymbol = $(`img`, `set-symbol`, cardData[`set-symbol`] + ` ${cardData[`set`]}`)
    let typeBar = $(`div`, `bar middle`, [type, setSymbol])

    let oracleContent = [];
    if (cardData["watermark"])
        oracleContent.push($(`img`, `watermark`, cardData[`watermark`] + " watermark"));
    let lines = cardData["oracle"].replace(`{{CARD NAME}}`, cardData[`name`]).split(`<br>`);
    for (let line of lines) {
        if (planeswalker) {
            let parts = line.split(`:`);
            if (parts.length == 2) {
                let cost = parts[0].trim();
                if (cost < 0) {
                    oracleContent.push($("span", `loyalty-thing`, [$("i", "ms ms-loyalty-down"), $("span", "", cost)]));
                } else if (cost > 0) {
                    oracleContent.push($("span", `loyalty-thing`, [$("i", "ms ms-loyalty-up"), $("span", "", cost)]));
                } else {
                    oracleContent.push($("span", `loyalty-thing`, [$("i", "ms ms-loyalty-zero"), $("span", "", cost)]));
                }
                oracleContent.push($(`p`, ``, `:`));
                let abilityText = $(`p`, ``, parts[1].trim());
                abilityText.style.fontSize = `calc(var(--ratio) * (9.5 - ${abilityText.textContent.length / 100}))`;
                oracleContent.push(abilityText);
                oracleContent.push($(`hr`));
            }
        } else {
            oracleContent.push($(`p`, ``, () => line));
        }
    }
    // Remove the last final hr on a planeswalker
    if (planeswalker) oracleContent.pop();
    let oracle = $(`div`, `oracle`, oracleContent);

    applyMTGSymbols(oracle);
    subCardName(oracle, cardData["name"])

    let flavour = $(`div`, `flavour`, () => cardData[`flavour`]);
    // Add loyalty if planeswalker, or power and toughness if a creature
    let ptl;
    if (planeswalker) {
        ptl = $(`div`, `loyalty loyalty-thing`, [$("i", "ms ms-loyalty-start loyalty-thing"), $(`span`, ``, cardData[`loyalty`])])
    } else {
        let p = $(`p`, `power`, cardData[`power`]);
        let t = $(`p`, `toughness`, cardData[`toughness`]);
        ptl = $(`div`, `pt`, [p, t])
    }
    let textBox = $(`div`, `card-text`);
    // , [oracle, $(`hr`), flavour, ptl]
    textBox.append(oracle);
    if (cardData[`flavour`]) {
        textBox.append($(`hr`));
        textBox.append(flavour);
    }
    if (cardData[`power`] || cardData[`loyalty`] || cardData[`toughness`]) {
        textBox.append(ptl);
    }
    
    let cardBorder = $(`div`, `border`, [nameBar, art_crop, typeBar, textBox]);

    let ciline1 = $(`div`, `line`, () => `${cardData[`id`]}/280 ${cardData["rarity"]}`)
    let ciline2 = $(`div`, `line`, () => `${cardData[`set`]} &bull; EN {art} ${cardData['artist']}`)
    let collectorInfo = $(`div`, `collector-info`, [ciline1, ciline2])

    let cardEl = $(`div`, `card ${color}${planeswalker ? " planeswalker" : ""}`, [cardBorder, collectorInfo]);

    applyMTGSymbols(cardEl);
    subCardName(cardEl, cardData["name"]);
    cardEl.querySelector(`.oracle`).innerHTML = oracle.innerHTML.replace(/ms-shadow/g, "");
    return cardEl;
}

function generateProxy(cardData) {

    let topbar = $(`div`, `proxy-bar proxy-top`, [$(`p`, `left`, cardData[`name`]), $(`p`, `right`, cardData[`manacost`])])

    let middlebar = $(`div`, `proxy-bar proxy-middle`, [$(`p`, `left`, cardData[`typeline`]), $(`p`, `right`, cardData[`rarity`])])

    let oracle = $(`div`, `proxy-oracle`, cardData[`oracle`].replace(`{{CARD NAME}}`, cardData[`name`]).split(`<br>`).map(line => $(`p`, `proxy-line`, () => line)));

    let ptl;

    if (cardData[`loyalty`]) {
        ptl = $(`div`, `proxy-loyalty`, cardData[`loyalty`]);
    } else if (cardData[`power`]) {
        ptl = $(`div`, `proxy-pt`, `${cardData[`power`]}/${cardData[`toughness`]}`)
    }
    console.log(cardData[`loyalty`], cardData[`power`], ptl)

    let proxy = $(`div`, `proxy`, [topbar, middlebar, oracle])
    if (ptl) proxy.append(ptl);
    return proxy;
}

function toggleProxy() {
    document.querySelectorAll(".card, .proxy").forEach(el => el.remove());
    if (document.body.classList.toggle(`faketime`)) {
        // Make Proxies
        for (let cardID in cardDb) {
            document.body.append(generateProxy(cardDb[cardID]));
        }
    } else {
        // Make Cards
        for (let cardID in cardDb) {
            document.body.append(generateCard(cardDb[cardID]));
        }
    }
}
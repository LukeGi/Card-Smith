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
    for (let i = 2; i < rows.length; i++) {
        let row = rows[i];
        let cardData = processRow(row.split('\t'));
        cardDb[cardData["name"]] = cardData;
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
            let cost = parts[0].trim();
            if (cost < 0) {
                oracleContent.push($("span", `loyalty-thing`, [$("i", "ms ms-loyalty-down"), $("span", "", cost)]));
            } else if (cost > 0) {
                oracleContent.push($("span", `loyalty-thing`, [$("i", "ms ms-loyalty-up"), $("span", "", cost)]));
            } else {
                oracleContent.push($("span", `loyalty-thing`, [$("i", "ms ms-loyalty-zero"), $("span", "", cost)]));
            }
            oracleContent.push($(`p`, ``, `:`));
            oracleContent.push($(`p`, ``, parts[1].trim()));
            oracleContent.push($(`hr`));
        } else {
            oracleContent.push($(`p`, ``, () => line));
        }
    }
    if (planeswalker) oracleContent.pop();
    let oracle = $(`div`, `oracle`, oracleContent);
    applyMTGSymbols(oracle);
    oracle.innerHTML = oracle.innerHTML.replace(/ms-shadow/g, "");

    let flavour = $(`div`, `flavour`, () => cardData["flavour"]);
    let ptl;
    if (planeswalker) {
        ptl = $(`div`, `loyalty loyalty-thing`, [$("i", "ms ms-loyalty-start loyalty-thing"), $(`span`, ``, cardData[`loyalty`])])
    } else {
        let p = $(`p`, `power`, cardData[`power`]);
        let t = $(`p`, `toughness`, cardData[`toughness`]);
        ptl = $(`div`, `pt`, [p, t])
    }
    let textBox = $(`div`, `card-text`, [oracle, $(`hr`), flavour, ptl]);

    let cardBorder = $(`div`, `border`, [nameBar, art_crop, typeBar, textBox]);

    let ciline1 = $(`div`, `line`, () => `${cardData[`id`]}/280 ${cardData["rarity"]}`)
    let ciline2 = $(`div`, `line`, () => `${cardData[`set`]} &bull; EN {art} ${cardData['artist']}`)
    let collectorInfo = $(`div`, `collector-info`, [ciline1, ciline2])

    let cardEl = $(`div`, `card ${color}${planeswalker ? " planeswalker" : ""}`, [cardBorder, collectorInfo]);

    applyMTGSymbols(cardEl);
    let remove = { ".pt": [".pt"], ".flavour": ["hr", ".flavour"] };
    for (let key in remove) {
        let x = cardEl.querySelector(key);
        if (x && x.textContent.length === 0) {
            for (let value of remove[key]) {
                cardEl.querySelector(value).remove();
            }
        }
    }
    return cardEl;
}

function makeCard(ev) {
    ev.preventDefault();
    let input = ev.srcElement[0];
    let cardName = input.value;
    input.value = "";
    let cardData = cardDb[cardName];
    let card = generateCard(cardData);
    document.body.append(card);
}
// document.querySelector('form#cardForm').addEventListener("submit", makeCard);
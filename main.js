const cheerio = require('cheerio')
const request = require('request-promise-native')
const fs = require('fs')
const queue = require('./qt')
let qt = new queue({ start: true });
const fluiDB = require('fluidb')
const songs = new fluiDB()
const config = new fluiDB('config')


// Cookie Builder
const makeCookie = (args) => Object.entries(args).map((item) => item.join("=")).join("; ");

const ourCookie = makeCookie({
    "PHPSESSID": '0hhf4busuk052666o6oimcao23',
    "only-ranked": "checked",
    "only-verified": "checked",
    "ranked": 1,
    "cat": 3,
    "sort": "desc",
    "star": config.starMax,
    "star1": config.starMin
})

const firstPage = async () => {
    const $ = cheerio.load(await request({
        uri: `https://scoresaber.com/?page=1`,
        headers: {
            "Cookie": ourCookie
        }
    }))
    console.log('Got first page!')
    console.log(parseInt($('.pagination-link').last().text()))
    getSongs(0, parseInt($('.pagination-link').last().text()))
}

const getSongs = (page, lastPage) => {
    if (page <= lastPage) {
        qt.add(async () => {
            const $ = cheerio.load(await request({
                uri: `https://scoresaber.com/?page=${page}`,
                headers: {
                    "Cookie": ourCookie
                }
            }));
            console.log(`Got Page ${page}`)
            $('a[href^="/leaderboard/"]')
                .each((idx, link) => {
                    let uid = link.attribs.href.replace('/leaderboard/', '')
                    songs[uid] = { 'uid': uid }
                })
        })
        getSongs(++page, lastPage);
    } else {
        console.log("Queued Pages");
    }
}
const getSongInfo = async () => {
    Object.keys(songs).forEach(async uid => {
        qt.add(async () => {
            const $ = cheerio.load(await request(`https://scoresaber.com/leaderboard/${uid}`))
            console.log(`Got Song ${uid}`)
            songs[uid].hms = parseFloat($('.ppValue').eq(0).text())
            songs[uid].stars = (parseFloat($('.column').eq(2).text().match(/.*Star Difficulty: (.*)★.*/)[1]))
            songs[uid].pp = parseFloat((songs[uid].stars * 42.12).toFixed(2));
            songs[uid].name = $('.title.is-5').text().trim();
            songs[uid].difficulty = $('.is-active').text();
        })
    })
    console.log(`Queued Songs`);
}

(async () => {
    await firstPage()
    qt.add(getSongInfo)
})();


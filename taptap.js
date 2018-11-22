const request = require('superagent'); //是nodejs里一个非常方便的客户端请求代理模块
const cheerio = require('cheerio'); //为服务器特别定制的，快速、灵活、实施的jQuery核心实现
const fs = require('fs-extra'); //丰富了fs模块，同时支持async/await
const csv = require('fast-csv');
const _ = require('lodash');
const moment = require('moment');

let BASE_URL = 'https://www.taptap.com/app/';
const BASE_FILE = 'taptap.csv';
const NEW_FILE = `taptap_${moment().format('YYYYMMDD')}.csv`;
const config = fs.readJsonSync('config.json');
const LIMIT = config.total;

let ws, csvStream;
if (config.startId === 1) {
    ws = fs.createWriteStream(BASE_FILE, { flags: 'w', encoding: 'utf8' });
    csvStream = csv.createWriteStream({ headers: true });
} else {
    ws = fs.createWriteStream(BASE_FILE, { flags: 'a+', encoding: 'utf8' });
    ws.write('\n')
    csvStream = csv.createWriteStream({ headers: false });
}
csvStream.pipe(ws);

ws.on('open', function () {
    console.log('write start');
});
ws.on('finish', function () {
    fs.copyFileSync(BASE_FILE, NEW_FILE);
    console.log('write over');
});
// ws.on('error', function (err) {
//     console.log(err.stack);
//     throw err;
//     // ws.end();
//     // csvStream.end();
// });


// 开始爬取下一个
function next(id, total) {
    id++;
    fs.writeJsonSync('config.json', { startId: id, total: total })
    return main(id);
}

async function main(id) {

    if (id > LIMIT) {
        // 标记文件末尾
        // ws.end();
        csvStream.end();
        return;
    }

    const newUrl = BASE_URL + id;
    console.log('id = ' + id);
    console.log('newUrl = ' + newUrl);
    let data = {
        id: 0,
        name: '',
        score: '',
        publisher: '',
        developer: '',
        install: '',
        follow: '',
        order: '',
        topic: '',
        review: '',
        recommend: '',
        size: '',
        softwareVersion: '',
        datePublished: '',
    }

    let $;

    try {
        const res = await request.get(newUrl);
        $ = cheerio.load(res.text);
    } catch (error) {
        // console.log('error: ' + error.stack);
        next(id, config.total);
        return;
    }

    data.id = id;
    // 获取游戏名字
    const name = $('h1').text();
    data.name = _.trim(name);
    // 获取评分
    data.score = $('.app-rating-score').text();
    // 获取开发商和发行商
    $('.header-text-author').each(function (i, elem) {
        const isPublisher = $(this).find('a').attr('itemprop') === 'publisher' ? true : false;
        // console.log('isPublisher = ' + isPublisher);
        if (isPublisher) {
            data.publisher = $('span', this).last().text();
        } else {
            data.developer = $('span', this).last().text();
        }
    });
    // 获取关注、安装、预约
    $('p.description').children().each(function (i, elem) {
        const text = $(this).text();
        if (text.match('关注')) {
            data.follow = parseInt(text);
        }
        if (text.match('安装')) {
            data.install = parseInt(text);
        }
        if (text.match('预约')) {
            data.order = parseInt(text);
        }
    });
    // 获取评论和论坛
    $('.main-header-tab').find('a').each(function (i, elem) {
        const type = $(this).attr('data-taptap-tab');
        if (type == 'review') {
            data.review = $(this).find('small').text();
        }
        if (type == 'topic') {
            data.topic = $(this).find('small').text();
        }
    })
    // 获取编辑推荐
    const rec = $('.main-header-rec').find('span').text();
    data.recommend = rec.match('编辑推荐') ? 'yes' : '';
    // 获取文件大小，当前版本，更新时间
    $('.main-body-info').find('.info-item-title').each(function(i, elem) {
        const title = elem.firstChild ? elem.firstChild.data : '';
        const value = elem.next.next.firstChild ? elem.next.next.firstChild.data : '';
        if (title.match('文件大小')) {
            data.size = value;
        }
        if (title.match('更新时间')) {
            data.datePublished = value;
        }
        if (title.match('当前版本')) {
            data.softwareVersion = value;
        }
    });
    // 写入数据
    // ws.write(JSON.stringify(data), 'UTF8');
    csvStream.write(data);
    // 递归下一个
    next(id, config.total);
}

main(config.startId);

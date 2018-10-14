const request = require('superagent'); //是nodejs里一个非常方便的客户端请求代理模块
const cheerio = require('cheerio'); //为服务器特别定制的，快速、灵活、实施的jQuery核心实现
const fs = require('fs-extra'); //丰富了fs模块，同时支持async/await
const csv = require('fast-csv');
const _ = require('lodash');
const moment = require('moment');

let url = 'https://www.taptap.com/app/';

// const LIMIT = 150000;
const LIMIT = 15;
const fileName = 'taptap_' + moment().format('YYYYMMDD') + '.csv';

var csvStream = csv.createWriteStream({ headers: true });
var ws = fs.createWriteStream(fileName);
csvStream.pipe(ws);

ws.on('open', function () {
    console.log('write start');
});
ws.on('finish', function () {
    console.log('write over');
});
ws.on('error', function (err) {
    console.log(err.stack);
    throw err;
    // ws.end();
    // csvStream.end();
});

async function main(id) {

    if (id > LIMIT) {
        // 标记文件末尾
        // ws.end();
        csvStream.end();
        return;
    }

    const newUrl = url + id;
    console.log('id = ' + id);
    console.log('newUrl = ' + newUrl);
    const data = {
        id: 0,
        name: '',
        score: '',
        publisher: '',
        developer: '',
        follow: '',
        topic: '',
        review: '',
    }

    let $
    try {
        const res = await request.get(newUrl);
        $ = cheerio.load(res.text);
    } catch (error) {
        // console.log('error: ' + error.stack);
        id++;
        main(id);
        throw error;
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
    // 写入数据
    // ws.write(JSON.stringify(data), 'UTF8');
    csvStream.write(data);

    id++;
    main(id);
}

main(1);
 
const request = require('superagent') //是nodejs里一个非常方便的客户端请求代理模块
const cheerio = require('cheerio') //为服务器特别定制的，快速、灵活、实施的jQuery核心实现
const fs = require('fs-extra') //丰富了fs模块，同时支持async/await

let url = 'https://www.taptap.com/app/10497';

const LIMIT = 20;

const ws = fs.createWriteStream('data.json', { encoding: 'utf8' })
ws.on('open', function () {
    console.log('write start');
});
ws.on('finish', function () {
    console.log('write over');
});
ws.on('error', function (err) {
    console.log(err.stack);
    ws.end();
});

async function main(id) {

    if (id >= LIMIT) {
        // 标记文件末尾
        ws.end();
        return;
    }

    const data = {}
    const res = await request.get(url);
    const $ = cheerio.load(res.text);
    // $('.main-header-text').each(function(i, elem) {
    //     // const href = $(this).find('a').attr('href')
    //     // const title = $(this).find('p').text()
    //     // console.log(title, href) 
    //     console.log(i, elem); 
    // })

    data.id = id;
    // 获取游戏名字
    data.name = $('h1').text();
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
        console.log(i)
        console.log($(this).text());
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
    // console.log($('p.description').length);
    // 
    $('.main-header-tab').find('a').each(function (i, elem) {
        const type = $(this).attr('data-taptap-tab');
        if (type == 'review') {
            data.review = $(this).find('small').text();
        }
        if (type == 'topic') {
            data.topic = $(this).find('small').text();
        }
    })
    console.log(id);
    // 使用 utf8 编码写入数据
    ws.write(JSON.stringify(data), 'UTF8');

    id++;
    main(id);
}

main(0);


// request
//   .get(url)
//   .then(function (res) {
//     console.log(res.text)  //获取打印出当前页的html
//   })  
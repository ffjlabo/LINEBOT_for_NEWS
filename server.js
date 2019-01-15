'use strict';

const express = require('express');
const line = require('@line/bot-sdk');
const request = require('request');
const feedparser = require('feedparser');
const dotenv = require('dotenv');

const PORT = process.env.PORT || 3000;

dotenv.config();
const config = {
    channelSecret: process.env['CHANNEL_SECRET'],
    channelAccessToken: process.env['CHANNEL_ACCESS_TOKEN']
};

const app = express();
const client = new line.Client(config);

app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => {
          console.log(result);
        res.json(result);
      });
});

function handleEvent(event) {
    if (event.type !== 'message') {
        return Promise.resolve(null);
    }

    if (event.message.text === 'ニュース' || event.message.text === 'news') {
        const url = 'https://news.yahoo.co.jp/pickup/computer/rss.xml';

        return getRssData(url).then((values) => {
            let message = '';
            values.forEach(element => {
                message += `${element['title']}\n${element['link']}\n`;
            });
            console.log(message);

            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: message
            });
            
        }).catch((err) => {
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: err
            });
        });
    } else {
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: event.message.text
        });
    }
}

function getRssData(url) {
    return new Promise((resolve, reject) => {
        let req = request(url);
        let parser = new feedparser();
        let rss = [];
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.on('response', (res) => {
            if (res.statusCode != 200) {
                return req.emit('error', new Error('Bad status code'));
            }
            req.pipe(parser);
        });

        parser.on('error', (err) => {
            reject(err);
        });

        parser.on('readable', () => {
            let item;
            while ( item = parser.read() ) {
                rss.push({
                    title: item['title'],
                    link: item['link']
                });
            }
        });

        parser.on('end', () => {
            resolve(rss);
        });
    });
}

app.listen(PORT);
console.log(`Server running at ${PORT}`);
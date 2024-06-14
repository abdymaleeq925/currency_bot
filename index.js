const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const app = express();

const BOT_TOKEN = '7292810376:AAGpYvRYLkPxesUk5mdloJ1NXT8s3vssjYw';
const PORT = process.env.PORT || 3000;
const bot = new Telegraf(BOT_TOKEN);

const baseCurrencies = ['AUD', 'INR', 'EUR', 'KGS', 'KRW', 'RUB'];
const exchangeState = {};

const getSingleCurrency = async (baseCurrency, targetCurrency, amount) => {
    try {
        const response = await axios.get('https://api.getgeoapi.com/v2/currency/convert', {
            params: {
                'api_key': '31cf9d429e4729bdab44377e41948919d5494064',
                'from': baseCurrency,
                'to': targetCurrency,
                'amount' : amount
            }
        });
        return response.data.rates[targetCurrency]
    } catch (err) {
        console.log(err)
    }
}

bot.start((ctx) => ctx.reply('Hi, how can I assist you?', Markup.keyboard(['Exchange rates'])));

bot.hears('Exchange rates', (ctx) => {
    const buttons = baseCurrencies.map(curr => [Markup.button.callback(curr, `base_${curr}`)]);
    ctx.reply('Choose currency you want to sell', Markup.inlineKeyboard(buttons))
});

bot.hears('Generate QR-Code', (ctx) => {
    ctx.reply('Send the link you want to generate');
});

bot.action(/base_(.+)/, async (ctx) => {
    const baseCurrency = ctx.match[1];
    const buttons = baseCurrencies.map(curr => [Markup.button.callback(curr, `target_${baseCurrency}_${curr}`)]);
    exchangeState[ctx.from.id] = {baseCurrency};
    ctx.reply('Choose currency you want to buy', Markup.inlineKeyboard(buttons));
});
bot.action(/target_(.+)_(.+)/, async (ctx) => {
    const targetCurrency = ctx.match[2];
    exchangeState[ctx.from.id] = {...exchangeState[ctx.from.id], targetCurrency};
    ctx.reply('How much you want to sell?');
});
bot.on('text', async(ctx) => {
    const text = ctx.message.text;
    const amount = parseFloat(text);
    if(exchangeState[ctx.from.id] && exchangeState[ctx.from.id].targetCurrency) {
        if(!isNaN(amount)) {
            const {baseCurrency, targetCurrency} = exchangeState[ctx.from.id];
            const currencyInfo = await getSingleCurrency(baseCurrency, targetCurrency, amount);
            if (currencyInfo) {
                    const responseMessage = `Your exchange from ${amount} ${baseCurrency} to ${targetCurrency} : ${Number(currencyInfo?.rate_for_amount).toFixed(2)} ${targetCurrency}\n`;
                    ctx.reply(responseMessage);
                } else {
                    ctx.reply('Failed to load info. I am sorry, please try later!')
                }
        } else {
            ctx.reply('Incorrect input. Please enter amount in digits!');
        }
    }
    
});

bot.launch();

app.listen(PORT, () => {
    console.log('Server is running')
})
const playwright = require('playwright')
const formData = require('form-data')
const Mailgun = require('mailgun.js')
// const secrets = require('./secrets.json')

const mailgun = new Mailgun(formData)
const DOMAIN = 'mg.barbalex.ch'
const key = process.env.MAILGUN_API_KEY
// const key = secrets.MAILGUN_API_KEY
const client = mailgun.client({
  username: 'api',
  key,
  url: 'https://api.eu.mailgun.net',
})

const url =
  'https://www.zoo.ch/de/erlebnisse-im-zoo/erlebnisse/nachtwandeln/nachtwandeln-lewa'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const run = async () => {
  const browser = await playwright.chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  // visit the page
  await page.goto(url)
  // ensure all events are listed
  let myError
  while (!myError) {
    try {
      await page.click('text=MEHR ANZEIGEN')
    } catch (error) {
      myError = error
    }
    await sleep(2000)
  }
  // find events
  const itemsOnPage = await page.$$('.grid__item .teaser--event__info')

  // build items
  let myItems = []
  let septemberItemsLength = 0

  for (const item of itemsOnPage) {
    const myItem = {}
    const date = await (await item.$('.teaser--event__date')).innerText()
    if (date.includes('9.2022')) septemberItemsLength++
    myItem.date = date
    myItem.text = await (
      await item.$('.teaser--event__text > .mrgt0')
    ).innerText()
    myItem.registrations = await (await item.$('.registrations')).innerText()
    myItems.push(myItem)
  }

  // build html
  let html = `<p>${septemberItemsLength} im September (<span style="font-weight: bold;">fett hervorgehoben</span>)</p><table style="border-collapse: collapse;"><thead><tr><th style="border: 1px solid #999; padding: 0.5rem; text-align: left;">Datum</th><th style="border: 1px solid #999; padding: 0.5rem; text-align: left;">Anlass</th><th style="border: 1px solid #999; padding: 0.5rem; text-align: left;">Registration</th></tr></thead><tbody>`
  for (const item of myItems) {
    html =
      html +
      `<tr ${
        item.date.includes('9.2022') && 'style="font-weight: bold;"'
      }><td style="border: 1px solid #999; padding: 0.5rem; text-align: left;">${
        item.date
      }</td><td style="border: 1px solid #999; padding: 0.5rem; text-align: left;">${
        item.text
      }</td><td style="border: 1px solid #999; padding: 0.5rem; text-align: left;">${
        item.registrations
      }</td></tr>`
  }
  if (myItems.length === 0)
    html =
      html +
      `<tr><td style="border: 1px solid #999; padding: 0.5rem; text-align: left;">--</td><td style="border: 1px solid #999; padding: 0.5rem; text-align: left;">keine Anlässe</td><td style="border: 1px solid #999; padding: 0.5rem; text-align: left;">--</td></tr>`
  html =
    html +
    '</tbody></table><br/><a href="https://www.zoo.ch/de/erlebnisse-im-zoo/erlebnisse/nachtwandeln/nachtwandeln-lewa">Link zur Webseite</a>'

  // console.log('html:', html)

  // send emails
  const messageData = {
    from: 'Nachtwandel-Bot <alex@barbalex.ch>',
    to: 'barbara.barbalex@gmail.com, alex.barbalex@gmail.com',
    subject: `${septemberItemsLength ?? 0} Nachtwandel-Anlässe im September`,
    html,
  }
  client.messages
    .create(DOMAIN, messageData)
    .then((res) => {
      console.log(res)
    })
    .catch((err) => {
      console.error(err)
    })
  await browser.close()
}
run()

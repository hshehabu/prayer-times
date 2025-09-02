require("dotenv").config();
const { Telegraf, Scenes, session } = require("telegraf");
const axios = require("axios");
const commands = require("./commands");
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const http = require("http");

bot.telegram.setMyCommands(commands);
bot.use(session());

async function getPrayerTimes(city) {
  try {
    const response = await axios.get(`https://muslimsalat.com/${city}.json`);

    const prayerTimes = extractPrayerTimes(response.data);

    return prayerTimes;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

function extractPrayerTimes(data) {
  const prayerTimes = data.items.map((item) => ({
    date: item.date_for,
    fajr: item.fajr,
    shurooq: item.shurooq,
    dhuhr: item.dhuhr,
    asr: item.asr,
    maghrib: item.maghrib,
    isha: item.isha,
  }));

  return prayerTimes;
}

async function getCalculationMethod(city) {
  try {
    const response = await axios.get(`https://muslimsalat.com/${city}.json`);
    const calculationMethod = response.data.prayer_method_name;

    return calculationMethod;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
async function getCity(prayerCity) {
  try {
    const response = await axios.get(
      `https://muslimsalat.com/${prayerCity}.json`
    );
    const thePrayerCity = response.data.city;

    return thePrayerCity;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

const prayerWizard = new Scenes.WizardScene(
  "prayer_wizard",
  async (ctx) => {
    await ctx.reply("Please enter the name of your city");
    ctx.wizard.next();
  },
  async (ctx) => {
    const city = ctx.message.text;

    try {
      await ctx.sendChatAction("typing");
      const prayerTimes = await getPrayerTimes(city);
      const theCity = await getCity(city);
      const calculationMethod = await getCalculationMethod(city);

      if (prayerTimes.length === 0) {
        ctx.reply(
          "Sorry, no prayer times found for the provided city. Please check the city name and try again."
        );
      } else {
        const message = `
                    Based on :<b>${calculationMethod}</b> 

<b>City:</b> ${theCity}

<b>Date:</b> ${prayerTimes[0].date}

<b>Fajr:</b> 🌙 ${prayerTimes[0].fajr}
   
<b>Shurooq:</b> ☀️ ${prayerTimes[0].shurooq}
   
<b>Dhuhr:</b> ☀️ ${prayerTimes[0].dhuhr}
   
<b>Asr:</b> 🌞 ${prayerTimes[0].asr}
   
<b>Maghrib:</b> 🌅 ${prayerTimes[0].maghrib}
   
<b>Isha:</b> 🌙 ${prayerTimes[0].isha}
                `;
        ctx.replyWithHTML(message);
      }

      ctx.scene.leave();
    } catch (error) {
      ctx.reply("An error occurred. Please try again or check the city name.");
      console.log(error);
      ctx.scene.leave();
    }
  }
);

const stage = new Scenes.Stage([prayerWizard]);
bot.use(stage.middleware());

bot.command("start", (ctx) => {
  ctx.reply(
    "Welcome! I can help you find prayer times. Just type /prayertime to get started."
  );
});

bot.command("prayertime", (ctx) => {
  ctx.scene.enter("prayer_wizard");
});

bot.on("text", (ctx) => {
  // Only handle text messages that are not part of a scene
  if (!ctx.scene || !ctx.scene.current) {
    ctx.reply(
      "I'm sorry, I didn't understand that. To get prayer times, type /prayertime."
    );
  }
});

bot.launch();

const webhookPath = "/webhook";
http.createServer(bot.webhookCallback(webhookPath)).listen(3000, () => {
  console.log(
    `Webhook server is listening on port 3000 for path ${webhookPath}`
  );
});
bot.telegram.setWebhook("https://prayer-times-gilt.vercel.app");

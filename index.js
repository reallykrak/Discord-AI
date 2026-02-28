const { Client, GatewayIntentBits } = require("discord.js");
const fetch = require("node-fetch");

const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready",()=>{
  console.log("Bot aktif:",client.user.tag);
});

client.on("messageCreate", async msg=>{

if(msg.author.bot) return;

if(!msg.content.startsWith("!ai")) return;

const soru = msg.content.slice(3);

if(!soru) return msg.reply("Soru yaz.");

msg.channel.sendTyping();

try{

const res = await fetch(`https://api.affiliateplus.xyz/api/chatbot?message=${encodeURIComponent(soru)}&owner=AI&botname=Bot`);

const data = await res.json();

msg.reply(data.message);

}catch(e){
console.log(e);
msg.reply("AI cevap veremedi.");
}

});

client.login("");

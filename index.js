const { 
    Client, GatewayIntentBits, REST, Routes,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits
} = require('discord.js');

const Hercai = require("hercai"); // ✅ DOĞRU IMPORT
const herc = new Hercai();        // ✅ DOĞRU INIT

const activeChats = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = "BOT_TOKEN";
const CLIENT_ID = "CLIENT_ID";

const commands = [
    new SlashCommandBuilder().setName('yardım').setDescription('Menüyü açar'),
    new SlashCommandBuilder().setName('ai').setDescription('AI menüsü'),
    new SlashCommandBuilder().setName('ai-sohbet')
        .setDescription('AI ile konuş')
        .addStringOption(o=>o.setName('mesaj').setDescription('mesaj').setRequired(true)),
    new SlashCommandBuilder().setName('ciz')
        .setDescription('Resim çizdir')
        .addStringOption(o=>o.setName('tanim').setDescription('tanım').setRequired(true))
].map(c=>c.toJSON());

client.once("ready", async ()=>{
    console.log(client.user.tag+" aktif");

    const rest = new REST({version:"10"}).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commands});
});

client.on("interactionCreate", async interaction=>{

if(!interaction.isChatInputCommand()) return;

if(interaction.commandName==="yardım"){
    return interaction.reply("Komutlar:\n/ai\n/ai-sohbet\n/ciz");
}

if(interaction.commandName==="ai"){
    activeChats.set(interaction.user.id,true);
    return interaction.reply("Sohbet başlatıldı. /ai-sohbet kullan.");
}

if(interaction.commandName==="ai-sohbet"){

    if(!activeChats.has(interaction.user.id))
        return interaction.reply({content:"Önce /ai yaz",ephemeral:true});

    const mesaj = interaction.options.getString("mesaj");
    await interaction.deferReply();

    try{
        const res = await herc.question({
            model:"v3",
            content:mesaj
        });

        interaction.editReply(res.reply);
    }
    catch(e){
        console.log(e);
        interaction.editReply("AI hata verdi");
    }
}

if(interaction.commandName==="ciz"){

    const prompt = interaction.options.getString("tanim");
    await interaction.deferReply();

    try{
        const img = await herc.drawImage({
            model:"v3",
            prompt:prompt
        });

        const embed = new EmbedBuilder()
        .setTitle("Oluşturuldu")
        .setImage(img.url);

        interaction.editReply({embeds:[embed]});
    }
    catch(e){
        console.log(e);
        interaction.editReply("Resim oluşturulamadı");
    }
}

});

client.login(TOKEN);

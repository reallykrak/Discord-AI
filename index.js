const { 
    Client, GatewayIntentBits, REST, Routes, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits 
} = require('discord.js');
const { Hercai } = require('hercai'); 

// HATA BURADAN KAYNAKLANIYORDU, İÇİNE {} EKLENEREK ÇÖZÜLDÜ
const herc = new Hercai({}); 

// Kullanıcıların AI sohbet geçmişlerini tutacağımız geçici bellek
const activeChats = new Map();

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

const TOKEN = "BURAYA_BOT_TOKENINI_YAZ";
const CLIENT_ID = "BURAYA_BOT_ID_YAZ"; // Botun Application ID'si

// --- KOMUT TANIMLAMALARI ---
const commands = [
    new SlashCommandBuilder().setName('yardım').setDescription('Profesyonel bot menüsünü açar.'),
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı sunucudan yasaklar.')
        .addUserOption(option => option.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Ban sebebi')),
    new SlashCommandBuilder().setName('ai').setDescription('Yapay zeka asistanı ile etkileşime geçin.'),
    new SlashCommandBuilder().setName('ai-sohbet').setDescription('Yapay zeka ile konuşun.')
        .addStringOption(option => option.setName('mesaj').setDescription('Sormak istediğiniz şey').setRequired(true)),
    new SlashCommandBuilder().setName('ciz').setDescription('Yapay zekaya profesyonel bir görsel çizdirin.')
        .addStringOption(option => option.setName('tanim').setDescription('Resmin İngilizce veya Türkçe tanımı').setRequired(true))
].map(command => command.toJSON());

// --- BOT HAZIR OLDUĞUNDA ---
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} aktif edildi!`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('Slash komutları yükleniyor...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Komutlar başarıyla yüklendi!');
    } catch (error) {
        console.error("Komutlar yüklenirken hata oluştu:", error);
    }
});

// --- KOMUT VE BUTON ETKİLEŞİMLERİ ---
client.on('interactionCreate', async interaction => {
    
    // --- 1. BUTON ETKİLEŞİMLERİ ---
    if (interaction.isButton()) {
        const [action, userId, targetId] = interaction.customId.split('_');

        // Sadece komutu kullanan kişi butona basabilir
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: "Bu butonu sadece komutu yazan kişi kullanabilir!", ephemeral: true });
        }

        // BAN ONAY SISTEMI
        if (action === 'onaylaban') {
            try {
                const targetUser = await interaction.guild.members.fetch(targetId);
                await targetUser.ban({ reason: "Moderasyon Kararı" });
                
                const embed = new EmbedBuilder()
                    .setTitle("🔨 İnfaz Gerçekleşti!")
                    .setDescription(`<@${targetId}> başarıyla sunucudan silindi.`)
                    .setImage("https://cdn.discordapp.com/attachments/964902901451489320/1082342926333522040/thanos-vs-thor-infinity-war_2.gif")
                    .setColor("DarkButNotBlack");

                await interaction.update({ embeds: [embed], components: [] });
            } catch (err) {
                await interaction.update({ content: "❌ Bu kullanıcıyı banlamak için yetkim yok veya benden daha üst bir rolde.", embeds: [], components: [] });
            }
        } 
        
        if (action === 'iptalban') {
            await interaction.update({ content: "❌ Ban işlemi iptal edildi.", embeds: [], components: [] });
        }

        // YENİ SOHBET BUTONU
        if (action === 'yenisohbet') {
            activeChats.set(userId, true); // Sohbet durumunu aktif et
            await interaction.update({ 
                content: "✅ **Yeni sohbet başlatıldı!** Artık `/ai-sohbet <mesajınız>` komutuyla benimle konuşabilirsiniz. Link gönderirseniz analiz edebilirim.", 
                components: [] 
            });
        }
        return;
    }

    // --- 2. SLASH KOMUTLARI ---
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    // YARDIM MENÜSÜ
    if (commandName === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle("🛡️ Profesyonel Bot Yönetim Paneli")
            .setColor("Blurple")
            .setDescription("Sistem komutları aşağıda listelenmiştir:")
            .addFields(
                { name: '🤖 AI Komutları', value: '`/ai` - Sohbet menüsünü açar\n`/ai-sohbet` - AI ile konuşursunuz\n`/ciz` - Görsel oluşturur', inline: false },
                { name: '⚖️ Moderasyon', value: '`/ban` - Onaylı ban sistemi', inline: false }
            )
            .setFooter({ text: "Gelişmiş Node.js Altyapısı" });
        await interaction.reply({ embeds: [embed] });
    }

    // ONAYLI BAN SİSTEMİ
    if (commandName === 'ban') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: "Bu komut için 'Üyeleri Yasakla' yetkisine sahip olmalısın.", ephemeral: true });
        }

        const hedef = interaction.options.getUser('kullanici');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`onaylaban_${interaction.user.id}_${hedef.id}`)
                .setLabel('Evet, Banla')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`iptalban_${interaction.user.id}_${hedef.id}`)
                .setLabel('Hayır, İptal')
                .setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
            .setTitle("⚠️ Kritik İşlem Onayı")
            .setDescription(`${hedef} adlı kullanıcıyı banlamak istediğinize emin misiniz?`)
            .setColor("Yellow");

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // AI ANA MENÜSÜ
    if (commandName === 'ai') {
        const hasChat = activeChats.has(interaction.user.id);
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`yenisohbet_${interaction.user.id}_x`)
                .setLabel('Yeni Sohbet Oluştur')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ 
            content: hasChat ? "Mevcut bir sohbetiniz var. `/ai-sohbet` ile devam edebilir veya butona basarak sıfırlayabilirsiniz." : "Merhaba! Benimle konuşmak için lütfen yeni bir sohbet oluşturun.", 
            components: [row] 
        });
    }

    // AI SOHBET & LİNK ANALİZİ
    if (commandName === 'ai-sohbet') {
        if (!activeChats.has(interaction.user.id)) {
            return interaction.reply({ content: "Önce `/ai` komutunu kullanıp yeni bir sohbet başlatmalısın!", ephemeral: true });
        }

        const mesaj = interaction.options.getString('mesaj');
        await interaction.deferReply(); 

        let prompt = mesaj;
        if (mesaj.includes("http://") || mesaj.includes("https://")) {
            prompt = `Şu linkteki olası içerik veya genel konu hakkında profesyonel bir analiz yap: ${mesaj}`;
        }

        try {
            const response = await herc.question({ model: "v3", content: prompt });
            await interaction.editReply(`**Sen:** ${mesaj}\n\n**🤖 AI:** ${response.reply}`);
        } catch (error) {
            console.error("Yapay zeka hatası:", error);
            await interaction.editReply("Cevap üretilirken bir hata oluştu, sağlayıcılar şu an yoğun olabilir.");
        }
    }

    // AI RESİM ÇİZİMİ
    if (commandName === 'ciz') {
        const tanim = interaction.options.getString('tanim');
        await interaction.deferReply();

        try {
            const response = await herc.drawImage({ model: "v3", prompt: tanim });
            const embed = new EmbedBuilder()
                .setTitle("🎨 Eseriniz Hazır!")
                .setImage(response.url)
                .setColor("Random")
                .setFooter({ text: `Çizimi isteyen: ${interaction.user.tag}` });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Resim çizim hatası:", error);
            await interaction.editReply("Resim çizilirken bir sorun oluştu.");
        }
    }
});

client.login(TOKEN);
                

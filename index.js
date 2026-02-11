const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const REQUEST_CHANNEL_ID = '807907723362041870';

const EMOJI_TO_ARTIST = {
  '🙂': '원준',
  '👽': '강준호',
};

const requestRecords = {
  '원준': [],
  '강준호': [],
};

const savedRequestIds = new Set();

client.once(Events.ClientReady, (c) => {
  console.log(`로그인 완료: ${c.user.tag}`);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    console.log('리액션 이벤트 들어옴');

    if (user.bot) {
      console.log('봇 리액션이라 무시');
      return;
    }

    if (reaction.partial) {
      reaction = await reaction.fetch();
    }

    const emoji = reaction.emoji.name;
    console.log('이모지:', emoji);

    const artist = EMOJI_TO_ARTIST[emoji];
    if (!artist) {
      console.log('매핑되지 않은 이모지, 무시');
      return;
    }

    const message = await reaction.message.fetch();
    const channel = message.channel;

    console.log('채널 ID:', channel.id, '/ 설정 ID:', REQUEST_CHANNEL_ID);

    if (channel.id !== REQUEST_CHANNEL_ID) {
      console.log('다른 채널, 무시');
      return;
    }

    const key = `${artist}:${message.id}`;
    if (savedRequestIds.has(key)) {
      console.log('이미 저장된 신청, 무시');
      return;
    }
    savedRequestIds.add(key);

    const content = message.content || '(내용 없음)';
    const requester =
      message.member?.displayName || message.author.username;
    const link = message.url;

    requestRecords[artist].push({
      messageId: message.id,
      requester,
      content,
      link,
    });

    console.log(`[${artist}] 신청 기록 추가: ${requester} - ${content}`);
  } catch (err) {
    console.error('리액션 처리 중 에러:', err);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === '!신청기록') {
    let lines = [];

    for (const artist of ['원준', '강준호']) {
      const records = requestRecords[artist] || [];
      if (records.length === 0) {
        lines.push(`**[${artist}]**\n(신청 없음)\n`);
        continue;
      }

      lines.push(`**[${artist}] 신청 목록**`);
      records.forEach((r, i) => {
        lines.push(
          `${i + 1}. **${r.requester}**: ${r.content}\n↪ ${r.link}`
        );
      });
      lines.push('');
    }

    let text = lines.join('\n');

    if (text.length > 1900) {
      text = text.slice(0, 1900) + '\n\n(너무 많아서 중간에 잘렸어요)';
    }

    await message.channel.send(text);
  }
});

client.login(process.env.TOKEN);


const Discord = require('discord.js');
require('dotenv').config();

const client = new Discord.Client();
const prefix = "!";

const meetingLinks = {
  happyhour: ["https://kahoot.it/","https://icebreaker.video/"],
  brainstorming: ["https://miro.com/", "https://figma.com"],
  study: ["https://quizlet.com", "https://docs.google.com/", "https://evernote.com/"]
}

client.on("message", function(message) {
  if(message.author.bot) return;
  if(!message.content.startsWith(prefix)) return;

  const commandBody = message.content.slice(prefix.length);
  const args = commandBody.split(' ');
  const command = args.shift().toLowerCase();

  if(command === "resources"){
    const meetingType = args[0];
    const links = meetingLinks[meetingType];
    links.forEach(element => {
      message.reply(element);
    });
  }
});

client.login(process.env.BOT_TOKEN);

const Discord = require('discord.js');
const GoogleSearchAPI = require('google-search-results-nodejs');
const search = new GoogleSearchAPI.GoogleSearch();
const fetch = require("node-fetch");
const client = new Discord.Client();
const Profile = require('./models/Profile');
const {connect} = require('mongoose');
require('dotenv').config();

const prefix = "!";
let interests = [];
let freeTime = [];

// Hard-coded meeting links for specific meeting types
// const meetingLinks = {
//   happyhour: ["https://kahoot.it/","https://icebreaker.video/"],
//   brainstorming: ["https://miro.com/", "https://figma.com"],
//   study: ["https://quizlet.com", "https://docs.google.com/", "https://evernote.com/"]
// }

const commands = ["resources", "commands", "profile", "motivateme"];

const createUser = (userName, interests, freeTime)  => {
  return {userName: userName, interests: [...interests], freeTime: [...freeTime]};
}

const profileTemplate = (user) => {
  
  // Embeds for formatted message. Source: https://discordjs.guide/popular-topics/embeds.html
  let embeddedMsg = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle(user.userName + "'s Profile")
    .addFields(
      { name: 'Interests', value: user.interests, inline: true },
      { name: 'Free time', value: user.freeTime, inline: true },
    )
    .setTimestamp()

    return embeddedMsg;
  }

client.on("message", async message => {
  if(message.author.bot) return;
  if(!message.content.startsWith(prefix)) return;

  const commandBody = message.content.slice(prefix.length);
  const args = commandBody.split(' ');
  const command = args.shift().toLowerCase();

  if(command === "resources"){
    const meetingType = args[0];

    if(meetingType === undefined){
      return message.channel.send("You must enter a type of meeting.");
    }

    //const links = meetingLinks[meetingType];

    let params = {
      engine: "google",
      q: `virtual ${meetingType} tools`,
      google_domain: "google.com",
      gl: "us",
      hl: "en",
      num: "5",
      tbs: "app",
      safe: "active",
      api_key: process.env.GOOGLE_API_KEY
    }
    
    let callback = (data) => {
      let jsonObjects = [...data.organic_results];
      let results = [];
      for(let i = 0; i < jsonObjects.length; i++){
        results[i] = jsonObjects[i].link;
      }
      
      let listOfLinksMsg = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Resources for your ${meetingType} meeting`)
        .addField('Resources', results, true)
        .setTimestamp();

      message.reply(listOfLinksMsg);
    }

    search.json(params, callback);

    // Check if a channel for meetingType exists, if not create it.
    if(message.guild.channels.cache.find(channel => channel.name === meetingType)){
      message.channel.send(`Check out the ${meetingType} channel!`);
    } else {
      message.guild.channels.create(meetingType, {
        type: 'text'
      });
      message.channel.send(`${meetingType} channel has been created!`);
      return;
    }
  } else if(command === "commands"){  
      // Embeds for formatted message. Source: https://discordjs.guide/popular-topics/embeds.html
      let embeddedMsg = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("Collabo Commands")
        .addFields(
          { name: 'Commands', value: commands, inline: true },
          { name: 'Example', value: ['!resources brainstorming', '!commands', '!profile create/get [USERNAME] (only include username if using get command)','!motivateme'], inline: true },
        )
        .setTimestamp();

      return message.channel.send(embeddedMsg);
  } else if(command === "profile"){
      if(args[0] === "create"){

        const req = await Profile.findOne({userName: message.author.username});

        if(req){
          return message.channel.send("You already have a profile");
        }

        // Check if message is being sent to author
        let filter = m => m.author.id === message.author.id;

        // Message is sent to user
        // Source: https://stackoverflow.com/questions/45856446/discord-js-reply-to-message-then-wait-for-reply
        await message.author.send("What are a few of your interests? Please enter 3.");

        await message.author.dmChannel.awaitMessages(filter, {
            max: 3,
            time: 300000,
            errors: ['time']
          })
          .then(messages => {
            let responses = messages.array();
            for(let i = 0; i < responses.length; i++){
              interests.push(responses[i].content);
            }
            message.author.send("Thanks for the reply!");
            //console.log(interests);
          })
          .catch(collected => {
              //console.log(message);
              message.author.send('Timed out waiting for response.' + collected);
          });
        
      await message.author.send("What do you like to do in your free time? Please enter 3.");

      await message.author.dmChannel.awaitMessages(filter, {
          max: 3,
          time: 300000,
          errors: ['time']
        })
        .then(messages => {
          let responses = messages.array();
          for(let i = 0; i < responses.length; i++){
            freeTime.push(responses[i].content);
          }
          message.author.send("Thanks for the reply!");
          console.log(freeTime);
        })
        .catch(collected => {
            console.log(message);
            message.author.send('Timed out waiting for response.' + collected);
        });

        const profile = new Profile({
          id: message.author.id,
          userName: message.author.username,
          interests: interests,
          freeTime: freeTime
        });

        await profile.save();

        let user = createUser(message.author.username, interests, freeTime);
        users.push(user);
        //console.log(users);
      } else if(args[0] === "get"){

        let userName = '';
        // Some usernames may have spaces therefore since this is an argument array
        // the spaces are not taking into account. To counter this, when a space is reached
        // after the first argument following the 'get' command, a space is added to the userName string.
        for(let i = 1; i < args.length; i++){
          userName += args[i];
          if(i != args.length - 1){
            userName += " ";
          }
        }

        const req = await Profile.findOne({userName: userName});
        //console.log(req.userName);
        if(!req){
          return message.channel.send(userName + "'s profile doesn't exist");
        } else {
          let user = createUser(req.userName, req.interests, req.freeTime);
          message.channel.send(profileTemplate(user))
        }

    } else {
      message.channel.send("You must enter a command along with 'profile'. Use 'create' to create a profile and 'get' to show a user profile.");
    }
  } else if(command === "motivateme"){
    // Fetch a random motivational/inspirational quote from the api
    fetch("https://zenquotes.io/api/random/")
      .then(response => response.json())
      .then(data => message.author.send(data[0].q));
  }
});

(async () => {
  await connect(process.env.MONGO_KEY,{
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  });

  return client.login(process.env.BOT_TOKEN);
})();
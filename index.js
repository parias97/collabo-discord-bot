const GoogleSearchAPI = require('google-search-results-nodejs');
const search = new GoogleSearchAPI.GoogleSearch();
const fetch = require("node-fetch");
const Profile = require('./models/Profile');
const ytdl = require('ytdl-core');
const {connect} = require('mongoose');
const Youtube = require('simple-youtube-api');
const Discord = require('discord.js');
const client = new Discord.Client();
require('dotenv').config();
let youtubeAPIKey = process.env.YOUTUBE_API_KEY;
const youtube = new Youtube(youtubeAPIKey);

const prefix = "!";
let interests = [];
let freeTime = [];
const queue = new Map();

// TESTING: Hard-coded meeting links for specific meeting types
// const meetingLinks = {
//   happyhour: ["https://kahoot.it/","https://icebreaker.video/"],
//   brainstorming: ["https://miro.com/", "https://figma.com", "https://lucidspark.com/", "https://conceptboard.com/" ],
//   study: ["https://quizlet.com", "https://docs.google.com/", "https://evernote.com/"]
// }

const commands = ["resources", "commands", "profile", "motivateme", "music"];

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
  const serverQueue = queue.get(message.guild.id);

  if(command === "resources"){
    let meetingType = '';

    for(let i = 0; i < args.length; i++){
      meetingType += args[i];
      if(i != args.length - 1){
        meetingType += " ";
      }
    }

    if(meetingType === undefined){
      return message.channel.send("You must enter a type of meeting.");
    } else {
      // TESTING:
      //const links = meetingLinks[meetingType];

      // Check if a channel for meetingType exists, if not create it.
      if(message.guild.channels.cache.find(channel => channel.name === meetingType)){
        return message.channel.send(`Check out the ${meetingType} channel!`);
      } else {
        await message.guild.channels.create(meetingType, {
          type: 'text'
        });
        message.channel.send(`${meetingType} channel has been created!`);
      }

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
          results[i] = "[" + jsonObjects[i].title + "](" + jsonObjects[i].link + ")";
        }
        
        let listOfLinksMsg = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`Resources for your ${meetingType} meeting`)
          .addField('Resources', results, true)
          .setTimestamp();

        message.guild.channels.cache.find(channel => channel.name === `${meetingType}`).send(listOfLinksMsg);
      }

      search.json(params, callback);      

    }
  
  } else if(command === "commands"){  
      // Embeds for formatted message. Source: https://discordjs.guide/popular-topics/embeds.html
      let embeddedMsg = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("Collabo Commands")
        .addFields(
          { name: 'Commands', value: commands, inline: true },
          { name: 'Example', value: ['!resources [MEETING_TYPE]', '!commands', '!profile create/get [USERNAME] (only include username if using get command)','!motivateme', "!music play [YOUTUBE URL/ARTIST + SONG NAME]"], inline: true },
        )
        .setTimestamp();

      return message.channel.send(embeddedMsg);
  } else if(command === "profile"){
      if(args[0] === "create"){

        const req = await Profile.findOne({userName: message.author.username.toLowerCase()});

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
          userName: message.author.username.toLowerCase(),
          interests: interests,
          freeTime: freeTime
        });

        await profile.save();

        // let user = createUser(message.author.username, interests, freeTime);
        // users.push(user);
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

        const req = await Profile.findOne({userName: userName.toLowerCase()});
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
      fetch("https://api.forismatic.com/api/1.0/?method=getQuote&lang=en&format=json&json=?")
        .then(response => response.json())
        .then(data => message.author.send(data.quoteText))
        .catch(error => {
          console.log("There has been a problem with this fetch operation: ", error)
        });

  } else if(command === "music"){  
      if(args[0] === "play"){
        args.shift();
        execute(message, args, serverQueue);
      }
  }
});

// Source: https://gabrieltanner.org/blog/dicord-music-bot
async function execute(message, url, serverQueue){
  const args = [...url];
  const voiceChannel = message.member.voice.channel;
  let song = '';

  if (!voiceChannel){
    return message.channel.send("You need to be in a voice channel to play music!");
  }

  const permissions = voiceChannel.permissionsFor(message.client.user);

  if(!permissions.has("CONNECT") || !permissions.has("SPEAK")){
    return message.channel.send("I need the permissions to join and speak in your voice channel!");
  }

  // Source: https://dev.to/galnir/how-to-write-a-music-command-using-the-discord-js-library-462f
  if (args[0].match(/^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/)) {
    const url = args[0]
    try {
      const songInfo = await ytdl.getInfo(url);
      song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
      };
    } catch (err) {
      console.error(err);
      return message.channel.send('Something went wrong, please try again later');
    }
  } else {
    let search = '';
    // Append all arguments into a string
    for(let i = 0; i < args.length; i++){
      search += args[i];
    }

    try {
      const videos = await youtube.searchVideos(search, 3);
      if(videos.length < 3){
        return message.channel.send(
          `I had some trouble finding what you were looking for, please try again or be more specific`
        );
      }

      const vidNameArr = [];

      for (let i = 0; i < videos.length; i++) {
        vidNameArr.push(`${i + 1}: ${videos[i].title}`);
      }

      // Push 'exit' string as it will be an option
      vidNameArr.push('exit');

      // Create and display an embed message which will present the user the 3 results
      // so the user can choose his desired result
      const embed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Choose a song by commenting a number between 1 and 3')
        .addField('Song 1', vidNameArr[0])
        .addField('Song 2', vidNameArr[1])
        .addField('Song 3', vidNameArr[2])
        .addField('Exit', 'exit'); // user can reply with 'exit' if none matches

      let songEmbed = await message.channel.send({embed});

      try {
        // Wait for user input for video selection
        var response = await message.channel.awaitMessages(
          msg => (msg.content > 0 && msg.content < 4) || msg.content === 'exit',
          {
            max: 1,
            maxProcessed: 1,
            time: 60000,
            errors: ['time']
          }
        );

        // Assign videoIndex to user's response
        var videoIndex = parseInt(response.first().content);
      } catch (err) {
        console.error(err);
        songEmbed.delete();
        return message.channel.send(
          'Please try again and enter a number between 1 and 3 or exit'
        );
      }

      if (response.first().content === 'exit') return songEmbed.delete();

      try {
        // Get video data from the YouTube API
        var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
      } catch (err) {
        console.error(err);
        songEmbed.delete();
        return message.channel.send(
          'An error has occured when trying to get the video ID from youtube'
        );
      }

      song = {
        title: video.title,
        url: video.url
      }

    } catch (err) {
      console.error(err);
      return message.channel.send(
        'Something went wrong with searching the video you requested :('
      );
    }
  }

  if(!serverQueue) {
    // Creating the queue contract
    const queueContract = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };
  
    // Setting the queue contract
    queue.set(message.guild.id, queueContract);
    queueContract.songs.push(song);

    // Try to join the voicechat and save our connection into our object
    try {
      let connection = await voiceChannel.join();
      queueContract.connection = connection;
      play(message.guild, queueContract.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`**${song.title}** has been added to the queue!`);
  }
}

function play(guild, song){
  const serverQueue = queue.get(guild.id);
  if(!song){
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));

  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`**${song.title}** has started playing!`);
}

// Connect to database and wake up bot
(async () => {
  await connect(process.env.MONGO_KEY,{
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  });

  return client.login(process.env.BOT_TOKEN);
})();
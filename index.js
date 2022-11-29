const Twit = require('twitter-lite');
const moment = require('moment-timezone');
const includes = require('array-includes');
const express = require('express');
const app = express();
const blockedTweets = require('./blockedTweets').tweets;
const path = require('path');
require('dotenv').config();

const APP_CONFIG = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
};

const T = new Twit(APP_CONFIG);

app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/api/retweet/:key', async (req, res) => {
  const key = req.params.key;
  if (key === process.env.API_KEY) {
    try {
      const tweets = await Tweet();
      for(const tweet of tweets){
        await T.post(`statuses/retweet`, {id: tweet.id_str}).catch(e=>{
          if('errors' in e){
            //twitter error
            if(e.errors[0].code !== 327){
              throw new Error(e.errors[0].message)
            }
          }else{
            throw new Error(e.message)
          }
        })
      }
      res.json({tweets: `${tweets.length} tweets retweeted!`});
    } catch (e) {
      console.log(e);
      res.sendStatus(403);
    }
  } else {
    res.json({error: 'Access Denied'});
  }
});
app.listen(process.env.PORT || 3000);

const Tweet = async () => {
  //first search
  const firstRes = await T.get('search/tweets', {
    q: '"wake forest" offer receive OR received exclude:retweets exclude:replies',
    count: 100,
    result_type: 'recent',
  }).catch((e) => {
    throw new Error(e.message);
  });
  const secondRes = await T.get('search/tweets', {
    q: '"wake forest" -Sarr -sarr -turnovers -fouls -penalty -crimes -antiracist -antiracism -racism -Confederate -Confederates -turnover -foul -penalty -penalties -fraud -crime commit OR committed exclude:retweets exclude:replies',
    count: 100,
    result_type: 'recent',
  }).catch((e) => {
    throw new Error(e.message);
  });
  const tweetList = [...firstRes.statuses, ...secondRes.statuses].filter(
    (tweet) => {
      if (tweet.hasOwnProperty('possibly_sensitive')) {
        return (
          !blockedTweets.includes(tweet.id_str) &&
          tweet.text.substring(0, 2) !== 'RT' &&
          tweet.possibly_sensitive === false
        );
      } else {
        return (
          !blockedTweets.includes(tweet.id_str) &&
          tweet.text.substring(0, 2) !== 'RT'
        );
      }
    }
  );
  //tweetList.forEach((x) => console.log(x.text));

  let d = new Date();
  let myTimezone = 'America/Toronto';
  let myDatetimeFormat = 'YYYY-MM-DD hh:mm:ss a z';
  let date = moment(d).tz(myTimezone).format(myDatetimeFormat);

  console.log(date); //log the date and time to quickly determine if the bot is running every hour
  console.log('Attempting to Retweet ' + tweetList.length + ' tweets...');
  //console.log("testing blocker " + blockedTweets[0])
  tweetList.forEach((x) => console.log(x.text, x.id_str)); //log the tweet text just for testing
  
  return tweetList;
};
// const retweet = async (id) =>
//   await T.post('statuses/retweet/:id', {id: id}, (err, response) => {
//     if (err) {
//       throw new Error('failed to Retweet');
//     } else {
//       console.log('Retweet successful');
//       return 200;
//     }
//   });

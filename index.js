require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const app = express()

//use body-parser library to access the data POSTED in req.body
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

//Connect to the database:
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, UseUnifiedTopology: true});

//test de connection with MongoDB and log to the console
let connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () => {
  console.log('Connection with MongoDB established succesfully');
})

//create the schema for new users
const userSchema = new mongoose.Schema({
  username: String
})

const User = mongoose.model('User', userSchema);


//POST a new user
app.post('/api/users', async function(req, res){
  let newUsername = req.body.username;

  // if(newUsername === null | newUsername === ""){res.json({error: "username is null, try again with a valid string"})}

  try {
    let findUser = await User.findOne({
      username: newUsername
    })

    if(findUser){ //if username was created before, the program will return the data asociated with that user.
      res.json({
        username: findUser.username,
        _id: findUser._id
      })
    } else { //if username was not created before, the program will create a new user.

      findUser = new User({
        username: newUsername
      })

      findUser.save();
      res.json({
        username: findUser.username,
        _id: findUser._id
      })
    }
  }
  catch(error) {
    console.error(error);
    res.status(500).json({error: 'An error has ocurred'})
  }


})




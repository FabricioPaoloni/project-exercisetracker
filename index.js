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
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, UseUnifiedTopology: true });

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
app.post('/api/users', async function (req, res) {
  let newUsername = req.body.username;

  if (newUsername === null | newUsername === "") { return res.json({ error: "username is null, try again with a valid string" }) }

  try {
    let findUser = await User.findOne({
      username: newUsername
    })

    if (findUser) { //if username was created before, the program will return the data asociated with that user.
      res.json({
        username: findUser.username,
        _id: findUser._id
      })
    } else { //if username was not created before, the program will create a new user.

      findUser = new User({
        username: newUsername
      })

      await findUser.save();
      res.json({
        username: findUser.username,
        _id: findUser._id
      })
    }
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error has ocurred while posting a username' })
  }


})

//GET all the users in the database
app.get('/api/users', async function (req, res) {

  try {
    let usersArray = await User.find({}, 'username _id');
    res.json(usersArray);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error has ocurred while getting al usernames in the database' })
  }
})


//create the Schema to post new exercises
const exerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true},
  description: String,
  duration: Number,
  date: Date
})

//Create the mongoose model asociated with the exersice Schema and the exercises collection in the database
const Exercise = mongoose.model('Exercise', exerciseSchema, 'exercises');

//POST a new exercise for an specific _id with the parameters: description, duration and date(optional)
app.post('/api/users/:_id/exercises', async function (req, res) {
  try {
    const validUser = await User.findById(req.params._id);
    //validate the ID requested before continue.
    if (!validUser) {
      return res.json({ error: 'ID not found, try again with a valid ID.' })
    } else {
      const newExercise = new Exercise({
        user_id: validUser._id,
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date ? new Date(req.body.date) : new Date()
      })
      const exerciseSaved = await newExercise.save();
      res.json({
        _id: validUser._id,
        username: validUser.username,
        description: newExercise.description,
        duration: newExercise.duration,
        date: newExercise.date.toDateString()
      })
    }
  }
  catch (error2) {
    console.error(error2);
    res.json({ error: 'An error has ocurred while posting an exercise' })
  }
})

//GET the logs of exercise that belong to a specific user in the format:
// {
//   username: "fcc_test",
//   count: 1,
//   _id: "5fb5853f734231456ccb3b05",
//   log: [{
//     description: "test",
//     duration: 60,
//     date: "Mon Jan 01 1990",
//   }]
// }
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if(!user){
    res.send('Could not find user. Try again with a valid ID');
    return
  }
  let dateObj = {};
  if (from) {
    dateObj['$gte'] = new Date(from);
  }
  if(to){
    dateObj['$lte'] = new Date(to);
  }
  let filter = {
    user_id: id,
  }
  if(from || to){
    filter.date = dateObj;
  }

  const exercisesArray = await Exercise.find(filter).limit(+limit ?? 500);
  const log = exercisesArray.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: exercisesArray.length,
    _id: user._id,
    log: log
  })

})
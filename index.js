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

      findUser.save();
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
  user_id: String,
  username: String,
  description: String,
  duration: Number,
  date: Date
})

//Create the mongoose model asociated with the exersice Schema and the exercises collection in the database
const Exercise = mongoose.model('Exercise', exerciseSchema, 'exercises');

//POST a new exercise for an specific _id with the parameters: description, duration and date(optional)
app.post('/api/users/:_id/exercises', async function (req, res) {
  try {
    const validUser = await User.findOne({ _id: req.params._id });
    //validate the ID requested before continue.
    if (!validUser) {
      return res.json({ error: 'ID not found, try again with a valid ID.' })
    } else {
      try {

        //validate description and duration parameters.
        if (!req.body.description | !req.body.duration) {
          return res.json({ error: 'invalid description or duration data. Try again with a valid string for -description- and a valid number for -duration-. If no -date- is supplied, the current date will be used.' })
        }
        //select between the date supplied by de user or the current date if no date was supplied.
        let dateSupplied = null;
        if (req.body.date === null | req.body.date === "") {
          let currentDate = new Date();
          dateSupplied = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`)
        } else {
          dateSupplied = new Date(req.body.date);
        }


        let findExercise = await Exercise.findOne({
          user_id: validUser._id,
          username: validUser.username,
          description: req.body.description,
          duration: req.body.duration,
          date: dateSupplied
        })

        if (findExercise) {
          return res.json({
            _id: validUser._id,
            username: findExercise.username,
            description: findExercise.description,
            duration: findExercise.duration,
            date: findExercise.date.toDateString(),
            note: 'The exercise has already been added to the database'
          })
        } else {
          let newExercise = new Exercise({
            user_id: validUser._id,
            username: validUser.username,
            description: req.body.description,
            duration: req.body.duration,
            date: dateSupplied
          })

          const savedExercise = await newExercise.save();
          res.json({
            _id: savedExercise.user_id,
            username: savedExercise.username,
            description: savedExercise.description,
            duration: savedExercise.duration,
            date: savedExercise.date.toDateString(),
          })
        }
      }

      catch (error2) {
        console.error(error2);
        res.status(500).json({ error: 'An error has ocurred while posting an exercise' })
      }

    }
  }
  catch (error1) {
    console.error(error1);
    res.status(500).json({ error: 'ID not found, try again with a valid ID.' })
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
app.get('/api/users/:_id/logs', async function (req, res) {
  //get the username


  let findUser = await User.findOne({ _id: req.params._id });
  if (!findUser) { //if no user matches, return an error.
    return res.json({ error: 'User not found. Try again with a valid ID' });
  }
  let fromDate = new Date(0);
  let toDate = new Date();
  let limit;
  req.query.limit ? limit = parseInt(req.query.limit) : limit = 0;
  if (isNaN(limit)) { return res.json({ error: 'limit is not a valid number. Please try again' }) }

  req.query.from ? fromDate = new Date(req.query.from) : fromDate = fromDate;
  req.query.to ? toDate = new Date(req.query.to) : toDate = toDate;
  req.query.limit ? limit = req.query.limit : limit = null;

  if (fromDate == 'Invalid Date') { return res.json({ error: 'FROM date is invalid' }) }
  if (toDate == 'Invalid Date') { return res.json({ error: 'TO date is invalid' }) }


  //catch all the exercises that belong to the supplied user.
  let exercisesArray = await Exercise.find({
    user_id: findUser._id,
    date: { $gte: fromDate, $lte: toDate }
  })
    .select('description duration date')
    .limit(limit)
    .exec();
  let log = exercisesArray.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))
  res.json({
    username: findUser.username,
    count: exercisesArray.length,
    _id: findUser._id,
    log: log,
  })


})
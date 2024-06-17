const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = express()
app.use(express.json())
let db = null
const dbPath = path.join(__dirname, 'twitterClone.db')

const initializeDBServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server running at https://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBServer()

// check authentication token
const checkJwtToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'secretkey', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

// API 1 Path: /register/
app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const checkUserInDB = `SELECT * FROM user WHERE username='${username}'`
  const isCheckedUserInDB = await db.get(checkUserInDB)
  if (isCheckedUserInDB === undefined) {
    const hashPassword = await bcrypt.hash(password, 10)
    const addUser = `INSERT INTO user (username, password, name, gender) VALUES('${username}','${hashPassword}','${name}','${gender}')`
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      await db.run(addUser)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

// API 2 Path: /login/
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const checkUserInDB = `SELECT * FROM user WHERE username='${username}'`
  const isCheckedUserInDB = await db.get(checkUserInDB)
  if (isCheckedUserInDB === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatch = await bcrypt.compare(
      password,
      isCheckedUserInDB.password,
    )
    if (isPasswordMatch === true) {
      const payload = {username: username}
      const token = jwt.sign(payload, 'secretkey')
      response.send({jwtToken: token})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// API 3 Path: /user/tweets/feed/
app.get('/user/tweets/feed/', checkJwtToken, async (request, response) => {
  let {username} = request
  console.log(username)
  const getTweet = `select user_id from user where username='${username}'`
  const personTweet = await db.get(getTweet)
  response.send(personTweet)
})

module.exports = app

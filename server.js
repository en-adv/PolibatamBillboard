const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 3000;

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static("public"));


// Create a MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'adven',
  password: '12345678',
  database: 'mqtt_database',
}); 

// Connect to the MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to the database');
});

// Parse URL-encoded bodies for all routes
app.use(bodyParser.urlencoded({ extended: false }));

// Parse JSON bodies for all routes
app.use(bodyParser.json());

// Serve the login page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

// Handle the login form submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    // Check if the username and password match a record in the database
    const query = `SELECT * FROM user WHERE username = '${username}' AND password = '${password}'`;
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      if (results.length === 0) {
        res.status(401).send('Invalid username or password');
      } else {
        res.render('dashboard');
      }
    });
  });
  
// Serve the registration page
app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/register.html');
});

// Handle the registration form submission
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Check if the username already exists in the database
  const query = `SELECT * FROM user WHERE username = '${username}'`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length > 0) {
      res.status(409).send('Username already exists');
    } else {
      // Insert the new user record into the database
      const insertQuery = `INSERT INTO user (username, password) VALUES ('${username}', '${password}')`;
      connection.query(insertQuery, (err) => {
        if (err) {
          console.error('Error executing query:', err);
          res.status(500).send('Internal Server Error');
          return;
        }

        res.status(200).send('Registration successful');
      });
    }
  });
});

app.get('/logout', (req, res) => {
    // Perform any necessary logout operations (e.g., clearing session, etc.)
  
    // Redirect the user back to the login page
    res.redirect('/login');
  });

// ...

// MQTT and Socket.IO integration
const mqttBrokerUrl = 'wss://hairdresser.cloudmqtt.com:35907/mqtt';
const mqttClient = mqtt.connect(mqttBrokerUrl, {
  username: 'ibxznyfv',
  password: 'CeTN0fS6rPFf',
});

mqttClient.on('connect', function () {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('viewers', function (err) {
    if (err) {
      console.error('Error subscribing to topic:', err);
    } else {
      console.log('Subscribed to topic: viewers');
    }
  });
});

mqttClient.on('error', function (error) {
  console.error('MQTT connection error:', error);
});

mqttClient.on('reconnect', function () {
  console.log('Reconnecting to MQTT broker');
});

mqttClient.on('message', function (topic, message) {
  console.log('Received message:', message.toString());

  // Convert the MQTT message to a JSON object
  const mqttData = JSON.parse(message.toString());

  // Extract the necessary data from the MQTT message
  const dataToSave = mqttData.dataToSave;

  // Prepare the SQL query to insert the data into the database
  const query = `INSERT INTO data_realtime (realtime) VALUES (?)`;
  const values = [dataToSave];

  // Execute the SQL query
  connection.query(query, values, (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      return;
    }

    console.log('Data saved successfully:', result);
  });

  io.emit('mqttMessage', message.toString());
});

io.on('connection', function (socket) {
  console.log('A client connected');

  socket.on('mqttMessage', function (message) {
    // Convert the message to a JSON object
    const mqttData = JSON.parse(message);

    // Save the data to the MySQL database (similar to the previous code snippet)
    const dataToSave = mqttData.dataToSave;
    const query = `INSERT INTO data_realtime (viewer) VALUES (?)`;
    const values = [dataToSave];

    // Execute the SQL query
    connection.query(query, values, (err, result) => {
      if (err) {
        console.error('Error executing query:', err);
        return;
      }

      console.log('Data saved successfully:', result);
    });

    socket.emit('mqttMessage', message);
  });
});



// Start the server
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

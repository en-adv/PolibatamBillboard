const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 3000;

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
  io.emit('mqttMessage', message.toString())});
  io.on('connection', function (socket) {
    console.log('A client connected');
  
    socket.on('mqttMessage', function (message) {
      socket.emit('mqttMessage', message);
    });
  });

io.on('connection', function (socket) {
  console.log('A client connected');
});

server.listen(port, function () {
  console.log(`Server listening on port ${port}`);
});

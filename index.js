const MqttBridge = require('./src/MqttBridge')

// Change topic names, mqtt-broker address and the base URL of your server
// running the REST endpoint
const topics = ['posts', 'comments']
const mqttURL = 'mqtt://localhost'
const restBaseURL = 'https://jsonplaceholder.typicode.com'

// Create and run a new MqttBridge
const bridge = new MqttBridge(mqttURL, restBaseURL, topics)

// subscribe to a new topic
bridge.subscribe('cucumber')

// Add a route with callback function
bridge.addRoute('cucumber', 'https://jsonplaceholder.typicode.com/albums/2', (topic, data) => {
  console.log(`Topic ${topic} returned data: ${JSON.stringify(data)}`)
})

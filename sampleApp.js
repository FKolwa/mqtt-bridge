const MqttBridge = require('./src/MqttBridge')

// Change topic names, mqtt-broker address and the base URL of your server
// running the REST endpoint
const topics = ['posts', 'comments']
const mqttHost = 'mqtt://localhost'
const httpHost = 'https://jsonplaceholder.typicode.com'

// Create and connect a new MqttBridge
const bridge = new MqttBridge()
bridge.connect(mqttHost, httpHost)

// subscribe to a new topic
bridge.subscribe(topics)
bridge.subscribe(['cucumber'])

// Add a route with callback function
bridge.addRoute(
  'cucumber',
  'https://jsonplaceholder.typicode.com/albums/2',
  {
    method: 'get',
    callback: (topic, data) => { console.log(`Topic ${topic} returned data: ${JSON.stringify(data)}`) }
  }
)

// Now go ahead and trigger the route with a mqtt client publish on topic 'cucumber'.
// When using mosquitto client just type mosquitto_pub -h <mqttHost> -t cucumber -m ''

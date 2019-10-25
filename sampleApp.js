const MqttBridge = require('./src/MqttBridge')

// Change topic names, mqtt-broker address and the base URL of your server
// running the REST endpoint
async function startServer () {
  // Create and connect a new MqttBridge
  const bridge = new MqttBridge()

  // load a sample configuration
  await bridge.connectWithConfig('./config.yml')

  // Add a route with callback function
  await bridge.addRoute(
    'cucumber',
    'https://jsonplaceholder.typicode.com/albums/2',
    {
      method: 'get',
      callback: (client, topic, data) => { console.log(`Topic ${topic} returned data: ${JSON.stringify(data)}`) }
    }
  )

  console.log(JSON.stringify(bridge.getRoutes()))

  // Now go ahead and trigger the route with a mqtt client publish on topic 'cucumber'.
  // When using mosquitto client just type mosquitto_pub -h <mqttHost> -t cucumber -m ''
}

startServer()

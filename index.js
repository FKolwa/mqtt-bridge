const MqttBridge = require('./src/MqttBridge')

async function startBridge () {
  const bridge = new MqttBridge()
  await bridge.connectWithConfig('./config.yml')
}

startBridge()

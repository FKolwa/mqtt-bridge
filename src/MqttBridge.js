const mqtt = require('mqtt')
const axios = require('axios')

class MqttBridge {
  constructor (mqttHost = 'mqtt://localhost', httpHost = 'https://localhost', topics = [], options = {}) {
    this._httpHost = httpHost
    this._routingTable = {}
    this._client = mqtt.connect(mqttHost, options)
    this._client.on('connect', () => this._connectionHandler(topics))
    this._client.on('message', (topic, payload) => this._messageHandler(topic, payload))
  }

  addRoute (_topic, _route, _method, _callback = undefined) {
    this._routingTable[_topic] = {
      route: _route,
      method: _method,
      callback: _callback
    }
  }

  subscribe (topic) {
    console.log(`Subscribing to: ${topic}`)
    this._client.subscribe(topic, (error) => {
      if (error) {
        console.log(`Encountered a problem subscribing to ${topic}: ` + error)
      } else {
        console.log(`Subscribing to ${topic}: Success!`)
      }
    })
  }

  _connectionHandler (topics) {
    topics.forEach(topic => {
      this.subscribe(topic)
    })
  }

  async _messageHandler (topic, payload) {
    const body = {
      method: this._routingTable[topic].method === undefined
        ? 'get'
        : this._routingTable[topic].method,
      url: this._routingTable[topic].route === undefined
        ? `${this._httpHost}/${topic}`
        : this._routingTable[topic].route
    }

    if (body.method === 'post') {
      body.data = { ...JSON.parse(payload) }
    }

    try {
      const response = await axios({
        ...body
      })
      if (body.method === 'get' && this._routingTable[topic].callback !== undefined) {
        try {
          this._routingTable[topic].callback(topic, response.data)
        } catch (error) {
          console.log(`Error during callback execution: ${error}`)
        }
      }
    } catch (error) {
      console.log(`Encountered a problem reaching target ${this._httpHost}/${topic}: ` + error)
    }
  }
}

module.exports = MqttBridge

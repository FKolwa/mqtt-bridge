const mqtt = require('mqtt')
const axios = require('axios')

class MqttBridge {
  constructor () {
    this._mqttHost = ''
    this._httpHost = ''
    this._routingTable = new Map()
    this._client = {}
    this._state = {
      mqttConnected: false,
      httpConnected: false
    }
  }

  async connect (mqttHost = 'mqtt://localhost', httpHost = 'https://localhost', options = {}) {
    this._mqttHost = mqttHost
    this._httpHost = httpHost
    try {
      this._client = await mqtt.connect(this._mqttHost, options)
      this._client.on('connect', () => this._connectionHandler())
      this._client.on('message', (topic, payload) => this._messageHandler(topic, payload))
      this._client.on('error', (error) => this._errorHandler(error))
    } catch (error) {
      console.error(`Error connecting to to ${mqttHost}: ${error}`)
    }

    try {
      await axios.get(this._httpHost)
      this._state.httpConnected = true
      console.debug('HTTP connection established!')
    } catch (error) {
      console.error(`Error connecting to to ${this._httpHost}: ${error}`)
    }
    return this._state.mqttConnected && this._state.httpConnected
  }

  addRoute (topic, route, options = {}) {
    this._routingTable[topic] = {
      route: route,
      responseTopic: options.responseTopic !== undefined ? options.responseTopic : `${topic}/response`,
      method: options.method !== undefined ? options.method : 'get',
      callback: options.callback !== undefined ? options.callback : this._defaultCallback
    }
  }

  getRoutes () {
    return this._routingTable
  }

  subscribe (topics) {
    for (const topic of topics) {
      console.debug(`Subscribing to: ${topic}`)
      this._client.subscribe(topic, (error) => {
        if (error) {
          console.error(`Error subscribing to ${topic}: ${error}`)
        } else {
          console.debug(`Subscribing to ${topic}: Success!`)
        }
      })
    }
  }

  _connectionHandler () {
    console.info('MQTT Connection established!')
    this._state.mqttConnected = true
  }

  async _messageHandler (topic, payload) {
    if (this._routingTable[topic] === undefined) {
      console.error(`Error: no route found for topic ${topic}!`)
    } else {
      const body = {
        method: this._routingTable[topic].method,
        url: this._routingTable[topic].route
      }

      if (body.method === 'post' ||
          body.method === 'put' ||
          body.method === 'delete') {
        body.data = { ...JSON.parse(payload) }
      }

      try {
        const response = await axios({
          ...body
        })
        if (body.method === 'get') {
          this._routingTable[topic].callback(this._client, this._routingTable[topic].responseTopic, response.data)
        }
      } catch (error) {
        console.error(`Error reaching target ${body.url}: ${error}`)
      }
    }
  }

  _errorHandler (error) {
    console.error(`Error: ${error}`)
  }

  async _defaultCallback (mqttClient, topic, payload) {
    console.debug(`Publishing response on topic ${topic}`)
    await mqttClient.publish(topic, JSON.stringify(payload))
  }
}

module.exports = MqttBridge

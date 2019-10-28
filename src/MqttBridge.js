const mqtt = require('mqtt')
const axios = require('axios')
const yaml = require('js-yaml')
const fs = require('fs')

class MqttBridge {
  constructor () {
    this._routingTable = new Map()
    this._client = {}
    this._state = {
      config: {},
      mqttConnected: false
    }
  }

  async connect (configPath) {
    try {
      this._state.config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
    } catch (error) {
      console.error(`Error loading config file from ${configPath}: ${error}`)
    }
    const mqttHost = this._state.config.mqttHost ? this._state.config.mqttHost : ''
    const mqttOptions = this._state.config.mqttOptions ? this._state.config.mqttOptions : {}
    await this._setupConnection(mqttHost, mqttOptions)
    while (!this._state.mqttConnected) {
      console.log('Connecting..')
      await this._delay(1000)
    }
  }

  async _setupConnection (mqttHost, options = {}) {
    try {
      this._client = await mqtt.connect(mqttHost, options)
      this._client.on('connect', () => this._connectionHandler())
      this._client.on('close', () => this._disconnectionHandler())
      this._client.on('message', (topic, payload) => this._messageHandler(topic, payload))
      this._client.on('error', (error) => this._errorHandler(error))
    } catch (error) {
      console.error(`Error connecting to to ${mqttHost}: ${error}`)
    }
  }

  addRoute (topic, route, options = {}) {
    this._subscribe(topic)
    this._routingTable[topic] = {
      route: route,
      responseTopic: options.responseTopic !== undefined ? options.responseTopic : `${topic}/response`,
      method: options.method !== undefined ? options.method : 'get',
      dynamic: options.dynamic !== undefined ? options.dynamic : false,
      callback: options.callback !== undefined ? options.callback : this._defaultCallback
    }
  }

  getRoutes () {
    return this._routingTable
  }

  getConfig () {
    return this._state.config
  }

  _subscribe (topic) {
    console.debug(`Subscribing to: ${topic}`)
    this._client.subscribe(topic, (error) => {
      if (error) {
        console.error(`Error subscribing to ${topic}: ${error}`)
      } else {
        console.debug(`Subscribing to ${topic}: Success!`)
      }
    })
  }

  _unsubscribe (topic) {
    console.debug(`Removing subscription to: ${topic}`)
    this._client.subscribe(topic, (error) => {
      if (error) {
        console.error(`Error unsubscribing from ${topic}: ${error}`)
      } else {
        console.debug(`Subscription to ${topic} removed!`)
      }
    })
  }

  _routesFromConfig (config) {
    for (const topic in config) {
      this.addRoute(topic, config[topic].route, config[topic])
    }
  }

  _connectionHandler () {
    console.info('MQTT Connection established!')
    if (this._state.config.routes) {
      this._routesFromConfig(this._state.config.routes)
    }
    this._state.mqttConnected = true
  }

  _disconnectionHandler () {
    console.info('MQTT Connection lost!')
    for (const topic in this._routingTable) {
      this._unsubscribe(topic)
      this._routingTable.delete(topic)
    }
    this._routingTable = new Map()
  }

  async _messageHandler (topic, payload) {
    if (this._routingTable[topic] === undefined) {
      console.error(`Error: no route found for topic ${topic}!`)
    } else {
      console.log(payload)
      const request = this._routingTable[topic].dynamic
        ? JSON.parse(payload)
        : this._createRequest(topic, payload)

      try {
        const response = await axios({
          ...request
        })
        if (request.method === 'get') {
          this._routingTable[topic].callback(this._client, this._routingTable[topic].responseTopic, response.data)
        }
      } catch (error) {
        console.error(`Error reaching target ${request.url}: ${error}`)
      }
    }
  }

  _createRequest (topic, payload) {
    const request = {
      method: this._routingTable[topic].method,
      url: this._routingTable[topic].route
    }

    if (request.method === 'post' ||
        request.method === 'put' ||
        request.method === 'delete') {
      request.data = { ...JSON.parse(payload) }
    }
    return request
  }

  _errorHandler (error) {
    console.error(`Error: ${error}`)
  }

  async _defaultCallback (mqttClient, topic, payload) {
    console.debug(`Publishing response on topic ${topic}`)
    await mqttClient.publish(topic, JSON.stringify(payload))
  }

  async _delay (t) {
    return new Promise(function (resolve) {
      setTimeout(resolve, t)
    })
  }
}

module.exports = MqttBridge

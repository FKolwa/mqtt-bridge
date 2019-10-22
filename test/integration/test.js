'use strict'
const axios = require('axios')
const { assert } = require('chai')
const mqtt = require('mqtt')
const MqttBridge = require('../../src/MqttBridge')

/* global describe, before, it */
describe('MqttBridge integration test', () => {
  let mqttBridge

  // A mockup for a client running mqtt
  const mqttClientHost = {
    count: 0,
    responses: {}
  }

  before(async () => {
    // init mqtt client mockup
    mqttClientHost.client = mqtt.connect('mqtt://mqtt-broker')
    mqttClientHost.client.on('connect', () => {
      mqttClientHost.client.subscribe('test/posts/response')
      mqttClientHost.client.subscribe('test/comments/response')
      mqttClientHost.client.subscribe('test/users/response')
    })
    mqttClientHost.client.on('message', (topic, payload) => {
      const topicName = topic.split('/')[1]
      mqttClientHost.responses[topicName] = payload
      mqttClientHost.count += 1
    })

    // setup mqtt bridge
    mqttBridge = await new MqttBridge(
      'mqtt://mqtt-broker',
      'http://http-server',
      [
        'test/posts/post',
        'test/comments/post',
        'test/users/post',
        'test/posts/get',
        'test/comments/get',
        'test/users/get'
      ]
    )
    mqttBridge.addRoute(
      'test/posts/post',
      'http://http-server/posts',
      'post'
    )
    mqttBridge.addRoute(
      'test/comments/post',
      'http://http-server/comments',
      'post'
    )
    mqttBridge.addRoute(
      'test/users/post',
      'http://http-server/users',
      'post'
    )

    mqttBridge.addRoute(
      'test/posts/get',
      'http://http-server/posts',
      'get',
      async (topic, data) => publishPayload(topic, data)
    )
    mqttBridge.addRoute(
      'test/comments/get',
      'http://http-server/comments',
      'get',
      async (topic, data) => publishPayload(topic, data)
    )
    mqttBridge.addRoute(
      'test/users/get',
      'http://http-server/users',
      'get',
      async (topic, data) => publishPayload(topic, data)
    )
  })

  describe('Given a running mqtt-client, broker and http-server', () => {
    it('should be possible to bridge GET calls', async () => {
      mqttClientHost.count = 0
      await mqttClientHost.client.publish('test/posts/get', '')
      await mqttClientHost.client.publish('test/comments/get', '')
      await mqttClientHost.client.publish('test/users/get', '')

      while (mqttClientHost.count < 3) {
        await delay(100)
      }

      assert.isDefined(mqttClientHost.responses.posts)
      assert.isDefined(mqttClientHost.responses.comments)
      assert.isDefined(mqttClientHost.responses.users)
    })

    it('should be possible to bridge POST calls', async () => {
      await mqttClientHost.client.publish('test/posts/post', JSON.stringify({ id: 3, body: 'text' }))
      await mqttClientHost.client.publish('test/comments/post', JSON.stringify({ id: 3, body: 'new', postId: 3 }))
      await mqttClientHost.client.publish('test/comments/post', JSON.stringify({ id: 4, body: 'new', postId: 4 }))
      await mqttClientHost.client.publish('test/users/post', JSON.stringify({ id: 3, body: 'new', userId: 1 }))
      await mqttClientHost.client.publish('test/users/post', JSON.stringify({ id: 4, body: 'new', userId: 2 }))
      await mqttClientHost.client.publish('test/users/post', JSON.stringify({ id: 5, body: 'new', userId: 3 }))

      const postResp = await axios.get('http://http-server/posts')
      const commentResp = await axios.get('http://http-server/comments')
      const userResp = await axios.get('http://http-server/users')

      assert.equal(postResp.data.length, 3)
      assert.equal(commentResp.data.length, 4)
      assert.equal(userResp.data.length, 5)
    })
  })
})

async function delay (t) {
  return new Promise(function (resolve) {
    setTimeout(resolve, t)
  })
}

// helper to publish retrieved information from the http server
async function publishPayload (topic, data) {
  const localMqttClient = mqtt.connect('mqtt://mqtt-broker')
  const reponseTopic = topic.replace(/get/g, 'response')
  await localMqttClient.publish(reponseTopic, JSON.stringify(data))
}

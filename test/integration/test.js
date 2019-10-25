'use strict'
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
      mqttClientHost.client.subscribe('test/orange/overwrite/response')
      mqttClientHost.client.subscribe('test/dynamic/response')
    })
    mqttClientHost.client.on('message', (topic, payload) => {
      const topicName = topic.split('/')[1]
      mqttClientHost.responses[topicName] = JSON.parse(payload)
      mqttClientHost.count += 1
    })

    // init mqtt bridge
    mqttBridge = new MqttBridge()
    await mqttBridge.connect('mqtt://mqtt-broker')
  })

  describe('Given a running mqtt-client, broker and http-server', () => {
    it('should be possible to create a connection from a config file', async () => {
      await mqttBridge.connectWithConfig('/app/test/fixtures/config.yml')

      const routes = mqttBridge.getRoutes()
      assert.deepEqual(Object.keys(routes), [
        'test/posts/post',
        'test/comments/post',
        'test/users/post',
        'test/posts/get',
        'test/comments/get',
        'test/users/get',
        'test/dynamic'
      ])
    })

    it('should be possible to create custom callbacks', async () => {
      mqttClientHost.count = 0

      // add a new route with custom callback
      mqttBridge.addRoute(
        'apple',
        'http://http-server/apple',
        {
          method: 'get',
          callback: (client, topic, payload) => publishPayload(client, topic, payload)
        }
      )

      // Execute GET on new route
      await mqttClientHost.client.publish('apple', '')

      // Wait for GET request to resolve
      while (mqttClientHost.count < 1) {
        await delay(100)
      }
      assert.isDefined(mqttClientHost.responses.orange)
    })

    it('should be possible to bridge GET calls', async () => {
      mqttClientHost.count = 0
      // Get
      await mqttClientHost.client.publish('test/posts/get', '')
      await mqttClientHost.client.publish('test/comments/get', '')
      await mqttClientHost.client.publish('test/users/get', '')

      // Wait for GET requests to resolve
      while (mqttClientHost.count < 3) {
        await delay(100)
      }

      assert.isDefined(mqttClientHost.responses.posts)
      assert.isDefined(mqttClientHost.responses.comments)
      assert.isDefined(mqttClientHost.responses.users)
    })

    it('should be possible to bridge POST calls', async () => {
      mqttClientHost.count = 0
      // Post
      await mqttClientHost.client.publish('test/posts/post', JSON.stringify({ id: 3, body: 'text' }))
      await mqttClientHost.client.publish('test/comments/post', JSON.stringify({ id: 3, body: 'new', postId: 3 }))
      await mqttClientHost.client.publish('test/comments/post', JSON.stringify({ id: 4, body: 'new', postId: 4 }))
      await mqttClientHost.client.publish('test/users/post', JSON.stringify({ id: 3, body: 'new', userId: 1 }))
      await mqttClientHost.client.publish('test/users/post', JSON.stringify({ id: 4, body: 'new', userId: 2 }))
      await mqttClientHost.client.publish('test/users/post', JSON.stringify({ id: 5, body: 'new', userId: 3 }))

      // Get
      await mqttClientHost.client.publish('test/posts/get', '')
      await mqttClientHost.client.publish('test/comments/get', '')
      await mqttClientHost.client.publish('test/users/get', '')

      // Wait for GET requests to resolve
      while (mqttClientHost.count < 3) {
        await delay(100)
      }

      assert.equal(mqttClientHost.responses.posts.length, 3)
      assert.equal(mqttClientHost.responses.comments.length, 4)
      assert.equal(mqttClientHost.responses.users.length, 5)
    })

    it('should be possible to bridge dynamic calls', async () => {
      mqttClientHost.count = 0

      // put request on posts/1
      await mqttClientHost.client.publish('test/dynamic', JSON.stringify({ method: 'put', url: 'http://http-server/posts/1', data: { id: 1, body: 'newText' } }))
      // delete request on posts/3
      await mqttClientHost.client.publish('test/dynamic', JSON.stringify({ method: 'delete', url: 'http://http-server/posts/3' }))

      // Get
      await mqttClientHost.client.publish('test/posts/get', '')

      // Wait for GET requests to resolve
      while (mqttClientHost.count < 1) {
        await delay(100)
      }

      assert.equal(mqttClientHost.responses.posts.length, 2)
      assert.equal(mqttClientHost.responses.posts[0].body, 'newText')
    })
  })
})

async function delay (t) {
  return new Promise(function (resolve) {
    setTimeout(resolve, t)
  })
}

// helper to publish retrieved information from the http server
async function publishPayload (mqttClient, _, payload) {
  const overwrittenReponseTopic = 'test/orange/overwrite/response'
  console.debug(`Publishing response on topic ${overwrittenReponseTopic}`)
  await mqttClient.publish(overwrittenReponseTopic, JSON.stringify(payload))
}

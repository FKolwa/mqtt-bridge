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
    })
    mqttClientHost.client.on('message', (topic, payload) => {
      const topicName = topic.split('/')[1]
      mqttClientHost.responses[topicName] = JSON.parse(payload)
      mqttClientHost.count += 1
    })
  })

  describe('Given a running mqtt-client, broker and http-server', () => {
    it('should be possible setup MqttBridge instance', async () => {
      mqttBridge = new MqttBridge()
      // test connection
      const connected = await mqttBridge.connect(
        'mqtt://mqtt-broker',
        'http://http-server'
      )
      assert.isTrue(connected)
    })

    it('should be possible subscribe and create routes', async () => {
      mqttBridge.subscribe([
        'test/posts/post',
        'test/comments/post',
        'test/users/post',
        'test/posts/get',
        'test/comments/get',
        'test/users/get'
      ])
      mqttBridge.addRoute(
        'test/posts/post',
        'http://http-server/posts',
        { method: 'post' }
      )
      mqttBridge.addRoute(
        'test/comments/post',
        'http://http-server/comments',
        { method: 'post' }
      )
      mqttBridge.addRoute(
        'test/users/post',
        'http://http-server/users',
        { method: 'post' }
      )

      mqttBridge.addRoute(
        'test/posts/get',
        'http://http-server/posts',
        {
          method: 'get',
          responseTopic: 'test/posts/response'
        }
      )
      mqttBridge.addRoute(
        'test/comments/get',
        'http://http-server/comments',
        {
          method: 'get',
          responseTopic: 'test/comments/response'
        }
      )
      mqttBridge.addRoute(
        'test/users/get',
        'http://http-server/users',
        {
          method: 'get',
          responseTopic: 'test/users/response'
        }
      )

      const routes = mqttBridge.getRoutes()
      assert.deepEqual(Object.keys(routes), [
        'test/posts/post',
        'test/comments/post',
        'test/users/post',
        'test/posts/get',
        'test/comments/get',
        'test/users/get'
      ])
    })

    it('should be possible to pass custom callbacks for get calls', async () => {
      mqttClientHost.count = 0

      mqttBridge.subscribe(['apple'])
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

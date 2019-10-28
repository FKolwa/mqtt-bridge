mqtt-bridge
===========
A MQTT to REST bridge.

How to install
--------------
**Node**
Just run `npm install` from the main directory of this repository.

**Docker**
Build the Dockerfile contained in the main directory by running `docker build .
-t mqtt-broker`.

How to configure
----------------
The easiest way to configure individual mqtt to REST mappings is by defining
routes in the config file.

**config.yml structure**
The config file consists of three main properties:
- mqttHost
- mqttOptions
- routes

**mqttHost**
This sets the host address of the mqtt broker.

**mqttOptions (optional)**
Additional options that are passed to the mqtt client running in the
brackground.

**routes**
The routing definition that maps mqtt topics to REST calls.
A route definition follows this structure:

    <TOPIC_NAME>
      dynamic: <BOOLEAN>
      route: '<STRING>'
      method: '<STRING>'
      responseTopic: '<STRING>'

*dynamic*
Dynamic routes execute flexible REST calls based on individual mqtt messages.
These routes ignore the method and route properties and create requests based on
their message payload.
If a route is defined as dynamic the mqtt-bridge expects a valid request body in
JSON format as `STRING` payload.
Mosquitto example:
    mosquitto_pub -h localhost -t example/topic/dynamic -m '{"method": "get", "url": "https://jsonplaceholder.typicode.com/albums/1"}'

*route*
Defines the REST endpoint.

*method*
REST method:
- 'get'
- 'post'
- 'put'
- 'delete'

*responseTopic*
If set the REST response is published on this topic.
If not set the response is published on the topic `<TOPIC_NAME>/response`.

**Example config.yml**

    ---
    mqttHost: 'mqtt://localhost'
    routes:
      # this route will respond on the default topic example/topic/response
      example/topic/get:
        route: 'https://jsonplaceholder.typicode.com/albums/1'
        method: 'get'
      # this route will publish any response on custom/topic/response
      example/topic/custom/get:
        route: 'https://jsonplaceholder.typicode.com/albums/2'
        responseTopic: 'custom/topic/response'
        method: 'get'
      # example for post
      example/topic/post:
        route: 'https://jsonplaceholder.typicode.com/albums'
        method: 'post'
      # example for dynamic routing
      example/topic/dynamic:
        dynamic: true


You can find this example configuration in `./config.yml`.

How to run
----------
**Node**
Run `node index.js`.
Info:
The example app in index.js expects a config.yml file located in the main
directory.

**Docker**
Run the previously build docker image.
Example: `docker run --net=host mqtt-bridge`

To dynamically load config files volume mount your local config to `/app/config.yml`
Example: `docker run --net=host -v $(pwd)/cusom-config.yml:/app/config.yml mqtt-bridge`

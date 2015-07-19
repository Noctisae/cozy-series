# create a bridge beween couchdb events and socket.io
# app : the express server object, or a server: httpServer Object
# patterns : the patterns to subscribe

# Return an object with method
# on(pattern, callback(event, id)) to register custom callbacks

path = require 'path'
fs = require 'fs'
sio = require 'socket.io'
axon = require 'axon'
log = require('printit')
    prefix: 'realtime-adapter'
    date: false

module.exports = (server, patterns, options) ->

    # Bind socket.io on HTTP server
    options ?= {}
    options.serveClient = true
    server.io = sio server, options

    # start axon's socket
    socket = axon.socket 'sub-emitter'
    socket.connect 9105

    log.info 'socket.io initialized'


    # default callback simply proxies the event to all clients through socketio
    defaultCallback = (change, msg) -> server.io.emit change, msg


    # add a callback
    registerCallback = (pattern, callback) ->
        log.debug "registered callback for pattern #{pattern}"
        socket.on pattern, (event, id) ->
            if id
                event = pattern.replace '*', event # axon is too smart
                callback event, id
            else
                callback pattern, event


    # register default patterns
    patterns ?= []
    for pattern in patterns
        registerCallback pattern, defaultCallback

    return on: registerCallback

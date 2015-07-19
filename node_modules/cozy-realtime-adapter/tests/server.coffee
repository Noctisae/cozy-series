express = require 'express'
expect = require ''
http = require 'http'
Client = require('request-json').JsonClient
initializer = require '../src/server.coffee'

describe 'Serve client file', ->

    before (done) ->

        app = express()
        app.get '/test', (req, res) -> res.send 'hey'

        @server = http.createServer app
        initializer server: @server

        port = process.env.PORT or 6666
        host = process.env.HOST or "127.0.0.1"

        @client = new Client "http://#{host}:#{port}/"

        @server.listen port, host, done

    after -> @server.close()

    it 'should let request go', (done) ->
        client.get 'test', (err, res, body) ->
            expect(body).to.equal 'hey'
            done()

    it 'should serve client under its url', (done) ->
        client.get 'cozy-realtime-adapter.js', (err, res, body) ->
            expect(err).to.be.null
            done()
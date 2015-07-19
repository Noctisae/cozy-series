{exec} = require 'child_process'

task 'tests', 'run tests', ->
    command  = "mocha tests/client.coffee tests/server.coffee"
    command += "--compilers coffee:coffee-script --colors"
    exec command

task 'build', 'build src into lib', ->
    exec "coffee --output lib --compile src"

task 'cpclient', 'copy client in brunch vendors', ->
    command  = "cp lib/client.js "
    command += "../../client/vendor/scripts/socketlistener-0.0.3.js"
    exec command

task 'cpclient-editor', 'copy client in brunch vendors for the editor', ->
  command  = "cp lib/client.js "
  command += "../../../vendor/scripts/socketlistener-0.0.3.js"
  exec command
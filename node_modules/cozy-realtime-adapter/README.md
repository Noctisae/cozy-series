# Realtime adapter

Helper library for interaction with cozy-data-system data changes notifications

##Server-Side : Axon -> Socket.io

Usage :

```javascript
americano.start(options, function(app, server){
    app.server = server

    RealtimeAdapter = require('cozy-realtime-adapter')

    // notification events should be proxyed to client
    realtime = RealtimeAdapter(app, ['notification.*']);
    
    // custom callback for alarm events
    realtime.on('alarm.*', function(event, msg){
        // event = 'alarm.update' or 'alarm.create' or 'alarm.delete'
        // msg = id of the updated alarm
    });
});
```


##Client-Side : Socket.io -> Backbone Models manipulations

Basic Usage :

```html
<script src="cozy-realtime-adapter.js"></script>
```

```coffee
class SocketListener extends CozySocketListener

    models:
        'notification': Notification

    events: [
        'notification.create', 'notification.update', 'notification.delete'
    ]

    onRemoteCreate: (model) ->
        @collection.add model if # should model be in @collection ?

    onRemoteDelete: (model) ->
        @collection.remove model

sl = new SocketListener()

sl.watch myNotificationCollection
```

For more complex usages, refer to the code of cozy applications


## What is Cozy?

![Cozy Logo](https://raw.github.com/mycozycloud/cozy-setup/gh-pages/assets/images/happycloud.png)

[Cozy](http://cozy.io) is a platform that brings all your web services in the
same private space.  With it, your web apps and your devices can share data
easily, providing you
with a new experience. You can install Cozy on your own hardware where no one
profiles you. You install only the applications you want. You can build your
own one too.

## Community 

You can reach the Cozy community via various support:

* IRC #cozycloud on irc.freenode.net
* Post on our [Forum](https://groups.google.com/forum/?fromgroups#!forum/cozy-cloud)
* Post issues on the [Github repos](https://github.com/mycozycloud/)
* Via [Twitter](http://twitter.com/mycozycloud)

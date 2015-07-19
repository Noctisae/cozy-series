class CozySocketListener

    models: {}
    events: []

    shouldFetchCreated: (id) -> true
    onRemoteCreate: (model) ->

    onRemoteUpdate: (model, collection) ->
    onRemoteDelete: (model, collection) ->

    constructor: () ->
        try
            @connect()
        catch err
            console.log "Error while connecting to socket.io"
            console.log err.stack

        @collections = []
        @singlemodels = new Backbone.Collection()

        @stack = []
        @ignore = []
        @paused = 0

    connect: ->
        url = window.location.origin
        pathToSocketIO = "/#{window.location.pathname.substring(1)}socket.io"
        socket = io.connect url, path: pathToSocketIO

        for event in @events
            socket.on event, @callbackFactory(event)

    watch: (collection) ->
        #shortcut for app with a single collection
        @collection = collection if @collections.length is 0

        @collections.push collection
        collection.socketListener = this
        @watchOne collection

    stopWatching: (toRemove) ->
        for collection, i in @collections
            if collection is toRemove
                return @collections.splice i, 1

    watchOne: (model) ->
        @singlemodels.add model
        model.on 'request', @pause
        model.on 'sync', @resume
        model.on 'destroy', @resume
        model.on 'error', @resume

    pause: (model, xhr, options) =>
        if options.ignoreMySocketNotification

            operation = if model.isNew() then 'create' else 'update'

            doctype = @getDoctypeOf model

            return unless doctype?

            @ignore.push
                doctype:   doctype,
                operation: operation,
                model:     model

            @paused = @paused + 1

    resume: (model, resp, options) =>
        if options.ignoreMySocketNotification
            @paused = @paused - 1
            if @paused <= 0
                @processStack()
                @paused = 0

    getDoctypeOf: (model) ->
        for key, Model of @models
            return key if model instanceof Model

    cleanStack: ->
        ignoreIndex = 0
        while ignoreIndex < @ignore.length
            removed = false
            stackIndex = 0
            ignoreEvent = @ignore[ignoreIndex]

            while stackIndex < @stack.length
                stackEvent = @stack[stackIndex]
                if stackEvent.operation is ignoreEvent.operation and \
                          stackEvent.id is ignoreEvent.model.id
                    @stack.splice stackIndex, 1
                    removed = true
                    break
                else
                    stackIndex++

            if removed
                @ignore.splice ignoreIndex, 1
            else
                ignoreIndex++

    callbackFactory: (event) => (id) =>
        [doctype, operation] = event.split '.'
        fullevent = id: id, doctype: doctype, operation: operation

        @stack.push fullevent
        @processStack() if @paused == 0

    processStack: =>
        @cleanStack()

        while @stack.length > 0
            @process @stack.shift()

    process: (event) ->
        {doctype, operation, id} = event
        switch operation
            when 'create'
                return unless @shouldFetchCreated(id)
                model = new @models[doctype](id: id)
                model.fetch
                    success: (fetched) =>
                        @onRemoteCreate fetched

            when 'update'
                if model = @singlemodels.get id
                    model.fetch
                        success: (fetched) =>
                            if fetched.changedAttributes()
                                @onRemoteUpdate fetched, null

                @collections.forEach (collection) =>
                    return unless model = collection.get id
                    model.fetch
                        success: (fetched) =>
                            if fetched.changedAttributes()
                                @onRemoteUpdate fetched, collection

            when 'delete'
                if model = @singlemodels.get id
                    @onRemoteDelete model, @singlemodels

                @collections.forEach (collection) =>
                    return unless model = collection.get id
                    @onRemoteDelete model, collection

global = module?.exports or window
global.CozySocketListener = CozySocketListener

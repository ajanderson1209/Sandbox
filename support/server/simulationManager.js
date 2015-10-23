var messageCompress = require('../client/lib/messageCompress')
    .messageCompress;
var simClient = function(sandboxClient, simulationManager)
{
    this.manager = simulationManager;
    this.sandboxClient = sandboxClient;
    this.nodesSimulating = [];
    this.startSimulatingScene = function()
    {
        var nodes = this.manager.world.state.children('index-vwf')
        for (var i = 0; i < nodes.length; i++)
        {
            if (this.nodesSimulating.indexOf(nodes[i]) == -1)
                this.nodesSimulating.push(nodes[i])
        }
        this.sendStartSimMessage('index-vwf');
    }
    this.startSimulatingNode = function(nodeID)
    {
        if (this.manager.world.state.findNode(nodeID))
        {
            if (this.nodesSimulating.indexOf(nodeID) == -1)
            {
                this.nodesSimulating.push(nodeID)
                this.sendStartSimMessage(nodeID);
            }
        }
    }
    this.isSimulating = function(nodeid)
    {
        return this.nodesSimulating.indexOf(nodeid) !== -1;
    }
    this.stopSimulatingNode = function(nodeID)
    {
        if (this.manager.world.state.findNode(nodeID))
        {
            if (this.nodesSimulating.indexOf(nodeID) != -1)
            {
                this.nodesSimulating.splice(this.nodesSimulating.indexOf(nodeID), 1)
                this.sendStopSimMessage(nodeID);
            }
        }
        
    }
    this.sendStopSimMessage = function(nodeID)
    {
        this.sandboxClient.emit('m', this.manager.world.messageCompress.pack(JSON.stringify(
        {
            "action": "stopSimulating",
            "parameters": [nodeID],
            "time": this.manager.world.time
        })));
    }
    this.sendStartSimMessage = function(nodeID)
    {
       
        this.sandboxClient.emit('m', this.manager.world.messageCompress.pack(JSON.stringify(
        {
            "action": "startSimulating",
            "parameters": [nodeID],
            "time": this.manager.world.time
        })));
    }
}
var simulationManager = function(world)
{
    this.world = world;
    this.clients = {};
    this.observers = {};
    this.clientControlTable = {}; //learn which clients need to simulate locally most
    //once a second look for client that most needs to simulate a node, and change owners
    var self = this;
   
    this.postLearnedMappings = function()
    {
        
        for (var i in this.clientControlTable)
        {
            if (!this.getClientForNode(i))
            {
                console.log("no client for " + i);
                continue;
            }
            for (var j in this.clientControlTable[i])
                this.clientControlTable[i][j] = Math.pow(this.clientControlTable[i][j], .99); // approach 0
            var max = 0;
            var controllingClient = null;
            for (var j in this.clientControlTable[i])
            {
                if (this.clientControlTable[i][j] > max)
                {
                    max = this.clientControlTable[i][j];
                    controllingClient = j;
                }
            }
            if (controllingClient !== this.getClientForNode(i).sandboxClient.id)
            {
                if(this.getClientForNode(i))
                    this.getClientForNode(i).stopSimulatingNode(i);
                
                this.clients[controllingClient].startSimulatingNode(i)
                console.log('moving ' + i + " to " + controllingClient);
            }
        }
    }.bind(this);
    this.postLearnedMappingsHandle = setInterval(this.postLearnedMappings, 1000);
    this.addClient = function(sandboxClient)
    {
        console.log("simulationManager.addClient " + sandboxClient.id )
        var newClient = new simClient(sandboxClient, this);
        if(sandboxClient.isAnonymous() && !this.world.state.metadata.publishSettings.allowAnonymous)
        {
            this.observers[sandboxClient.id] = newClient;
            console.log(sandboxClient.id + " is isAnonymous. Not distributing")
            return;
        }
        //must add to list to get proper average load, then remove so we don't keep distributing
        //nodes from new client to new client
        this.clients[sandboxClient.id] = newClient;
       
        var average = this.clientAverageLoad();
        delete this.clients[sandboxClient.id];
        var counter = 0;
        var errorTimeout = 100;
        if(this.world.state.nodes["index-vwf"])
            errorTimeout =  Object.keys(this.world.state.nodes["index-vwf"].children).length;
        //divide up work distribute until new client shares load
        while (newClient.nodesSimulating.length < average -1 && errorTimeout)
        {
            
            var nextClient = this.clients[Object.keys(this.clients)[counter]];
            var node = nextClient.nodesSimulating[0];
            if (node)
            {
                nextClient.stopSimulatingNode(node);
                newClient.startSimulatingNode(node);
                counter++;
                counter = counter % this.clientCount();
            }
            errorTimeout--;
        }
        if(errorTimeout == 0)
        {
            console.log("Error redistributing nodes");
        }
        this.clients[sandboxClient.id] = newClient;
    }
    this.clientCount = function()
    {
        return (Object.keys(this.clients).length);
    }
    this.removeClient = function(sandboxClient)
    {
        if(this.observers[sandboxClient.id])
        {
            delete this.observers[sandboxClient.id];
            return;
        }
        var oldNodes = this.clients[sandboxClient.id].nodesSimulating;
        delete this.clients[sandboxClient.id];
        //redistribute the nodes the client had been simulating
        
        for (var i in this.clientControlTable)
        {
            if(this.clientControlTable[i][sandboxClient.id])
            {
                console.log("remove " + sandboxClient.id +" from " + i)
                delete this.clientControlTable[i][sandboxClient.id];
            }
        }
        this.distribute(oldNodes);
    }
    this.distribute = function(nodes)
    {
        console.log("distribute");
        while (nodes.length)
        {
            for (var i in this.clients)
            {
                var node = nodes.shift();
                if (node)
                    this.clients[i].startSimulatingNode(node);
            }
        }
    }
    this.getClientForNode = function(nodeid)
    {
        for (var i in this.clients)
            if (this.clients[i].isSimulating(nodeid))
                return this.clients[i];
        return null;
    }
    this.clientAverageLoad = function()
    {
        var total = 0
        for (var i in this.clients)
            total += this.clients[i].nodesSimulating.length;
        return total / this.clientCount();
    }
    this.startScene = function()
    {
        this.clients[Object.keys(this.clients)[0]].startSimulatingScene();
    }
    this.nodeCreated = function(nodeid, creatingClient)
    {
        //careful to keep objects in islands by their root
        var rootID = this.world.state.ancestors(nodeid)[1];
        if (!rootID)
        {
            this.clients[creatingClient.id].startSimulatingNode(nodeid);
            console.log(creatingClient.id + " start simulation " + nodeid);
        }
        else
            this.getClientForNode(rootID).startSimulatingNode(nodeid);
    }
    this.nodeDeleted = function(nodeid)
    {
        var client = this.getClientForNode(nodeid);
        if(client)
            client.stopSimulatingNode(nodeid);
        delete this.clientControlTable[nodeid];
    }
    this.updateClientControlTable = function(nodeid, sendingClient)
    {
        if (nodeid == "index-vwf") return;
        var record = this.clientControlTable[nodeid];
        if (!record)
        {
            record = this.clientControlTable[nodeid] = {};
        }
        if (!record[sendingClient.id])
            record[sendingClient.id] = 0;
        record[sendingClient.id] ++;
      
    }
    this.getClientsForMessage = function(message, sendingClient)
    {

        var type = message.action;
        var nodeid = message.node;
        // ancestors[0] should be index-vwf. 1 is the root. 
        //remember that we assign simulation by the root under scene
        var nodeid = this.world.state.ancestors(nodeid)[1] || nodeid;
        var clients = [];
        for (var i in this.clients)
        {
            //don't bother sending state updates back to the person who posted them
            if(message.action == "simulationStateUpdate")
            {
                if(sendingClient != this.clients[i].sandboxClient)
                {
                    clients.push(this.clients[i].sandboxClient) 
                }
            }
            else if (type == 'setProperty' || type == 'callMethod' || type == 'fireEvent')
            {
                if (this.clients[i].isSimulating(nodeid) || nodeid == 'index-vwf')
                    clients.push(this.clients[i].sandboxClient)
                    this.updateClientControlTable(nodeid,sendingClient)
            }
            else
            {
                clients.push(this.clients[i].sandboxClient);
            }
        }
        for (var i in this.observers)
        {
            //don't bother sending state updates back to the person who posted them
            if(message.action == "simulationStateUpdate")
            {
                clients.push(this.observers[i].sandboxClient) 
            }
            else if (type == 'setProperty' || type == 'callMethod' || type == 'fireEvent')
            {
              
            }
            else
            {
                clients.push(this.observers[i].sandboxClient);
            }
        }
        return clients;
    }
    this.shutdown = function()
    {
        clearInterval(this.postLearnedMappingsHandle);
    }
}
exports.simulationManager = simulationManager;
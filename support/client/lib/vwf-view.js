/*Copyright 2012 Lockheed Martin

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */
( function( modules, namespace ) {

    window.console && console.info && console.info( "loading " + namespace );

    // vwf-view.js is the common implementation of all Virtual World Framework views. Views
    // interpret information from the simulation, present it to the user, and accept user input
    // influencing the simulation.
    //
    // Views are outside of the simulation. Unlike models, they may accept external input--such as
    // pointer and key events from a user--but may only affect the simulation indirectly through the
    // synchronization server.
    // 
    // vwf-view, as well as all deriving views, is constructed as a JavaScript module
    // (http://www.yuiblog.com/blog/2007/06/12/module-pattern). It attaches to the vwf modules list
    // as vwf.modules.view.

    var module = modules[namespace.split(".").pop()] = function( vwf ) {

        if ( ! vwf ) return;

        vwf.logger.info( "creating " + namespace );

        this.vwf = vwf;
        this.namespace = namespace;

    };

    // == Stimulus API =============================================================================

    // The base view stands between the VWF manager and the deriving view classes. API calls pass
    // through in two directions. Calls from a deriving view to the manager are commands, causing
    // change. These calls are the stimulus half of the API.
    // 
    // Since views can't directly manipulate the simulation, stimulus calls are sent via the manager
    // to the replication server. Future development will move some functionality from the deriving
    // views to provide a common service for mapping between vwf and view object identifiers.

    // -- createNode -------------------------------------------------------------------------------

    module.prototype.createNode = function( nodeID, childComponent, childName ) {
        vwf.logger.info( namespace + ".createNode " + nodeID + " " + childComponent + " " + childName );
        vwf.send( nodeID, "createNode", undefined, [ childComponent, childName ], 0 );  // TODO: swap childComponent & childName
    };

    // -- deleteNode -------------------------------------------------------------------------------

    module.prototype.deleteNode = function( nodeID ) {
        vwf.logger.info( namespace + ".deleteNode " + nodeID );
        vwf.send( nodeID, "deleteNode", undefined, undefined, 0 );
    };

    // -- addChild ---------------------------------------------------------------------------------

    module.prototype.addChild = function( nodeID, childID, childName ) {
        vwf.logger.info( namespace + ".addChild " + nodeID + " " + childID + " " + childName );
        vwf.send( nodeID, "addChild", undefined, [ childID, childName ], 0 );
    };

    // -- removeChild ------------------------------------------------------------------------------

    module.prototype.removeChild = function( nodeID, childID ) {
        vwf.logger.info( namespace + ".removeChild " + nodeID + " " + childID );
        vwf.send( nodeID, "removeChild", undefined, [ childID ], 0 );
    };

    // -- createProperty ---------------------------------------------------------------------------

    module.prototype.createProperty = function( nodeID, propertyName, propertyValue ) {
        vwf.logger.info( namespace + ".createProperty " + nodeID + " " + propertyName + " " + propertyValue );
        vwf.send( nodeID, "createProperty", propertyName, [ propertyValue ], 0 );
    };

    // TODO: deleteProperty

    // -- setProperty ------------------------------------------------------------------------------

    module.prototype.setProperty = function( nodeID, propertyName, propertyValue ) {
        vwf.logger.info( namespace + ".setProperty " + nodeID + " " + propertyName + " " + propertyValue );
        vwf.send( nodeID, "setProperty", propertyName, [ propertyValue ], 0 );
    };

    // -- getProperty ------------------------------------------------------------------------------

    module.prototype.getProperty = function( nodeID, propertyName, propertyValue ) {
        vwf.logger.info( namespace + ".getProperty " + nodeID + " " + propertyName + " " + propertyValue );
        vwf.send( nodeID, "getProperty", propertyName, undefined, 0 );
    };
    
    // -- createMethod -----------------------------------------------------------------------------

    module.prototype.createMethod = function( nodeID, methodName, methodParameters, methodBody ) {
        vwf.logger.info( namespace + ".createMethod " + nodeID + " " + methodName + " " + methodParameters );
        vwf.send( nodeID, "createMethod", methodName, [ methodParameters, methodBody ], 0 );
    };

    // TODO: deleteMethod

    // -- callMethod -------------------------------------------------------------------------------

    module.prototype.callMethod = function( nodeID, methodName, methodParameters ) {
        vwf.logger.info( namespace + ".callMethod " + nodeID + " " + methodName + " " + methodParameters );
        vwf.send( nodeID, "callMethod", methodName, [ methodParameters ], 0 );
    };

    // -- createEvent ------------------------------------------------------------------------------

    module.prototype.createEvent = function( nodeID, eventName, eventParameters ) {
        vwf.logger.info( namespace + ".createEvent " + nodeID + " " + eventName + " " + eventParameters );
        vwf.send( nodeID, "createEvent", eventName, [ eventParameters ], 0 );
    };

    // TODO: deleteEvent

    // -- fireEvent --------------------------------------------------------------------------------

    module.prototype.fireEvent = function( nodeID, eventName, eventParameters ) {
        vwf.logger.info( namespace + ".fireEvent " + nodeID + " " + eventName + " " + eventParameters );
        vwf.send( nodeID, "fireEvent", eventName, [ eventParameters ], 0 );
    };
    
    // -- dispatchEvent ----------------------------------------------------------------------------

    module.prototype.dispatchEvent = function( nodeID, eventName, eventParameters, eventNodeParameters ) {
        vwf.logger.info( namespace + ".dispatchEvent " + nodeID + " " + eventName + " " + eventParameters + " " + eventNodeParameters );
        vwf.send( nodeID, "dispatchEvent", eventName, [ eventParameters, eventNodeParameters ], 0 );
    };
    
    // -- execute ----------------------------------------------------------------------------------

    module.prototype.execute = function( nodeID, scriptText, scriptType ) {
        vwf.logger.info( namespace + ".execute " + nodeID + " " + ( scriptText || "" ).substring( 0, 100 ) + " " + scriptType );
        vwf.send( nodeID, "execute", undefined, [ scriptText, scriptType ], 0 );
    };

    // -- time -------------------------------------------------------------------------------------

    module.prototype.time = function() {
        return vwf.time(); 
    };

// TODO: implement two paths for stimulus functions: if callback provided, send and serialize onto queue and return value via callback when complete; otherwise, for read functions only, make direct call to vwf to get current state (which will be in past wrt serialized calls); time() does only the second case; the others only do the first case but don't return the result.

    // == Response API =============================================================================

    // Calls from the manager to a deriving view are notifications, informing of change. These calls
    // are the response half of the API.

    // Views generally handle a response by updating a UI element to reflect the internal state
    // change in the simulation.

    // Each of these implementations provides the default, null response. A deriving view only needs
    // to implement the response handlers that it needs for its work. These will handle the rest.

    // -- createdNode ------------------------------------------------------------------------------

    module.prototype.createdNode = function( nodeID, childID, childExtendsID, childImplementsIDs,
        childSource, childType, childName, callback /* ( ready ) */ ) {

        vwf.logger.info( namespace + ".createdNode " + nodeID + " " + childID + " " + childExtendsID + " " +  childImplementsIDs + " " +
            childSource + " " +  childType + " " + childName );
    };

    // -- deletedNode ------------------------------------------------------------------------------

    module.prototype.deletedNode = function( nodeID ) {
        vwf.logger.info( namespace + ".deletedNode " + nodeID );
    };


    // -- addedChild -------------------------------------------------------------------------------

    module.prototype.addedChild = function( nodeID, childID, childName ) {
        vwf.logger.info( namespace + ".addedChild " + nodeID + " " + childID + " " + childName );
    };

    // -- removedChild -----------------------------------------------------------------------------

    module.prototype.removedChild = function( nodeID, childID ) {
        vwf.logger.info( namespace + ".removedChild " + nodeID + " " + childID );
    };

    // -- createdProperty --------------------------------------------------------------------------

    module.prototype.createdProperty = function( nodeID, propertyName, propertyValue ) {
        vwf.logger.info( namespace + ".createdProperty " + nodeID + " " + propertyName + " " + propertyValue );
    };

    // -- initializedProperty ----------------------------------------------------------------------

    module.prototype.initializedProperty = function( nodeID, propertyName, propertyValue ) {
        vwf.logger.info( namespace + ".initializedProperty " + nodeID + " " + propertyName + " " + propertyValue );
    };

    // TODO: deletedProperty

    // -- satProperty ------------------------------------------------------------------------------

    // Please excuse the horrible grammar. It needs to be a past tense verb distinct from the
    // present tense command that invokes the action.

    module.prototype.satProperty = function( nodeID, propertyName, propertyValue ) {
        vwf.logger.info( namespace + ".satProperty " + nodeID + " " + propertyName + " " + propertyValue );
    };

    // -- gotProperty ------------------------------------------------------------------------------

    module.prototype.gotProperty = function( nodeID, propertyName, propertyValue ) {
        vwf.logger.info( namespace + ".gotProperty " + nodeID + " " + propertyName + " " + propertyValue );
    };

    // -- createdMethod ----------------------------------------------------------------------------

    module.prototype.createdMethod = function( nodeID, methodName, methodParameters, methodBody ) {
        vwf.logger.info( namespace + ".createdMethod " + nodeID + " " + methodName + " " + methodParameters );
    };

    // TODO: deletedMethod

    // -- calledMethod -----------------------------------------------------------------------------

    module.prototype.calledMethod = function( nodeID, methodName, methodParameters ) {
        vwf.logger.info( namespace + ".calledMethod " + nodeID + " " + methodName + " " + methodParameters );
    };

    // -- createdEvent -----------------------------------------------------------------------------

    module.prototype.createdEvent = function( nodeID, eventName, eventParameters ) {
        vwf.logger.info( namespace + ".createdEvent " + nodeID + " " + eventName + " " + eventParameters );
    };

    // TODO: deletedEvent

    // -- calledEvent ------------------------------------------------------------------------------

    module.prototype.firedEvent = function( nodeID, eventName, eventParameters ) {
        vwf.logger.info( namespace + ".firedEvent " + nodeID + " " + eventName + " " + eventParameters );
    };

    // -- executed ---------------------------------------------------------------------------------

    module.prototype.executed = function( nodeID, scriptText, scriptType ) {
        vwf.logger.info( namespace + ".executed " + nodeID + " " + ( scriptText || "" ).replace( /\s+/g, " " ).substring( 0, 100 ) + " " + scriptType );
    };

    // -- ticked -----------------------------------------------------------------------------------

    module.prototype.ticked = function( time ) {
    };

} ) ( window.vwf.modules, "vwf.view" );

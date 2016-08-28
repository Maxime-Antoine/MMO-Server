(function(){
	var io = require('socket.io')(process.env.PORT || 3000);
	var shortId = require('shortid');
	
	console.log('server started');
	
	var players = [];
	
	io.on('connection', function(socket){
		//create player obj
		var clientId = shortId.generate();
		var player = {
			id: clientId,
			targetPosition: {
				x: 0, y: 0, z: 0
			}
		};
		players[clientId] = player;
	
		//------------------------------ spawn logic -------------------------------------
		//emit spawn and request position to all other connected players
		console.log('client connected - broadcasting spawn - id: ' + clientId);

		socket.emit('register', { id: clientId});
		socket.broadcast.emit('spawn', player);
		socket.broadcast.emit('requestPosition');
		
		//emit spawn for each connected player
		for (var playerId in players){
			if (playerId != clientId) {
				socket.emit('spawn', players[playerId]);
				console.log('sending spawn new player for id: ' + playerId);
			}
		}
		
		//---------------------------- event handlers ------------------------------------
		socket.on('move', function(data){
			data.id = clientId;
			console.log('client moving to: ' + JSON.stringify(data));
			
			//update position
			player.targetPosition.x = data.x;
			player.targetPosition.y = data.y;
			player.targetPosition.z = data.z;
			
			socket.broadcast.emit('move', player);
		});
		
		socket.on('updatePosition', function(data){
			data.id = clientId;
			console.log('Update position: ' + JSON.stringify(data));
			
			socket.broadcast.emit('updatePosition', data);
		});
		
		socket.on('follow', function(data){
			data.id = clientId;
			console.log('Follow request: ' + JSON.stringify(data));
			
			socket.broadcast.emit('follow', data);
		});
		
		socket.on('attack', function(data){
			console.log('attack request: ', data);
			data.id = clientId;
			
			io.emit('attack', data);
		});
		
		//on player disconnect
		socket.on('disconnect', function(){
			console.log('client disconnected - id: ' + clientId);
			delete players[clientId];
			
			socket.broadcast.emit('clientDisconnected', { id: clientId });
		});
	});
})();
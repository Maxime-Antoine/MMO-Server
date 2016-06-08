(function(){
	var io = require('socket.io')(process.env.PORT || 3000);
	var shortId = require('shortid');
	
	console.log('server started');
	
	var players = [];
	
	io.on('connection', function(socket){
		var clientId = shortId.generate();
		players.push(clientId);
		
		console.log('client connected - broadcasting spawn - id: ' + clientId);
		
		socket.broadcast.emit('spawn', { id: clientId });

		players.forEach(function(id){ 
			if (id != clientId) {
				socket.emit('spawn', { id: id});
				console.log('sending spawn for new player for id: ' + id);
			}
		});
		
		socket.on('move', function(data){
			data.id = clientId;
			console.log('client moving to: ' + JSON.stringify(data));
			
			socket.broadcast.emit('move', data);
		});
		
		socket.on('disconnect', function(){
			if (players.indexOf != -1) {
				console.log('client disconnected - id: ' + clientId);
				socket.broadcast.emit('clientDisconnected', { id: clientId });
				players.splice(players.indexOf(clientId), 1);
			}
		});
	});
})();
'use strict';

const io = require('socket.io')(process.env.PORT || 3001);
const firebase = require('firebase-admin');
const firebaseCertificate = require('./MMOF-0179c0b56559');

firebase.initializeApp({
    databaseURL: 'https://mmof-f9dec.firebaseio.com',
    credential: firebase.credential.cert(firebaseCertificate)
});

console.log('Server started on port ' + (process.env.PORT || 3001));

const players = [];

io.on('connection', (socket) => {
	//require registration (playerId)
    console.log('client connected - required registration');
    socket.emit('register');

    socket.on('registering', (data) => {
		//create player obj
        let clientId = data.playerId;
        let player = {
            id: clientId,
            targetPosition: {
                x: 0, y: 0, z: 0
            }
        };
        players[clientId] = player;

		//------------------------------ spawn logic -------------------------------------
		//emit spawn and request position to all other connected players
        console.log('client registered with id: ' + clientId + ' - broadcasting spawn');

		//retrieve character saved location and spawn
        firebase.database()
				.ref('/characters/' + clientId + '/location/coordinates')
				.once('value', (snapshot) => {
					let data = snapshot.val();
					if (data){
						player.targetPosition.x = data.x;
						player.targetPosition.y = data.y;
						player.targetPosition.z = data.z;
						console.log('send iddle position at x:' + data.x + ' y:' + data.y + ' z:' + data.z);
						socket.emit('iddlePosition', player);
					}

					socket.broadcast.emit('spawn', player);
					socket.broadcast.emit('requestPosition');
				);

		//emit spawn for each connected player
        for (let playerId in players){
            if (playerId != clientId) {
                socket.emit('spawn', players[playerId]);
                console.log('sending spawn new player for id: ' + playerId);
            }
        }

		//---------------------------- event handlers ------------------------------------
        socket.on('move', (data) => {
            data.id = clientId;
            console.log('client moving to: ' + JSON.stringify(data));

			//update position
            player.targetPosition.x = data.x;
            player.targetPosition.y = data.y;
            player.targetPosition.z = data.z;

            firebase.database()
					.ref('/characters/' + clientId + '/location/coordinates')
					.set({
						x: player.targetPosition.x,
						y: player.targetPosition.y,
						z: player.targetPosition.z
					});

            socket.broadcast.emit('move', player);
        });

        socket.on('iddlePosition', (data) => {
            data.id = clientId;
            console.log('client iddle at: ' + JSON.stringify(data));

			//updatePosition
            player.targetPosition.x = data.x;
            player.targetPosition.y = data.y;
            player.targetPosition.z = data.z;

            firebase.database()
					.ref('/characters/' + clientId + '/location/coordinates')
					.set({
							x: player.targetPosition.x,
							y: player.targetPosition.y,
							z: player.targetPosition.z
					});

            socket.broadcast.emit('iddlePosition', player);
        });

        socket.on('updatePosition', (data) => {
            data.id = clientId;
            console.log('Update position: ' + JSON.stringify(data));

            socket.broadcast.emit('updatePosition', data);
        });

        socket.on('follow', (data) => {
            data.id = clientId;
            console.log('Follow request: ' + JSON.stringify(data));

            socket.broadcast.emit('follow', data);
        });

        socket.on('attack', (data) => {
            console.log('attack request: ', data);
            data.id = clientId;

            io.emit('attack', data);
        });

		//on player disconnect
        socket.on('disconnect', () => {
            console.log('client disconnected - id: ' + clientId);
            delete players[clientId];

            socket.broadcast.emit('clientDisconnected', { id: clientId });
        });
    });
});

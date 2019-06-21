var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var availableChallenges = [];
var currentMatches = [];

var onlineUsers = 0;


io.on('connection', function(socket){
    console.log('a user connected : '+ onlineUsers);

    //websocket listeners:

    //log signed in user
    socket.on('callChallenge', function(msg){
      msg = JSON.parse(msg);
      console.log(msg);
      console.log("available challenge from"+msg['emailAddress']);
      availableChallenges.push(msg);
      socket.join(msg['room']);
      io.to(msg['room']).emit('newRoom', msg['room']);

      io.emit('existChallenger',JSON.stringify(availableChallenges));
  });

    // listen for login
    socket.on('playerLogged', function(msg){
        console.log("user: "+msg+" logged In");
        onlineUsers++;      
    });

      // listen for logout
      socket.on('playerLoggedOut', function(msg){
        console.log("user: "+msg+" logged out");
        onlineUsers--;      
    });

    //listen for challenger list request
    socket.on('findChallenger', function(){
     
      io.emit('available challenges',JSON.stringify(availableChallenges));
  });

    //engage in a challenge
    socket.on('acceptChallenge', function(msg){
        console.log(msg);
        //msg = JSON.parse(msg);
        socket.join(msg['room']);
        currentMatches.push(msg);
    
    io.to(msg['room']).emit("roomStartMatch",JSON.stringify(msg));

    });


    //on score (challenger)
    socket.on('challengerPoint', function(msg){
        console.log(msg);

        io.to(msg['room']).emit('challengerPoint',msg);
        
    });

    //on score (opponent)
    socket.on('opponentPoint', function(msg){
        console.log(msg);
        io.to(msg['room']).emit('opponentPoint',msg);
    });

    //display active games (open rooms)
    socket.on('findRooms',function(){
      io.emit('availableRooms',currentMatches);
    });

    //alert winner
    socket.on('playerWin',function(msg){
      io.to(msg['room']).emit('playerWin',msg);
      console.log(msg);

      availableChallenges = availableChallenges.filter(function( obj ) {
        return obj.room !== msg['room'];
    });
    })

    //add user to room
    socket.on('addUser',function(msg){
      console.log(msg);
      socket.join(msg['room']);
      io.to(msg['room']).emit('welcomUser',msg)
    })

    socket.on('roomMessage',function(msg){
      io.to(msg['room']).emit('roomMessage',msg);
      console.log(msg);
    })

    
   

    
    


  });

http.listen(3000, function(){
  console.log('listening on *:3000');
});
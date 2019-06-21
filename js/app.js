
var app = angular.module('myApp', ["ngRoute"]);
var serverUrl = "http://127.0.0.1/admin-2-gh-pages/php-server/PlayerController.php";


app.config(function($routeProvider) {
  $routeProvider
  .when("/", {
    templateUrl : "scoreboard.html",
    controller : "boardCtrl"
  })
  .when("/foosball", {
    templateUrl : "foosball.html",
    controller:"newGameCtrl"
  })
  
});



app.factory('socket', function ($rootScope) {
    var socket = io.connect('http://localhost:3000');
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {  
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    };
  });


  //service to get logged in user data & update it
app.service('user', function($http,socket,$location) {
   var user = {};

  this.getUser = function (emailAddress,password) {
    $http({
      url:serverUrl+"?q=signIn",
      method: "post",
      data:{

        playerEmail : emailAddress,
        playerPassword : password
      }
    }).then (function mySuccess(response){
     
     

      if (response.data != 'controller fail') {

        socket.emit('playerLogged',response.data['emailAddress']);
        user = response.data;
        $location.path('/foosball');
      }
    },function myError(response){
      alert(response.statusText);

    });

    return user;
  }

  //return user data
  this.currentUser = function () {
    return user;
  }

});

  app.controller('boardCtrl', function($scope,$http,$window,socket) {

    $scope.players;
   

    $scope.getPlayers = function(){
    
      $http({
        url:serverUrl+"?q=getPlayers",
        method: "get"  
      }).then (function mySuccess(response){

       
        $scope.players = response.data;
        return response.data;
    
      },function myError(response){
        alert(response.statusText);
  
      });

    }

    $scope.getPlayers();

  });

  app.controller('LoginCtrl', function($scope,$location,$http,$window,socket,user) {
    $scope.email;
    $scope.password;

    $scope.login = function(){
      if ($scope.email != "" && $scope.password != "") {
          user.getUser($scope.email,$scope.password);
      }
    }
    

  });

  app.controller('RegisterCtrl', function($scope,$http,$window) {

    $scope.username;
    $scope.emailAddress;
    $scope.password;
    $scope.passwordConfirm;


    $scope.checkPasswords = function(){
      if($scope.password != "" && $scope.passwordConfirm != ""){

        if ($scope.password == $scope.passwordConfirm ) {
          document.getElementById('passwordError').style.display='none';
          return true;
        }else{
          document.getElementById('passwordError').style.display='block';
          return false;
        }
      }
    }

    $scope.registerUser = function(){
     if($scope.checkPasswords){
      $http({
        url:serverUrl+"?q=signup",
        method: "post",
        data:{
          playerName : $scope.username,
          playerEmail : $scope.emailAddress,
          playerPassword : $scope.password
        }
      }).then (function mySuccess(response){
       
        console.log(response.data);

        if (response.data != 'controller fail') {
          $window.location.href= 'login.html';
        }
      },function myError(response){
        alert(response.statusText);
  
      });
     }
    }

  });

  


  app.controller('newGameCtrl', function($scope,$http,$window,socket,user,$location) {
    $scope.availbleChallengers ;
    $scope.currentPlayer;
    $scope.maxScore = 5;
    $scope.challengerScore = 0;
    $scope.opponentScore = 0;
    $scope.room;

    $scope.currentChallengeDetails;

    socket.on('roomMessage',function(msg){
      document.getElementById('messages').innerHTML= document.getElementById('messages').append( '<li>'+msg['senderName']+" : "+msg['message']+'</li>');
      document.getElementById('messages').append(msg['senderName']+" : "+msg['message']);
    })
    //listen to challenger updates
    socket.on('roomStartMatch',function(msg){
      
      document.getElementById('challengersList').style.display="none";
      document.getElementById('currentMatch').style.display="block";
      $scope.currentChallengeDetails = JSON.parse(msg);
    });

    //listen to new user joining
    socket.on('welcomUser',function(msg){
      console.log(msg);
      $window.alert(msg['user']+" joined");
    })

      //listen to match start
      socket.on('existChallenger',function(msg){
        $scope.availbleChallengers=JSON.parse(msg);
        console.log($scope.availbleChallengers);
        
      });

      //listen to challenger score
      socket.on('challengerPoint',function(msg){
       
        console.log(msg);
        $scope.challengerScore = msg['player1'];
        $scope.opponentScore = msg['player2'];

        
      });

       //listen to opponent score
       socket.on('opponentPoint',function(msg){
        
        console.log(msg);
        
        $scope.challengerScore = msg['player1'];
        $scope.opponentScore = msg['player2']

        ;
      });

     

      socket.on('newRoom',function(msg){
        console.log(msg);
      })

      //listen for winning player
      socket.on('playerWin',function(msg){
        $window.alert(msg['winner']+' wins !');
        console.log(msg['winner']+' wins !');
        $location.path('/')
        
      })

      

    

      
      $scope.findChallenger = function(){

        $scope.user = user.currentUser();

        socket.emit('findChallenger');
        socket.on('available challenges',function(msg){
          $scope.availbleChallengers=JSON.parse(msg);
          
        });
  
      }
      $scope.findChallenger();

     

    $scope.checkChallengers = function(){
      if($scope.availbleChallengers != null){
        return true;
      }else{
        return false;
      }
    }

    $scope.startMatch = function(challenger){
      $scope.room = challenger['room'] ;
      $scope.currentPlayer ="opponent";
      var data = {
        challengerID : challenger['playerId'],
        challenger : challenger['emailAddress'],
        room : challenger['room'],
        opponentID : $scope.user['playerId'],
        opponent : $scope.user['emailAddress']
        
      };
     
      socket.emit('acceptChallenge',data);
      document.getElementById('challengersList').style.display="none";
      document.getElementById('currentMatch').style.display="block";
    }



    $scope.appendRoomMessages = function(msg){
      console.log(msg);
    }

    $scope.sendRoomMessage = function(){
      
      var text = document.getElementById('m').value;
      socket.emit('roomMessage',{

        room : $scope.currentChallengeDetails['room'],
        sender : $scope.user['playerId'],
        senderName : $scope.user['emailAddress'],
        message : text

      });
      document.getElementById('m').value = '';

    }
    

    $scope.sendChallenge = function(){
      var challengeAlreadysent = false;
      
      $scope.availbleChallengers.forEach(challenger => {
        if (challenger['playerId'] == $scope.user['playerId']) {
          $window.alert('You have already sent out a challenge');
          challengeAlreadysent = true;
        }
      });
      if( challengeAlreadysent != true){
        $scope.currentPlayer = "challenger";
        $scope.user['room'] = $scope.user['playerId']+"."+ Math.random();
        
        socket.emit('callChallenge',JSON.stringify($scope.user));
        console.log($scope.user);
      }


    
    }

    $scope.saveMatchResults = function(){
      $http({
        url:serverUrl+"?q=saveScore",
        method: "post",
        data:{
          challengerID : $scope.currentChallengeDetails['challengerID'],
          opponentID : $scope.currentChallengeDetails['opponentID'],
          roomID : $scope.currentChallengeDetails['room'],
          challengerPoint : $scope.challengerScore,
          opponentPoint : $scope.opponentScore
        }
      }).then (function mySuccess(response){
       
        //console.log(response.data);

      console.log(response.data);
      
      },function myError(response){
        alert(response.statusText);
  
      });
    }

    $scope.score = function(){

      if($scope.currentPlayer == 'challenger'){
          $scope.challengerScore++;

          if ($scope.challengerScore == $scope.maxScore ) {

            socket.emit('playerWin',{
              winner : 'PLAYER 1',
              room : $scope.currentChallengeDetails['room']
            })
            $scope.saveMatchResults();
           
          }

        var data = {
          player1 : $scope.challengerScore,
          player2 : $scope.opponentScore,
          room :  $scope.currentChallengeDetails['room']
      }
          socket.emit('challengerPoint',data);
          
          console.log("player 1 :"+$scope.challengerScore+" /n"+ " player 2 : " +$scope.opponentScore);
         
      }else{
          $scope.opponentScore++;

          if ($scope.opponentScore == $scope.maxScore ) {

            socket.emit('playerWin',{
              winner : 'PLAYER 2',
              room : $scope.currentChallengeDetails['room']
            })

            $scope.saveMatchResults();
           
          }

          var data = {
            player1 : $scope.challengerScore,
            player2 : $scope.opponentScore,
            room : $scope.currentChallengeDetails['room']
        }
        console.log($scope.user['room']);
          socket.emit('opponentPoint',data);
          console.log("player 1 :"+$scope.challengerScore+" /n"+ " player 2 : " +$scope.opponentScore);
          
      }
  }   

  $scope.acceptChallenger= function(){
    $scope.currentPlayer = 'opponent';
    var player2Info = {
        "name": "I-AM-OPPONENT",
        "id" : "2",
        "room" : "1"
        
    };
    socket.emit('acceptChallenge',player2Info);
}






$scope.subtractPoints = function(){

  if($scope.currentPlayer == 'challenger'){
    $scope.challengerScore--;
    socket.emit('challengerPoint',{
        player1 : $scope.challengerScore,
        player2 : $scope.opponentScore,
        room : $scope.currentChallengeDetails['room']
    });

    console.log("player 1 :"+$scope.challengerScore+" /n"+ " player 2 : " +$scope.opponentScore);
}else{
    $scope.opponentScore--;
    socket.emit('opponentPoint',{
        player1 : $scope.challengerScore,
        player2 : $scope.opponentScore,
        room : $scope.currentChallengeDetails['room']
    });
    console.log("player 1 :"+$scope.challengerScore+" /n"+ " player 2 : " +$scope.opponentScore);
}

}
    
  });

  /*app.controller('joinMatch', function($scope,socket,$window) {
    $scope.availableRooms = [];
    $scope.room;

    //listen to available rooms
    socket.on('availableRooms',function(msg){
      $scope.availableRooms = msg;
      $scope.room = msg['room'];
      console.log(msg);
    });

    //listen to a match/room message event
     socket.on('roomMessage',function(msg){
      document.getElementById('messages').innerHTML= document.getElementById('messages').append( '<li>'+msg['senderName']+" : "+msg['message']+'</li>');
      document.getElementById('messages').append(msg['senderName']+" : "+msg['message']);
    })

    socket.on('welcomUser',function(msg){
      console.log(msg);
      $window.alert(msg['user']+" joined");
    });

      //listen to challenger score
      socket.on('challengerPoint',function(msg){
       
        console.log(msg);

        document.getElementById('messages').append("\n player1 : "+msg['player1']+" player2 : "+ msg['player2']+" \n ");
      });

       //listen to opponent score
       socket.on('opponentPoint',function(msg){
        
        console.log(msg);


        document.getElementById('messages').append("\n player1 : "+msg['player1']+" player2 : "+  msg['player2']+" \n ");
      });

      socket.on('roomMessage',function(msg){
        document.getElementById('messages').append(msg['message']);
      })


    
    $window.onload = function(){
      $scope.user = JSON.parse(localStorage.getItem('activeUser'));
       console.log($scope.user);

       socket.emit('findRooms');
    }

  

    $scope.joinRoom = function(roomNum){
      $scope.room = roomNum;
      socket.emit('addUser',{user: $scope.user['emailAddress'], room : $scope.room});
      $window.location.href= "room.html";
      $scope.room = roomNum;
      
    }

    $scope.sendRoomMessage = function(){
     console.log($scope.room);
     
      var text = document.getElementById('m').value;
      socket.emit('roomMessage',{
        room : $scope.room,
        sender : $scope.user['playerId'],
        senderName : $scope.user['emailAddress'],
        message : text

      });

    }

    

  });


app.controller('activeMathCtrl', function($scope,socket,$window) {


    $scope.currentPlayer;
    $scope.challenger;
    $scope.opponent;
    $scope.maxScore = 5;
    $scope.challengerScore = 0;
    $scope.opponentScore = 0;

    $window.onload = function(){
      $scope.currentPlayer = localStorage.getItem('activeUser');
      console.log($scope.currentPlayer);
    }
    

    //socket listeners
    //intent to play posted alert
    socket.on('existChallenger',function(msg){
        $scope.challenger = msg;
        console.log($scope.challenger);
    });

    socket.on('acceptChallenge',function(msg){
        $scope.opponent = msg;
        console.log(msg);
        document.getElementById('matchDiv').style.display = "block";
    })

    socket.on('challengerPoint',function(msg){
        
        
        $scope.challengerScore = msg['player1'];
        $scope.opponentScore = msg['player2'];
        console.log(msg);
    });

    socket.on('opponentPoint',function(msg){
        
        $scope.challengerScore = msg['player1'];
        $scope.opponentScore = msg['player2'];
        console.log(msg);
    })

      socket.on('roombroadcast',function(msg){
        
        console.log(msg);
    })
  

    $scope.callChallenge = function(){
        $scope.currentPlayer = 'challenger';
        var player1Info = {
            "name": "I-AM-CHALLENGER",
            "id" : "1"
        }
        socket.emit('callChallenge',player1Info);
        
    }



   
  });
  */




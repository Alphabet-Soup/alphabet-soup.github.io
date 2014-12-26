// ==UserScript==
// @name        OfflineVoter
// @namespace   http://alphabet-soup.github.io
// @description Keeps tracks of a users votes when not logged in to be applied when the user signs on.
// @include     http://www.reddit.com/*
// @version     1.0
// @updateURL   http://alphabet-soup.github.io/scripts/offline-voter/latest-version/OfflineVoter.meta.js
// @grant       none
// ==/UserScript==

//read_content_global taken from http://www.webextender.net/scripts/preview/85398.html by arantius
//eventually this will be modified which is why I put it in like this instead of used it with require metadata
//beginning of read_content_global block
var read_content_global;
(function() {
var callbacks = [];
var callback_counter = 0;

function dispatch_global(id, name, value) {
  var msg_data = {
      'type': 'read_content_global',
      'callback_id': id,
      'name': name,
      'data': value,
      };
  var msg = JSON.stringify(msg_data);
  window.postMessage(msg, '*');
}
location.href = 'javascript:'+dispatch_global.toString();

function receive_global(event) {
  try {
    var result = JSON.parse(event.data);
    if ('read_content_global' != result.type) return;
    if (!callbacks[result.callback_id]) return;
    callbacks[result.callback_id](result.name, result.data);
    del(callbacks[result.callback_id]);
  } catch (e) {
    // No-op.
  }
}
window.addEventListener('message', receive_global, false);

read_content_global = function(name, callback) {
  var id = (callback_counter++);
  callbacks[id] = callback;

  location.href = 'javascript:dispatch_global('
      + id + ', "'
      + name.replace(/\"/g, '\\"') + '", '
      + name 
      + ');void(0);';
}
})();
//end of read_content_global block



var reddit, votes;
var voteCtr = 0;


read_content_global("reddit", function (name, value) {
    reddit = value;
    offlineVoter(reddit); 
});

function offlineVoter(redditObj){

    //votes should be an object with the format { thing_fullname: dir, ... }
    //votes should only track upvoted or downvoted links with values 1 or -1 respectively
    //since this is to be used when the user is not logged in the 0 or un-vote value is unnecessary
    //if a user un-votes something that thing_fullname should be deleted from votes

    
    votes = JSON.parse(window.sessionStorage.getItem("OLV.votes")) || {};
    
    voteCtr = Object.keys(votes).length;

    if (!reddit.logged){
    
        window.addEventListener("beforeunload", function(){
            if (votes){
                window.sessionStorage.setItem("OLV.votes", JSON.stringify(votes));
            }
        });
        
        var arrows = document.getElementsByClassName("arrow");
        
        disableLoginPopups(arrows);
        addVoteListeners(arrows);
        
        setVotes(Object.keys(votes));

    }

    if (reddit.logged && Object.keys(votes).length){
        //Added here otherwise arrows won't show your vote without refreshing the page
        setVotes(Object.keys(votes));
        
        sendVotes(votes);
    }
}

function setVotes(things){

        for (var i = 0; i < things.length; i++){
            var thingElem = document.getElementsByClassName("id-" + things[i])[0];
            if (thingElem){
                thingUtils(thingElem).updateThing(votes[things[i]]);
            }
        }
}


function thingUtils(thingElement){

    var makeThingUnvoted = function() {
        var midcol = thingElement.getElementsByClassName("midcol")[0];
        var arrows = thingElement.getElementsByClassName("arrow");

        midcol.setAttribute("class", "midcol unvoted");
        arrows[0].setAttribute("class", "arrow up");
        arrows[1].setAttribute("class", "arrow down");
    };

    var makeThingUpvoted = function(){
        var midcol = thingElement.getElementsByClassName("midcol")[0];
        var arrows = thingElement.getElementsByClassName("arrow");

        midcol.setAttribute("class", "midcol likes");
        arrows[0].setAttribute("class", "arrow upmod");
        arrows[1].setAttribute("class", "arrow down");
    };

    var makeThingDownvoted = function(){
        var midcol = thingElement.getElementsByClassName("midcol")[0];
        var arrows = thingElement.getElementsByClassName("arrow");

        midcol.setAttribute("class", "midcol dislikes");
        arrows[0].setAttribute("class", "arrow up");
        arrows[1].setAttribute("class", "arrow downmod");
    };
    
    this.getVote = function(){

        if (!this.isThing()){
            return "";
        }

        var midcolClasses = thingElement.getElementsByClassName("midcol")[0].getAttribute("class").split(" ");
        var vote = midcolClasses[1];


        return (vote === "unvoted" || vote === "likes" || vote === "dislikes") ? vote : "";

    };

    this.updateThing = function(newVote){
        if (newVote === "up" || newVote === 1){
            makeThingUpvoted();
        }
        else if (newVote === "down" || newVote === -1){
            makeThingDownvoted();
        }  
        else{
            makeThingUnvoted();
        }
        
    };

    this.getFullName = function() {


        if (!this.isThing()){
            return "";
        }


        if (thingElement.hasAttribute("data-fullname")){
            return thingElement.getAttribute("data-fullname");
        }
        else {
            var classes = thingElement.getAttribute("class").split(" ");

            for (var i = 0; i < classes.length; i++){
                if (classes[i].slice(0,3) === "id-"){
                    return classes[i].slice(3);
                }
            }

        }

        return "";
    };

    this.isThing = function(){
        var classes = thingElement.getAttribute("class").split(" ");

        for (var i = 0; i < classes.length; i++){
            if (classes[i] === "thing"){
                return true;
            }
        }

        return false;
    };
    
    return this;
}

function arrowUtils(arrowElement){
        
    return {
        arrowType : function(){
            var classes = arrowElement.getAttribute("class").split(" ");

            for (var i = 0; i < classes.length; i++){
                if (classes[i] === "up" || classes[i] === "upmod" || classes[i] === "down" || classes[i] === "downmod"){
                    return classes[i];
                }

            }

            return "";
        },

        getAssociatedThingElement : function () {
            return arrowElement.parentElement.parentElement;
        }
    
    } 
}

function disableLoginPopups(arrowElements){
    var classes;
    
    for (var i = 0; i < arrowElements.length; i++){
        newClassStr = "";
        classes = arrowElements[i].getAttribute("class").split(" ");
        
        for (var j = 0; j < classes.length; j++){
            if (classes[j] !== "login-required"){
                newClassStr += classes[j] + " ";
            }
        }
        
        arrowElements[i].setAttribute("class", newClassStr);
    }  
}

function addVoteListeners(arrowElements) {
    for (var i = 0; i < arrowElements.length; i++) {
        arrowElements[i].addEventListener("click", voteAction);
    }
}

function voteAction(event){
    var arrowUtil = arrowUtils(event.target);

    var thing = arrowUtil.getAssociatedThingElement();
    var vote = arrowUtil.arrowType();
    
    var thingUtil = thingUtils(thing);
    var thingName = thingUtil.getFullName();
    
    thingUtil.updateThing(vote);
    
    
    if (votes[thingName] && (votes[thingName] === 1 && vote === "upmod") || (votes[thingName] === -1 && vote === "downmod")){
        delete votes[thingName];
        voteCtr--;
    }
    else {
        voteCtr += votes[thingName] ? 0 : 1;
        votes[thingName] = (vote === "up") ? 1 : -1;  

    }
    
    if (voteCtr && (voteCtr === 1 || voteCtr % 5 === 0)){
        alert("You are not logged in. " + voteCtr + ((voteCtr > 1) ? " votes " : " vote ") + " will be applied when you log in.");
    }
}


function sendVotes(votes){
    var voteKeys = Object.keys(votes);
    
    if (!voteKeys.length){
        return;
    }
    var req = new XMLHttpRequest();
    
    var resp = function() { 
        vote = voteKeys.pop();
        
        if (!vote){
            clearAllVoteInfo();
            return;
        }
        req.open("POST", "http://www.reddit.com/api/vote");
    
        req.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
        req.setRequestHeader("X-Modhash", reddit.modhash);

        voteString = "id=" + vote + "&dir=" + votes[vote];
        console.log(voteString);
            
        req.send(voteString);
        console.log("sent request");
    };
    req.addEventListener("load", resp);
    
    req.open("POST", "http://www.reddit.com/api/vote");
    
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
    req.setRequestHeader("X-Modhash", reddit.modhash);

    var voteString;
    var vote = voteKeys.pop();
    
    voteString = "id=" + vote + "&dir=" + votes[vote];
    console.log(voteString);
        
    req.send(voteString);
    console.log("sent request");

    

}

function clearAllVoteInfo(){
    votes = {};
    window.sessionStorage.removeItem("OLV.votes");
}

// ==UserScript==
// @name        LinkGrouper
// @namespace   http://alphabet-soup.github.io/
// @description Groups links by various properties.
// @include     http://www.reddit.com/*
// @exclude     http://www.reddit.com/r/*/comments/*
// @version     1.0
// @updateURL   http://alphabet-soup.github.io/scripts/link-grouper/latest-version/LinkGrouper.meta.js
// @grant       GM_addStyle
// ==/UserScript==

styleString = "#groupBy { border: 1px solid black; padding: 4px; }"
                + "#showGrouped { margin: 3px; }"
                + "#groupByOptions { margin-left: 16px;} ";
                
             

GM_addStyle(styleString);

window.addEventListener("beforeunload", function (){
    var isGrouped = document.getElementById("showGrouped").checked;  

    if (isGrouped){
        groupedOptions = document.getElementsByName("grouper");
        
        for (var i = 0; i < groupedOptions.length; i++){
            if (groupedOptions[i].checked){
                var grpOptChk = true;
                window.sessionStorage.setItem("SRG.groupBy", groupedOptions[i].value);
                break;
            }
        }
        
        if (!grpOptChk){
            window.sessionStorage.setItem("SRG.groupBy", groupedOptions[0].value);
        }
    }
    else {
        window.sessionStorage.setItem("SRG.groupBy", "");
    }
    
});  


groups = {};

links = getLinks();


displayInSideBar();


//getProperty is a function that gets an attribute of the link
//backupProperty is a function that gets an attribute of the link
//if getProperty returns an empty string it will attempt to get another useful property to group by.
//backupProperty does not have to be supplied, it will default to getSubredditName()
function groupBy(getProperty, backupProperty){
  //messy?
  delete groups;
  
  //groups is going to have format { "group name" : { count: number, div: div-element } };
  //the div element gets created by createSubredditGroupDiv and holds all the links within that category
  groups = {};
  
  
  backupProperty = backupProperty || getSubredditName;
  
  for (var i = 0; i < links.length; i++){
    var name = getProperty(links[i]);
    
    if (name == ""){
      name = backupProperty(links[i]);
    }
    
    if (groups.hasOwnProperty(name)) {
      groups[name].div.children[1].appendChild(links[i]);
      groups[name].count++;
    } 
    else {
      groups[name] = {};
      groups[name].count = 1;
      groups[name].div = createSubredditGroupDiv(name);
      groups[name].div.children[1].appendChild(links[i]);
    } 
  }   
    
}

function ungroup(){
  
  clearSiteTable();
  sitetable = document.getElementById("siteTable");
  nav = sitetable.getElementsByClassName("nav-buttons")[0];
  for (var i = 0; i < links.length; i++){
   sitetable.insertBefore(links[i], nav);
  }
  
}

function addGroupDivs() {
  
  clearSiteTable();
  var siteTableDiv = document.getElementById('siteTable');
  var nav = siteTableDiv.getElementsByClassName('nav-buttons') [0];
  Object.keys(groups).forEach(function (name) {
    siteTableDiv.insertBefore(groups[name].div, nav);
    siteTableDiv.insertBefore(clearLeftDiv(), nav);
  });
}

function getLinks() {

  var pageLinks = document.getElementById('siteTable').getElementsByClassName('thing');
  
  var linksArr = [];
  
  //sometimes it's weird to work with array-like objects, by returning an array 
  //I don't have to remember that getLinks() returns an array-like object whenever I use it.
  for (var i = 0; i < pageLinks.length; i++){
    linksArr[i] = pageLinks[i];
  }
  
  return linksArr;

  
}

function getSubredditName(subreddit) {
  var raw = subreddit.getElementsByClassName('subreddit') [0].firstChild.nodeValue;
  
  return (raw.slice(0, 3) === '/r/') ? raw.slice(3)  : raw;
}

function getSubredditDomain(subreddit) {
  var domain = subreddit.getElementsByClassName("domain")[0];

  if (domain){
    return domain.childNodes[1].firstChild.nodeValue;
  }

  else {
    return "";
  }
  
}

function getThingType(subreddit){
    var fullname = subreddit.getAttribute("data-fullname");
    var type = fullname.slice(0,2);
    
    if (type === "t1"){
        return "comment";
    }
    else if (type === "t3"){
        return "link";
    }
    
    return "unknown";
    
}

function getLinkType(subreddit){
    var classes = subreddit.getAttribute("class");
    
    if (classes.indexOf("link") !== -1){
        if (classes.indexOf("self") !== -1){
            return "self";
        }
        else {
            return "link";
        }
    }
    
    if (getThingType(subreddit) === "comment"){
        return "comment;
    }
    
    return "unknown";
}
function clearSiteTable(){
  sitetable = document.getElementById("siteTable");
  nav = sitetable.getElementsByClassName("nav-buttons")[0];
  while (sitetable.hasChildNodes()){
    sitetable.removeChild(sitetable.firstChild);
  }
  
  //if the siteTable had nav-buttons (prev or next), make sure to add them back.
  if (nav){
   sitetable.appendChild(nav);
  }
}

//Can't tell what this div does but source code has it as every other div in siteTable
//so I'm re-adding it as I populate the lists.
function clearLeftDiv() {
  var div = document.createElement('div');
  div.setAttribute('class', 'clearleft');
  return div;
}

function createSideMenu(){
  var groupByDiv = document.createElement("div");
  groupByDiv.setAttribute("id", "groupBy");
  
  var showGrouped = createInputElement({label: "group", type:"checkbox", otherAttributes: { id:"showGrouped"}});
  showGrouped.addEventListener("click", function() { 
    if (showGrouped.firstChild.checked){
      groupByOptions.setAttribute("style", "display:block;");
      subredditOption.click();
      
    }
    else{
      ungroup();
      groupByOptions.setAttribute("style", "display:none;");
    }
  });
  
  groupByDiv.appendChild(showGrouped);
  
  var groupByOptions = document.createElement("ul");
  groupByOptions.setAttribute("id", "groupByOptions");
  groupByOptions.setAttribute("style", "display:none;");
  
  var subredditOption = createListItem(createInputElement({label: "subreddit", type:"radio", otherAttributes: {name:"grouper", value:"subreddit", checked: true}}));
  subredditOption.addEventListener("click", function () { 
   groupBy(getSubredditName);
   addGroupDivs();
  });
  
  var domainOption = createListItem(createInputElement({label: "domain", type:"radio", otherAttributes: {name:"grouper", value:"domain"}}));
  domainOption.addEventListener("click", function () { 
   groupBy(getSubredditDomain);
   addGroupDivs();
  });
  
  var linkSelfOption = createListItem(createInputElement({label: "link/self", type: "radio", otherAttributes:{ name: "grouper", value: "link/self"}}));
  linkSelfOption.addEventListener("click", function(){
    groupBy(getLinkType);
    addGroupDivs();
  });
  
  var commentLinkOption = createListItem(createInputElement({label: "comment/link", type: "radio", otherAttributes: {name: "grouper", value: "comment/link"}}));
  commentLinkOption.addEventListener("click", function () { 
   groupBy(getThingType);
   addGroupDivs();
  });
  
  groupByOptions.appendChild(subredditOption);
  groupByOptions.appendChild(domainOption);
  groupByOptions.appendChild(linkSelfOption);
  groupByOptions.appendChild(commentLinkOption);
  
  groupByDiv.appendChild(groupByOptions);
  
  return groupByDiv;
  
  
}

function displayInSideBar(){
  var sidebar = document.getElementsByClassName("side")[0];
  
  var spacerDiv = document.createElement("div");
  spacerDiv.setAttribute("class", "spacer");
  
  var groupByMenu = createSideMenu();
  
  spacerDiv.appendChild(groupByMenu);
  
  //usually puts it in a nice spot, haven't found a case where I felt the need to customize it based on the page
  sidebar.insertBefore(spacerDiv, sidebar.childNodes[1]);
  
  var sesh = activeSessionSettings();
  
  if (sesh){
    document.getElementById("showGrouped").click();  
    if (sesh == "subreddit"){
        document.getElementsByName("grouper")[0].click();
    }
    else if (sesh == "domain"){
        document.getElementsByName("grouper")[1].click();
    }
    else if (sesh == "link/self"){
        document.getElementsByName("grouper")[2].click();
    }
    else if (sesh == "comment/link"){
        document.getElementsByName("grouper")[3].click();
    }

  }
  
}

function activeSessionSettings(){    
    return window.sessionStorage.getItem("SRG.groupBy") || false;    
}

function createInputElement(spec){
  //spec is of format { label: "display text", type: "input type", otherAttributes: { attrib1 : "value", }}
  //displayText gets put in a <label> that encloses the <input> element.
  var inputLabel = document.createElement("label");
  var inputElement = document.createElement("input");
  
  inputElement.setAttribute("type", spec.type);
  
  Object.keys(spec.otherAttributes).forEach(function(key){
    inputElement.setAttribute(key, spec.otherAttributes[key]);
  });
  
  inputLabel.appendChild(inputElement);
  inputLabel.appendChild(document.createTextNode(spec.label));
  
  return inputLabel;
  
}

function createListItem(item){
  var listItem = document.createElement("li");
  listItem.appendChild(item);
  
  return listItem;
  
}

function createSubredditGroupDiv(subredditName) {
  var mainContainer = document.createElement('div');
  var caption = document.createElement('h1');
  var subredditContainer = document.createElement('div');
  
  mainContainer.setAttribute('style', 'border: 1px solid black; margin-bottom:5px; border-left: 0px; border-right: 0px;');
  
  caption.appendChild(document.createTextNode(subredditName));
  caption.setAttribute('style', 'margin: 1px; font-size:12px');
  
  caption.addEventListener("click", function(){
    var curDisplay = subredditContainer.getAttribute("style").split(":")[1];
    var newDisplay = (curDisplay === "block;") ? "none;" : "block;";
    
    if (newDisplay == "none;"){
        caption.firstChild.nodeValue = subredditName + " - " + groups[subredditName].count + " links hidden";
    }
    else {
        caption.firstChild.nodeValue = subredditName;
    }
    
    
    subredditContainer.setAttribute('style', 'display:' + newDisplay);
  });
  
  subredditContainer.setAttribute('style', 'display:block;');
  
  mainContainer.appendChild(caption);
  mainContainer.appendChild(subredditContainer);
  
  return mainContainer;
}

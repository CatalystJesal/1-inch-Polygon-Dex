// const { default: Moralis } = require("moralis/types");


/* Moralis init code */
const serverUrl = "https://3mxythy48esg.usemoralis.com:2053/server";
const appId = "JAvSEVI7tpwfJlfWMT2RcTeuxGHy1nBODJLVfD6x";
Moralis.start({ serverUrl, appId });
var web3;
var chainID;

/* TODO: Add Moralis Authentication code */
var user = window.ethereum.selectedAddress;
var dex;
var tokenList;
// var isDexInitialized = false;
var nativeBalance = 0;
var nativeTokenAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
var otherBalances = [];


var tokenBalancesMap = new Map();

function setToken(key, value){
  tokenBalancesMap.set(key, value);
}

function hasToken(key){
  return tokenBalancesMap.has(key);
}


(async function(){
  
  setWeb3Environment();
  await Moralis.initPlugins();
  dex = Moralis.Plugins.oneInch;
  await updateTokenList();
  if(user){
   login();
  }


})();

let updateTokenList = async function(){
  await getSupportedTokens();
  await populateTokenForm("tokens");
}


async function init_balances(reset = false){

      if(!reset){
        await getAccountBalances();
        await syncBalancesMap(nativeBalance, otherBalances);
      }
     
    syncTokenFormBalances(reset);
    document.getElementById("btn-login").innerText = window.ethereum.selectedAddress;
}


function setWeb3Environment(){
  web3 = new Web3(window.ethereum);
  monitorNetwork();
  monitorAccount();
}

 function monitorNetwork(){
  Moralis.onChainChanged(async function(){
      chainID = await web3.eth.net.getId();

       if(chainID == 137){
         init_balances();
       } else {
         syncTokenFormBalances(true);
         document.getElementById("btn-login").innerHTML = "Switch to Polygon";
       }
  })
}

function monitorAccount(){
  Moralis.onAccountsChanged(async function (accounts) {
      chainID = await web3.eth.net.getId();

      if(accounts.length < 1){
        console.log("Logged out of Metamask");
        await logOut();
        return;
      } 
      
      if (chainID == 137){
        await init_balances(reset = false);
      } else {
        await init_balances(reset = true);
      }
    });
    
}


async function hasUserPreviouslyAuthenticated(user){
  console.log("Checking for user: " + user);
  const users = await Moralis.Cloud.run("getUsers");
  for(let i=0; i<users.length; i++){
    if(user == users[i]){
      return true;
    }
  }
  return false;
}




async function getAccountBalances() {
  console.log("Token balances fetched...")
  const options = { chain: 'polygon'}
  var res = await Moralis.Web3API.account.getNativeBalance(options);
  nativeBalance = res;
  nativeBalance = await Moralis.Units.FromWei(`${nativeBalance.balance}`, 18);
  otherBalances = await Moralis.Web3API.account.getTokenBalances(options);
  
}

function syncBalancesMap(nativeBalance, otherBalances){
  //Native balance
  setToken(nativeTokenAddress, nativeBalance);

  for(let i = 0; i < otherBalances.length; i++){
      setToken(otherBalances[i].address, otherBalances[i].balance);
  }

  console.log(tokenBalancesMap);
}


 //This function will be required for the actual DEX swap functionality
$('#table').on('click', 'tbody tr', function(event) {
  $(this).addClass('highlight').siblings().removeClass('highlight');
  var row = $(this);
  console.log("Address: " + row[0].id);
  console.log("Image: " + row.children('td')[0].children[0].src);
  console.log("Token: " + row.children('td')[1].children[0].innerText);
  console.log("Qty: " + row.children('td')[2].children[0].innerText);
});



async function login(){

  await Moralis.enableWeb3(); //This brings the pop-up form of MetaMask for user to login (not authentication of an account BIG difference)
  await Moralis.switchNetwork(0x89); 

  console.log(user);

  if(!user){
  // console.log(await !hasUserPreviouslyAuthenticated(user));
    user = await Moralis.authenticate({ signingMessage: "Log in using Moralis" }).catch(function (error) {
      console.log(error);
    });

    console.log("logged in user:", user);
    
  } 

  await init_balances();

}

  
  async function logOut() {
    await Moralis.User.logOut();
    user = null;
    console.log("Logged out");
    document.getElementById("btn-login").innerText = "Connect to Metamask";
    syncTokenFormBalances(true);

  }

   async function getSupportedTokens() {
    const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
      chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
    });

    tokenList = tokens;
    console.log(tokenList);
  }

  async function getTokenMetadata(address){
      //Get metadata for one token
    const options = { chain: "polygon", addresses: address };
    const tokenMetadata = await Moralis.Web3API.token.getTokenMetadata(options);

    return tokenMetadata;
  }
  
    async function populateTokenForm(element){
      console.log("Populating Table...")
  
      for(const [address, name, logoURI] of Object.entries(tokenList.tokens)){
        var tr = createTokenHTML(element, address, name.symbol, name.logoURI);
        var tbody = document.getElementById(element);
        addRowToTokenForm(tbody, tr);
      }
    }
  

  function createTokenHTML(element, address, symbol, logoURI){
 
      // console.log(address);
      // console.log(name.symbol);
      // console.log(name.logoURI);

      //TOKEN ITEM
      var tableRow = document.createElement("tr");
      tableRow.id = `${address}`
      var tbody = document.getElementById(element);

      //IMAGE
      var tableDetail1 = document.createElement("td");
      tableDetail1.className = '';
      tableDetail1.style.width = '1px';
      var img = document.createElement("img")
      img.alt = symbol;
      img.src = logoURI; 
      img.style.width = "30px";
      img.style.borderRadius = "30px"
      img.id = `${address}-${symbol}-img`;

      tableDetail1.appendChild(img);

      //TOKEN NAME
      var tableDetail2 = document.createElement("td");
      tableDetail2.className = 'align-middle ';
      tableDetail2.style.width = '150px';
      var div = document.createElement("div");
      div.className = '';
      div.style.position = 'relative';
      var p = document.createElement("p");
      p.className = "text-start"
      p.innerText = symbol;
      p.id = `${address}-tokenName`;
      
      div.appendChild(p);
      tableDetail2.appendChild(div);

      //TOKEN QTY
      var tableDetail3 = document.createElement("td");
      tableDetail3.className = '';
      var qty = document.createElement("p");
      qty.className = "text-end fs-6 fw-bold"
    
      qty.id = `${address}-tokenQty`

      tableDetail3.appendChild(qty);


      tableRow.appendChild(tableDetail1);
      tableRow.appendChild(tableDetail2);
      tableRow.appendChild(tableDetail3);
   
      return tableRow;

}

function addRowToTokenForm(tbody, tr){
    tbody.appendChild(tr);
}

function syncTokenFormBalances(reset = false){
  var table = document.getElementById('table');


  for(let i = 0; i<table.rows.length; i++){
    var row = table.rows[i];
    var qty = row.cells[2].children[0];
    
    if(reset) {
      qty.innerText = '';
      continue;
    }

    if(hasToken(row.id))
      qty.innerText = tokenBalancesMap.get(row.id).toFixed(4);
    else  
      qty.innerText = 0;
  }
}


$("#inputSearch").keyup(async function () {
  var value = $(this).val().toLowerCase();
  var tbody1 = document.getElementById("tokens");
  var tbody2 = document.getElementById("searchTokens");
  tbody1.style.visibility = "visible";
  tbody2.style.visibility = "hidden";
  $("#table tr").filter(async function(){
    var row = $(this)
    
    row.toggle(row.text().toLowerCase().indexOf(value) > -1)

  })
  
  if(await web3.utils.isAddress(value)){
    tbody1.style.visibility = "hidden";
    tbody2.style.visibility = "visible";
    var tokenMetaData = await getTokenMetadata(value);
    if(tokenMetaData.length > 0){
      // console.log(tokenMetaData[0].address)
      // console.log(tokenMetaData[0].symbol)
      // console.log(tokenMetaData[0].thumbnail)
      var tr = createTokenHTML("searchTokens", tokenMetaData[0].address, tokenMetaData[0].symbol, tokenMetaData[0].thumbnail);
      if(tokenMetaData[0].symbol){
        optionalRow(tr);
      }
      console.log(tr);
    }
  }
})

function optionalRow(tr){
  // tr.cells[1].innerText += ` Found by address (Add)`
  var tbody = document.getElementById("searchTokens");
  var div = document.createElement("div")
  var btn = document.createElement("button");
  btn.style.fontSize = '12px';
  btn.innerText = "Add";
  btn.addEventListener('click', function(){
    addToken(tr, btn);
  });

  var td = tr.cells[1];
  //Make this temporary, remove from table if the user doesn't click the add button
  //Need another table that overlays on top of the main table to show the search results for adding, granted we enter this function
  //when the search box input is empty then remove that temporary table
  div.appendChild(btn);
  td.appendChild(div);
  tbody.appendChild(tr, this);
  
  return tr;
}


function addToken(tr, el){
  console.log("We are here");
  tokens = document.getElementById("tokens");
  var btnDiv = el.closest('div')
  if(el.innerText == "Add"){
      el.innerText = "Remove";
      tokens.appendChild(tr);
      el.closest('div').style.visibility = "hidden";
      syncTokenFormBalances();
      
  } else {
       el.innerText = "Add"
       console.log(btnDiv);
       el.appendChild(btnDiv);
       tokens.removechild(tr);
  }

  //The user can toggle 'Add' 'Remove' multiple times here. The only thing that changes is the UI. If they wish to submit the token,
  //there must be a change in the input form, any function calls should be done when that happens seperately NOT HERE.

  //Make it so that the search function looks for the address in the main table via tr ID before firing the meta data function to search seperately
  //That way we can handle whether or not we want to remove custom tokens that were added by toggling their div class (if it exists)
}

  document.getElementById("btn-login").onclick = login;
  document.getElementById("btn-logout").onclick = logOut;

//Make the thumbnails smaller (done)
//Make table rows smaller (done)
//Show actual quantity of the tokens user has (done)
//Make it possible to search/add tokens that isn't in the list 


//Make sure when network is switched while the user is logged-in, the balances are reset from the table (done)

//Authenticate automatically if user is already accessed MetaMask account and show their address without having to click 'Login' button
//Show the address of the person, especially update it when another account is selected - this means re-populating the balances

//Check if account is linked already
//Refreshing page causes table not to update despite being selected on a Metamask account

//Mechanics of the DEX

//When not logged in - populate the list of tokens but not the balances (done)
//If not logged in - log in (done)
//If on wrong bridge make 'Swap' button say 'Switch to Polygon', then fire function which changes MM network to Polygon (done).
//If logged in populate address balances and write quantity to each row for the token they belong to (done)

//Look to create a separate function which writes the balances to each table row, based on what the user has. (done)


//Check onAccountsChanged whether the address has already authenticated in the past (use Cloud Function returned array to check if they exist) (done)
//If they exist in the User table already then no need to authenticate/link them again. Just re-populate the balances and change innerText/html of (done)
//of the current address shown


//generally populate balances and show current address if already authenticated/page is ready



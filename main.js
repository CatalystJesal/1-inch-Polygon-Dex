

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

// var isPolygon = (chainID == 137);

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
  Moralis.enableWeb3();
  await getSupportedTokens();
  await populateTable("tokens");
  await login();

 
  console.log(chainID);
  // console.log(isPolygon);

 if(chainID == 137){
   await init_balances();
 }

})();


async function init_balances(reset){

    await getTokenBalances();
    await updateTokenBalancesMap(nativeBalance, otherBalances);
    updateTableBalances(reset);
}


function setWeb3Environment(){
  web3 = new Web3(window.ethereum);
  monitorNetwork();
  monitorAccount();
}

 function monitorNetwork(){
  Moralis.onChainChanged(async function(){
      chainID = await web3.eth.net.getId();
      console.log(chainID);

       if(chainID == 137){
         login();
         init_balances();
       } else {
         updateTableBalances(true);
         document.getElementById("address").innerHTML = "Wrong Network";
       }
  })
}

function monitorAccount(){
  Moralis.onAccountsChanged(async function (accounts) {
      login();

      if(chainID == 137){
        await init_balances();
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




async function getTokenBalances() {
  console.log("Token balances fetched...")
  const options = { chain: 'polygon'}
  var res = await Moralis.Web3API.account.getNativeBalance(options);
  nativeBalance = res;
  nativeBalance = await Moralis.Units.FromWei(`${nativeBalance.balance}`, 18);
  otherBalances = await Moralis.Web3API.account.getTokenBalances(options);
  
}

function updateTokenBalancesMap(nativeBalance, otherBalances){
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




async function login() {
    chainID = await web3.eth.net.getId();

    if(chainID != 137){
      document.getElementById("address").innerHTML = "Wrong Network";
      return;
    }

    if (!user) {

      if(await !hasUserPreviouslyAuthenticated(user)){
        user = await Moralis.authenticate({ signingMessage: "Log in using Moralis" }).catch(function (error) {
          console.log(error);
        });

        console.log("logged in user:", user);

    }

  } else {
      user = window.ethereum.selectedAddress;
  }

  document.getElementById("address").innerHTML = user;

  }
  
  async function logOut() {
    await Moralis.User.logOut();
    console.log("Logged out");
    document.getElementById("address").innerHTML = "";
    updateTableBalances(true);

  }

   async function getSupportedTokens() {
    const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
      chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
    });

    tokenList = tokens;
    console.log(tokenList);
  }
  
    async function populateTable(element){
      console.log("Populating Table...")
  
      for(const [address, name, logoURI] of Object.entries(tokenList.tokens)){
        generateTokenHTML(element, address, name, logoURI);
      }
    }
  

  function generateTokenHTML(element, address, name, logoURI){
 
      // console.log(address);
      // console.log(name.symbol);
      // console.log(name.logoURI);

      //TOKEN ITEM
      var tableRow = document.createElement("tr");
      tableRow.id = `${name.address}`
      var tbody = document.getElementById(element);

      //IMAGE
      var tableDetail1 = document.createElement("td");
      tableDetail1.className = '';
      tableDetail1.style.width = '1px';
      var img = document.createElement("img")
      img.alt = name.symbol;
      img.src = name.logoURI; 
      img.style.width = "30px";
      img.style.borderRadius = "30px"
      img.id = `${address}-${name.symbol}-img`;

      tableDetail1.appendChild(img);

      //TOKEN NAME
      var tableDetail2 = document.createElement("td");
      tableDetail2.className = 'align-middle';
      tableDetail2.style.width = '1px';
      var p = document.createElement("p");
      p.className = "text-start align-self-center"
      p.innerText = name.symbol;
      p.id = `${address}-tokenName`;

      tableDetail2.appendChild(p);

      //TOKEN QTY
      var tableDetail3 = document.createElement("td");
      tableDetail3.className = '';
      var qty = document.createElement("p");
      qty.className = "text-start text-end fs-6 fw-bold"
    
      qty.id = `${address}-tokenQty`

      tableDetail3.appendChild(qty);


      tableRow.appendChild(tableDetail1);
      tableRow.appendChild(tableDetail2);
      tableRow.appendChild(tableDetail3);
      tbody.appendChild(tableRow);

}

function updateTableBalances(reset = false){
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


$("#inputSearch").keyup(function () {
  var value = $(this).val().toUpperCase();

  $("#table tr").filter(function(){
    var row = $(this)
    
    row.toggle(row.text().toUpperCase().indexOf(value) > -1)
  })
  
})

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



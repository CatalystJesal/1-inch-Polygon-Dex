
/* Moralis init code */
const serverUrl = "https://3mxythy48esg.usemoralis.com:2053/server";
const appId = "JAvSEVI7tpwfJlfWMT2RcTeuxGHy1nBODJLVfD6x";
Moralis.start({ serverUrl, appId });

/* TODO: Add Moralis Authentication code */
let user = Moralis.User.current();
let dex;
let tokenList;

let isDexInitialized = false;

let nativeBalance = 0;

let nativeTokenAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

let otherBalances = [];

let tokenBalancesMap = new Map();


function setToken(key, value){
  tokenBalancesMap.set(key, value);
}

function hasToken(key){
  return tokenBalancesMap.has(key);
}

async function getTokenBalances() {
  const options = { chain: 'polygon'}

  nativeBalance = await Moralis.Web3API.account.getNativeBalance(options);

  nativeBalance = Moralis.Units.FromWei(nativeBalance.balance);

  otherBalances = await Moralis.Web3API.account.getTokenBalances(options);
  
}

function updateTokenBalancesMap(balances){

  //Native balance
  setToken(nativeTokenAddress, nativeBalance);

  for(let i = 0; i < balances.length; i++){
      setToken(balances[i].address, balances[i].balance);
  }

  console.log(tokenBalancesMap);
}


(async function(){

if(!isDexInitialized){
  await Moralis.initPlugins();
  dex = Moralis.Plugins.oneInch;
  await getSupportedTokens();
  await getTokenBalances();
  updateTokenBalancesMap(otherBalances);
  await populateTable("tokens");
  // console.log(tokens);
  await Moralis.enableWeb3();
  isDexInitialized = true;
}

})();


if(user){
  let user = Moralis.User.current();
  document.getElementById("address").innerHTML = user.get("ethAddress");
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
    if (!user) {
      user = await Moralis.authenticate({ signingMessage: "Log in using Moralis" })
        .then(function (user) {
          console.log("logged in user:", user);
          console.log(user.get("ethAddress"));
          document.getElementById("address").innerHTML = user.get("ethAddress");

        })
        .catch(function (error) {
          console.log(error);
        });
    } 
  }
  
  async function logOut() {
    await Moralis.User.logOut();
    console.log("logged out");
    document.getElementById("address").innerHTML = "...";

  }

   async function getSupportedTokens() {
    const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
      chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
    });

    tokenList = tokens;
    console.log(tokenList);
  }
  
    async function populateTable(element){

      generateTokenHTML(element);
    }
  

  function generateTokenHTML(element){
    for(const [address, name, logoURI] of Object.entries(tokenList.tokens)){
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
      img.className = "img-thumbnail";
      img.alt = name.symbol;
      img.src = name.logoURI; 
      img.width = 80;
      img.height = 80; 
      img.style.width = "30px";
      img.style.borderRadius = "30px"
      img.id = `${address}-tokenImg`;

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
      var qty = document.createElement("p");
      qty.className = "text-start text-end fs-6 fw-bold"

      if(hasToken(address)){
        qty.innerText = tokenBalancesMap.get(address).toFixed(4);
      } else {
        qty.innerText = "0";
      }

      //Native Balance
      // console.log(tokenBalancesMap.get(address));
        
    
      qty.id = `${address}-tokenQty`

      tableDetail3.appendChild(qty);


      tableRow.appendChild(tableDetail1);
      tableRow.appendChild(tableDetail2);
      tableRow.appendChild(tableDetail3);
      tbody.appendChild(tableRow);

      // setToken(address, 0);

  }
}


  document.getElementById("btn-login").onclick = login;
  document.getElementById("btn-logout").onclick = logOut;

//Make the thumbnails smaller (done)
//Make table rows smaller (done)
//Show actual quantity of the tokens user has (done)
//Make it possible to search/add tokens that isn't in the list 


//Create another function to add other balances
//if token is already in the table (get tableRow IDs and compare) then re-write balance 
//otherwise, create token detail and update with the balance



//Map, Key = Address Value = 0 (initially)
//

/* Moralis init code */
const serverUrl = "https://3mxythy48esg.usemoralis.com:2053/server";
const appId = "JAvSEVI7tpwfJlfWMT2RcTeuxGHy1nBODJLVfD6x";
Moralis.start({ serverUrl, appId });

/* TODO: Add Moralis Authentication code */
let user = Moralis.User.current();
let dex;
let tokenList;

let isDexInitialized = false;

var tokenItem; 

(async function(){

if(!isDexInitialized){
  await Moralis.initPlugins();
  dex = Moralis.Plugins.oneInch;
  await getSupportedTokens();
  await appendTokenListToForm("tokens");
  tokenItem = document.getElementById('tokenItem');
  // await appendTokenListToForm("tokensB");
  await Moralis.enableWeb3();
  isDexInitialized = true;
}

})();



  if(user){
    let user = Moralis.User.current();
    document.getElementById("address").innerHTML = user.get("ethAddress");
 }

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
    // console.log(tokenList);
  }
  
    async function appendTokenListToForm(element){

    let index = 0;
    for(const [address, name, logoURI] of Object.entries(tokenList.tokens)){
      // console.log(name.address);
      // console.log(name.symbol);
      // console.log(name.logoURI);

      // var option = document.createElement("option");
      // option.text = name.symbol;
      // option.value = `${index}${name.symbol}`;
      // var select = document.getElementById(element);
      // select.appendChild(option);

      //TOKEN ITEM
      var tableRow = document.createElement("tr");
      // list.className = "list-group-item d-flex justify-content-between";
      tableRow.id = "tokenRow"
      var tbody = document.getElementById(element);

      // var tableHead = document.createElement("th");
      // tableHead.scope = "row"

      // tableRow.appendChild(tableHead);

      //IMAGE
      var tableDetail1 = document.createElement("td");
      tableDetail1.className = '';
      var img = document.createElement("img")
      img.className = "img-thumbnail";
      img.alt = name.symbol;
      img.src = name.logoURI; 
      img.width = 80;
      img.height = 80; 

      tableDetail1.appendChild(img);

      //TOKEN NAME
      var tableDetail2 = document.createElement("td");
      tableDetail2.className = 'align-middle';
      var p = document.createElement("p");
      p.className = "text-start align-self-center"
      p.innerText = name.symbol;
      p.id = "tokenName";

      tableDetail2.appendChild(p);

      //TOKEN QTY
      var tableDetail3 = document.createElement("td");
      tableDetail3.className = 'align-middle';
      var qty = document.createElement("p");
      qty.className = "text-start align-self-center fs-5 fw-bold"
      qty.innerText = "0";
      qty.id = "tokenQty"

      tableDetail3.appendChild(qty);


      tableRow.appendChild(tableDetail1);
      tableRow.appendChild(tableDetail2);
      tableRow.appendChild(tableDetail3);
      tbody.appendChild(tableRow);
      // var list = document.getElementById("li");
   
      

  //NOTE: May need all of below back, trying with table to make use of bootstrap for ease...
      // //TOKEN ITEM
      // var list = document.createElement("li");
      // list.className = "list-group-item d-flex justify-content-between";
      // list.id = "tokenItem"
      // var ul = document.getElementById(element);

      // //IMAGE
      // var img = document.createElement("img")
      // img.className = "img-thumbnail";
      // img.alt = name.symbol;
      // img.src = name.logoURI; 
      // img.width = 80;
      // img.height = 80; 

      // //TOKEN NAME
      // var p = document.createElement("p");
      // p.className = "text-start align-self-center"
      // p.innerText = name.symbol;
      // p.id = "tokenName";

      
      // //TOKEN QTY
      // var qty = document.createElement("p");
      // qty.className = "text-start align-self-center fs-5 fw-bold"
      // qty.innerText = "0";
      // qty.id = "tokenQty"
      
      // // var list = document.getElementById("li");
      // list.appendChild(img);
      // list.appendChild(p);
      // list.appendChild(qty)
      // ul.appendChild(list);
      
      
    }
  }

  async function onSelectedToken(){
    var e = document.getElementById("tokensA");
    var value = e.options[e.selectedIndex].value;
    var text = e.options[e.selectedIndex].text;

      console.log("text: " + text)
  }

var mouseOverFunction = function (){
  this.style.color = '#f5d38c';
};

tokenItem.onmouseover = mouseOverFunction;



  document.getElementById("btn-login").onclick = login;
  document.getElementById("btn-logout").onclick = logOut;
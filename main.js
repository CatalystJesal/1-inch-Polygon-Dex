/* Moralis init code */
const serverUrl = "https://3mxythy48esg.usemoralis.com:2053/server";
const appId = "JAvSEVI7tpwfJlfWMT2RcTeuxGHy1nBODJLVfD6x";
Moralis.start({ serverUrl, appId });
var web3;
var chainID;

var user = window.ethereum.selectedAddress;
var dex;
var tokenList;
var nativeBalance = 0;
var nativeTokenAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
var otherBalances = [];

var tokenBalancesMap = new Map();
var currTokenTableMap = new Map();

var tokensDB;

var currActionId;

function setValue(map, key, value) {
  map.set(key, value);
}

function hasValue(map, key) {
  return map.has(key);
}

(async function () {
  setWeb3Environment();
  await Moralis.initPlugins();
  dex = Moralis.Plugins.oneInch;
  user = await Moralis.User.current(); //Get current user from cache
  await getSupportedTokens();
  await populateTokenForm("tokens");
  await login();

  console.log(currTokenTableMap);
})();

async function init_balances(reset = false) {
  if (!reset) {
    await getAccountBalances();
    await syncBalancesMap(nativeBalance, otherBalances);
    document.getElementById("btn-login").innerHTML =
      user.attributes.accounts[0];
  }

  syncTokenUIBalances(reset);
}

function setWeb3Environment() {
  web3 = new Web3(window.ethereum);
  monitorNetwork();
  monitorAccount();
}

function monitorNetwork() {
  Moralis.onChainChanged(async function () {
    chainID = await web3.eth.net.getId();

    if (chainID == 137) {
      init_balances();
    } else {
      syncTokenUIBalances(true);
      document.getElementById("btn-login").innerHTML = "Switch to Polygon";
    }
  });
}

function monitorAccount() {
  Moralis.onAccountChanged(async function (accounts) {
    chainID = await web3.eth.net.getId();

    if (accounts.length < 1) {
      console.log("Logged out of Metamask");
      await logOut();
      return;
    }

    if (chainID == 137) {
      await init_balances((reset = false));
    } else {
      await init_balances((reset = true));
    }
  });
}

async function hasUserPreviouslyAuthenticated(user) {
  console.log("Checking for user: " + user);
  const users = await Moralis.Cloud.run("getUsers");
  for (let i = 0; i < users.length; i++) {
    if (user == users[i]) {
      return true;
    }
  }
  return false;
}

async function getTokensDB() {
  console.log("Loading custom added tokens by this user...");

  const tokensDB = await Moralis.Cloud.run("getTokensDB", {
    userAddress: user.attributes.accounts[0],
  });

  return tokensDB;
}

async function getAccountBalances() {
  console.log("Fetch Token balances...");
  const options = { chain: "polygon" };
  var res = await Moralis.Web3API.account.getNativeBalance(options);
  nativeBalance = res;
  console.log(nativeBalance.balance);
  console.log(await Moralis.Web3API.account);
  nativeBalance = await Moralis.Units.FromWei(`${nativeBalance.balance}`, 18);
  // nativeBalance = await Moralis.Units.FromWei(`${30}`, 18);
  otherBalances = await Moralis.Web3API.account.getTokenBalances(options);
  // console.log(otherBalances)
  console.log("Fetched Token balances...");
}

async function syncBalancesMap(nativeBalance, otherBalances) {
  console.log("Synchronize Balances Map...");
  //Native balance
  setValue(tokenBalancesMap, nativeTokenAddress, nativeBalance);

  for (let i = 0; i < otherBalances.length; i++) {
    var balance = await Moralis.Units.FromWei(
      `${otherBalances[i].balance}`,
      18
    );

    setValue(tokenBalancesMap, otherBalances[i].token_address, balance);
  }

  console.log("Synchronized Balances Map...");
}

function openTokenForm(btn_id) {
  // console.log("Form opened")
  var dexForm = document.getElementById("dexForm");
  var tokenForm = document.getElementById("tokenForm");

  dexForm.style.display = "none";
  tokenForm.style.removeProperty("display");

  currActionId = btn_id;
}

//This function will be required for the actual DEX swap functionality

$("#table").on("click", "tr", function () {
  var dexForm = document.getElementById("dexForm");
  var tokenForm = document.getElementById("tokenForm");
  var btn = document.getElementById(currActionId);
  console.log(btn);

  //disable the current selected token the btn shows
  var row = $(this);
  row.addClass("highlight").siblings().removeClass("highlight");

  console.log(row.attr("id"));
  console.log(btn.children[0].getAttribute("data-address"));

  if (btn.children[0].getAttribute("data-address") != row.attr("id")) {
    var seltokenName = row.children("td")[1].children[0].innerText;
    var seltokenImg = row.children("td")[0].children[0].src;
    dexForm.style.removeProperty("display");
    tokenForm.style.display = "none";

    btn.children[0].innerText = seltokenName;
    btn.children[0].setAttribute("data-address", row.attr("id"));
    btn.children[1].src = seltokenImg;
  }
});

async function login() {
  await Moralis.enableWeb3(); //This brings the pop-up form of MetaMask for user to login (not authentication of an account BIG difference)
  console.log(user);

  if (!user) {
    user = await Moralis.authenticate({
      signingMessage: "Log in using Moralis",
    }).catch(function (error) {
      console.log(error);
    });

    console.log("logged in user:", user.attributes);
  }

  await Moralis.switchNetwork(0x89);
  await init_balances();
}

async function logOut() {
  await Moralis.User.logOut();
  user = null;
  console.log("Logged out");
  document.getElementById("btn-login").innerText = "Connect to Metamask";
  syncTokenUIBalances(true);
}

async function getSupportedTokens() {
  const result = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: "polygon", // The blockchain you want to use (eth/bsc/polygon)
  });

  tokenList = result.tokens;
  console.log(tokenList);
}

async function getTokenMetadata(address) {
  //Get metadata for one token
  const options = { chain: "polygon", addresses: address };
  const tokenMetadata = await Moralis.Web3API.token.getTokenMetadata(options);

  return tokenMetadata;
}

async function populateTokenForm(element) {
  console.log("Populating Table...");

  for (const [address, name, logoURI] of Object.entries(tokenList)) {
    var tr = createTokenHTML(element, address, name.symbol, name.logoURI);
    var tbody = document.getElementById(element);
    addRowToTokenForm(tbody, tr);
  }

  if (!user) {
    return;
  }

  tokensDB = await getTokensDB();

  console.log(tokensDB);

  for (let i = 0; i < tokensDB.length; i++) {
    console.log(tokensDB[i]);
    var tr = createTokenHTML(
      "tokens",
      tokensDB[i].attributes.contract,
      tokensDB[i].attributes.tokenName,
      ""
    );
    tr = addBtnToRow(tr, "tokens", "Remove");
  }
}

function createTokenHTML(element, address, symbol, logoURI) {
  //TOKEN ITEM
  var tableRow = document.createElement("tr");
  tableRow.id = `${address}`;
  var tbody = document.getElementById(element);

  //IMAGE
  var tableDetail1 = document.createElement("td");
  tableDetail1.className = "";
  tableDetail1.style.width = "1px";
  var img = document.createElement("img");
  img.alt = symbol;
  img.src = logoURI;
  img.style.width = "30px";
  img.style.borderRadius = "30px";
  img.id = `${address}-${symbol}-img`;

  tableDetail1.appendChild(img);

  //TOKEN NAME
  var tableDetail2 = document.createElement("td");
  tableDetail2.className = "align-middle ";
  tableDetail2.style.width = "150px";
  var div = document.createElement("div");
  div.className = "";
  div.style.position = "relative";
  var span = document.createElement("span");
  span.className = "text-start";
  span.innerText = symbol;
  span.id = `${address}-tokenName`;

  div.appendChild(span);
  tableDetail2.appendChild(div);

  //TOKEN QTY
  var tableDetail3 = document.createElement("td");
  tableDetail3.className = "";
  var qty = document.createElement("p");
  qty.className = "text-end fs-6 fw-bold text-end";
  qty.id = `${address}-tokenQty`;

  tableDetail3.appendChild(qty);
  tableRow.appendChild(tableDetail1);
  tableRow.appendChild(tableDetail2);
  tableRow.appendChild(tableDetail3);

  return tableRow;
}

function addRowToTokenForm(tbody, tr) {
  if (!hasValue(currTokenTableMap, tr.id)) {
    tbody.appendChild(tr);
    setValue(
      currTokenTableMap,
      tr.id,
      tr.getElementsByTagName("p")[0].innerText
    );
  }
}

function syncTokenUIBalances(reset = false) {
  console.log("Sync Token UI Balances...");
  var table = document.getElementById("table");

  for (let i = 0; i < table.rows.length; i++) {
    var row = table.rows[i];
    var txtElement = row.cells[2].children[0];
    if (reset) {
      txtElement.innerText = "";
      continue;
    }

    if (hasValue(tokenBalancesMap, row.id)) {
      var qty = tokenBalancesMap.get(row.id);
      console.log(qty);
      txtElement.innerText = qty % 1 == 0 ? qty : "" + Number(qty).toFixed(4);
    } else {
      txtElement.innerText = 0;
    }
  }
}

//Pasting not included yet

$("#inputSearch").bind("input", async function () {
  var value = $(this).val().toLowerCase();

  var searchTokens = document.getElementById("searchTokens");
  searchTokens.style.visibility = "hidden";
  var isTokenAddress = await web3.utils.isAddress(value);

  if (searchTokens.rows.length > 0) {
    searchTokens.deleteRow(0);
  }

  $("#table tr").filter(async function () {
    var row = $(this);
    if (!isTokenAddress)
      row.toggle(row.text().toLowerCase().indexOf(value) > -1);
    else row.toggle(row.attr("id").toLowerCase().indexOf(value) > -1);
  });

  btn = searchTokens.getElementsByTagName("button")[0];

  var el = document.querySelector("#tokens tr:not([style='display: none;'])");
  console.log(el);

  if (el == null && isTokenAddress) {
    searchTokens.style.visibility = "visible";
    console.log(searchTokens.rows.length);
    tokens.style.visibility = "visible";
    var tokenMetaData = await getTokenMetadata(value);
    if (tokenMetaData.length > 0) {
      var tr = createTokenHTML(
        "searchTokens",
        tokenMetaData[0].address,
        tokenMetaData[0].symbol,
        tokenMetaData[0].thumbnail
      );
      if (tokenMetaData[0].symbol) {
        addBtnToRow(tr, "searchTokens", "Add");
      }
      console.log(tr);
    }
  }
});

function addBtnToRow(tr, table, defaultBtn) {
  var tbody = document.getElementById(table);
  var div = document.createElement("div");
  var btn = document.createElement("button");
  btn.style.fontSize = "12px";
  btn.innerText = defaultBtn;
  btn.addEventListener("click", function () {
    onClick_AddRemoveToken(tr, btn);
  });

  var td = tr.cells[1];
  div.appendChild(btn);
  td.appendChild(div);
  tbody.appendChild(tr, this);

  return tr;
}

async function onClick_AddRemoveToken(tr, el) {
  tokens = document.getElementById("tokens");
  var btnDiv = el.closest("div");
  if (el.innerText == "Add") {
    el.innerText = "Remove";
    tokens.appendChild(tr);
    addRowToTokenForm(tokens, tr);
    //add token to the database here
    var tokenName = tr.cells[1].getElementsByTagName("span")[0].innerText;
    await addTokenToMoralis(tokenName, tr.id);
    syncTokenUIBalances();
  } else {
    el.innerText = "Add";

    //remove token from the database here
    var remove = $("#tokens tr").index(tr);
    tokens.removeChild(document.getElementById(tr.id));
    await deleteTokenFromMoralis(tr.id);
  }
}

addTokenToMoralis = async (name, contract) => {
  const TokensDB = Moralis.Object.extend("TokensDB");
  const token = new TokensDB();
  console.log(contract);
  if (!isTokenInDB(contract)) {
    token.set("tokenName", name);
    token.set("contract", contract);
    token.set("creatorAddress", user.attributes.accounts[0]);
  }

  await token.save();
};

deleteTokenFromMoralis = async (contract) => {
  for (let i = 0; i < tokensDB.length; i++) {
    let object = tokensDB[i];
    if (contract == object.attributes.contract) {
      object.destroy().then(
        () => {
          console.log("The object was deleted from the token database");
          return;
        },
        (error) => {
          console.log(error);
          return;
        }
      );
    }
  }
};

function isTokenInDB(contract) {
  for (let i = 0; i < tokensDB.length; i++) {
    if (contract == tokensDB[i].attributes.contract) {
      return true;
    }
  }

  return false;
}

//One-Inch Plugin functionality
async function getQuote(from, to, amount) {

  amount = amount * 10 ** tokenList[from].decimals;

  const quote = await Moralis.Plugins.oneInch.quote({
    chain: "polygon", // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: from, // The token you want to swap
    toTokenAddress: to, // The token you want to receive
    amount: amount,
  });

  return quote;
}

async function hasAllowance() {
  const allowance = await Moralis.Plugins.oneInch.hasAllowance({
    chain: "polygon", // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: swapFromBtn.children[0].getAttribute("data-address"), // The token you want to swap
    fromAddress: user.attributes.accounts[0], // Your wallet address
    amount: document.getElementById("amountFromInput").value,
  });
  console.log(`The user has enough allowance: ${allowance}`);
}

async function approve() {
  await Moralis.Plugins.oneInch.approve({
    chain: "polygon", // The blockchain you want to use (eth/bsc/polygon)
    tokenAddress: swapFromBtn.children[0].getAttribute("data-address"), // The token you want to swap
    fromAddress: user.attributes.accounts[0], // Your wallet address
  });
}

async function swap() {
  const receipt = await Moralis.Plugins.oneInch.swap({
    chain: "polygon", // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: swapFromBtn.children[0].getAttribute("data-address"), // The token you want to swap
    toTokenAddress: swapToBtn.children[0].getAttribute("data-address"), // The token you want to receive
    amount: document.getElementById("amountFromInput").value,
    fromAddress: user.attributes.accounts[0], // Your wallet address
    slippage: 1,
  });
  console.log(receipt);
}

async function showMaxBalance(tokenFrom, tokenTo, amount) {
  try {
    var quote = await getQuote(tokenFrom, tokenTo, amount); //This function should also be called after the user has stopped typing in the input
    var amountTo = await Moralis.Units.FromWei(`${quote.toTokenAmount}`, 6);
    document.getElementById("amountToInput").value =
      amount != 0 ? amountTo : "";
  } catch (error) {
    console.log(error);
  }
}

$("#amountFromInput").bind("input", async function () {
  var tokenFrom = swapFromBtn.children[0].getAttribute("data-address");
  var tokenTo = swapToBtn.children[0].getAttribute("data-address");

  var amount = 0;
  var amountTo = "";

  if ($(this).val() != "") {
    try {
      amount = $(this).val()
      var quote = await getQuote(tokenFrom, tokenTo, amount);
    } catch (error) {
      console.log(error);
    }
  }

  console.log(amountTo);
  document.getElementById("amountToInput").value = amount != 0 ? quote.toTokenAmount / 10 ** quote.toToken.decimals : "";
});

$("#amountToInput").bind("input", async function () {
  var tokenFrom = swapFromBtn.children[0].getAttribute("data-address");
  var tokenTo = swapToBtn.children[0].getAttribute("data-address");

  var amount = 0;
  var amountTo = "";

  if ($(this).val() != "") {
    try {
      amount = $(this).val()
      var quote = await getQuote(tokenTo, tokenFrom, amount);
      console.log(quote);
    } catch (error) {
      console.log(error);
    }
  }

  document.getElementById("amountFromInput").value = amount != 0 ? quote.toTokenAmount / 10 ** quote.toToken.decimals : "";
});

document.getElementById("btn-login").onclick = login;
document.getElementById("btn-logout").onclick = logOut;

document.getElementById("swapFromBtn").onclick = function () {
  openTokenForm(this.id);
};

document.getElementById("swapToBtn").onclick = function () {
  openTokenForm(this.id);
};

document.getElementById("maxBtn").onclick = function () {
  var swapFromBtn = document.getElementById("swapFromBtn");
  var tokenFrom = swapFromBtn.children[0].getAttribute("data-address");
  var tokenTo = swapToBtn.children[0].getAttribute("data-address");
  var amountFromInput = document.getElementById("amountFromInput");
  amountFromInput.value = Number(tokenBalancesMap.get(tokenFrom)).toFixed(4);
  var amount = Moralis.Units.Token(amountFromInput.value, "18");
  showMaxBalance(tokenFrom, tokenTo, amount);
};

// document.getElementById("swapFromBtn").onclick = openTokenForm;
// document.getElementById("swapToBtn").onclick = openTokenForm;

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

//Issues with showing token in searchtokens table and not showing erroring

//Store any added tokens to the Moralis DB
//Build Actual DEX Swapping functionality

//Once all done, replicate using REACT

//Clean-up code a bit tomorrow
//Begin creating the actual swapping functionality

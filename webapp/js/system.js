var BankApp = window.BankApp || {};
BankApp.map = BankApp.map || {};

var authToken;
// at first no id, after first iteration we have id.
var lastProcessedEventResultId = "";

/********************************************************************* */
// on login and on refreshing page, need the TOKEN ready to do actions.
/********************************************************************* */
function loadLoginInfo() {
    BankApp.authToken.then(function setAuthToken(token) {
        if (token) {
            authToken = token;
            $('.authToken').text(token);
            pollEventResults();
            //alert("auth token is: " + authToken); seems to be OK.
        } else {
            window.location.href = '/index.html';
        }
    }).catch(function handleTokenError(error) {
        alert("error in auth " + error);
        window.location.href = '/index.html';
    });
}

/********************************************************************* */
// show user's current balance in account - calls ajax and shows result
/********************************************************************* */
function getBalance() {
    console.log("getting balance with token " + authToken);
    $.ajax({
        method: 'POST',                     
        url: _config.api.invokeUrl + "/getaccountbalance",           
        headers: {
            Authorization: authToken
        },
        contentType: 'application/json',
        success: successGetBalance,
        error: function ajaxError(jqXHR, textStatus, errorThrown) {
        console.error('Error requesting balance: ', textStatus, ', Details: ', errorThrown);
        console.error('Response: ', jqXHR.responseText);
        alert('error getting balance ' + jqXHR.responseText);
        }
    });
}
/********************************************************************* */
// show result after JSON returns from lambda - show balance
/********************************************************************* */
function successGetBalance(result) {
    console.log("getting balance event finished. result: ")
    console.log(result);
    // this works without polling because it's not an event to be logged.
    // just display the balance received.
    alert("Your balance is " + result.CurrentBalance);
}

/********************************************************************* */
// move money between accounts
// now done using asynchronous event sourcing, so just sends the
// request. result will come asynchronously by polling.
/********************************************************************* */
function transferMoney() {
    //now asynchronous, with polling. doesn't process result.
    console.log("transferring money with token " + authToken);
    var targetUser = $("#account-id")[0].value;
    var amount = $("#transfer-amount")[0].value;
    console.log("transferring money to " + targetUser + " amount " + amount);
    var eventJSON = {
        method: 'POST',                     
        url: _config.api.invokeUrl+ "/transfermoney",           
        headers: {
            Authorization: authToken
        },
        data: JSON.stringify({
            EventType: "TRANSER_MONEY",
            TargetUser: targetUser,
            Amount: amount
        }),
        contentType: 'application/json',
        success: successTransferMoney,
        error: function ajaxError(jqXHR, textStatus, errorThrown) {
        console.error('Error in money transfer: ', textStatus, ', Details: ', errorThrown);
        console.error('Response: ', jqXHR.responseText);
        alert('An error occured when transferring money ' + jqXHR.responseText);
        }
    };
    console.log(eventJSON);
    $.ajax(eventJSON);
}

/********************************************************************* */
// succesful call to transfer money ajax.
// now with async event srcing, only writes to console some logging.
// result will come by polling 
/********************************************************************* */
function successTransferMoney(result) {
    console.log("money transfer event finished. result:");
    console.log(result);
    // show nothing. should poll for result.
    /*alert("Result of money transfer: " + result.message);*/
}

// handle auth if in system - useful when refreshing page to reload token.
if  (  (window.location.href.indexOf("bank-system-logged-in") > -1) ||
       (window.location.href.indexOf("transfer-money") > -1)   
    )
{
    console.log("logged in screen, loading auth creds");
    loadLoginInfo();
}

/********************************************************************* */
// poll lambda for event results
/********************************************************************* */
function pollEventResults()
{
    console.log("polling event results lambda " + authToken);
    var eventJSON = {
        method: 'POST',                     
        url: _config.api.invokeUrl+ "/polleventresults",           
        headers: {
            Authorization: authToken
        },
        data: JSON.stringify({
            // no parameters needed except for auth and last event id
            // (if any)
            LastEventResultId : lastProcessedEventResultId
        }),        
        contentType: 'application/json',
        success: function(resultobj) {            
            var result = resultobj.result;
            if (result.length > 0) // if we have new events
            {
                console.log("result obj: "+ result);
                var resultId = result[0].identity.low;
                console.log("result id: " + resultId);            
                // process new result
                if (lastProcessedEventResultId != resultId)
                {                                            
                    var msg = result[0].properties.msgText;
                    alert(msg);                
                    var resultJSON = JSON.stringify(result);
                    console.log("result from polling: " + resultJSON + " EVENT JSON: " + eventJSON);
                    lastProcessedEventResultId = resultId;
                }
            }            
            setTimeout(function() {
                 pollEventResults(); // poll again after a bit.
            }, 2000);
        },
        error: function ajaxError(jqXHR, textStatus, errorThrown) {
            console.error('Error in polling lambda: ', textStatus, ', Details: ', errorThrown);
            console.error('Response for polling lambda: ', jqXHR.responseText);
            alert('An error occured when polling lambda: ' + jqXHR.responseText);            
        }
    };
    console.log(eventJSON);
    $.ajax(eventJSON);
}


function getConfig(request) {
  var service = getService();
  var response = JSON.parse(UrlFetchApp.fetch("https://graph.facebook.com/v2.10/me/accounts", {
    headers: {
      Authorization: 'Bearer ' + service.getAccessToken()
    }
  }));
  var config = {
    configParams: [
      {
        type: "SELECT_SINGLE",
        name: "pageID",
        displayName: "Page ID",
        helpText: "Please select the Page ID for which you would like to retrieve the Statistics.",
        options: []
      }
    ],
    dateRangeRequired: true
  };
  response.data.forEach(function(field) {
    config.configParams[0].options.push({
      label: field.name,
      value: field.id
    });
  })
  return config;
};


var facebookSchema = [
  {
    name: 'timestamp',
    label: 'Timestamp',
    dataType: 'STRING',
    semantics: {
      conceptType: 'DIMENSION'
    }
  },
  {
    name: 'timestampWeek',
    label: 'Timestamp Week',
    dataType: 'STRING',
    semantics: {
      conceptType: 'DIMENSION'
    }
  },
  {
    name: 'timestampMonth',
    label: 'Timestamp Month',
    dataType: 'STRING',
    semantics: {
      conceptType: 'DIMENSION'
    }
  },
  {
    name: 'likes',
    label: 'Likes Total',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name: 'impressions_daily',
    label: 'Impressions',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name: 'engagements_daily',
    label: 'Page Post Engagements',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  }
];

function getSchema(request) {
  return {schema: facebookSchema};
};

function getData(request) {
  var service = getService();
  
  function dateDelta(dObj, num) {
    if (isNaN(num)) {
      var dateStart = new Date(dObj);
    } else {
      var dateStart = new Date(dObj);
      var dateStart = new Date(dateStart.setDate(dateStart.getDate() + num));
    }
    var dd = dateStart.getDate();
    var mm = dateStart.getMonth()+1; //January is 0!
    
    var yyyy = dateStart.getFullYear();
    if(dd<10){
        dd='0'+dd;
    } 
    if(mm<10){
        mm='0'+mm;
    } 
    var dateStart = yyyy + "-" + mm + "-" + dd;
    return dateStart;
  }
  
  var gStartDate = new Date(request.dateRange.startDate);
  var gStartDate = new Date(dateDelta(gStartDate, -1));
  var gEndDate = new Date(request.dateRange.endDate);
  var gEndDate = new Date(dateDelta(gEndDate, +1));
  var gRange = Math.ceil(Math.abs(gEndDate - gStartDate) / (1000 * 3600 * 24));
  var gBatches = Math.ceil(gRange / 92);

  if (gBatches < 2) {
    var batch = [{"method": "GET", "relative_url": request.configParams.pageID + "/insights/page_fans,page_impressions,page_post_engagements?since=" + dateDelta(gStartDate) + "&until=" + dateDelta(gEndDate)}];
    //console.log(batch);
  } else {
    batch = [];
    var iterRanges = gRange / gBatches;
    
    for (i = 0; i < gBatches; i++) {
      var iterStart = dateDelta(gStartDate, (iterRanges * i));
      if (i == (gBatches - 1)) {
        var iterEnd = dateDelta(gEndDate);
      } else {
        var iterEnd = dateDelta(gStartDate, (iterRanges * (i + 1)) + 1);
      }
      batch.push({"method": "GET", "relative_url": request.configParams.pageID + "/insights/page_fans,page_impressions,page_post_engagements?since=" + iterStart + "&until=" + iterEnd})
    }
    //console.log(batch);
  }
  
    // Fetch the data with UrlFetchApp
  var url = "https://graph.facebook.com?include_headers=false&batch=" + encodeURIComponent(JSON.stringify(batch))
  
  var response = JSON.parse(UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {    
        Authorization: 'Bearer ' + service.getAccessToken()
    }
  }));
  
  // Prepare the schema for the fields requested.
  var dataSchema = [];
  request.fields.forEach(function(field) {
    for (var i = 0; i < facebookSchema.length; i++) {
      if (facebookSchema[i].name === field.name) {
        dataSchema.push(facebookSchema[i]);
        break;
      }
    }
  });
  var data = [];
      
      // Prepare the tabular 
      // console.log("Response: %s", response);
//      response.data[0].values.forEach(function(day, i) {
    response.forEach(function(resp) {
      var resp = JSON.parse(resp.body);
      resp.data[0].values.forEach(function(day, i){
        var values = [];
        dataSchema.forEach(function(field) {
          switch(field.name) {
            case 'timestamp':
              var fbTime = day.end_time;
              var myTime = fbTime.substring(0,4) + fbTime.substring(5,7) + fbTime.substring(8,10);
              values.push(myTime);
              break;
            case 'timestampWeek':
              var myTime = new Date(day.end_time);
              var startTime = new Date(myTime.getFullYear(), 00, 01);
              var deltaTime = Math.abs(myTime - startTime);
              var weekTime = ("0" + Math.ceil((deltaTime / (1000 * 3600 * 24)) / 7)).slice(-2);
              values.push(myTime.getFullYear() + weekTime);
              break;  
            case 'timestampMonth':
              var fbTime = day.end_time;
              var myTime = fbTime.substring(0,4) + fbTime.substring(5,7);
              values.push(myTime);
              break;            
            case 'likes':
              values.push(day.value);
              break;
            case 'impressions_daily':
              values.push(resp.data[1].values[i].value);
              break;
            case 'engagements_daily':
              values.push(resp.data[4].values[i].value);
              break;
            default:
              values.push('');
          }
        });
        data.push({
          values: values
        });
      });
    });

    //console.log("Data Schema: %s", dataSchema);
    //console.log("Data: %s", data);

  
  // Return the tabular data for the given request.
  return {
    schema: dataSchema,
    rows: data
  };
};

function isAdminUser() {
  if (Session.getEffectiveUser().getEmail() == "#########@gmail.com") {
    return true;
  }
}

function getAuthType() {
  // Returns the authentication method required.
  var response = {
    "type": "OAUTH2"
  };
  return response;
}

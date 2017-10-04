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
    ]
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
    name: 'likes',
    label: 'Likes Total',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name: 'impressions_daily',
    label: 'Impressions (Daily)',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name: 'impressions_7day',
    label: 'Impressions (7 Day)',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name: 'impressions_28day',
    label: 'Impressions (28 Day)',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name: 'engagements_daily',
    label: 'Page Post Engagements (Daily)',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name: 'engagements_7day',
    label: 'Page Post Engagements (7 Day)',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC'
    }
  },
  {
    name: 'engagements_28day',
    label: 'Page Post Engagements (28 day)',
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
  
  // Todays date
  var dateToday = new Date();
  var dd = dateToday.getDate();
  var mm = dateToday.getMonth()+1; //January is 0!
  
  var yyyy = dateToday.getFullYear();
  if(dd<10){
      dd='0'+dd;
  } 
  if(mm<10){
      mm='0'+mm;
  } 
  var dateToday = yyyy + "-" + mm + "-" + dd;
  //
  
  // 93 Days ago
  var dateStart = new Date(new Date().setDate(new Date().getDate()-93));
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
  //
  
  // Fetch the data with UrlFetchApp
  var url = [
    "https://graph.facebook.com/v2.10/", 
    request.configParams.pageID, 
    "/insights/page_fans,page_impressions,page_post_engagements?since=", 
    dateStart, 
    "&until=", 
    dateToday 
    ];
  var nextURL = url.join('');
  
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
  
  // Pull data in multiple 3 month chunks
  var threeMonths = 8;
  
  for (i = 0; i < threeMonths; i++) { 
      
    var response = JSON.parse(UrlFetchApp.fetch(nextURL, {
        headers: {
          Authorization: 'Bearer ' + service.getAccessToken()
        }
      }));
      
      // Prepare the tabular 
      // console.log("Response: %s", response);
      response.data[0].values.forEach(function(day, i) {
        var values = [];
        // Provide values in the order defined by the schema.
        dataSchema.forEach(function(field) {
          switch(field.name) {
            case 'timestamp':
              var fbTime = day.end_time;
              var myTime = fbTime.substring(0,4) + fbTime.substring(5,7) + fbTime.substring(8,10);
              values.push(myTime);
              break;
            case 'likes':
              values.push(day.value);
              break;
            case 'impressions_daily':
              values.push(response.data[1].values[i].value);
              break;
            case 'impressions_7day':
              values.push(response.data[2].values[i].value);
              break;
            case 'impressions_28day':
              values.push(response.data[3].values[i].value);
              break;
            case 'engagements_daily':
              values.push(response.data[4].values[i].value);
              break;
            case 'engagements_7day':
              values.push(response.data[5].values[i].value);
              break;
            case 'engagements_28day':
              values.push(response.data[6].values[i].value);
              break;
            default:
              values.push('');
          }
        });
        data.push({
          values: values
        });
      });
      //console.log("Data Schema: %s", dataSchema);
      //console.log("Data: %s", data);
      
      // fetching up to 6 months
      nextURL = response.paging.previous;
  }
  
  // Return the tabular data for the given request.
  return {
    schema: dataSchema,
    rows: data
  };
};

function isAdminUser() {
  if (Session.getEffectiveUser().getEmail() == "##########@gmail.com") {
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

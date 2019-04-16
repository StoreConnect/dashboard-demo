using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Net;

namespace POCStoreConnect
{
    public partial class proxy : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            string API_SERVICE_URL = "http://api-service.westeurope.cloudapp.azure.com:8080/services-api/";

            WebClient wc = new WebClient();
            wc.Headers["Content-Type"] = "application/json";

            // Login
            string loginquery = @"{
                ""EndPoint"": {
                    ""host"": ""apiontologie.westeurope.cloudapp.azure.com"",
                    ""port"": 8890,
                    ""endpointName"": ""strabon - endpoint - 3.3.2 - SNAPSHOT / Query""
                },
                ""Database"": {
                    ""dbName"": ""ontologydb"",
                    ""dbEngine"": ""postgis"",
                    ""user"": ""geouser"",
                    ""password"": ""geouser"",
                    ""port"": 5432,
                    ""serverName"": null,
                    ""checkForLockTable"": true
                }
            }";

            string sessionid = wc.UploadString(API_SERVICE_URL + "login", "POST", loginquery);

            string searchquery = @"{
                ""connectionID"": """ + sessionid + @""",
                ""select"": [""timeStamp"", ""motionState"", ""floor"", ""building"", ""coordinates""],
                ""filters"": [{
                    ""filter"": {
                        ""condition"": {
                            ""field"": ""timeStamp"",
                            ""operator"": "">="",
                            ""value"": ""2019-04-10T13:30:00 00:00""
                        },
                        ""logicalOP"": ""AND""
                    }
                }, {
                    ""filter"": {
                        ""condition"": {
                            ""field"": ""timeStamp"",
                            ""operator"": ""<="",
                            ""value"": ""2019-04-10T14:00:00 00:00""
                        }
                    }
                }]
            }";

            string res = wc.UploadString(API_SERVICE_URL + "query", "POST", searchquery);

            Response.Write(res);
        }
    }
}